from pathlib import Path

from fastapi import APIRouter, HTTPException

from models.dependency import DepGraphRequest, DepGraphResponse
from services.dependency_service import DependencyService
from routes.settings import load_settings

router = APIRouter(prefix="/api/deps", tags=["deps"])


@router.post("/graph", response_model=DepGraphResponse)
async def get_dependency_graph(req: DepGraphRequest):
    settings = load_settings()
    cwd = settings.get("workspace_root", "")
    if not cwd or not Path(cwd).is_dir():
        raise HTTPException(status_code=400, detail="No workspace configured")
    scope = req.scope
    if scope and (".." in scope or scope.startswith("/")):
        raise HTTPException(status_code=400, detail="Invalid scope")
    svc = DependencyService(cwd)
    return svc.build_graph(scope=scope)
