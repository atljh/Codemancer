# Codemancer

Gamified developer companion app. Tauri 2.0 desktop app with React frontend and Python FastAPI backend.

## Architecture

```
src/                    # React 19 + TypeScript + Vite 7
  components/           # UI components (chat/, layout/, modals/, bars/, etc.)
  stores/gameStore.ts   # Zustand 5 — single global store
  hooks/useApi.ts       # Singleton API client (memoized, never re-creates)
  types/game.ts         # All TypeScript interfaces
  i18n/translations.ts  # EN/RU translations (add keys to BOTH locales)
  themes/               # CSS custom properties, 4 themes

backend/                # Python FastAPI, managed by uv
  routes/               # API routers (game, chat, quests, files, commands, conversations, settings, project)
  models/               # Pydantic models
  services/             # Business logic (providers/, tools, file_service, exp_service)
  conversations/        # JSON files — persisted chat history
  state.json            # Player state
  settings.json         # User preferences

src-tauri/              # Rust — Tauri shell, spawns Python backend
  src/lib.rs            # Setup, PythonProcess lifecycle, OAuth commands
```

## Dev Commands

```bash
pnpm tauri dev                    # Full app (Vite + Rust + Python backend)
pnpm dev                          # Frontend only (Vite on :1420)
cd backend && uv run python -m uvicorn main:app --host 127.0.0.1 --port 8420  # Backend only
pnpm exec tsc --noEmit            # Type check
```

## Key Conventions

- **Backend imports**: relative paths (`from models.player import Player`), NOT `backend.` prefix
- **API port**: always 8420
- **State management**: Zustand only. No React context for app state. Access outside components via `useGameStore.getState()`
- **useApi hook**: returns memoized singleton `api` object — never recreate, never put in deps arrays that change
- **Translations**: every user-facing string goes through `useTranslation()` hook. Add to both `en` and `ru` in `translations.ts`
- **Styling**: Tailwind CSS 4.2 + CSS custom properties (`--theme-*`). Use `glass-panel`, `glass-panel-bright` utility classes. Sci-fi / tactical aesthetic
- **Animations**: Framer Motion for enter/exit. Keep subtle
- **Backend process management**: Tauri spawns Python in a process group, kills entire group on Drop. `kill_stale_backend()` cleans port 8420 before start
- **Git commands**: whitelisted in `backend/routes/commands.py`. Add new commands to `ALLOWED_COMMANDS` or `ALLOWED_PREFIXES`
- **Chat messages**: types are `message` | `action_card` | `action_log`. `action_log` is ephemeral (not persisted)
- **Conversations**: saved as JSON in `backend/conversations/`. Auto-save after user message and after AI response

## Adding a New Backend Route

1. Create model in `backend/models/`
2. Create router in `backend/routes/` with `APIRouter(prefix="/api/...")`
3. Import and include in `backend/main.py`
4. Add corresponding API methods in `src/hooks/useApi.ts`

## Adding a New UI Panel/Component

1. Create component in appropriate `src/components/` subdirectory
2. Add state/actions to `gameStore.ts` if needed
3. Add translation keys to both EN and RU
4. Wire into `AppLayout.tsx` or parent component
