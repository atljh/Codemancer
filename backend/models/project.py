from pydantic import BaseModel


class ProjectScanRequest(BaseModel):
    path: str
    award_exp: bool = True


class ProjectScanResponse(BaseModel):
    path: str
    total_files: int
    total_dirs: int
    key_files: list[str]
    file_types: dict[str, int]
    exp_gained: int = 0


class ProjectContextResponse(ProjectScanResponse):
    summary: str
