"""
Local verification test for the Excel parser.
Run from the backend/ directory or the worktree root.
"""
import sys
import os

# Ensure the app package is importable when running from worktree root
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.parser import parse_excel

EXCEL_PATH = "/Users/adam/projects/etom-explorer/docs/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx"


def count_nodes(nodes):
    total = 0
    for node in nodes:
        total += 1
        total += count_nodes(node.children)
    return total


EXPECTED_DOMAIN_ROOTS = [
    "D-Market", "D-Product", "D-Customer", "D-Service",
    "D-Resource", "D-BusinessPartner", "D-Enterprise", "D-Sales",
]


def main():
    print(f"Parsing: {EXCEL_PATH}")
    roots = parse_excel(EXCEL_PATH)

    # --- Assertion 1: exactly 8 domain root nodes ---
    root_ids = [n.id for n in roots]
    assert len(roots) == 8, f"Expected 8 domain roots, got {len(roots)}: {root_ids}"
    assert sorted(root_ids) == sorted(EXPECTED_DOMAIN_ROOTS), (
        f"Unexpected root IDs: {root_ids}"
    )
    print(f"✓ Domain root nodes ({len(roots)}): {[n.name for n in roots]}")

    # --- Assertion 2: total node count > 2800 ---
    # 2,893 unique data nodes + 8 synthesised domain roots = 2,901 total.
    total = count_nodes(roots)
    assert total > 2800, f"Expected >2800 total nodes, got {total}"
    print(f"✓ Total node count: {total}")

    # --- Assertion 3: multi-VG processes capture all vertical groups ---
    # Process 1.1.14 appears with both Fulfillment and Business Value Development.
    def find_node(nodes, target_id):
        for n in nodes:
            if n.id == target_id:
                return n
            result = find_node(n.children, target_id)
            if result:
                return result
        return None

    node_1114 = find_node(roots, "1.1.14")
    assert node_1114 is not None, "Could not find process 1.1.14"
    assert len(node_1114.vertical_groups) >= 2, (
        f"Expected >=2 vertical groups for 1.1.14, got {node_1114.vertical_groups}"
    )
    print(f"✓ Multi-VG process 1.1.14 has groups: {node_1114.vertical_groups}")

    # --- Summary ---
    print("\n=== Summary ===")
    for root in roots:
        l2_count = len(root.children)
        print(f"  {root.name} ({root.id}) — {l2_count} L2 children")

    print("\nAll assertions passed.")


if __name__ == "__main__":
    main()
