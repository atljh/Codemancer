"""Jira signal provider — fetches assigned issues via REST API v3."""
import uuid
from datetime import datetime, timezone

import httpx

from models.signal_refinery import UnifiedSignal, UnifiedSignalSource
from services.signals.base_provider import BaseSignalProvider

# Jira priority name → SignalPriority value
_JIRA_PRIORITY_MAP: dict[str, int] = {
    "highest": 1,
    "high": 2,
    "medium": 3,
    "low": 4,
    "lowest": 5,
}


class JiraProvider(BaseSignalProvider):
    name = "jira"

    def is_configured(self) -> bool:
        base = self._settings.get("jira_base_url", "").strip()
        email = self._settings.get("jira_email", "").strip()
        token = self._settings.get("jira_api_token", "").strip()
        return bool(base and email and token)

    def _auth(self) -> tuple[str, str]:
        """Return (email, api_token) for Basic Auth."""
        return (
            self._settings["jira_email"].strip(),
            self._settings["jira_api_token"].strip(),
        )

    def _base_url(self) -> str:
        url = self._settings["jira_base_url"].strip().rstrip("/")
        return url

    async def fetch_signals(self, since: str | None = None) -> list[UnifiedSignal]:
        base = self._base_url()
        auth = self._auth()
        signals: list[UnifiedSignal] = []
        now = datetime.now(timezone.utc).isoformat()

        # Build JQL — assigned to current user, recently updated
        jql = "assignee = currentUser() AND status != Done"
        if since:
            # Convert ISO timestamp to Jira relative format
            try:
                since_dt = datetime.fromisoformat(since)
                minutes_ago = int(
                    (datetime.now(timezone.utc) - since_dt).total_seconds() / 60
                )
                minutes_ago = max(minutes_ago, 1)
                jql += f' AND updated >= "-{minutes_ago}m"'
            except (ValueError, TypeError):
                pass

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.get(
                    f"{base}/rest/api/3/search",
                    params={
                        "jql": jql,
                        "maxResults": "30",
                        "fields": "summary,description,priority,status,issuetype,updated,created,labels,project",
                    },
                    auth=auth,
                    headers={"Accept": "application/json"},
                )

                if resp.status_code == 200:
                    data = resp.json()
                    for issue in data.get("issues", []):
                        fields = issue.get("fields", {})
                        key = issue.get("key", "")
                        summary = fields.get("summary", "")
                        description = _extract_description(fields.get("description"))

                        # Map Jira priority to signal priority
                        jira_priority = (
                            fields.get("priority", {}).get("name", "").lower()
                        )
                        priority = _JIRA_PRIORITY_MAP.get(jira_priority, 3)

                        status_name = fields.get("status", {}).get("name", "")
                        issue_type = fields.get("issuetype", {}).get("name", "")
                        project_key = fields.get("project", {}).get("key", "")
                        labels = fields.get("labels", [])

                        # Bugs get priority boost
                        if issue_type.lower() == "bug" and priority > 2:
                            priority = 2

                        signals.append(
                            UnifiedSignal(
                                id=f"jira-{key}-{uuid.uuid4().hex[:6]}",
                                source=UnifiedSignalSource.JIRA,
                                external_id=key,
                                title=f"[{key}] {summary}",
                                content=description[:500] if description else "",
                                url=f"{base}/browse/{key}",
                                priority=priority,
                                provider_metadata={
                                    "type": issue_type,
                                    "status": status_name,
                                    "project": project_key,
                                    "labels": labels,
                                    "jira_priority": jira_priority,
                                },
                                created_at=fields.get("created", now),
                                updated_at=fields.get("updated", now),
                                fetched_at=now,
                            )
                        )

            except httpx.HTTPError:
                pass

        return signals


def _extract_description(description) -> str:
    """Extract plain text from Jira's ADF (Atlassian Document Format) or string."""
    if description is None:
        return ""
    if isinstance(description, str):
        return description

    # ADF: walk content nodes to extract text
    texts: list[str] = []

    def walk(node):
        if isinstance(node, dict):
            if node.get("type") == "text":
                texts.append(node.get("text", ""))
            for child in node.get("content", []):
                walk(child)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(description)
    return " ".join(texts)
