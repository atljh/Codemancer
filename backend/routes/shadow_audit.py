from fastapi import APIRouter
from pydantic import BaseModel

from models.shadow_audit import VerificationResult

router = APIRouter(prefix="/api/shadow-audit", tags=["shadow-audit"])

# Injected from main.py
shadow_auditor = None


@router.get("/pending")
async def get_pending() -> dict[str, VerificationResult]:
    if not shadow_auditor:
        return {}
    return shadow_auditor.get_pending()


class ReverifyRequest(BaseModel):
    file_path: str


@router.post("/reverify")
async def reverify(req: ReverifyRequest):
    if not shadow_auditor:
        return {"ok": False, "error": "Shadow auditor not initialized"}
    # Re-read file and reverify
    from pathlib import Path
    from routes.settings import load_settings

    fp = Path(req.file_path)
    if not fp.exists():
        return {"ok": False, "error": "File not found"}

    settings = load_settings()
    if not settings.get("shadow_auto_tests_enabled", False):
        return {"ok": False, "error": "Auto-tests disabled"}

    content = fp.read_text(errors="replace")
    shadow_auditor.cancel_file(req.file_path)

    import asyncio
    asyncio.create_task(
        shadow_auditor.verify_file(req.file_path, content, settings, None)
    )
    return {"ok": True}
