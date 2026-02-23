from pydantic import BaseModel


class ChatMessageIn(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessageIn]
    project_context: str = ""


class ChatResponse(BaseModel):
    content: str
    model: str
    tokens_used: int = 0
