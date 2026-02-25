from pydantic import BaseModel


class GitFileEntry(BaseModel):
    path: str
    status: str          # "M", "A", "D", "R", "C", "U", "?"
    original_path: str | None = None  # for renames


class GitStatusResponse(BaseModel):
    branch: str
    remote_branch: str | None = None
    ahead: int = 0
    behind: int = 0
    staged: list[GitFileEntry] = []
    unstaged: list[GitFileEntry] = []
    untracked: list[GitFileEntry] = []


class GitBranchEntry(BaseModel):
    name: str
    current: bool = False


class GitBranchesResponse(BaseModel):
    branches: list[GitBranchEntry] = []


class GitPathsRequest(BaseModel):
    paths: list[str]


class GitCommitRequest(BaseModel):
    message: str


class GitCommitResponse(BaseModel):
    hash: str
    message: str
