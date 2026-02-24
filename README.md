<p align="center">
  <img src="docs/logo.png" alt="Codemancer" width="120" />
</p>

<h1 align="center">CODEMANCER</h1>
<p align="center">
  <strong>The Strategic Command Deck for AI-Native Engineering</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="CONTRIBUTING.md">Contributing</a> &bull;
  <a href="README.ru.md">Русский</a> &bull;
  <a href="README.uk.md">Українська</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri" alt="Tauri 2.0" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Python-3.12+-3776ab?logo=python" alt="Python 3.12+" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT" />
</p>

---

Codemancer is not an IDE. It's a **tactical code reality management interface** for the era where development means commanding AI agents, not typing lines.

> While your AI agent operates files and terminal, you see the big picture: dependency maps, tech debt radars, EXP bars, and a voice link to your operative.

<p align="center">
  <img src="docs/gifs/hero-overview.gif" alt="Codemancer full interface overview" width="800" />
</p>

## Quick Start

```bash
git clone https://github.com/atljh/codemancer.git
cd codemancer
./setup.sh
```

That's it. The script checks prerequisites, installs everything, and launches the app.

> **Install only** (no auto-launch): `./setup.sh --install`

<details>
<summary>Manual setup</summary>

**Prerequisites:** Node.js >= 18, Python >= 3.12, Rust (stable), pnpm, uv

```bash
pnpm install                     # Frontend
cd backend && uv sync && cd ..   # Backend
pnpm tauri dev                   # Launch
```
</details>

<details>
<summary>Platform-specific dependencies</summary>

**macOS:**
```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl -LsSf https://astral.sh/uv/install.sh | sh
npm install -g pnpm
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl -LsSf https://astral.sh/uv/install.sh | sh
npm install -g pnpm
```

**Windows:**
```powershell
# Install Rust from https://rustup.rs
# Install C++ Build Tools via Visual Studio Installer
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
npm install -g pnpm
```
</details>

---

## Features

### Tactical Map — See the Blast Radius Before You Break Things

Interactive dependency graph with "fog of war". When the AI writes files, orange highlights show the **Blast Radius** — every module that could be affected.

<p align="center">
  <img src="docs/gifs/tactical-map.gif" alt="Tactical Map pulsing with blast radius highlights" width="700" />
</p>

---

### RPG Progression — Every Action Earns EXP

Messages, commits, bug fixes, file saves — everything feeds your experience bar. Level up, watch HP/MP fluctuate, unlock focus mode for x2 multiplier.

<p align="center">
  <img src="docs/gifs/exp-growth.gif" alt="EXP bar filling up and level-up notification" width="700" />
</p>

| Action | EXP |
|--------|-----|
| Send message | +10 |
| Save file | +5 |
| Apply code | +50 |
| Fix bug | +100 |
| Git commit | variable |
| Tool execution | +15-25 |
| Focus mode | x2 multiplier |

**Level formula:** `level = floor(sqrt(total_exp / 100))`

---

### Neural Voice Link — Talk to Your Agent

Voice input via microphone. TTS reads AI responses back. Procedural audio engine: scanning tones on tool use, glitch noise on errors, success chimes on completion.

<p align="center">
  <img src="docs/gifs/voice-input.gif" alt="Voice input activating and AI responding with TTS" width="700" />
</p>

---

### Self-Repair — Fix Everything Under Doom Music

One button. The agent runs ESLint, Prettier, Ruff, Black across your project while **Doom E1M1** plays procedurally through Web Audio API. Streamed results in real-time.

<p align="center">
  <img src="docs/gifs/self-repair.gif" alt="Self-Repair running with Doom music and streaming results" width="700" />
</p>

---

### 5 Themes Including Hacker Mode

Switch between Dark Ops (cyan), Midnight (blue), Phantom (amber), Arctic (light), and **Hacker** — full green monochrome Matrix mode with scanline animation and phosphor glow.

<p align="center">
  <img src="docs/gifs/themes.gif" alt="Cycling through all 5 themes including Hacker mode" width="700" />
</p>

---

### Sound Packs

4 audio personalities for every UI interaction:

| Pack | Style |
|------|-------|
| **Default** | Tactical sci-fi bleeps |
| **Jarvis** | Warm sine tones, AI assistant feel |
| **Pip-Boy** | 8-bit square waves, Fallout vibes |
| **Retro Terminal** | Sawtooth warble, floppy seek, CRT noise |

---

### Health & Tech Debt Radar

Radar diagram of code anomalies. Complexity, coverage, cleanliness, file size — all scored. Background health watch alerts when critical issues appear.

<p align="center">
  <img src="docs/gifs/health-radar.gif" alt="Health radar scanning and detecting anomalies" width="700" />
</p>

---

### Agentic Tools — The Agent Executes, Not Just Advises

Full access to `list_files`, `read_file`, `write_file`, `search_text`, `run_command`. Failed commands deal HP damage; the agent proposes repair plans automatically.

---

### Session Chronicle & Cross-Session Memory

Automatic knowledge base. Generate PR reports in one click. The agent recalls previous work:

```
[RECALLING_DATA]: We previously worked on this module in session #47...
```

---

### Multi-Provider AI Chat

| Provider | Setup |
|----------|-------|
| **Anthropic** | API key or OAuth |
| **OpenAI** | API key |
| **Gemini** | API key |
| **Custom** | Any OpenAI-compatible endpoint (Ollama, LM Studio) |

Streaming responses, persistent conversations, project context injection.

---

### More

- **Built-in Monaco Editor** with themed syntax highlighting, tabs, diff viewer
- **Visual Git Client** — stage, unstage, commit, AI-generated messages
- **Command Palette** (Cmd+K) — 20+ commands
- **Quick Open** (Cmd+P) — fuzzy file search
- **Quest System** — auto-scan TODOs/FIXMEs into quests
- **Proactive Assistant** — background pulse analyzes `git diff` every 5 minutes
- **Deep Dive Mode** — RPG focus timer with EXP multiplier
- **Critical HP Effects** — below 20% HP, the UI glitches with red vignette
- **2 Languages** — English and Russian

---

## Architecture

```
src/                        # React 19 + TypeScript + Vite 7
  components/               # 40+ components across 15 feature areas
    bars/                   # EXP bar, stat bars
    chat/                   # OmniChat, message bubbles
    editor/                 # Monaco editor, file tabs
    explorer/               # File tree browser
    focus/                  # Focus timer
    git/                    # Git status panel
    health/                 # Code metrics, radar chart
    layout/                 # 3-panel layout, top stats bar
    map/                    # Tactical dependency map
    modals/                 # Command palette, settings, diff viewer
    chronicle/              # Session journal
    welcome/                # Initial setup screen
    ui/                     # Glass card, glow panel, waveform visualizer
  stores/gameStore.ts       # Zustand 5 — single global store
  hooks/                    # useApi, useAudio, useHealthWatch, useProactivePulse
  types/game.ts             # All TypeScript interfaces
  i18n/translations.ts      # EN/RU translations (250+ keys)
  themes/                   # CSS custom properties, 5 themes

backend/                    # Python 3.12+ FastAPI
  routes/                   # 14 API routers, 60+ endpoints
  models/                   # Pydantic models
  services/                 # Business logic
    providers/              # AI providers (Anthropic, OpenAI, Gemini, Custom)
  conversations/            # JSON files — persisted chat history
  state.json                # Player state

src-tauri/                  # Rust — Tauri 2.0 shell
  src/lib.rs                # App setup, Python process lifecycle, OAuth
```

### How It Works

1. `pnpm tauri dev` starts the Tauri shell (Rust)
2. Tauri spawns the Python FastAPI backend on port **8420**
3. Vite dev server runs the React frontend on port **1420**
4. Frontend communicates with backend via HTTP/SSE

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Shell | Tauri 2.0 (Rust) |
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS 4.2, Framer Motion 12 |
| State | Zustand 5 |
| Editor | Monaco Editor |
| Audio | Web Audio API (procedural), Web Speech API (TTS/STT) |
| Icons | Lucide React |
| Backend | Python 3.12+, FastAPI, Uvicorn |
| AI SDKs | anthropic, openai, google-genai |
| Package Managers | pnpm, uv, cargo |

## Building for Production

```bash
pnpm tauri build
```

Output in `src-tauri/target/release/bundle/`.

## Roadmap

- **Visual Vision** — agent "sees" your running app's UI
- **Skill Trees** — level up as Architect or Debugger, unlock new tools
- **Multi-agent Orchestration** — coordinate multiple AI agents
- **GitHub/CI Integration** — PR reviews, pipeline monitoring from the deck
- **Plugin System** — community-built modules and themes

## Contributing

We're looking for **allies** to build the future of AI-native development.

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to create themes, sound packs, and new modules.

## License

MIT
