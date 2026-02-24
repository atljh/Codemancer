import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

import re

from models.chronicle import ChronicleEvent, ChronicleSession, RecallMatch, IntelLog

DB_PATH = Path(__file__).parent.parent / "chronicle.db"


class ChronicleService:
    def __init__(self):
        self._conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()
        self._current_session_id: str | None = None

    def _init_schema(self):
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                total_exp INTEGER DEFAULT 0,
                total_actions INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                action_type TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                files_affected TEXT DEFAULT '[]',
                exp_gained INTEGER DEFAULT 0,
                session_id TEXT REFERENCES sessions(id)
            );
            CREATE TABLE IF NOT EXISTS intel_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'text',
                raw_input TEXT NOT NULL DEFAULT '',
                intent TEXT NOT NULL DEFAULT '',
                subtasks TEXT DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'pending',
                exp_multiplier REAL DEFAULT 1.0,
                session_id TEXT REFERENCES sessions(id)
            );
        """)
        self._conn.commit()

    @property
    def current_session_id(self) -> str | None:
        return self._current_session_id

    def start_session(self) -> str:
        sid = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            "INSERT INTO sessions (id, started_at) VALUES (?, ?)",
            (sid, now),
        )
        self._conn.commit()
        self._current_session_id = sid
        return sid

    def end_session(self):
        if not self._current_session_id:
            return
        now = datetime.now(timezone.utc).isoformat()
        row = self._conn.execute(
            "SELECT COALESCE(SUM(exp_gained),0) as exp, COUNT(*) as cnt FROM events WHERE session_id=?",
            (self._current_session_id,),
        ).fetchone()
        self._conn.execute(
            "UPDATE sessions SET ended_at=?, total_exp=?, total_actions=? WHERE id=?",
            (now, row["exp"], row["cnt"], self._current_session_id),
        )
        self._conn.commit()
        self._current_session_id = None

    def log_event(
        self,
        action_type: str,
        description: str = "",
        files_affected: list[str] | None = None,
        exp_gained: int = 0,
    ):
        if not self._current_session_id:
            return
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            "INSERT INTO events (timestamp, action_type, description, files_affected, exp_gained, session_id) VALUES (?,?,?,?,?,?)",
            (
                now,
                action_type,
                description,
                json.dumps(files_affected or []),
                exp_gained,
                self._current_session_id,
            ),
        )
        self._conn.commit()

    def get_events(
        self, session_id: str | None = None, limit: int = 50, offset: int = 0
    ) -> list[ChronicleEvent]:
        if session_id:
            rows = self._conn.execute(
                "SELECT * FROM events WHERE session_id=? ORDER BY id DESC LIMIT ? OFFSET ?",
                (session_id, limit, offset),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM events ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
        result = []
        for r in rows:
            try:
                files = json.loads(r["files_affected"])
            except (json.JSONDecodeError, TypeError):
                files = []
            result.append(ChronicleEvent(
                id=r["id"],
                timestamp=r["timestamp"],
                action_type=r["action_type"],
                description=r["description"],
                files_affected=files,
                exp_gained=r["exp_gained"],
                session_id=r["session_id"],
            ))
        return result

    def get_sessions(self, limit: int = 20) -> list[ChronicleSession]:
        rows = self._conn.execute(
            "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [
            ChronicleSession(
                id=r["id"],
                started_at=r["started_at"],
                ended_at=r["ended_at"],
                total_exp=r["total_exp"] or 0,
                total_actions=r["total_actions"] or 0,
            )
            for r in rows
        ]

    def recall(self, message: str) -> list[RecallMatch]:
        """Search past sessions for events related to files/modules mentioned in the message."""
        keywords = self._extract_keywords(message)
        if not keywords:
            return []

        # Build SQL WHERE clauses for keyword matching
        conditions = []
        params: list[str] = []
        for kw in keywords:
            like = f"%{kw}%"
            conditions.append("(e.files_affected LIKE ? OR e.description LIKE ?)")
            params.extend([like, like])

        where = " OR ".join(conditions)

        rows = self._conn.execute(
            f"""
            SELECT e.session_id, e.files_affected, e.description, e.action_type,
                   s.started_at
            FROM events e
            JOIN sessions s ON s.id = e.session_id
            WHERE e.session_id != ? AND ({where})
            ORDER BY e.id DESC
            LIMIT 200
            """,
            [self._current_session_id or "", *params],
        ).fetchall()

        if not rows:
            return []

        # Group by session
        sessions: dict[str, dict] = {}
        for r in rows:
            sid = r["session_id"]
            if sid not in sessions:
                sessions[sid] = {
                    "session_id": sid,
                    "session_date": r["started_at"][:10] if r["started_at"] else "",
                    "files": set(),
                    "actions": [],
                    "total_events": 0,
                }
            entry = sessions[sid]
            entry["total_events"] += 1
            try:
                files = json.loads(r["files_affected"])
                for f in files:
                    entry["files"].add(f)
            except (json.JSONDecodeError, TypeError):
                pass
            desc = r["description"] or ""
            action = r["action_type"] or ""
            if desc and len(entry["actions"]) < 5:
                entry["actions"].append(f"{action}: {desc[:80]}")

        # Sort by most recent, limit to top 3 sessions
        sorted_sessions = sorted(sessions.values(), key=lambda s: s["session_date"], reverse=True)[:3]

        return [
            RecallMatch(
                session_id=s["session_id"],
                session_date=s["session_date"],
                files=sorted(s["files"])[:10],
                actions=s["actions"],
                total_events=s["total_events"],
            )
            for s in sorted_sessions
        ]

    @staticmethod
    def _extract_keywords(message: str) -> list[str]:
        """Extract file paths and module names from a user message."""
        keywords: list[str] = []

        # File paths: anything like path/to/file.ext or file.ext
        paths = re.findall(r'[\w./\\-]+\.(?:py|ts|tsx|js|jsx|rs|toml|json|css|html)', message)
        for p in paths:
            # Use the basename and parent for matching
            name = p.split("/")[-1]
            keywords.append(name)
            if "/" in p:
                # Also match the relative path
                keywords.append(p)

        # Module-style names: CamelCase or snake_case identifiers that look like code
        identifiers = re.findall(r'\b([A-Z][a-zA-Z]{4,}|[a-z][a-z_]{4,}_[a-z]+)\b', message)
        for ident in identifiers:
            keywords.append(ident)

        # Common code terms: class, function, component names explicitly mentioned
        code_refs = re.findall(r'(?:class|function|component|module|service|hook|store)\s+(\w+)', message, re.IGNORECASE)
        keywords.extend(code_refs)

        # Deduplicate and return
        seen: set[str] = set()
        result: list[str] = []
        for kw in keywords:
            low = kw.lower()
            if low not in seen and len(low) >= 3:
                seen.add(low)
                result.append(kw)
        return result[:10]

    # ── Intel Logs ───────────────────────────────────────

    def add_intel(
        self,
        source: str,
        raw_input: str,
        intent: str = "",
        subtasks: list[str] | None = None,
        exp_multiplier: float = 1.0,
    ) -> IntelLog:
        now = datetime.now(timezone.utc).isoformat()
        sid = self._current_session_id or ""
        cursor = self._conn.execute(
            "INSERT INTO intel_logs (timestamp, source, raw_input, intent, subtasks, status, exp_multiplier, session_id) VALUES (?,?,?,?,?,?,?,?)",
            (now, source, raw_input, intent, json.dumps(subtasks or []), "pending", exp_multiplier, sid),
        )
        self._conn.commit()
        return IntelLog(
            id=cursor.lastrowid or 0,
            timestamp=now,
            source=source,
            raw_input=raw_input,
            intent=intent,
            subtasks=subtasks or [],
            status="pending",
            exp_multiplier=exp_multiplier,
            session_id=sid,
        )

    def get_intel_logs(self, status: str | None = None, limit: int = 50) -> list[IntelLog]:
        if status:
            rows = self._conn.execute(
                "SELECT * FROM intel_logs WHERE status=? ORDER BY id DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM intel_logs ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
        result = []
        for r in rows:
            try:
                subtasks = json.loads(r["subtasks"])
            except (json.JSONDecodeError, TypeError):
                subtasks = []
            result.append(IntelLog(
                id=r["id"],
                timestamp=r["timestamp"],
                source=r["source"],
                raw_input=r["raw_input"],
                intent=r["intent"],
                subtasks=subtasks,
                status=r["status"],
                exp_multiplier=r["exp_multiplier"] or 1.0,
                session_id=r["session_id"],
            ))
        return result

    def update_intel_status(self, intel_id: int, status: str) -> bool:
        cursor = self._conn.execute(
            "UPDATE intel_logs SET status=? WHERE id=?", (status, intel_id)
        )
        self._conn.commit()
        return cursor.rowcount > 0

    def get_session_summary(self, session_id: str) -> dict:
        session = self._conn.execute(
            "SELECT * FROM sessions WHERE id=?", (session_id,)
        ).fetchone()
        if not session:
            return {}
        events = self.get_events(session_id=session_id, limit=500)
        action_counts: dict[str, int] = {}
        total_exp = 0
        all_files: set[str] = set()
        for e in events:
            action_counts[e.action_type] = action_counts.get(e.action_type, 0) + 1
            total_exp += e.exp_gained
            all_files.update(e.files_affected)
        return {
            "session_id": session_id,
            "started_at": session["started_at"],
            "ended_at": session["ended_at"],
            "total_exp": total_exp,
            "total_actions": len(events),
            "action_counts": action_counts,
            "files_touched": list(all_files)[:50],
            "events": [e.model_dump() for e in events[:100]],
        }
