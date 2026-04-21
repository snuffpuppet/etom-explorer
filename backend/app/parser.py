import logging
import os
from openpyxl import load_workbook

from app.models import ProcessNode

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Synthesised domain (L1) root node definitions
# Ordered by the numeric second-segment of their L2 process identifiers.
# ---------------------------------------------------------------------------

# (id_suffix, display_name, normalised_domain_value_from_excel)
# The "Domain" column in the sheet uses "<Name> Domain" — normalise() strips that suffix.
DOMAIN_DEFINITIONS = [
    ("Market",          "Market",          "Market"),
    ("Product",         "Product",         "Product"),
    ("Customer",        "Customer",        "Customer"),
    ("Service",         "Service",         "Service"),
    ("Resource",        "Resource",        "Resource"),
    ("BusinessPartner", "Business Partner", "Business Partner"),
    ("Enterprise",      "Enterprise",       "Enterprise"),
    ("Sales",           "Sales",            "Sales"),
]

# Normalised domain name → synthetic root node id
DOMAIN_TO_ROOT_ID: dict[str, str] = {
    norm: f"D-{suffix}" for suffix, _name, norm in DOMAIN_DEFINITIONS
}


def _normalise_domain(raw: str | None) -> str | None:
    """Strip trailing ' Domain' suffix and whitespace."""
    if raw is None:
        return None
    s = raw.strip()
    if s.endswith(" Domain"):
        s = s[: -len(" Domain")]
    return s or None


def parse_excel(path: str) -> list[ProcessNode]:
    """Parse the GB921 Excel file and return a list of 8 domain root nodes with
    their L2-L7 children nested beneath them."""

    if not os.path.exists(path):
        raise FileNotFoundError(
            f"GB921 Excel file not found at: {path}\n"
            "Please ensure the file exists before running the parser."
        )

    wb = load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb["eTOM25,5"]

        # ------------------------------------------------------------------
        # 1. Read header row to find column indices by name
        # ------------------------------------------------------------------
        header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
        col_index: dict[str, int] = {
            str(cell).strip(): idx for idx, cell in enumerate(header_row) if cell is not None
        }

        def col(row: tuple, name: str):
            idx = col_index.get(name)
            if idx is None:
                return None
            v = row[idx]
            if isinstance(v, str):
                return v.strip() or None
            return v

        # ------------------------------------------------------------------
        # 2. Build the 8 synthesised domain root nodes (level 1)
        # ------------------------------------------------------------------
        domain_roots: dict[str, ProcessNode] = {}  # keyed by normalised domain name
        root_list: list[ProcessNode] = []

        for suffix, display_name, norm_domain in DOMAIN_DEFINITIONS:
            node_id = f"D-{suffix}"
            node = ProcessNode(
                id=node_id,
                name=display_name,
                level=1,
                domain=norm_domain,
            )
            domain_roots[norm_domain] = node
            root_list.append(node)

        # ------------------------------------------------------------------
        # 3. Read all L2-L7 rows into a flat dict keyed by process_identifier
        # ------------------------------------------------------------------
        data_nodes: dict[str, ProcessNode] = {}

        for row in ws.iter_rows(min_row=2, values_only=True):
            proc_id = col(row, "Process identifier")
            if proc_id is None:
                continue
            proc_id = str(proc_id).strip()
            if not proc_id:
                continue

            level_raw = col(row, "Level")
            try:
                level = int(level_raw)
            except (TypeError, ValueError):
                logger.warning("Skipping row with invalid level: %r", level_raw)
                continue

            domain_raw = col(row, "Domain")
            domain = _normalise_domain(domain_raw)

            uid_raw = col(row, "UID")
            if uid_raw is not None:
                try:
                    uid = str(int(uid_raw))
                except (TypeError, ValueError):
                    uid = str(uid_raw).strip()
            else:
                uid = None

            name_raw = col(row, "Process")
            name = str(name_raw).strip() if name_raw else proc_id

            orig_id_raw = col(row, "Original Process Identifier")
            orig_id = str(orig_id_raw).strip() if orig_id_raw is not None else None

            vg_raw = col(row, "Vertical Group")
            vg = str(vg_raw).strip() if vg_raw else None

            if proc_id in data_nodes:
                # Accumulate additional vertical groups for duplicate rows
                if vg and vg not in data_nodes[proc_id].vertical_groups:
                    data_nodes[proc_id].vertical_groups.append(vg)
                continue

            node = ProcessNode(
                id=proc_id,
                name=name,
                level=level,
                brief_description=col(row, "Brief description"),
                extended_description=col(row, "Extended Description"),
                domain=domain,
                vertical_groups=[vg] if vg else [],
                original_id=orig_id,
                uid=uid,
            )
            data_nodes[proc_id] = node

        # ------------------------------------------------------------------
        # 4. Assign parent_id
        # ------------------------------------------------------------------
        for proc_id, node in data_nodes.items():
            if node.level == 2:
                # Parent is the synthesised domain root node
                domain = node.domain
                if domain and domain in domain_roots:
                    node.parent_id = domain_roots[domain].id
                else:
                    logger.warning(
                        "L2 node %r has unknown domain %r; cannot assign domain root parent",
                        proc_id, domain,
                    )
            else:
                # Parent is derived by stripping the last dotted segment
                parts = proc_id.rsplit(".", 1)
                if len(parts) == 2:
                    parent_proc_id = parts[0]
                    if parent_proc_id in data_nodes:
                        node.parent_id = data_nodes[parent_proc_id].id
                    else:
                        # Fallback: attach to domain root
                        domain = node.domain
                        if domain and domain in domain_roots:
                            node.parent_id = domain_roots[domain].id
                            logger.warning(
                                "Parent %r not found for node %r; falling back to domain root %s",
                                parent_proc_id, proc_id, domain,
                            )
                        else:
                            logger.warning(
                                "Cannot find parent for node %r (expected parent %r); domain unknown",
                                proc_id, parent_proc_id,
                            )
                else:
                    logger.warning("Node %r has no dot-separable parent", proc_id)

        # ------------------------------------------------------------------
        # 5. Wire children into parent nodes
        # ------------------------------------------------------------------
        all_nodes: dict[str, ProcessNode] = {}
        for norm_domain, root in domain_roots.items():
            all_nodes[root.id] = root
        all_nodes.update(data_nodes)

        sorted_data = sorted(data_nodes.values(), key=lambda n: n.level)
        for node in sorted_data:
            if node.parent_id and node.parent_id in all_nodes:
                parent = all_nodes[node.parent_id]
                parent.children.append(node)
            else:
                logger.warning("Node %r has no resolvable parent %r", node.id, node.parent_id)

        return root_list
    finally:
        wb.close()
