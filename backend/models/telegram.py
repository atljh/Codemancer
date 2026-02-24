from pydantic import BaseModel


class TelegramAnalyzeRequest(BaseModel):
    message_text: str
    sender_name: str = ""
    project_context: str = ""
    project_files: list[str] = []


class TelegramAnalyzeResponse(BaseModel):
    has_references: bool = False
    linked_files: list[str] = []
    summary: str = ""
    quest_suggestion: str | None = None


class TelegramQuestRequest(BaseModel):
    message_text: str
    sender_name: str = ""
    linked_files: list[str] = []
    quest_title: str = ""
