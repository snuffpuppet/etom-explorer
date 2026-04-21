"""
Deterministic seed script for classifications.md and value-streams.md.

Derives classifications from domain (OSS/BSS mapping) and value stream
assignments from vertical group membership. No LLM required.

Usage:
    cd backend
    python3 scripts/seed_data.py [--excel PATH] [--data-dir PATH] [--force]

Options:
    --excel     Path to the GB921 Excel file (default: ../data/GB921_...)
    --data-dir  Path to the data directory (default: ../data)
    --force     Overwrite existing value-streams.md assignments
"""

import argparse
import os
import sys

# Ensure app package is importable from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.parser import parse_excel
from app.models import ProcessNode
from app.persistence import read_md_file, write_md_file, parse_md_table, write_md_table
from app.routers.value_streams import VALUE_STREAMS

# ---------------------------------------------------------------------------
# Mappings
# ---------------------------------------------------------------------------

DOMAIN_CATEGORY: dict[str, str] = {
    "Market":           "bss",
    "Product":          "bss",
    "Customer":         "bss",
    "Sales":            "bss",
    "Service":          "oss",
    "Resource":         "oss",
    "Business Partner": "oss_bss",
    "Enterprise":       "other",
}

VG_TO_STREAMS: dict[str, list[str]] = {
    "Fulfillment":                  ["vs-p2o", "vs-o2a", "vs-r2c", "vs-t2c"],
    "Assurance":                    ["vs-p2r", "vs-m2r"],
    "Billing":                      ["vs-u2c"],
    "Business Value Development":   ["vs-i2i", "vs-p2o"],
    "business Value Development":   ["vs-i2i", "vs-p2o"],  # normalise case variant in Excel
    "Capability Management":        ["vs-p2b", "vs-pr2o"],
    "Strategy Management":          ["vs-i2i", "vs-p2b"],
    "strategy Management":          ["vs-i2i", "vs-p2b"],  # normalise case variant
    "Operations Readiness & Support": ["vs-m2r", "vs-pr2o"],
    "operations Readiness & Support": ["vs-m2r", "vs-pr2o"],  # normalise case variant
}

_HUMAN_REVIEWED = {"classified", "descoped", "under_review"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _collect_l2(roots: list[ProcessNode]) -> list[ProcessNode]:
    """Return all L2 process nodes across all domain roots."""
    l2: list[ProcessNode] = []
    for root in roots:
        l2.extend(root.children)
    return l2


def _collect_all(roots: list[ProcessNode]) -> list[ProcessNode]:
    """Return every non-root process node (L2+), depth-first."""
    result: list[ProcessNode] = []

    def _walk(nodes: list[ProcessNode]) -> None:
        for n in nodes:
            result.append(n)
            _walk(n.children)

    for root in roots:
        _walk(root.children)
    return result


# ---------------------------------------------------------------------------
# Seed classifications
# ---------------------------------------------------------------------------

def seed_classifications(roots: list[ProcessNode], data_dir: str) -> int:
    os.environ["DATA_DIR"] = data_dir

    _, body = read_md_file("classifications.md")
    existing_rows = parse_md_table(body, "Classifications")
    existing_by_id: dict[str, dict] = {r["id"]: r for r in existing_rows}

    all_nodes = _collect_all(roots)

    new_rows: list[dict] = []
    seeded = 0

    for node in all_nodes:
        existing = existing_by_id.get(node.id)
        if existing and existing.get("review_status") in _HUMAN_REVIEWED:
            new_rows.append(existing)
            continue

        category = DOMAIN_CATEGORY.get(node.domain or "", "other")
        new_rows.append({
            "id": node.id,
            "name": node.name,
            "category": category,
            "review_status": "unreviewed",
            "notes": "",
        })
        seeded += 1

    columns = ["id", "name", "category", "review_status", "notes"]
    body_out = "## Classifications\n\n" + write_md_table(new_rows, columns)
    write_md_file("classifications.md", {"version": 1}, body_out)
    return seeded


# ---------------------------------------------------------------------------
# Seed value streams
# ---------------------------------------------------------------------------

def seed_value_streams(roots: list[ProcessNode], data_dir: str, force: bool) -> int:
    os.environ["DATA_DIR"] = data_dir

    # Validate VG_TO_STREAMS stream IDs against the canonical list
    valid_ids = {vs["id"] for vs in VALUE_STREAMS}
    for vg, stream_ids in VG_TO_STREAMS.items():
        for sid in stream_ids:
            if sid not in valid_ids:
                raise ValueError(
                    f"Unknown stream ID '{sid}' in VG_TO_STREAMS['{vg}']. "
                    f"Valid IDs: {sorted(valid_ids)}"
                )

    _, body = read_md_file("value-streams.md")
    existing_rows = parse_md_table(body, "Assignments")
    if existing_rows and not force:
        print(
            "  value-streams.md already has assignments — skipping "
            "(pass --force to overwrite)"
        )
        return 0

    l2_nodes = _collect_l2(roots)

    assignment_rows: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for node in l2_nodes:
        for vg in node.vertical_groups:
            stream_ids = VG_TO_STREAMS.get(vg, [])
            for sid in stream_ids:
                key = (sid, node.id)
                if key not in seen:
                    assignment_rows.append({"stream_id": sid, "process_id": node.id})
                    seen.add(key)

    columns = ["stream_id", "process_id"]
    body_out = "## Assignments\n\n" + write_md_table(assignment_rows, columns)
    write_md_file("value-streams.md", {"version": 1}, body_out)
    return len(assignment_rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    default_excel = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "..", "data", "GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx",
    )
    default_data_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "..", "data",
    )

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--excel", default=default_excel)
    parser.add_argument("--data-dir", default=default_data_dir)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    excel_path = os.path.realpath(args.excel)
    data_dir = os.path.realpath(args.data_dir)

    print(f"Excel: {excel_path}")
    print(f"Data dir: {data_dir}")

    print("\nParsing Excel...")
    roots = parse_excel(excel_path)
    print(f"  {sum(1 for r in roots for _ in [r])} domain roots, "
          f"{sum(len(r.children) for r in roots)} L2 nodes")

    print("\nSeeding classifications.md...")
    n_cls = seed_classifications(roots, data_dir)
    print(f"  Wrote {n_cls} classification rows")

    print("\nSeeding value-streams.md...")
    n_vs = seed_value_streams(roots, data_dir, force=args.force)
    if n_vs:
        print(f"  Wrote {n_vs} value stream assignment rows")

    print("\nDone.")


if __name__ == "__main__":
    main()
