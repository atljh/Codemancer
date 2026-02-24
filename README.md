# Codemancer: The Strategic Command Deck for AI-Native Engineering

Codemancer is not just an IDE. It's a **tactical code reality management interface** built for the era where development is not writing lines, but commanding powerful AI agents.

Built with Tauri 2.0 + React 19 + Python FastAPI. Works as a visual companion for CLI tools like Claude Code, providing UI for what terminals can't: visualization, tracking, and interactive panels.

[README на русском](README.ru.md) | [README українською](README.uk.md)

![Codemancer Screenshot](docs/screenshot.png)

## Vision

Modern tools (VS Code, Cursor) are a legacy of the past. They force a human to work as a "text micromanager". Codemancer elevates you to the level of a **Strategist**.

While your AI agent operates files and terminal, you see the big picture:

- **Intelligence over text** — you interact with your project as a living organism
- **Dopamine over burnout** — every solved task is a captured sector and growth of your influence
- **Context over chaos** — visual dependency maps and tech debt radars replace thousands of open tabs

## Key Features

### The Tactical Map

Interactive dependency graph with "fog of war" effect. See the **Blast Radius** of your changes before they break the system. Orange highlights show affected modules when the AI writes files.

### Agentic Tools (The Hands)

The agent has full access to `list_files`, `read_file`, `write_file`, `search_text`, and `run_command`. It doesn't just advise — it executes. Failed commands deal HP damage; the agent proposes repair plans automatically.

### Health & Tech Debt Radar

Radar diagram of anomalies. Turn refactoring into clearing "red zones" of complexity and tech debt. Background health watch alerts you when critical anomalies are detected: `[CRITICAL_ANOMALY]: Instability detected in sector src/logic`.

### Session Chronicle

Automatic knowledge base of all your actions. Generate PR reports and standups in one click. **Cross-session memory** — the agent recalls previous work on the same code: `[RECALLING_DATA]: We previously worked on this module...`

### Proactive Assistant (Ambient Thinking)

Background pulse every 5 minutes analyzes `git diff` and error patterns. If something important is found, the agent initiates dialogue: `[PROACTIVE_LOG]: Background analysis complete. Redundancy detected. Operator, shall we stabilize?`

### Neural Voice Link

Voice input via microphone button in the command line. Web Speech API TTS voices AI responses. Procedural audio engine: scanning tones on tool use, glitch noise on errors, success chimes on completion.

### Deep Dive Mode

RPG focus timer with experience multiplier (x2 EXP). Working in flow restores your mental "Mana".

### Visual Presence Effects

Animated waveform in the header pulses when the AI is thinking. When HP drops below 20%, the entire UI gets a glitch distortion effect with a red vignette — your systems are failing, Operator.

### RPG Progression System

- **EXP & Levels** — earn experience for coding actions (messages, commits, bug fixes, file saves)
- **HP / MP** — HP drains from failed commands, MP spent on tool use
- **Focus Mode** — Pomodoro-style timer with x2 EXP multiplier
- **Level-up notifications** with visual effects

### AI Chat Assistant

- **Multi-provider support** — Anthropic Claude, OpenAI GPT, Google Gemini, Custom (Ollama, local LLMs)
- **Streaming responses** with tool use integration
- **Persistent conversations** — auto-saved, restorable across sessions
- **Project context injection** — AI understands your codebase
- **Tactical personality** — the agent addresses you as "Operator" and reports in analytical style with confidence percentages

### Built-in Code Editor

- **Monaco Editor** with 4 sci-fi themes
- **Tab-based multi-file editing**
- **Syntax validation** (Python, JavaScript, TypeScript)
- **Diff viewer** — side-by-side code comparison
- **File explorer** with tree navigation

### Visual Git Client

- **Git status panel** — staged, unstaged, untracked files with status icons
- **Stage/unstage** individual files
- **Inline commit** with message input
- **AI-generated commit messages**
- **Discard changes** per file

### Productivity Tools

- **Command Palette** (Cmd+K) — 20+ built-in commands
- **Quick Open** (Cmd+P) — fuzzy file search
- **Search in files** with result preview
- **Find & Replace** across the project
- **Quest system** — auto-scan TODOs/FIXMEs and turn them into quests

### Theming & Localization

- **4 themes**: Dark Ops (cyan), Midnight (blue), Phantom (amber), Arctic (light blue)
- **2 languages**: English, Russian
- **Sci-fi / tactical aesthetic** with glass morphism effects

## The Philosophy

- **AI-First**: The interface is abstracted from files. Code is an artifact, not the center of attention.
- **Visual Context**: If it can't be seen on the map, it doesn't exist.
- **Proactive Assistance**: Your agent speaks first when it senses danger in the sector.

## Architecture

```
src/                        # React 19 + TypeScript + Vite 7
  components/               # 40+ components across 15 feature areas
    bars/                   # EXP bar, stat bars
    chat/                   # OmniChat, bubbles (message, health, recall, blast, proactive)
    editor/                 # Monaco editor, file tabs
    explorer/               # File tree browser
    focus/                  # Focus timer
    git/                    # Git status panel
    health/                 # Code metrics, radar chart
    layout/                 # 3-panel layout, top stats bar
    map/                    # Tactical dependency map
    modals/                 # Command palette, settings, diff viewer, etc.
    chronicle/              # Session journal
    welcome/                # Initial setup screen
    ui/                     # Glass card, glow panel, waveform visualizer
  stores/gameStore.ts       # Zustand 5 — single global store
  hooks/                    # useApi, useAudio, useHealthWatch, useProactivePulse, etc.
  types/game.ts             # All TypeScript interfaces
  i18n/translations.ts      # EN/RU translations (250+ keys)
  themes/                   # CSS custom properties, 4 themes

backend/                    # Python 3.12+ FastAPI
  routes/                   # 13 API routers, 60+ endpoints
  models/                   # Pydantic models
  services/                 # Business logic
    providers/              # AI providers (Anthropic, OpenAI, Gemini, Custom)
  conversations/            # JSON files — persisted chat history
  state.json                # Player state

src-tauri/                  # Rust — Tauri 2.0 shell
  src/lib.rs                # App setup, Python process lifecycle, OAuth
```

## Prerequisites

- **Node.js** >= 18
- **pnpm** (recommended) or npm
- **Rust** (latest stable) — [install via rustup](https://rustup.rs/)
- **Python** >= 3.12
- **uv** — Python package manager — [install](https://docs.astral.sh/uv/getting-started/installation/)
- **Tauri 2 system dependencies** — [platform-specific guide](https://v2.tauri.app/start/prerequisites/)

### macOS

```bash
# Install Xcode Command Line Tools (if not already installed)
xcode-select --install

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install pnpm (if not installed)
npm install -g pnpm
```

### Linux (Debian/Ubuntu)

```bash
# System dependencies for Tauri
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install pnpm
npm install -g pnpm
```

### Windows

```powershell
# Install Rust via rustup (download from https://rustup.rs)
# Install Microsoft C++ Build Tools (via Visual Studio Installer)
# Install WebView2 (pre-installed on Windows 11)

# Install uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Install pnpm
npm install -g pnpm
```

## Installation

```bash
# Clone the repository
git clone https://github.com/fyodorlukashov/codemancer.git
cd codemancer

# Install frontend dependencies
pnpm install

# Install backend dependencies
cd backend && uv sync && cd ..
```

## Development

```bash
# Full desktop app (Vite + Rust + Python backend)
pnpm tauri dev

# Frontend only (Vite dev server on http://localhost:1420)
pnpm dev

# Backend only (FastAPI on http://127.0.0.1:8420)
cd backend && uv run python -m uvicorn main:app --host 127.0.0.1 --port 8420

# Type checking
pnpm exec tsc --noEmit
```

### How It Works

1. `pnpm tauri dev` starts the Tauri shell (Rust)
2. Tauri spawns the Python FastAPI backend as a child process on port **8420**
3. Vite dev server runs the React frontend on port **1420**
4. The frontend communicates with the backend via HTTP/SSE

## Building for Production

```bash
# Build the desktop app
pnpm tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

## Configuration

### AI Provider Setup

On first launch, open **Settings** (gear icon) and configure your AI provider:

| Provider      | What you need                                                |
| ------------- | ------------------------------------------------------------ |
| **Anthropic** | API key or OAuth (sign in with Anthropic account)            |
| **OpenAI**    | API key from platform.openai.com                             |
| **Gemini**    | API key from ai.google.dev                                   |
| **Custom**    | Any OpenAI-compatible endpoint URL (Ollama, LM Studio, etc.) |

### Workspace

Select your project directory via the folder icon in the top bar. Codemancer will scan it and build the file tree, dependency graph, and quest list.

## EXP System

| Action         | EXP           |
| -------------- | ------------- |
| Send message   | +10           |
| Save file      | +5            |
| Apply code     | +50           |
| Fix bug        | +100          |
| Git commit     | variable      |
| Tool execution | +15-25        |
| Focus mode     | x2 multiplier |

**Level formula**: `level = floor(sqrt(total_exp / 100))`

## Tech Stack

| Layer            | Technology                                           |
| ---------------- | ---------------------------------------------------- |
| Desktop Shell    | Tauri 2.0 (Rust)                                     |
| Frontend         | React 19, TypeScript, Vite 7                         |
| Styling          | Tailwind CSS 4.2, Framer Motion 12                   |
| State            | Zustand 5                                            |
| Editor           | Monaco Editor                                        |
| Audio            | Web Audio API (procedural), Web Speech API (TTS/STT) |
| Icons            | Lucide React                                         |
| Backend          | Python 3.12+, FastAPI, Uvicorn                       |
| AI SDKs          | anthropic, openai, google-genai                      |
| Package Managers | pnpm (frontend), uv (backend), cargo (Rust)          |

## What's Next

- **Visual Vision** — agent ability to "see" your running application's UI
- **Skill Trees** — level up as "Architect" or "Debugger", unlocking new agent tools
- **Multi-agent Orchestration** — coordinate multiple AI agents on complex tasks
- **GitHub/CI Integration** — PR reviews, pipeline monitoring from the command deck

## License

MIT
