# Codemancer

**Gamified developer companion** — a desktop app that turns your coding workflow into an RPG adventure.

Built with Tauri 2.0 + React 19 + Python FastAPI. Works as a visual companion for CLI tools like Claude Code, providing UI for what terminals can't: visualization, tracking, and interactive panels.

[README на русском](README.ru.md) | [README українською](README.uk.md)

![Codemancer Screenshot](docs/screenshot.png)

## Features

### RPG Progression System
- **EXP & Levels** — earn experience for coding actions (messages, commits, bug fixes, file saves)
- **HP / MP** — HP drains after inactivity, MP regenerates during idle
- **Focus Mode** — Pomodoro-style timer with x2 EXP multiplier
- **Level-up notifications** with visual effects

### AI Chat Assistant
- **Multi-provider support** — Anthropic Claude, OpenAI GPT, Google Gemini, Custom (Ollama, local LLMs)
- **Streaming responses** with tool use integration
- **Persistent conversations** — auto-saved, restorable across sessions
- **Project context injection** — AI understands your codebase
- **OAuth authentication** with Anthropic

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

### Code Quality Analysis
- **Health panel** — complexity, test coverage, code cleanliness metrics
- **Large files & complex functions** detection
- **Tech debt indicators**
- **Anomaly detection**

### Dependency Visualization
- **Tactical Map** — interactive dependency graph
- **Module-to-module relationship** mapping
- **Fog of war** visual effect

### Session Tracking (Chronicle)
- **Timeline of all actions** — commits, edits, AI responses, quests
- **Session reports** in PR, standup, and Jira formats
- **Activity history** across sessions

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

## Architecture

```
src/                        # React 19 + TypeScript + Vite 7
  components/               # 30 components across 13 feature areas
    bars/                   # EXP bar, stat bars
    chat/                   # OmniChat, message bubbles, action cards
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
    ui/                     # Glass card, glow panel primitives
  stores/gameStore.ts       # Zustand 5 — single global store
  hooks/useApi.ts           # Singleton API client
  types/game.ts             # All TypeScript interfaces
  i18n/translations.ts      # EN/RU translations (200+ keys)
  themes/                   # CSS custom properties, 4 themes

backend/                    # Python 3.12+ FastAPI
  routes/                   # 12 API routers, 50+ endpoints
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

| Provider | What you need |
|----------|--------------|
| **Anthropic** | API key or OAuth (sign in with Anthropic account) |
| **OpenAI** | API key from platform.openai.com |
| **Gemini** | API key from ai.google.dev |
| **Custom** | Any OpenAI-compatible endpoint URL (Ollama, LM Studio, etc.) |

### Workspace

Select your project directory via the folder icon in the top bar. Codemancer will scan it and build the file tree, dependency graph, and quest list.

## EXP System

| Action | EXP |
|--------|-----|
| Send message | +10 |
| Save file | +5 |
| Apply code | +50 |
| Fix bug | +100 |
| Git commit | variable |
| Focus mode | x2 multiplier |

**Level formula**: `level = floor(sqrt(total_exp / 100))`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri 2.0 (Rust) |
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS 4.2, Framer Motion 12 |
| State | Zustand 5 |
| Editor | Monaco Editor |
| Icons | Lucide React |
| Backend | Python 3.12+, FastAPI, Uvicorn |
| AI SDKs | anthropic, openai, google-genai |
| Package Managers | pnpm (frontend), uv (backend), cargo (Rust) |

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development plan.

- **v0.2** (current) — Visual Git client
- **v0.3** — Session journal & time tracking
- **v0.4** — Project dashboard & code metrics
- **v0.5** — GitHub, CI/CD, Linear/Jira integrations
- **v0.6** — Focus mode & productivity analytics

## License

MIT
