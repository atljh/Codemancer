"""Supervisor API — action plan management and execution."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from services.agentic_supervisor import AgenticSupervisor

router = APIRouter(prefix="/api/supervisor", tags=["supervisor"])

# Injected from main.py
supervisor: AgenticSupervisor | None = None
file_service = None


@router.get("/plans")
async def list_plans(status: str | None = None, limit: int = 50):
    if not supervisor:
        raise HTTPException(status_code=503, detail="Supervisor not initialized")
    plans = supervisor.get_plans(status=status, limit=limit)
    return [p.model_dump() for p in plans]


@router.get("/plans/{plan_id}")
async def get_plan(plan_id: str):
    if not supervisor:
        raise HTTPException(status_code=503, detail="Supervisor not initialized")
    plan = supervisor.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan.model_dump()


@router.post("/plans/{plan_id}/dismiss")
async def dismiss_plan(plan_id: str):
    if not supervisor:
        raise HTTPException(status_code=503, detail="Supervisor not initialized")
    plan = supervisor.dismiss_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"ok": True, "status": plan.status.value}


@router.post("/plans/{plan_id}/execute")
async def execute_plan(plan_id: str):
    if not supervisor:
        raise HTTPException(status_code=503, detail="Supervisor not initialized")
    if not file_service:
        raise HTTPException(status_code=503, detail="File service not initialized")
    plan = supervisor.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    return StreamingResponse(
        supervisor.execute_plan(plan_id, file_service),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/proposals/count")
async def proposals_count():
    if not supervisor:
        return {"count": 0}
    return {"count": len(supervisor.proposals)}
