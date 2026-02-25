# Changelog

All notable changes to Codemancer are documented here.

## [Unreleased]

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
