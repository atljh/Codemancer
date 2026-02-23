from pydantic import BaseModel


class FileReadRequest(BaseModel):
    path: str


class FileReadResponse(BaseModel):
    content: str
    language: str


class FileWriteRequest(BaseModel):
    path: str
    content: str


class FileWriteResponse(BaseModel):
    success: bool
    message: str = ""


class FileTreeRequest(BaseModel):
    root: str
    max_depth: int = 5


class FileTreeNode(BaseModel):
    name: str
    path: str
    is_dir: bool
    children: list["FileTreeNode"] = []


class SyntaxCheckRequest(BaseModel):
    path: str
    content: str


class SyntaxError_(BaseModel):
    line: int
    column: int
    message: str


class SyntaxCheckResponse(BaseModel):
    errors: list[SyntaxError_] = []
    valid: bool
