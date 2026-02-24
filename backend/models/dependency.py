from pydantic import BaseModel


class DepNode(BaseModel):
    id: str
    path: str
    name: str
    type: str  # "python" | "typescript" | "javascript"
    lines: int
    extension: str


class DepEdge(BaseModel):
    source: str
    target: str


class DepGraphRequest(BaseModel):
    scope: str | None = None


class DepGraphResponse(BaseModel):
    nodes: list[DepNode] = []
    edges: list[DepEdge] = []
