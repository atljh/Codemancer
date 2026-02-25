"""SignalPoller — background asyncio loop that polls external signal providers."""
import asyncio
import logging
from datetime import datetime, timezone

from models.mission import Operation
from services.context_aggregator import ContextAggregator
from services.signals.github_provider import GitHubProvider
from services.signals.jira_provider import JiraProvider
from services.signals.slack_provider import SlackProvider
from services.signals.base_provider import BaseSignalProvider
from services.mission_synthesizer import synthesize_operations

logger = logging.getLogger("signal_poller")

PROVIDER_MAP: dict[str, type[BaseSignalProvider]] = {
    "github": GitHubProvider,
    "jira": JiraProvider,
    "slack": SlackProvider,
}

# Check interval between provider sweeps
CHECK_INTERVAL = 30


class SignalPoller:
    def __init__(
        self,
        aggregator: ContextAggregator,
        operations_store: dict[str, Operation],
        settings_loader=None,
    ):
        self._aggregator = aggregator
        self._operations = operations_store
        self._settings_loader = settings_loader
        self._task: asyncio.Task | None = None
        self._running = False

    @property
    def active(self) -> bool:
        return self._running and self._task is not None and not self._task.done()

    def start(self):
        if self._task and not self._task.done():
            return
        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("SignalPoller started")

    def stop(self):
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("SignalPoller stopped")

    async def poll_now(self) -> int:
        """Run a single poll cycle immediately. Returns number of new signals."""
        settings = self._load_settings()
        total_new = 0
        for name, cls in PROVIDER_MAP.items():
            provider = cls(settings)
            if not provider.is_configured() or not provider.is_enabled():
                continue
            count = await self._poll_provider(name, provider, settings)
            total_new += count
        return total_new

    async def _poll_loop(self):
        while self._running:
            try:
                settings = self._load_settings()
                for name, cls in PROVIDER_MAP.items():
                    if not self._running:
                        break
                    provider = cls(settings)
                    if not provider.is_configured() or not provider.is_enabled():
                        continue

                    # Check if enough time has passed since last poll
                    poll_state = self._aggregator.get_poll_state(name)
                    interval = provider.get_poll_interval()

                    if poll_state and poll_state.get("last_poll_at"):
                        try:
                            last = datetime.fromisoformat(poll_state["last_poll_at"])
                            elapsed = (datetime.now(timezone.utc) - last).total_seconds()
                        except (ValueError, TypeError):
                            elapsed = interval + 1

                        # Check backoff on errors
                        error_count = poll_state.get("error_count", 0)
                        if error_count > 0:
                            backoff = provider.get_rate_limit_delay(error_count)
                            if elapsed < backoff:
                                continue

                        if elapsed < interval:
                            continue

                    await self._poll_provider(name, provider, settings)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Poll loop error: {e}")

            await asyncio.sleep(CHECK_INTERVAL)

    async def _poll_provider(
        self, name: str, provider: BaseSignalProvider, settings: dict
    ) -> int:
        """Poll a single provider. Returns count of new signals."""
        now = datetime.now(timezone.utc).isoformat()
        poll_state = self._aggregator.get_poll_state(name)
        since = poll_state.get("last_poll_at") if poll_state else None

        try:
            raw_signals = await provider.fetch_signals(since=since)

            if raw_signals:
                workspace = settings.get("workspace_root", "")
                self._aggregator.link_signals_to_files(raw_signals, workspace)
                new_signals = self._aggregator.process(raw_signals)

                if new_signals:
                    # Auto-triage with LLM if enabled
                    if settings.get("signal_ai_triage_enabled", False):
                        try:
                            new_signals = self._aggregator.triage_signals_with_llm(
                                new_signals, settings, workspace,
                            )
                        except Exception as e:
                            logger.warning(f"Auto-triage failed: {e}")

                    # Convert to mission signals and synthesize operations
                    mission_signals = self._aggregator.to_mission_signals(new_signals)
                    existing = list(self._operations.values())
                    new_ops = synthesize_operations(mission_signals, existing)
                    for op in new_ops:
                        self._operations[op.id] = op

                self._aggregator.update_poll_state(name, now, error_count=0)
                return len(new_signals)
            else:
                self._aggregator.update_poll_state(name, now, error_count=0)
                return 0

        except Exception as e:
            error_count = (poll_state.get("error_count", 0) + 1) if poll_state else 1
            self._aggregator.update_poll_state(
                name, now, error=str(e), error_count=error_count
            )
            logger.warning(f"Provider {name} error (count={error_count}): {e}")
            return 0

    def _load_settings(self) -> dict:
        if self._settings_loader:
            return self._settings_loader()
        # Fallback: import inline to avoid circular deps
        from routes.settings import load_settings
        return load_settings()
