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


class FileSearchRequest(BaseModel):
    query: str
    root: str
    max_results: int = 100


class FileSearchMatch(BaseModel):
    path: str
    line: int
    text: str


class FileSearchResponse(BaseModel):
    matches: list[FileSearchMatch]
    truncated: bool = False


class FileReplaceRequest(BaseModel):
    root: str
    search: str
    replace: str


class FileReplaceResult(BaseModel):
    files_modified: int
    replacements_made: int
