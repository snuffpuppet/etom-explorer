from pydantic import BaseModel
from typing import Optional, Literal

ScopeStatusType = Literal["tbd", "in_scope", "adjacent", "out_of_scope", "gap"]
ReviewStatusType = Literal["unreviewed", "under_review", "classified"]


class ProcessNode(BaseModel):
    id: str
    name: str
    level: int
    brief_description: Optional[str] = None
    extended_description: Optional[str] = None
    domain: Optional[str] = None
    vertical_groups: list[str] = []
    original_id: Optional[str] = None
    uid: Optional[str] = None
    parent_id: Optional[str] = None
    children: list["ProcessNode"] = []


ProcessNode.model_rebuild()


class Classification(BaseModel):
    id: str
    name: str
    scope_status: ScopeStatusType = "tbd"
    review_status: ReviewStatusType = "unreviewed"
    reason: str = ""
    notes: str = ""


class ClassificationUpdate(BaseModel):
    scope_status: ScopeStatusType
    review_status: ReviewStatusType
    reason: str = ""
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
    cascade: str = "false"


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
