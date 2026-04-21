from pydantic import BaseModel
from typing import Optional, Literal

CategoryType = Literal["oss", "oss_bss", "bss", "other", "unclassified"]
ReviewStatusType = Literal["unreviewed", "under_review", "classified", "descoped"]


class ProcessNode(BaseModel):
    id: str                          # e.g. "D-Market", "D-BusinessPartner", "1.2.3.4"
    name: str
    level: int                       # 0=L0 domain group, 1=L1 domain, 2-7=data levels
    brief_description: Optional[str] = None
    extended_description: Optional[str] = None
    domain: Optional[str] = None     # e.g. "Customer", "Service" — populated for L2+ nodes
    vertical_groups: list[str] = []
    original_id: Optional[str] = None
    uid: Optional[str] = None
    parent_id: Optional[str] = None
    children: list["ProcessNode"] = []


ProcessNode.model_rebuild()


class Classification(BaseModel):
    id: str
    name: str
    category: CategoryType = "unclassified"
    review_status: ReviewStatusType = "unreviewed"
    notes: str = ""


class ClassificationUpdate(BaseModel):
    category: CategoryType
    review_status: ReviewStatusType
    notes: str = ""


class DescopedEntry(BaseModel):
    id: str
    name: str
    reason: str
    notes: str = ""


class DescopedUpdate(BaseModel):
    reason: str
    notes: str = ""


# Tags

class TagDef(BaseModel):
    id: str
    name: str
    colour: str = "#6366f1"
    description: str = ""


class TagDefCreate(BaseModel):
    name: str
    colour: str = "#6366f1"
    description: str = ""


class TagAssignment(BaseModel):
    node_id: str
    tag_id: str
    cascade: str = "false"  # stored as string in MD table


class TagAssignmentEntry(BaseModel):
    tag_id: str
    cascade: bool = False


class TagAssignmentUpdate(BaseModel):
    assignments: list[TagAssignmentEntry] = []


# Teams

class TeamAssignment(BaseModel):
    node_id: str
    team: str
    function: str = ""


class TeamEntry(BaseModel):
    team: str
    function: str = ""


class TeamAssignmentUpdate(BaseModel):
    assignments: list[TeamEntry] = []


# Search

class SearchResult(BaseModel):
    id: str
    name: str
    level: int
    brief_description: Optional[str] = None
    breadcrumbs: list[str] = []
    ancestor_ids: list[str] = []


# Notes

class NoteResponse(BaseModel):
    id: str
    content: str


class NoteUpdate(BaseModel):
    content: str


# Value Streams

ValueStreamCategoryType = Literal["customer", "operational"]


class ValueStream(BaseModel):
    id: str
    category: ValueStreamCategoryType
    name: str
    process_ids: list[str] = []


class ValueStreamUpdate(BaseModel):
    process_ids: list[str] = []


class ExportRequest(BaseModel):
    format: Literal["markdown", "html"] = "markdown"
