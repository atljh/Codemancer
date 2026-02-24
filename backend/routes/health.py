from pathlib import Path

from fastapi import APIRouter, HTTPException

from models.health import HealthScanResponse, HealthWatchResponse
from services.health_service import HealthService
from routes.settings import load_settings

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/scan", response_model=HealthScanResponse)
async def health_scan():
    settings = load_settings()
    cwd = settings.get("workspace_root", "")
    if not cwd or not Path(cwd).is_dir():
        raise HTTPException(status_code=400, detail="No workspace configured")
    svc = HealthService(cwd)
    return svc.scan()


@router.get("/watch", response_model=HealthWatchResponse)
async def health_watch():
    settings = load_settings()
    cwd = settings.get("workspace_root", "")
    if not cwd or not Path(cwd).is_dir():
        return HealthWatchResponse()
    svc = HealthService(cwd)
    return svc.watch()
