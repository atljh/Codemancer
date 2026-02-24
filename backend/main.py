import json
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.player import Player
from services.quest_service import QuestService
from services.chronicle_service import ChronicleService
from routes import game, quests, files, settings, chat, project, commands, conversations, git
from routes import chronicle as chronicle_route
from routes import health as health_route
from routes import dependency as dependency_route
from routes import proactive as proactive_route
from routes import telegram as telegram_route
from services.file_service import FileService

STATE_FILE = Path(__file__).parent / "state.json"

player = Player()
quest_service = QuestService()
chronicle_service = ChronicleService()

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
    chronicle_service.start_session()
    file_service = FileService()
    game.player = player
    game.quest_service = quest_service
    game.save_state_fn = save_state
    game.chronicle_service = chronicle_service
    quests.player = player
    quests.quest_service = quest_service
    files.file_service = file_service
    chat.player = player
    chat.quest_service = quest_service
    chat.file_service = file_service
    chat.save_state_fn = save_state
    chat.chronicle_service = chronicle_service
    project.file_service = file_service
    project.player = player
    project.save_state_fn = save_state
    git.player = player
    git.save_state_fn = save_state
    git.chronicle_service = chronicle_service
    chronicle_route.chronicle_service = chronicle_service
    telegram_route.quest_service = quest_service
    yield
    chronicle_service.end_session()
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
app.include_router(commands.router)
app.include_router(conversations.router)
app.include_router(git.router)
app.include_router(chronicle_route.router)
app.include_router(health_route.router)
app.include_router(dependency_route.router)
app.include_router(proactive_route.router)
app.include_router(telegram_route.router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8420, reload=True)
