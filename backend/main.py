import json
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.player import Player
from services.quest_service import QuestService
from routes import game, quests, files, settings, chat, project
from services.file_service import FileService

STATE_FILE = Path(__file__).parent / "state.json"

player = Player()
quest_service = QuestService()

def load_state():
    global player
    if STATE_FILE.exists():
        try:
            data = json.loads(STATE_FILE.read_text())
            player = Player(**data.get("player", {}))
        except Exception:
            player = Player()

def save_state():
    STATE_FILE.write_text(json.dumps({
        "player": player.model_dump(),
    }, indent=2))

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_state()
    file_service = FileService()
    game.player = player
    game.quest_service = quest_service
    quests.player = player
    quests.quest_service = quest_service
    files.file_service = file_service
    chat.player = player
    chat.quest_service = quest_service
    project.file_service = file_service
    project.player = player
    project.save_state_fn = save_state
    yield
    save_state()

app = FastAPI(title="Codemancer Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(game.router)
app.include_router(quests.router)
app.include_router(files.router)
app.include_router(settings.router)
app.include_router(chat.router)
app.include_router(project.router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8420, reload=True)
