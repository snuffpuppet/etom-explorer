"""
Local verification test for the Excel parser.
Run from the backend/ directory or the worktree root.
"""
import sys
import os

# Ensure the app package is importable when running from worktree root
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.parser import parse_excel

EXCEL_PATH = "/Users/adam/projects/etom-explorer/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx"


def count_nodes(nodes):
    total = 0
    for node in nodes:
        total += 1
        total += count_nodes(node.children)
    return total


def main():
    print(f"Parsing: {EXCEL_PATH}")
    roots = parse_excel(EXCEL_PATH)

    # --- Assertion 1: exactly 3 L0 nodes ---
    assert len(roots) == 3, f"Expected 3 L0 nodes, got {len(roots)}: {[n.id for n in roots]}"
    print(f"✓ L0 nodes ({len(roots)}): {[n.name for n in roots]}")

    # --- Assertion 2: exactly 8 L1 nodes total ---
    l1_nodes = [child for root in roots for child in root.children]
    assert len(l1_nodes) == 8, (
        f"Expected 8 L1 nodes, got {len(l1_nodes)}: {[n.id for n in l1_nodes]}"
    )
    print(f"✓ L1 nodes ({len(l1_nodes)}): {[n.name for n in l1_nodes]}")

    # --- Assertion 3: total node count > 2800 ---
    # The Excel contains 3,167 rows but 274 are exact duplicates (same UID/name/domain).
    # After deduplication by Process identifier the unique count is 2,893 data nodes
    # plus 3 L0 + 8 L1 synthesised nodes = 2,904 total.
    total = count_nodes(roots)
    assert total > 2800, f"Expected >2800 total nodes, got {total}"
    print(f"✓ Total node count: {total} (2893 unique data nodes + 11 synthesised)")

    # --- Summary ---
    print("\n=== Summary ===")
    for l0 in roots:
        print(f"\nL0: {l0.name} ({l0.id})")
        for l1 in l0.children:
            l2_count = len(l1.children)
            print(f"  L1: {l1.name} ({l1.id}) — {l2_count} L2 children")

    print("\nAll assertions passed.")


if __name__ == "__main__":
    main()
