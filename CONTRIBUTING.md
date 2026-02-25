# Contributing to Codemancer

## We're Looking for Allies

Codemancer is an open-source project, and we're searching for **allies** (Соратники) — developers, designers, and tinkerers who want to shape the future of AI-native development tools.

You don't need to be an expert in every part of the stack. Pick what excites you.

---

## Areas Where We Need Help

### Themes (Skins)

Codemancer uses CSS custom properties for theming. Adding a new theme means defining ~30 color variables and optionally adding special effects.

**Current themes:** Dark Ops, Midnight, Phantom, Arctic, Hacker

**What a theme needs:**

1. CSS variables in `src/themes/themes.css` under `[data-theme="your-theme"]`
2. A config entry in `src/themes/themeConfig.ts` (colors, Monaco editor mapping)
3. The theme ID added to the `ThemeId` type in `src/types/game.ts`

**Variables to define:**

```css
[data-theme="your-theme"] {
  --theme-bg-deep: ...; /* Deepest background */
  --theme-bg-base: ...; /* Main background */
  --theme-bg-elevated: ...; /* Cards, panels */
  --theme-bg-inset: ...; /* Inset areas */
  --theme-bg-empty: ...; /* Empty state backgrounds */

  --theme-accent: ...; /* Primary accent color */
  --theme-accent-dim: ...; /* Dimmed accent */
  --theme-accent-rgb: ...; /* RGB values for alpha usage */
  --theme-accent-hue: ...; /* Hue for programmatic shifts */

  --theme-text: ...; /* Primary text */
  --theme-text-dim: ...; /* Secondary text */
  --theme-text-dimmer: ...; /* Tertiary text */
  --theme-text-bright: ...; /* Highlighted text */

  --theme-status-success: ...; /* Green status */
  --theme-status-warning: ...; /* Amber status */
  --theme-status-error: ...; /* Red status */

  --theme-glass-bg: ...; /* Glass panel background */
  --theme-glass-bg-bright: ...;
  --theme-glass-border: ...; /* Glass panel borders */
  --theme-glass-border-bright: ...;

  --theme-grid-color: ...; /* Tactical grid dots */
  --theme-grid-line: ...;
  --theme-corner-color: ...; /* Corner brackets */

  --theme-purple: ...; /* MP bar / secondary accent */
  --theme-purple-dim: ...;
  --theme-exp-hue-start: ...; /* EXP bar gradient start hue */
}
```

Look at the **Hacker** theme in `themes.css` for an example with special effects (scanlines, phosphor glow).

---

### Sound Packs

Sound packs use the Web Audio API to procedurally generate all sounds — no audio files needed.

**Current packs:** Default, Jarvis, Pip-Boy, Retro Terminal

**What a sound pack needs:**

1. A new entry in the `SOUND_PACKS` record in `src/hooks/useAudio.ts`
2. The pack ID added to `SoundPackId` in `src/types/game.ts`
3. Translation labels in `src/i18n/translations.ts` (both EN and RU)
4. A selector entry in `src/components/modals/SettingsModal.tsx`

**Sound events to implement:**

```
level_up         — Player leveled up
action_done      — Successful action completed
scan_start       — Project scan beginning
scan_tick        — File being processed
message_sent     — User sent a message
error            — Something failed
tool_start       — AI tool invocation started
tool_done        — AI tool invocation succeeded
code_apply       — Code was written to a file
self_repair_start — Self-repair sequence initiated (Doom music plays here)
self_repair_tick  — Individual repair tool running
self_repair_done  — Self-repair complete
```

Each handler is a plain function that creates `OscillatorNode`, `GainNode`, etc. via `AudioContext`. See existing packs for patterns.

---

### Modules (New Features)

Codemancer is modular. New features typically involve:

**Backend (Python FastAPI):**

1. Model in `backend/models/`
2. Router in `backend/routes/` with `APIRouter(prefix="/api/...")`
3. Register in `backend/main.py`

**Frontend (React + TypeScript):**

1. Component in `src/components/`
2. State slice in `src/stores/gameStore.ts` (Zustand)
3. API methods in `src/hooks/useApi.ts`
4. Translation keys in `src/i18n/translations.ts` (EN + RU)

**Ideas for modules:**

- Skill trees with spec paths (Architect, Debugger, etc.)
- Achievement system with badges
- Team mode / multiplayer EXP tracking
- GitHub/GitLab integration panel
- CI/CD pipeline monitor
- Notification system for external events

---

## Development Setup

```bash
git clone https://github.com/atljh/codemancer.git
cd codemancer
./setup.sh --install
```

```bash
pnpm tauri dev        # Full app
pnpm dev              # Frontend only (http://localhost:1420)
pnpm exec tsc --noEmit  # Type check
```

Backend standalone:

```bash
cd backend && uv run python -m uvicorn main:app --host 127.0.0.1 --port 8420
```

---

## Code Conventions

- **TypeScript strict mode** — no `any`, no implicit returns
- **Relative imports** in backend (`from models.player import Player`, not `backend.models...`)
- **Zustand only** for state management — no React context for app state
- **Translations** — every user-facing string through `useTranslation()`, added to both EN and RU
- **Tailwind CSS** — use existing utility classes (`glass-panel`, `glass-panel-bright`) and `--theme-*` custom properties
- **Framer Motion** for animations — keep them subtle
- **API port** is always 8420

---

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes
4. Run type checking: `pnpm exec tsc --noEmit`
5. Test with `pnpm tauri dev`
6. Commit with a descriptive message
7. Open a Pull Request

---

## Questions?

Open an issue or reach out. We're building this together.
