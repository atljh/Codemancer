"""Slack signal provider — fetches messages from monitored channels."""
import uuid
from datetime import datetime, timezone

import httpx

from models.signal_refinery import UnifiedSignal, UnifiedSignalSource
from services.signals.base_provider import BaseSignalProvider


class SlackProvider(BaseSignalProvider):
    name = "slack"

    def is_configured(self) -> bool:
        return bool(self._settings.get("slack_bot_token", "").strip())

    def _headers(self) -> dict:
        token = self._settings["slack_bot_token"].strip()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        }

    def _channels(self) -> list[str]:
        """Get list of channel IDs to monitor."""
        raw = self._settings.get("slack_channels", "").strip()
        if not raw:
            return []
        return [c.strip() for c in raw.split(",") if c.strip()]

    async def fetch_signals(self, since: str | None = None) -> list[UnifiedSignal]:
        channels = self._channels()
        if not channels:
            # If no channels specified, try to discover relevant ones
            channels = await self._discover_channels()
            if not channels:
                return []

        headers = self._headers()
        signals: list[UnifiedSignal] = []
        now = datetime.now(timezone.utc).isoformat()

        # Calculate oldest timestamp for filtering
        oldest = None
        if since:
            try:
                since_dt = datetime.fromisoformat(since)
                oldest = str(since_dt.timestamp())
            except (ValueError, TypeError):
                pass

        async with httpx.AsyncClient(timeout=30) as client:
            for channel_id in channels[:5]:  # max 5 channels per poll
                try:
                    params: dict[str, str] = {
                        "channel": channel_id,
                        "limit": "20",
                    }
                    if oldest:
                        params["oldest"] = oldest

                    resp = await client.get(
                        "https://slack.com/api/conversations.history",
                        params=params,
                        headers=headers,
                    )

                    if resp.status_code != 200:
                        continue

                    data = resp.json()
                    if not data.get("ok"):
                        continue

                    channel_name = await self._get_channel_name(
                        client, headers, channel_id
                    )

                    for msg in data.get("messages", []):
                        text = msg.get("text", "")
                        if not text or msg.get("subtype") == "bot_message":
                            continue

                        # Filter: only @mentions or file references
                        is_mention = "<@" in text
                        has_file_ref = _has_code_reference(text)
                        if not is_mention and not has_file_ref:
                            continue

                        user_id = msg.get("user", "")
                        ts = msg.get("ts", "")
                        msg_time = _ts_to_iso(ts) if ts else now

                        # Priority: direct mentions are higher
                        priority = 3 if is_mention else 4

                        signals.append(
                            UnifiedSignal(
                                id=f"slack-{channel_id}-{ts}-{uuid.uuid4().hex[:6]}",
                                source=UnifiedSignalSource.SLACK,
                                external_id=f"{channel_id}:{ts}",
                                title=f"#{channel_name}: {text[:60]}",
                                content=text,
                                url=f"https://slack.com/archives/{channel_id}/p{ts.replace('.', '')}",
                                priority=priority,
                                provider_metadata={
                                    "channel_id": channel_id,
                                    "channel_name": channel_name,
                                    "user_id": user_id,
                                    "ts": ts,
                                    "is_mention": is_mention,
                                    "has_file_ref": has_file_ref,
                                },
                                created_at=msg_time,
                                updated_at=msg_time,
                                fetched_at=now,
                            )
                        )

                except httpx.HTTPError:
                    continue

        return signals

    async def _discover_channels(self) -> list[str]:
        """Get channels the bot is a member of (first 5)."""
        headers = self._headers()
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://slack.com/api/conversations.list",
                    params={
                        "types": "public_channel,private_channel",
                        "exclude_archived": "true",
                        "limit": "5",
                    },
                    headers=headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("ok"):
                        return [
                            ch["id"]
                            for ch in data.get("channels", [])
                            if ch.get("is_member")
                        ][:5]
        except httpx.HTTPError:
            pass
        return []

    async def _get_channel_name(
        self, client: httpx.AsyncClient, headers: dict, channel_id: str
    ) -> str:
        """Resolve channel ID to name."""
        try:
            resp = await client.get(
                "https://slack.com/api/conversations.info",
                params={"channel": channel_id},
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok"):
                    return data.get("channel", {}).get("name", channel_id)
        except httpx.HTTPError:
            pass
        return channel_id


def _has_code_reference(text: str) -> bool:
    """Check if message references code files or paths."""
    indicators = [
        ".ts", ".tsx", ".py", ".js", ".jsx", ".rs", ".go",
        ".java", ".cpp", ".h", ".css", ".html",
        "/src/", "/backend/", "/api/", "/components/",
    ]
    text_lower = text.lower()
    return any(ind in text_lower for ind in indicators)


def _ts_to_iso(ts: str) -> str:
    """Convert Slack timestamp to ISO format."""
    try:
        epoch = float(ts)
        return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()
    except (ValueError, TypeError):
        return datetime.now(timezone.utc).isoformat()
