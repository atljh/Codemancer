from fastapi import APIRouter, HTTPException
from models.quest import Quest, QuestCreate
from services.todo_parser import parse_todos_from_directory
from pydantic import BaseModel

router = APIRouter(prefix="/api/quests", tags=["quests"])

quest_service = None

class ScanRequest(BaseModel):
    directory: str

@router.get("/", response_model=list[Quest])
async def list_quests():
    return quest_service.list_all()

@router.get("/active", response_model=list[Quest])
async def list_active_quests():
    return quest_service.list_active()

@router.post("/", response_model=Quest)
async def create_quest(data: QuestCreate):
    return quest_service.create(data)

@router.post("/{quest_id}/complete")
async def complete_quest(quest_id: str):
    quest = quest_service.complete(quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found or already completed")
    return {"quest": quest}

@router.post("/scan", response_model=list[Quest])
async def scan_todos(req: ScanRequest):
    todos = parse_todos_from_directory(req.directory)
    created = []
    for todo in todos:
        if not quest_service.get(todo.id):
            quest_service.quests[todo.id] = todo
            created.append(todo)
    return created
