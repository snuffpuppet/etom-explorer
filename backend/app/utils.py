from app.models import ProcessNode


def find_node(tree: list[ProcessNode], node_id: str) -> ProcessNode | None:
    for node in tree:
        if node.id == node_id:
            return node
        found = find_node(node.children, node_id)
        if found:
            return found
    return None
