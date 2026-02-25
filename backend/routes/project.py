from fastapi import APIRouter, HTTPException

from models.project import ProjectScanRequest, ProjectScanResponse, ProjectContextResponse
from services.file_service import FileService

router = APIRouter(prefix="/api/project", tags=["project"])

file_service: FileService | None = None

save_state_fn = None  # injected from main.py


@router.post("/scan", response_model=ProjectScanResponse)
async def scan_project(req: ProjectScanRequest):
    if not file_service:
        raise HTTPException(status_code=500, detail="File service not initialized")

    try:
        result = file_service.scan_project(req.path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ProjectScanResponse(**result)


@router.post("/context", response_model=ProjectContextResponse)
async def get_project_context(req: ProjectScanRequest):
    if not file_service:
        raise HTTPException(status_code=500, detail="File service not initialized")

    try:
        result = file_service.scan_project(req.path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Build text summary for AI
    top_types = sorted(result["file_types"].items(), key=lambda x: -x[1])[:10]
    types_str = ", ".join(f"{ext}({count})" for ext, count in top_types)
    keys_str = ", ".join(result["key_files"][:15])

    summary = (
        f"Project: {result['path']}\n"
        f"Files: {result['total_files']}, Dirs: {result['total_dirs']}\n"
        f"Key files: {keys_str}\n"
        f"Top file types: {types_str}"
    )

    return ProjectContextResponse(**result, summary=summary)
