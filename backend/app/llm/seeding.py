"""Batch seeding logic for classifying eTOM processes via LLM."""

import json
from typing import Callable

from app.models import ProcessNode
from app.persistence import read_md_file, parse_md_table, write_md_file, write_md_table
from app.llm.client import stream_chat
from app.llm.prompts import build_seeding_system_prompt

FILENAME = "classifications.md"
SECTION = "Classifications"
COLUMNS = ["id", "name", "category", "review_status", "notes"]

# review_status values that indicate a human has already made a decision — skip these
_HUMAN_REVIEWED = {"classified", "descoped", "under_review"}


def get_seed_context(domain_node: ProcessNode) -> str:
    """Format a domain's processes compactly as 'ID: Name' lines for LLM input.

    Only includes L2+ descendants (skips the L1 domain node itself).
    """
    lines: list[str] = []
    _collect_descendants(domain_node, lines, min_level=2)
    return "\n".join(lines)


def _collect_descendants(node: ProcessNode, lines: list[str], min_level: int) -> None:
    """Recursively collect 'ID: Name' strings for all descendants at >= min_level."""
    for child in node.children:
        if child.level >= min_level:
            if child.brief_description:
                lines.append(f"{child.id}: {child.name} — {child.brief_description}")
            else:
                lines.append(f"{child.id}: {child.name}")
        _collect_descendants(child, lines, min_level)


async def seed_classifications(
    process_tree: list[ProcessNode],
    provider: str,
    model: str,
    progress_callback: Callable[[str], None] | None = None,
) -> dict:
    """Seed classifications for all processes by domain (one LLM call per L1 domain).

    For each L1 domain node:
    1. Collect all descendant processes (L2+) as compact 'ID: Name' lines
    2. Build a user message asking the LLM to classify them
    3. Call stream_chat, accumulate full response
    4. Parse JSON from response
    5. Write results to classifications.md, skipping human-reviewed entries

    Returns {"seeded": N, "domains": D, "errors": [...]}
    """
    system_prompt = build_seeding_system_prompt()

    # Load existing classifications so we can honour human reviews
    _, body = read_md_file(FILENAME)
    existing_rows = parse_md_table(body, SECTION)
    existing_by_id: dict[str, dict] = {r["id"]: r for r in existing_rows}

    total_seeded = 0
    domains_processed = 0
    errors: list[str] = []

    # Gather L1 domain nodes from the tree
    l1_nodes: list[ProcessNode] = []
    for node in process_tree:
        if node.level == 0:
            # L0 group — descend to L1 children
            l1_nodes.extend(node.children)
        elif node.level == 1:
            l1_nodes.append(node)

    for domain_node in l1_nodes:
        domain_name = domain_node.name
        context = get_seed_context(domain_node)

        if not context.strip():
            # No L2+ descendants to classify
            if progress_callback:
                progress_callback(f"Skipping domain '{domain_name}' — no descendant processes")
            continue

        if progress_callback:
            progress_callback(f"Seeding domain: {domain_name}")

        user_message = (
            f"Classify the following eTOM processes from the '{domain_name}' domain.\n\n"
            f"{context}"
        )

        # Accumulate the full streamed response
        full_response = ""
        try:
            async for chunk in stream_chat(
                provider=provider,
                model=model,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            ):
                full_response += chunk
        except Exception as exc:
            msg = f"Error seeding domain '{domain_name}': {exc}"
            errors.append(msg)
            if progress_callback:
                progress_callback(msg)
            continue

        # Parse JSON from response (strip any accidental markdown fences)
        try:
            classifications = _parse_classifications_json(full_response)
        except Exception as exc:
            msg = f"Failed to parse LLM response for domain '{domain_name}': {exc}"
            errors.append(msg)
            if progress_callback:
                progress_callback(msg)
            continue

        # Merge results into existing_by_id, skipping human-reviewed entries
        seeded_in_domain = 0
        for item in classifications:
            item_id = item.get("id", "").strip()
            item_name = item.get("name", "").strip()
            category = item.get("category", "unclassified").strip()

            if not item_id:
                continue

            existing = existing_by_id.get(item_id)
            if existing and existing.get("review_status") in _HUMAN_REVIEWED:
                # Preserve human decision
                continue

            existing_by_id[item_id] = {
                "id": item_id,
                "name": item_name,
                "category": category,
                "review_status": "unreviewed",
                "notes": existing.get("notes", "") if existing else "",
            }
            seeded_in_domain += 1

        total_seeded += seeded_in_domain
        domains_processed += 1

        if progress_callback:
            progress_callback(
                f"Domain '{domain_name}': classified {seeded_in_domain} processes"
            )

    # Persist updated classifications
    updated_rows = list(existing_by_id.values())
    new_body = f"## {SECTION}\n\n" + write_md_table(updated_rows, COLUMNS)
    write_md_file(FILENAME, {"version": 1}, new_body)

    return {
        "seeded": total_seeded,
        "domains": domains_processed,
        "errors": errors,
    }


def _parse_classifications_json(response: str) -> list[dict]:
    """Extract and parse the classifications JSON object from an LLM response."""
    start = response.find('{')
    end = response.rfind('}')
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in response")
    data = json.loads(response[start:end + 1])
    return data.get("classifications", [])
