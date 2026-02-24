# Codemancer Roadmap

Codemancer = visual companion для CLI-инструментов вроде Claude Code.
Фокус: делать то, что CLI не может — визуализация, трекинг, UI для сложных операций.

---

## v0.2 — Visual Git *(current)*

Цель: полноценный visual git клиент внутри Codemancer.

### Phase 1: Git Status Panel
- [ ] Новый компонент `GitPanel` — боковая панель (или tab) с git-информацией
- [ ] Backend: `GET /api/git/status` — parsed git status (staged, unstaged, untracked файлы со статусами)
- [ ] Backend: `GET /api/git/branch` — текущая ветка, список локальных/remote веток
- [ ] UI: список изменённых файлов с иконками статуса (M/A/D/R), staged vs unstaged секции
- [ ] Stage/unstage файлов по клику (чекбоксы или drag)
- [ ] Quick commit: inline поле для commit message + кнопка Commit

### Phase 2: Visual Diff
- [ ] Backend: `POST /api/git/diff` — diff для конкретного файла (staged/unstaged)
- [ ] Интеграция с существующим `DiffViewerModal` — показ git diff в side-by-side виде
- [ ] Клик по файлу в GitPanel → открывает diff
- [ ] Hunk-level staging: stage отдельные куски изменений

### Phase 3: Branch Management
- [ ] UI: dropdown/drawer со списком веток
- [ ] Создание новой ветки (от текущей или от выбранного коммита)
- [ ] Переключение между ветками (checkout)
- [ ] Backend: расширить whitelist команд для branch операций
- [ ] Визуальное предупреждение при uncommitted changes перед checkout

### Phase 4: Commit History
- [ ] Backend: `GET /api/git/log` — parsed commit log (hash, author, date, message, refs)
- [ ] UI: вертикальный timeline коммитов с branch graph (линии веток)
- [ ] Клик по коммиту → просмотр diff этого коммита
- [ ] Фильтр по ветке, автору, файлу

### Phase 5: Merge & Conflicts
- [ ] UI для merge: выбрать ветку → preview → merge
- [ ] Visual conflict resolver: three-way merge (ours / theirs / result)
- [ ] Интеграция с AI: "Resolve this conflict" через чат
- [ ] Cherry-pick отдельных коммитов

### Phase 6: Stash & Advanced
- [ ] Stash list, stash apply/drop/pop
- [ ] Interactive rebase UI (reorder, squash, edit)
- [ ] Git blame — аннотации в просмотре файла
- [ ] Tags management

---

## v0.3 — Session Journal & Time Tracking

Цель: автоматический лог рабочего дня.

- [ ] Автоматический трекинг: какие файлы менялись, сколько строк, какие коммиты
- [ ] Session timeline: визуальная шкала с событиями (commit, file edit, AI chat, quest complete)
- [ ] Daily summary: генерация "что было сделано сегодня" через AI
- [ ] Weekly/monthly dashboard с графиками активности
- [ ] Streak tracking: серии дней кодинга
- [ ] EXP graph: визуализация прогресса по уровням

---

## v0.4 — Project Dashboard

Цель: здоровье проекта на одном экране.

- [ ] Code metrics: LOC, файлы, зависимости, complexity
- [ ] Tech debt indicators: TODO/FIXME count, large files, long functions
- [ ] Dependency graph: визуальная карта imports между модулями
- [ ] File heatmap: какие файлы менялись чаще всего
- [ ] Bundle size tracking (для JS/TS проектов)

---

## v0.5 — Integrations

Цель: подтягивать внешние данные в одно место.

- [ ] GitHub: PRs, issues, checks status
- [ ] CI/CD: build status notifications
- [ ] Linear/Jira: синхронизация задач с квестами Codemancer
- [ ] Notifications panel: агрегация событий из всех источников

---

## v0.6 — Focus & Productivity

Цель: помочь оставаться в потоке.

- [ ] Pomodoro timer с интеграцией в EXP (бонус за завершённый фокус-блок)
- [ ] Focus mode: скрыть всё кроме кода и чата
- [ ] Break reminders на основе HP drain
- [ ] Productivity analytics: продуктивные часы, паттерны

---

## Backlog / Ideas

- [ ] Collaborative mode: шаринг квестов между разработчиками
- [ ] Plugin system: custom panels и команды
- [ ] Voice commands через Whisper
- [ ] Mobile companion app (только dashboard и уведомления)
- [ ] Achievement system: badges за milestones (первый commit, 1000 строк, и т.д.)
- [ ] Customizable layout: drag & drop панелей
- [ ] Terminal emulator встроенный (xterm.js)
