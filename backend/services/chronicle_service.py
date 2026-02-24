import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from models.chronicle import ChronicleEvent, ChronicleSession

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
