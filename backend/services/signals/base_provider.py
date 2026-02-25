"""Abstract base class for all signal providers."""
from abc import ABC, abstractmethod

from models.signal_refinery import UnifiedSignal


class BaseSignalProvider(ABC):
    name: str = ""

    def __init__(self, settings: dict):
        self._settings = settings

    @abstractmethod
    async def fetch_signals(self, since: str | None = None) -> list[UnifiedSignal]:
        """Fetch new signals from the external service."""
        ...

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the provider has the necessary credentials."""
        ...

    def is_enabled(self) -> bool:
        """Check if polling is enabled for this provider."""
        return bool(self._settings.get(f"signal_{self.name}_enabled", False))

    def get_poll_interval(self) -> int:
        """Polling interval in seconds (default 300 = 5 min)."""
        return int(self._settings.get(f"signal_{self.name}_poll_interval", 300))

    def get_rate_limit_delay(self, error_count: int) -> int:
        """Exponential backoff: 60s -> 120s -> 240s -> ... max 900s."""
        return min(60 * (2 ** error_count), 900)
