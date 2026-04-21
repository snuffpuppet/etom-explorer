from fastapi import APIRouter, Query, Request
from app.models import SearchResult, ProcessNode

router = APIRouter()


def _collect_ancestors(tree: list[ProcessNode], target_id: str) -> list[dict]:
    """Walk the tree to find target_id. Return ancestor chain as list of {id, name}."""
    def walk(nodes: list[ProcessNode], path: list[dict]) -> list[dict] | None:
        for node in nodes:
            current_path = path + [{"id": node.id, "name": node.name}]
            if node.id == target_id:
                return current_path
            result = walk(node.children, current_path)
            if result is not None:
                return result
        return None

    result = walk(tree, [])
    return result or []


def _search_tree(nodes: list[ProcessNode], q: str, tree: list[ProcessNode]) -> list[SearchResult]:
    results = []
    q_lower = q.lower()
    for node in nodes:
        name_match = q_lower in node.name.lower()
        desc_match = (node.brief_description and q_lower in node.brief_description.lower()) or \
                     (node.extended_description and q_lower in node.extended_description.lower())
        id_match = q_lower in node.id.lower()

        if name_match or desc_match or id_match:
            ancestors = _collect_ancestors(tree, node.id)
            # ancestors includes the node itself as last item
            breadcrumbs = [a["name"] for a in ancestors[:-1]]
            ancestor_ids = [a["id"] for a in ancestors[:-1]]
            results.append(SearchResult(
                id=node.id,
                name=node.name,
                level=node.level,
                brief_description=node.brief_description,
                breadcrumbs=breadcrumbs,
                ancestor_ids=ancestor_ids,
            ))

        results.extend(_search_tree(node.children, q, tree))
    return results


@router.get("/search", response_model=list[SearchResult])
async def search(request: Request, q: str = Query(..., min_length=2)):
    tree = request.app.state.process_tree
    return _search_tree(tree, q, tree)
