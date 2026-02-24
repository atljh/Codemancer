from typing import Optional, Any
from pydantic import BaseModel


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    timestamp: float
    type: Optional[str] = None
    actionCard: Optional[dict[str, Any]] = None
    actionLog: Optional[dict[str, Any]] = None
    images: Optional[list[dict[str, str]]] = None


class ConversationMeta(BaseModel):
    id: str
    title: str
    created_at: float
    updated_at: float
    message_count: int


class SaveMessagesRequest(BaseModel):
    messages: list[ChatMessageOut]


class RenameRequest(BaseModel):
    title: str
