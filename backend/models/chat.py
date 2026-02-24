from pydantic import BaseModel


class ImageData(BaseModel):
    media_type: str  # "image/png", "image/jpeg", "image/gif", "image/webp"
    data: str  # base64-encoded image data


class ChatMessageIn(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    images: list[ImageData] = []


class ChatRequest(BaseModel):
    messages: list[ChatMessageIn]
    project_context: str = ""


class ChatResponse(BaseModel):
    content: str
    model: str
    tokens_used: int = 0
