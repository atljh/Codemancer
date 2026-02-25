# Changelog

All notable changes to Codemancer are documented here.

## [Unreleased]

### Added

- **Agentic Supervisor** — autonomous action planning system
  - LLM generates `ActionPlan` with concrete steps for high-priority signals (priority 4-5)
  - Interactive `AgentProposalCard` in chat: expandable step list, Execute/Dismiss buttons
  - Sandbox mode (default on): `write_file` shows diff without writing, `run_command` blocked
  - SSE streaming execution with per-step status updates
  - TacticalMap highlights affected files in gold during execution
  - Polling hook (`useSupervisorPolling`) checks for new proposals every 15s
  - Backend: `AgenticSupervisor` service, `/api/supervisor/*` routes, in-memory plan storage
  - Settings: `supervisor_enabled`, `supervisor_sandbox_mode` toggles
- **Signal Refinery** — unified external signal ingestion
  - GitHub Issues/PRs provider (`github_token`, `github_owner`, `github_repo`)
  - Jira Issues provider (`jira_base_url`, `jira_email`, `jira_api_token`)
  - Slack Messages provider (`slack_bot_token`, `slack_channels`)
  - AI Triage: LLM-based priority scoring (1-5) with reasoning
  - `SignalRefineryPanel` UI with provider status, signal list, priority filtering
  - Backend: `SignalPoller` service, `/api/signals/refinery/*` routes, SQLite cache
- **Background agent activity system** — typewriter-style status log in the bottom bar
- **Integrations settings tab** — dedicated tab for Telegram, Signal Refinery, AI Triage, and Supervisor settings (moved out of General)

### Changed

- **Health alerts redesigned** — "Stability Report" paradigm
  - Fonts: Inter for UI, JetBrains Mono for logs/code (`font-sans` / `font-mono`)
  - Alert box: dark `bg-theme-bg-elevated` panels with severity-colored borders and glow shadows
  - Category micro-icons: Ruler (file_size), Cpu (complexity), ShieldCheck (coverage), FileCode (cleanliness)
  - Animated horizontal progress bars for score metrics
  - Severity levels expanded: `critical` | `warning` | `info` | `notice`
  - Thresholds softened: large files (>500 lines) = info, complex functions (>100 lines) = info/warning, true CRITICAL reserved for LSP/import errors
  - Translations: professional wording ("Entropy analysis complete" instead of "Instability detected")
- **SSE streaming — non-blocking event loop**
  - Backend: LLM stream iteration and tool execution run in thread pool via `asyncio.to_thread()`, no longer block the async event loop
  - Frontend: proper line buffering across chunks, TextDecoder final flush, `streamDone` flag for clean loop exit
  - Fixes intermittent chat hangs when concurrent API requests queued behind a streaming response
- General settings tab simplified: only Language, Workspace, Danger Zone

### Removed

- **RPG progression system** — HP, MP, EXP bars, levels, and level-up modals are gone
- `exp_service.py` — deleted entirely
- `ExpBar.tsx`, `LevelUpModal.tsx` — deleted
- EXP rewards from all actions (commits, file saves, code apply, tool use, quests, operations)
- MP gating on chat (messages were blocked when MP < 5)
- HP drain timer and MP regen timer
- Focus mode EXP multiplier ("x2 EXP" → focus is now a simple productivity timer)
- `performAction()`, `awardMp()`, `resetPlayer()` API methods
- Translation keys: `stats.level`, `stats.hp`, `stats.mp`, `stats.exp`, `chat.noMp`, `levelUp.*`, `focus.expBoost`, `intel.expBonus`, `intel.mpReward`, `bridge.expReward`

### Added

- **Agent monitoring model** (`AgentStatus`) replacing `Player`
  - `integrity_score` (0-100%) — code health derived from health_service metrics
  - `known_files` — files the agent has worked with
  - `total_bytes_processed` — cumulative data throughput
- `POST /api/game/track_file` — registers a file in the agent's knowledge base
- `POST /api/game/update_integrity` — recalculates integrity from health metrics
- `POST /api/game/reset` — resets agent to defaults
- **TopStatsBar** — compact metrics bar: INTG, STATUS (IDLE/PROCESSING), KNOWLEDGE (files known/total), DATA
- Automatic `state.json` migration from `"player"` to `"agent"` key
- Periodic agent status refresh (every 5 min)
- Integrity auto-update after health watch scans
- Translation keys: `stats.integrity`, `stats.agentStatus`, `stats.processing`, `stats.idle`, `stats.knowledge`

### Changed

- `Player` model/type → `AgentStatus` throughout backend and frontend
- `player` store field → `agent`, `setPlayer` → `setAgent`
- Welcome message: "Clearance {level}" → "System integrity {integrity}%"
- Diff viewer: "Deploy Patch +50 MASTERY" → "Deploy Patch"
- File save: "Asset saved +5 MASTERY" → "Asset saved"
- Settings sidebar: shows agent name + integrity instead of name + level + EXP
- Chat is always available (no MP check)
- `completeQuest`, `completeOperation` return just the entity without player/EXP data
- `ToolResult` no longer carries `exp_gained`, `mp_cost`, `hp_damage`
- SSE tool events no longer emit EXP/MP/HP deltas
- Chronicle events: `exp_gained` column retained in DB for historical data but no longer displayed
