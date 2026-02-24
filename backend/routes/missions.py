"""
MissionControl API routes.
Manages operations lifecycle: scan → synthesize → track → complete.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.mission import (
    Operation, OperationCreate, OperationUpdate,
    OperationStatus, Signal, ScanResult,
)
from services.mission_scanner import (
    scan_code_todos, scan_lsp_errors, signals_from_telegram,
)
from services.mission_synthesizer import synthesize_operations

router = APIRouter(prefix="/api/missions", tags=["missions"])

# Injected from main.py
player = None
save_state_fn = None
chronicle_service = None

# In-memory store
_operations: dict[str, Operation] = {}
_signals: list[Signal] = []
_last_scan: str | None = None


class ScanRequest(BaseModel):
    directory: str
    telegram_messages: list[dict] = []
    lsp_errors: list[dict] = []


class TelegramSignalsRequest(BaseModel):
    messages: list[dict]


class LspErrorsRequest(BaseModel):
    errors: list[dict]


@router.get("/operations", response_model=list[Operation])
async def list_operations():
    """List all operations, sorted by creation time (newest first)."""
    ops = sorted(_operations.values(), key=lambda o: o.created_at, reverse=True)
    return ops


@router.get("/operations/active", response_model=list[Operation])
async def list_active_operations():
    """List non-completed operations."""
    ops = [
        o for o in _operations.values()
        if o.status != OperationStatus.COMPLETED
    ]
    return sorted(ops, key=lambda o: o.created_at, reverse=True)


@router.get("/operations/{op_id}", response_model=Operation)
async def get_operation(op_id: str):
    op = _operations.get(op_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    return op


@router.post("/operations", response_model=Operation)
async def create_operation(data: OperationCreate):
    """Manually create a new operation."""
    now = datetime.now(timezone.utc).isoformat()
    op = Operation(
        id=f"op-{uuid.uuid4().hex[:8]}",
        title=data.title,
        description=data.description,
        status=data.status,
        related_sectors=data.related_sectors,
        created_at=now,
        updated_at=now,
    )
    _operations[op.id] = op
    return op


@router.patch("/operations/{op_id}", response_model=Operation)
async def update_operation(op_id: str, data: OperationUpdate):
    """Update operation status or metadata."""
    op = _operations.get(op_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    now = datetime.now(timezone.utc).isoformat()
    if data.status is not None:
        op.status = data.status
    if data.title is not None:
        op.title = data.title
    if data.description is not None:
        op.description = data.description
    op.updated_at = now
    _operations[op.id] = op
    return op


@router.post("/operations/{op_id}/complete")
async def complete_operation(op_id: str):
    """Complete an operation and award EXP."""
    op = _operations.get(op_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    if op.status == OperationStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Operation already completed")

    op.status = OperationStatus.COMPLETED
    op.updated_at = datetime.now(timezone.utc).isoformat()
    _operations[op.id] = op

    # Award EXP
    if player:
        player.total_exp += op.exp_reward
        if save_state_fn:
            save_state_fn()
        if chronicle_service:
            chronicle_service.log_event(
                "mission_complete",
                f"Operation completed: {op.title}",
                op.related_sectors,
                op.exp_reward,
            )

    from routes.game import get_player_response
    return {
        "operation": op,
        "player": get_player_response(player) if player else None,
        "exp_gained": op.exp_reward,
    }


@router.delete("/operations/{op_id}")
async def delete_operation(op_id: str):
    if op_id not in _operations:
        raise HTTPException(status_code=404, detail="Operation not found")
    del _operations[op_id]
    return {"ok": True}


@router.post("/scan", response_model=ScanResult)
async def scan_signals(req: ScanRequest):
    """Full scan: collect signals from all sources and synthesize into operations."""
    global _last_scan

    all_signals: list[Signal] = []

    # 1. CODE_TODO signals
    todo_signals = scan_code_todos(req.directory)
    all_signals.extend(todo_signals)

    # 2. TELEGRAM signals
    if req.telegram_messages:
        tg_signals = signals_from_telegram(req.telegram_messages)
        all_signals.extend(tg_signals)

    # 3. LSP_ERRORS signals
    if req.lsp_errors:
        lsp_signals = scan_lsp_errors(req.lsp_errors)
        all_signals.extend(lsp_signals)

    # Store signals
    _signals.extend(all_signals)

    # Synthesize into operations
    existing = list(_operations.values())
    new_ops = synthesize_operations(all_signals, existing)

    for op in new_ops:
        _operations[op.id] = op

    _last_scan = datetime.now(timezone.utc).isoformat()

    if chronicle_service and new_ops:
        chronicle_service.log_event(
            "mission_scan",
            f"Scanned {len(all_signals)} signals → {len(new_ops)} new operations",
            [s.file_path for s in all_signals if s.file_path][:10],
            0,
        )

    return ScanResult(
        signals=all_signals,
        operations_created=len(new_ops),
        total_signals=len(all_signals),
    )


@router.post("/signals/telegram", response_model=list[Signal])
async def add_telegram_signals(req: TelegramSignalsRequest):
    """Add Telegram signals and synthesize."""
    signals = signals_from_telegram(req.messages)
    _signals.extend(signals)

    existing = list(_operations.values())
    new_ops = synthesize_operations(signals, existing)
    for op in new_ops:
        _operations[op.id] = op

    return signals


@router.post("/signals/lsp", response_model=list[Signal])
async def add_lsp_signals(req: LspErrorsRequest):
    """Add LSP error signals and synthesize."""
    signals = scan_lsp_errors(req.errors)
    _signals.extend(signals)

    existing = list(_operations.values())
    new_ops = synthesize_operations(signals, existing)
    for op in new_ops:
        _operations[op.id] = op

    return signals


@router.get("/signals", response_model=list[Signal])
async def list_signals(source: str | None = None, limit: int = 100):
    """List collected signals, optionally filtered by source."""
    result = _signals
    if source:
        result = [s for s in result if s.source.value == source.upper()]
    return result[-limit:]


@router.get("/status")
async def mission_status():
    """Get MissionControl overview status."""
    total = len(_operations)
    by_status = {}
    for status in OperationStatus:
        by_status[status.value] = sum(
            1 for o in _operations.values() if o.status == status
        )
    return {
        "total_operations": total,
        "by_status": by_status,
        "total_signals": len(_signals),
        "last_scan": _last_scan,
    }
