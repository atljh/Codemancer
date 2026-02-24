import json
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException

from models.conversation import (
    ChatMessageOut,
    ConversationMeta,
    SaveMessagesRequest,
    RenameRequest,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

CONVERSATIONS_DIR = Path(__file__).parent.parent / "conversations"
CONVERSATIONS_DIR.mkdir(exist_ok=True)


def _read_conversation(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_conversation(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _to_meta(data: dict) -> ConversationMeta:
    return ConversationMeta(
        id=data["id"],
        title=data.get("title", ""),
        created_at=data.get("created_at", 0),
        updated_at=data.get("updated_at", 0),
        message_count=len(data.get("messages", [])),
    )


@router.get("/", response_model=list[ConversationMeta])
async def list_conversations():
    result: list[ConversationMeta] = []
    for f in CONVERSATIONS_DIR.glob("*.json"):
        try:
            data = _read_conversation(f)
            result.append(_to_meta(data))
        except Exception:
            continue
    result.sort(key=lambda c: c.updated_at, reverse=True)
    return result


@router.post("/", response_model=ConversationMeta)
async def create_conversation():
    conv_id = str(uuid.uuid4())
    now = time.time()
    data = {
        "id": conv_id,
        "title": "",
        "created_at": now,
        "updated_at": now,
        "messages": [],
    }
    _write_conversation(CONVERSATIONS_DIR / f"{conv_id}.json", data)
    return _to_meta(data)


@router.get("/{conv_id}")
async def get_conversation(conv_id: str):
    path = CONVERSATIONS_DIR / f"{conv_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _read_conversation(path)


@router.put("/{conv_id}/messages", response_model=ConversationMeta)
async def save_messages(conv_id: str, req: SaveMessagesRequest):
    path = CONVERSATIONS_DIR / f"{conv_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Conversation not found")

    data = _read_conversation(path)

    # Filter out action_log messages (ephemeral)
    filtered = [m.model_dump() for m in req.messages if m.type != "action_log"]
    data["messages"] = filtered
    data["updated_at"] = time.time()

    # Auto-set title from first user message if empty
    if not data["title"]:
        for m in filtered:
            if m["role"] == "user" and m["content"].strip():
                data["title"] = m["content"].strip()[:60]
                break

    _write_conversation(path, data)
    return _to_meta(data)


@router.delete("/{conv_id}")
async def delete_conversation(conv_id: str):
    path = CONVERSATIONS_DIR / f"{conv_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Conversation not found")
    path.unlink()
    return {"ok": True}


@router.patch("/{conv_id}", response_model=ConversationMeta)
async def rename_conversation(conv_id: str, req: RenameRequest):
    path = CONVERSATIONS_DIR / f"{conv_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Conversation not found")

    data = _read_conversation(path)
    data["title"] = req.title
    data["updated_at"] = time.time()
    _write_conversation(path, data)
    return _to_meta(data)
