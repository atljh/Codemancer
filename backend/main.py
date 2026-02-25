import json
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.player import AgentStatus
from services.quest_service import QuestService
from services.chronicle_service import ChronicleService
from routes import game, quests, files, settings, chat, project, commands, conversations, git
from routes import chronicle as chronicle_route
from routes import health as health_route
from routes import dependency as dependency_route
from routes import proactive as proactive_route
from routes import telegram as telegram_route
from routes import repair as repair_route
from routes import missions as missions_route
from routes import refinery as refinery_route
from routes import supervisor as supervisor_route
from services.file_service import FileService
from services.context_aggregator import ContextAggregator
from services.signal_poller import SignalPoller
from services.agentic_supervisor import AgenticSupervisor

STATE_FILE = Path(__file__).parent / "state.json"

agent = AgentStatus()
quest_service = QuestService()
chronicle_service = ChronicleService()

def load_state():
    global agent
    if STATE_FILE.exists():
        try:
            data = json.loads(STATE_FILE.read_text())
            # Migration: "player" -> "agent"
            if "agent" in data:
                agent = AgentStatus(**data["agent"])
            elif "player" in data:
                old = data["player"]
                agent = AgentStatus(
                    name=old.get("name", "Codemancer"),
                    total_bytes_processed=old.get("total_bytes_processed", 0),
                    focus_active=old.get("focus_active", False),
                    focus_started_at=old.get("focus_started_at"),
                    focus_duration_minutes=old.get("focus_duration_minutes", 0),
                    known_files=[],
                    integrity_score=100.0,
                )
            else:
                agent = AgentStatus()
        except Exception:
            agent = AgentStatus()

def save_state():
    STATE_FILE.write_text(json.dumps({
        "agent": agent.model_dump(),
    }, indent=2))

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_state()
    chronicle_service.start_session()
    file_service = FileService()
    game.agent = agent
    game.quest_service = quest_service
    game.save_state_fn = save_state
    game.chronicle_service = chronicle_service
    quests.quest_service = quest_service
    files.file_service = file_service
    chat.agent = agent
    chat.quest_service = quest_service
    chat.file_service = file_service
    chat.save_state_fn = save_state
    chat.chronicle_service = chronicle_service
    project.file_service = file_service
    project.save_state_fn = save_state
    git.agent = agent
    git.save_state_fn = save_state
    git.chronicle_service = chronicle_service
    chronicle_route.chronicle_service = chronicle_service
    telegram_route.quest_service = quest_service
    missions_route.save_state_fn = save_state
    missions_route.chronicle_service = chronicle_service

    # Signal Refinery
    aggregator = ContextAggregator()
    signal_poller = SignalPoller(
        aggregator=aggregator,
        operations_store=missions_route._operations,
    )
    refinery_route.aggregator = aggregator
    refinery_route.poller = signal_poller
    refinery_route.chronicle_service = chronicle_service
    refinery_route.operations_store = missions_route._operations
    signal_poller.start()

    # Agentic Supervisor
    agentic_supervisor = AgenticSupervisor()
    supervisor_route.supervisor = agentic_supervisor
    supervisor_route.file_service = file_service
    signal_poller.supervisor = agentic_supervisor
    refinery_route.agentic_supervisor = agentic_supervisor

    yield

    signal_poller.stop()
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
app.include_router(repair_route.router)
app.include_router(missions_route.router)
app.include_router(refinery_route.router)
app.include_router(supervisor_route.router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8420, reload=True)
