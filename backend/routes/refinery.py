"""Signal Refinery API routes — query, ingest, dismiss, link external signals."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.signal_refinery import UnifiedSignal, RefineryStatus, RefineryProviderStatus
from models.mission import Operation
from services.context_aggregator import ContextAggregator
from services.signal_poller import SignalPoller, PROVIDER_MAP
from services.signals.telegram_provider import TelegramProvider
from services.mission_synthesizer import synthesize_operations

router = APIRouter(prefix="/api/signals/refinery", tags=["refinery"])

# Injected from main.py lifespan
aggregator: ContextAggregator | None = None
poller: SignalPoller | None = None
chronicle_service = None
operations_store: dict[str, Operation] | None = None


class IngestRequest(BaseModel):
    source: str  # e.g. "TELEGRAM"
    messages: list[dict]


class DismissRequest(BaseModel):
    signal_id: str


class LinkRequest(BaseModel):
    signal_id: str
    file_path: str
    line_number: int | None = None


@router.get("/signals", response_model=list[UnifiedSignal])
async def get_signals(
    source: str | None = None,
    status: str | None = None,
    priority_max: int = 5,
    limit: int = 100,
    offset: int = 0,
):
    """Query cached signals with filters."""
    if not aggregator:
        return []
    return aggregator.get_signals(
        source=source, status=status,
        priority_max=priority_max, limit=limit, offset=offset,
    )


@router.get("/status", response_model=RefineryStatus)
async def get_status():
    """Get refinery status: providers, counts, polling state."""
    if not aggregator:
        return RefineryStatus()

    from routes.settings import load_settings
    settings = load_settings()

    providers: dict[str, RefineryProviderStatus] = {}
    for name, cls in PROVIDER_MAP.items():
        provider = cls(settings)
        poll_state = aggregator.get_poll_state(name)
        providers[name] = RefineryProviderStatus(
            name=name,
            configured=provider.is_configured(),
            enabled=provider.is_enabled(),
            last_poll=poll_state.get("last_poll_at") if poll_state else None,
            error_count=poll_state.get("error_count", 0) if poll_state else 0,
            last_error=poll_state.get("last_error") if poll_state else None,
        )

    return RefineryStatus(
        providers=providers,
        total_signals=aggregator.get_total_count(),
        new_signals=aggregator.get_new_count(),
        polling_active=poller.active if poller else False,
    )


@router.post("/ingest", response_model=list[UnifiedSignal])
async def ingest_signals(req: IngestRequest):
    """Push-based ingestion (e.g. Telegram messages from frontend)."""
    if not aggregator:
        raise HTTPException(status_code=503, detail="Aggregator not initialized")

    source = req.source.upper()
    if source == "TELEGRAM":
        signals = TelegramProvider.normalize_messages(req.messages)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown source: {req.source}")

    from routes.settings import load_settings
    settings = load_settings()
    workspace = settings.get("workspace_root", "")
    aggregator.link_signals_to_files(signals, workspace)

    new_signals = aggregator.process(signals)

    # Synthesize into operations
    if new_signals and operations_store is not None:
        mission_signals = aggregator.to_mission_signals(new_signals)
        existing = list(operations_store.values())
        new_ops = synthesize_operations(mission_signals, existing)
        for op in new_ops:
            operations_store[op.id] = op

    if new_signals and chronicle_service:
        chronicle_service.log_event(
            "signal_ingest",
            f"Ingested {len(new_signals)} signals from {source}",
            [s.file_path for s in new_signals if s.file_path][:10],
        )

    return new_signals


@router.post("/dismiss")
async def dismiss_signal(req: DismissRequest):
    """Dismiss a signal."""
    if not aggregator:
        raise HTTPException(status_code=503, detail="Aggregator not initialized")
    ok = aggregator.dismiss_signal(req.signal_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Signal not found")
    return {"ok": True}


@router.post("/link")
async def link_signal(req: LinkRequest):
    """Link a signal to a file path."""
    if not aggregator:
        raise HTTPException(status_code=503, detail="Aggregator not initialized")
    ok = aggregator.link_signal_to_file(req.signal_id, req.file_path, req.line_number)
    if not ok:
        raise HTTPException(status_code=404, detail="Signal not found")
    return {"ok": True}


@router.post("/poll-now")
async def poll_now():
    """Manually trigger a polling cycle."""
    if not poller:
        raise HTTPException(status_code=503, detail="Poller not initialized")
    count = await poller.poll_now()
    return {"ok": True, "new_signals": count}


class TriageRequest(BaseModel):
    signal_ids: list[str] | None = None  # None = triage all new signals


@router.post("/triage")
async def triage_signals(req: TriageRequest | None = None):
    """Run AI triage on new/specified signals."""
    if not aggregator:
        raise HTTPException(status_code=503, detail="Aggregator not initialized")

    from routes.settings import load_settings
    settings = load_settings()

    if not settings.get("signal_ai_triage_enabled", False):
        raise HTTPException(status_code=400, detail="AI triage is not enabled in settings")

    # Get signals to triage
    if req and req.signal_ids:
        signals = [
            s for s in aggregator.get_signals(status="new", limit=500)
            if s.id in set(req.signal_ids)
        ]
    else:
        signals = aggregator.get_signals(status="new", limit=50)

    if not signals:
        return {"ok": True, "triaged": 0}

    workspace = settings.get("workspace_root", "")
    triaged = aggregator.triage_signals_with_llm(signals, settings, workspace)

    # Re-synthesize operations with updated priorities
    if triaged and operations_store is not None:
        mission_signals = aggregator.to_mission_signals(triaged)
        existing = list(operations_store.values())
        new_ops = synthesize_operations(mission_signals, existing)
        for op in new_ops:
            operations_store[op.id] = op

    return {"ok": True, "triaged": len(triaged)}


@router.get("/providers")
async def list_providers():
    """List all providers and their configuration state."""
    from routes.settings import load_settings
    settings = load_settings()

    result = []
    for name, cls in PROVIDER_MAP.items():
        provider = cls(settings)
        poll_state = aggregator.get_poll_state(name) if aggregator else None
        result.append({
            "name": name,
            "configured": provider.is_configured(),
            "enabled": provider.is_enabled(),
            "poll_interval": provider.get_poll_interval(),
            "last_poll": poll_state.get("last_poll_at") if poll_state else None,
            "error_count": poll_state.get("error_count", 0) if poll_state else 0,
        })
    return result
