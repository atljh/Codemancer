"""Telegram signal provider — push-based wrapper for frontend messages."""
import uuid
from datetime import datetime, timezone

from models.signal_refinery import UnifiedSignal, UnifiedSignalSource
from services.signals.base_provider import BaseSignalProvider


class TelegramProvider(BaseSignalProvider):
    name = "telegram"

    def is_configured(self) -> bool:
        # Telegram data comes via push from frontend, no polling config needed
        return True

    async def fetch_signals(self, since: str | None = None) -> list[UnifiedSignal]:
        # Push-based: data arrives via /ingest endpoint
        return []

    @staticmethod
    def normalize_messages(messages: list[dict]) -> list[UnifiedSignal]:
        """Convert raw Telegram messages into UnifiedSignal objects."""
        now = datetime.now(timezone.utc).isoformat()
        signals: list[UnifiedSignal] = []

        for msg in messages:
            text = msg.get("text", "")
            sender = msg.get("sender_name", msg.get("sender", ""))
            linked = msg.get("linked_files", [])

            signals.append(UnifiedSignal(
                id=f"tg-{msg.get('id', uuid.uuid4().hex[:8])}-{uuid.uuid4().hex[:6]}",
                source=UnifiedSignalSource.TELEGRAM,
                external_id=str(msg.get("id", "")),
                title=f"[{sender}] {text[:60]}" if sender else text[:60],
                content=text,
                file_path=linked[0] if linked else None,
                priority=3,
                provider_metadata={
                    "sender": sender,
                    "date": msg.get("date"),
                    "linked_files": linked,
                },
                created_at=now,
                updated_at=now,
                fetched_at=now,
            ))

        return signals
