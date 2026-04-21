from pydantic import BaseModel
from typing import Optional, Literal

CategoryType = Literal["oss", "oss_bss", "bss", "other", "unclassified"]
ReviewStatusType = Literal["unreviewed", "under_review", "classified", "descoped"]


class ProcessNode(BaseModel):
    id: str                          # e.g. "L0-OPS", "L1-Customer", "1.2.3.4"
    name: str
    level: int                       # 0=L0 domain group, 1=L1 domain, 2-7=data levels
    brief_description: Optional[str] = None
    extended_description: Optional[str] = None
    domain: Optional[str] = None     # e.g. "Customer", "Service" — populated for L2+ nodes
    vertical_group: Optional[str] = None
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
