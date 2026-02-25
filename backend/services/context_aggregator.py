"""ContextAggregator — SQLite cache, dedup, file linking, AI triage for unified signals."""
import json
import logging
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from models.signal_refinery import UnifiedSignal, UnifiedSignalSource
from models.mission import Signal, SignalSource

logger = logging.getLogger("context_aggregator")

DB_PATH = Path(__file__).parent.parent / "signal_cache.db"

_SOURCE_MAP: dict[str, SignalSource] = {
    "GITHUB": SignalSource.GITHUB,
    "JIRA": SignalSource.JIRA,
    "SLACK": SignalSource.SLACK,
    "TELEGRAM": SignalSource.TELEGRAM,
    "CODE_TODO": SignalSource.CODE_TODO,
    "LSP_ERRORS": SignalSource.LSP_ERRORS,
}

_INIT_SQL = """
CREATE TABLE IF NOT EXISTS unified_signals (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    external_id TEXT DEFAULT '',
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    url TEXT,
    file_path TEXT,
    line_number INTEGER,
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'new',
    reason TEXT,
    provider_metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    operation_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_signals_source ON unified_signals(source);
CREATE INDEX IF NOT EXISTS idx_signals_status ON unified_signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_priority ON unified_signals(priority);
CREATE INDEX IF NOT EXISTS idx_signals_created ON unified_signals(created_at);

CREATE TABLE IF NOT EXISTS poll_state (
    provider TEXT PRIMARY KEY,
    last_poll_at TEXT,
    last_cursor TEXT,
    error_count INTEGER DEFAULT 0,
    last_error TEXT
);
"""


class ContextAggregator:
    def __init__(self, db_path: Path | None = None):
        self._db_path = db_path or DB_PATH
        self._init_db()

    def _init_db(self):
        with self._conn() as conn:
            conn.executescript(_INIT_SQL)
            # Migration: add reason column if missing
            try:
                conn.execute("SELECT reason FROM unified_signals LIMIT 1")
            except sqlite3.OperationalError:
                conn.execute("ALTER TABLE unified_signals ADD COLUMN reason TEXT")
                conn.commit()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self._db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def process(self, signals: list[UnifiedSignal]) -> list[UnifiedSignal]:
        """Dedup by (source, external_id), persist, return only new signals."""
        if not signals:
            return []

        new_signals: list[UnifiedSignal] = []

        with self._conn() as conn:
            for sig in signals:
                # Check for existing signal with same source + external_id
                if sig.external_id:
                    existing = conn.execute(
                        "SELECT id FROM unified_signals WHERE source = ? AND external_id = ?",
                        (sig.source.value, sig.external_id),
                    ).fetchone()
                    if existing:
                        # Update existing signal
                        conn.execute(
                            """UPDATE unified_signals
                               SET title = ?, content = ?, priority = ?,
                                   updated_at = ?, fetched_at = ?,
                                   provider_metadata = ?
                               WHERE id = ?""",
                            (
                                sig.title, sig.content, sig.priority,
                                sig.updated_at, sig.fetched_at,
                                json.dumps(sig.provider_metadata),
                                existing["id"],
                            ),
                        )
                        continue

                # Insert new signal
                conn.execute(
                    """INSERT INTO unified_signals
                       (id, source, external_id, title, content, url,
                        file_path, line_number, priority, status, reason,
                        provider_metadata, created_at, updated_at, fetched_at, operation_id)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        sig.id, sig.source.value, sig.external_id,
                        sig.title, sig.content, sig.url,
                        sig.file_path, sig.line_number,
                        sig.priority, sig.status, sig.reason,
                        json.dumps(sig.provider_metadata),
                        sig.created_at, sig.updated_at, sig.fetched_at,
                        sig.operation_id,
                    ),
                )
                new_signals.append(sig)

        return new_signals

    def to_mission_signals(self, unified: list[UnifiedSignal]) -> list[Signal]:
        """Convert UnifiedSignal list into existing Mission Signal model."""
        results: list[Signal] = []
        for u in unified:
            source = _SOURCE_MAP.get(u.source.value, SignalSource.CODE_TODO)
            results.append(Signal(
                id=u.id,
                source=source,
                content=u.title or u.content[:80],
                file_path=u.file_path,
                line_number=u.line_number,
                timestamp=u.created_at,
                priority=u.priority,
                url=u.url,
                reason=u.reason,
                metadata=u.provider_metadata,
            ))
        return results

    def get_signals(
        self,
        source: str | None = None,
        status: str | None = None,
        priority_max: int = 5,
        limit: int = 100,
        offset: int = 0,
    ) -> list[UnifiedSignal]:
        """Query signals with filters."""
        clauses = ["priority <= ?"]
        params: list = [priority_max]

        if source:
            clauses.append("source = ?")
            params.append(source.upper())
        if status:
            clauses.append("status = ?")
            params.append(status)

        where = " AND ".join(clauses)
        params.extend([limit, offset])

        with self._conn() as conn:
            rows = conn.execute(
                f"""SELECT * FROM unified_signals
                    WHERE {where}
                    ORDER BY priority ASC, created_at DESC
                    LIMIT ? OFFSET ?""",
                params,
            ).fetchall()

        return [_row_to_signal(r) for r in rows]

    def get_new_count(self) -> int:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT COUNT(*) as cnt FROM unified_signals WHERE status = 'new'"
            ).fetchone()
            return row["cnt"] if row else 0

    def get_total_count(self) -> int:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT COUNT(*) as cnt FROM unified_signals"
            ).fetchone()
            return row["cnt"] if row else 0

    def dismiss_signal(self, signal_id: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self._conn() as conn:
            result = conn.execute(
                "UPDATE unified_signals SET status = 'dismissed', updated_at = ? WHERE id = ?",
                (now, signal_id),
            )
            return result.rowcount > 0

    def link_signal_to_file(
        self, signal_id: str, file_path: str, line_number: int | None = None
    ) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self._conn() as conn:
            result = conn.execute(
                """UPDATE unified_signals
                   SET file_path = ?, line_number = ?, status = 'linked', updated_at = ?
                   WHERE id = ?""",
                (file_path, line_number, now, signal_id),
            )
            return result.rowcount > 0

    def update_poll_state(
        self,
        provider: str,
        last_poll_at: str,
        cursor: str | None = None,
        error: str | None = None,
        error_count: int = 0,
    ):
        with self._conn() as conn:
            conn.execute(
                """INSERT INTO poll_state (provider, last_poll_at, last_cursor, error_count, last_error)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(provider) DO UPDATE SET
                       last_poll_at = excluded.last_poll_at,
                       last_cursor = COALESCE(excluded.last_cursor, poll_state.last_cursor),
                       error_count = excluded.error_count,
                       last_error = excluded.last_error""",
                (provider, last_poll_at, cursor, error_count, error),
            )

    def get_poll_state(self, provider: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM poll_state WHERE provider = ?", (provider,)
            ).fetchone()
            return dict(row) if row else None

    def link_signals_to_files(
        self, signals: list[UnifiedSignal], workspace_root: str
    ) -> list[UnifiedSignal]:
        """Rule-based: search for file names mentioned in signal content."""
        if not workspace_root:
            return signals

        root = Path(workspace_root)
        if not root.exists():
            return signals

        # Build set of project file paths (relative)
        project_files: set[str] = set()
        for p in root.rglob("*"):
            if p.is_file() and not _is_skip_path(p):
                project_files.add(str(p.relative_to(root)))

        for sig in signals:
            if sig.file_path:
                continue
            text = f"{sig.title} {sig.content}"
            # Look for file references in content
            for fp in project_files:
                name = Path(fp).name
                if len(name) > 3 and re.search(re.escape(name), text, re.IGNORECASE):
                    sig.file_path = fp
                    break

        return signals


    # ------------------------------------------------------------------
    # AI Triage
    # ------------------------------------------------------------------

    def triage_signals_with_llm(
        self,
        signals: list[UnifiedSignal],
        settings: dict,
        workspace_root: str = "",
    ) -> list[UnifiedSignal]:
        """Use configured LLM to score signals (priority + reason + file linking).

        The LLM returns priority on a 1-5 scale where 5=critical.
        We invert to the internal scale (1=critical) before storing.
        """
        if not signals:
            return signals

        from services.providers import get_provider

        _MODEL_KEY = {
            "anthropic": "claude_model",
            "openai": "openai_model",
            "gemini": "gemini_model",
            "custom": "custom_model",
        }

        provider_name = settings.get("ai_provider", "anthropic")
        model = settings.get(_MODEL_KEY.get(provider_name, "claude_model"), "")

        try:
            provider = get_provider(settings)
        except Exception as e:
            logger.warning(f"Cannot create LLM provider for triage: {e}")
            return signals

        # Build project file list (limited)
        project_files: list[str] = []
        if workspace_root:
            root = Path(workspace_root)
            if root.exists():
                for p in root.rglob("*"):
                    if p.is_file() and not _is_skip_path(p):
                        project_files.append(str(p.relative_to(root)))
                        if len(project_files) >= 200:
                            break

        # Prepare signals data for prompt
        signals_data = []
        for s in signals:
            signals_data.append({
                "id": s.id,
                "source": s.source.value,
                "title": s.title[:120],
                "content": s.content[:300],
                "file_path": s.file_path,
            })

        system_prompt = (
            "You are a signal triage AI for a software development project. "
            "Analyze incoming signals and assess their priority and relevance.\n"
            "Return ONLY valid JSON — no markdown, no explanation."
        )

        user_content = json.dumps({
            "project_files": project_files[:100],
            "signals": signals_data,
            "instructions": (
                "For each signal, return: id, priority (1-5 where 5=critical/urgent, "
                "4=high, 3=medium, 2=low, 1=noise), reason (1 concise sentence), "
                "and linked_file (relative path from project_files if signal relates "
                "to a specific file, otherwise null). "
                "Return a JSON array of objects."
            ),
        }, ensure_ascii=False)

        try:
            result = provider.chat(
                messages=[{"role": "user", "content": user_content}],
                system_prompt=system_prompt,
                model=model,
            )
        except Exception as e:
            logger.warning(f"LLM triage call failed: {e}")
            return signals

        # Parse LLM response
        content = result.get("content", "")
        # Strip markdown code fences if present
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)

        try:
            triage_results = json.loads(content)
        except json.JSONDecodeError:
            logger.warning(f"LLM triage returned invalid JSON: {content[:200]}")
            return signals

        if not isinstance(triage_results, list):
            return signals

        # Build lookup
        triage_map: dict[str, dict] = {}
        for item in triage_results:
            if isinstance(item, dict) and "id" in item:
                triage_map[item["id"]] = item

        now = datetime.now(timezone.utc).isoformat()
        updated: list[UnifiedSignal] = []

        with self._conn() as conn:
            for sig in signals:
                tri = triage_map.get(sig.id)
                if not tri:
                    updated.append(sig)
                    continue

                # Invert: LLM 5=critical → internal 1=critical
                ai_priority = int(tri.get("priority", 3))
                ai_priority = max(1, min(5, ai_priority))
                internal_priority = 6 - ai_priority

                reason = tri.get("reason", "")
                linked = tri.get("linked_file")

                sig.priority = internal_priority
                sig.reason = reason[:300] if reason else None
                sig.status = "triaged"

                if linked and not sig.file_path:
                    # Validate the linked file exists in project
                    if linked in project_files:
                        sig.file_path = linked

                conn.execute(
                    """UPDATE unified_signals
                       SET priority = ?, reason = ?, status = 'triaged',
                           file_path = COALESCE(?, file_path),
                           updated_at = ?
                       WHERE id = ?""",
                    (
                        sig.priority,
                        sig.reason,
                        sig.file_path,
                        now,
                        sig.id,
                    ),
                )
                updated.append(sig)

        logger.info(f"Triaged {len(triage_map)} signals via LLM")
        return updated


def _row_to_signal(row: sqlite3.Row) -> UnifiedSignal:
    d = dict(row)
    d["provider_metadata"] = json.loads(d.get("provider_metadata") or "{}")
    return UnifiedSignal(**d)


_SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", "target", ".idea", ".vscode",
}


def _is_skip_path(path: Path) -> bool:
    return any(part in _SKIP_DIRS for part in path.parts)
