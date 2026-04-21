"""Chat API router — SSE streaming chat endpoint."""

import json
from typing import AsyncGenerator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.llm.client import stream_chat
from app.llm.prompts import build_chat_system_prompt
from app.models import ProcessNode
from app.persistence import read_md_file, parse_md_table

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    provider: str = "claude"
    model: str = "claude-sonnet-4-6"
    messages: list[ChatMessage]


def _build_tree_context(process_tree: list[ProcessNode]) -> str:
    """Walk the process tree and format compactly as indented 'id: name' lines.

    L1 nodes are not indented. Each level beyond L1 adds 2 spaces.
    Descriptions are omitted to keep context compact (tree has ~2900 nodes).
    """
    lines: list[str] = []

    def _walk(node: ProcessNode, depth: int) -> None:
        indent = "  " * depth
        lines.append(f"{indent}{node.id}: {node.name}")
        for child in node.children:
            _walk(child, depth + 1)

    for node in process_tree:
        if node.level == 0:
            # L0 group — include it then walk children at depth 0 (L1 = no indent)
            lines.append(f"{node.id}: {node.name}")
            for child in node.children:
                _walk(child, 1)
        else:
            _walk(node, 0)

    return "\n".join(lines)


def _build_state_context() -> str:
    """Build a compact state summary from classifications.md and tag_assignments.md.

    Targets ~2000 chars total.
    """
    parts: list[str] = []

    # --- Classifications ---
    _, clf_body = read_md_file("classifications.md")
    clf_rows = parse_md_table(clf_body, "Classifications")

    total = len(clf_rows)
    unreviewed_count = sum(1 for r in clf_rows if r.get("review_status") == "unreviewed")
    classified_count = total - unreviewed_count

    parts.append(f"Classifications: {classified_count} classified, {unreviewed_count} unreviewed")

    # List non-unclassified items (category != "unclassified"), capped to avoid blowing budget
    non_default = [
        r for r in clf_rows
        if r.get("category", "unclassified") != "unclassified"
    ]
    if non_default:
        clf_lines = [
            f"  {r['id']}: {r.get('category', '')} ({r.get('review_status', '')})"
            for r in non_default[:80]  # cap at 80 entries
        ]
        parts.append("\n".join(clf_lines))
        if len(non_default) > 80:
            parts.append(f"  ... and {len(non_default) - 80} more")

    # --- Tag assignments ---
    _, tag_body = read_md_file("tag_assignments.md")
    tag_rows = parse_md_table(tag_body, "Assignments")

    if tag_rows:
        # Group by node_id
        by_node: dict[str, list[str]] = {}
        for row in tag_rows:
            nid = row.get("node_id", "")
            tid = row.get("tag_id", "")
            if nid and tid:
                by_node.setdefault(nid, []).append(tid)

        tag_lines = [f"  {nid}: {', '.join(tags)}" for nid, tags in list(by_node.items())[:50]]
        parts.append("Tags:\n" + "\n".join(tag_lines))
        if len(by_node) > 50:
            parts.append(f"  ... and {len(by_node) - 50} more nodes with tags")

    context = "\n".join(parts)

    # Hard truncate to ~2000 chars if still over budget
    if len(context) > 2000:
        context = context[:1970] + "\n[...truncated]"

    return context


async def _sse_stream(
    provider: str,
    model: str,
    system: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    try:
        async for chunk in stream_chat(provider, model, system, messages):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
    except Exception as exc:
        yield f"data: {json.dumps({'error': str(exc)})}\n\n"


@router.post("/chat")
async def chat(body: ChatRequest, request: Request):
    tree_context = _build_tree_context(request.app.state.process_tree)
    state_context = _build_state_context()
    system = build_chat_system_prompt(tree_context, state_context)

    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    return StreamingResponse(
        _sse_stream(body.provider, body.model, system, messages),
        media_type="text/event-stream",
    )
