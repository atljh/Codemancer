# Codemancer

**Геймифицированный компаньон разработчика** — десктопное приложение, которое превращает рабочий процесс в RPG-приключение.

Построен на Tauri 2.0 + React 19 + Python FastAPI. Работает как визуальный компаньон для CLI-инструментов вроде Claude Code, предоставляя UI для того, чего терминал не может: визуализация, трекинг и интерактивные панели.

[English README](README.md) | [README українською](README.uk.md)

![Codemancer Screenshot](docs/screenshot.png)

## Возможности

### RPG-система прогрессии
- **EXP и уровни** — получайте опыт за действия в коде (сообщения, коммиты, исправление багов, сохранение файлов)
- **HP / MP** — HP убывает при неактивности, MP восстанавливается в простое
- **Режим фокуса** — таймер в стиле Pomodoro с множителем EXP x2
- **Уведомления о повышении уровня** с визуальными эффектами

### AI-чат ассистент
- **Мульти-провайдерная поддержка** — Anthropic Claude, OpenAI GPT, Google Gemini, Custom (Ollama, локальные LLM)
- **Потоковые ответы** с интеграцией инструментов
- **Сохранение диалогов** — автосохранение, восстановление между сессиями
- **Инъекция контекста проекта** — AI понимает вашу кодовую базу
- **OAuth аутентификация** через Anthropic

### Встроенный редактор кода
- **Monaco Editor** с 4 sci-fi темами
- **Табовое редактирование** нескольких файлов
- **Проверка синтаксиса** (Python, JavaScript, TypeScript)
- **Просмотр diff** — сравнение кода side-by-side
- **Файловый эксплорер** с деревом навигации

### Визуальный Git-клиент
- **Панель Git-статуса** — staged, unstaged, untracked файлы с иконками статуса
- **Stage/unstage** отдельных файлов
- **Inline коммит** с полем ввода сообщения
- **AI-генерация сообщений коммитов**
- **Отмена изменений** по файлам

### Анализ качества кода
- **Панель здоровья** — сложность, покрытие тестами, чистота кода
- **Обнаружение** больших файлов и сложных функций
- **Индикаторы технического долга**
- **Детекция аномалий**

### Визуализация зависимостей
- **Тактическая карта** — интерактивный граф зависимостей
- **Маппинг связей** между модулями
- **Эффект «тумана войны»**

### Трекинг сессий (Хроника)
- **Таймлайн всех действий** — коммиты, правки, ответы AI, квесты
- **Отчёты по сессиям** в форматах PR, стендап, Jira
- **История активности** между сессиями

### Инструменты продуктивности
- **Палитра команд** (Cmd+K) — 20+ встроенных команд
- **Быстрое открытие** (Cmd+P) — fuzzy-поиск файлов
- **Поиск по файлам** с превью результатов
- **Найти и заменить** по всему проекту
- **Система квестов** — автосканирование TODO/FIXME и превращение их в квесты

### Темы и локализация
- **4 темы**: Dark Ops (cyan), Midnight (blue), Phantom (amber), Arctic (light blue)
- **2 языка**: английский, русский
- **Sci-fi / тактическая эстетика** с эффектами glass morphism

## Архитектура

```
src/                        # React 19 + TypeScript + Vite 7
  components/               # 30 компонентов в 13 функциональных областях
    bars/                   # Полоска EXP, стат-бары
    chat/                   # OmniChat, пузыри сообщений, карточки действий
    editor/                 # Monaco-редактор, табы файлов
    explorer/               # Файловое дерево
    focus/                  # Таймер фокуса
    git/                    # Панель Git-статуса
    health/                 # Метрики кода, радар-чарт
    layout/                 # 3-панельный layout, верхний стат-бар
    map/                    # Тактическая карта зависимостей
    modals/                 # Палитра команд, настройки, diff-просмотр и др.
    chronicle/              # Журнал сессий
    welcome/                # Экран первого запуска
    ui/                     # Glass card, glow panel примитивы
  stores/gameStore.ts       # Zustand 5 — единый глобальный стор
  hooks/useApi.ts           # Синглтон API-клиент
  types/game.ts             # Все TypeScript-интерфейсы
  i18n/translations.ts      # EN/RU переводы (200+ ключей)
  themes/                   # CSS custom properties, 4 темы

backend/                    # Python 3.12+ FastAPI
  routes/                   # 12 API-роутеров, 50+ эндпоинтов
  models/                   # Pydantic-модели
  services/                 # Бизнес-логика
    providers/              # AI-провайдеры (Anthropic, OpenAI, Gemini, Custom)
  conversations/            # JSON-файлы — сохранённые диалоги
  state.json                # Состояние игрока

src-tauri/                  # Rust — Tauri 2.0 оболочка
  src/lib.rs                # Настройка приложения, жизненный цикл Python-процесса, OAuth
```

## Требования

- **Node.js** >= 18
- **pnpm** (рекомендуется) или npm
- **Rust** (последняя стабильная версия) — [установка через rustup](https://rustup.rs/)
- **Python** >= 3.12
- **uv** — менеджер пакетов Python — [установка](https://docs.astral.sh/uv/getting-started/installation/)
- **Системные зависимости Tauri 2** — [руководство по платформам](https://v2.tauri.app/start/prerequisites/)

### macOS

```bash
# Установка Xcode Command Line Tools (если ещё не установлены)
xcode-select --install

# Установка Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Установка uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Установка pnpm (если не установлен)
npm install -g pnpm
```

### Linux (Debian/Ubuntu)

```bash
# Системные зависимости для Tauri
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Установка Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Установка uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Установка pnpm
npm install -g pnpm
```

### Windows

```powershell
# Установка Rust через rustup (скачать с https://rustup.rs)
# Установка Microsoft C++ Build Tools (через Visual Studio Installer)
# Установка WebView2 (предустановлен в Windows 11)

# Установка uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Установка pnpm
npm install -g pnpm
```

## Установка

```bash
# Клонирование репозитория
git clone https://github.com/fyodorlukashov/codemancer.git
cd codemancer

# Установка фронтенд-зависимостей
pnpm install

# Установка бэкенд-зависимостей
cd backend && uv sync && cd ..
```

## Разработка

```bash
# Полное десктоп-приложение (Vite + Rust + Python бэкенд)
pnpm tauri dev

# Только фронтенд (Vite dev-сервер на http://localhost:1420)
pnpm dev

# Только бэкенд (FastAPI на http://127.0.0.1:8420)
cd backend && uv run python -m uvicorn main:app --host 127.0.0.1 --port 8420

# Проверка типов
pnpm exec tsc --noEmit
```

### Как это работает

1. `pnpm tauri dev` запускает Tauri-оболочку (Rust)
2. Tauri порождает Python FastAPI бэкенд как дочерний процесс на порту **8420**
3. Vite dev-сервер запускает React-фронтенд на порту **1420**
4. Фронтенд общается с бэкендом через HTTP/SSE

## Сборка для продакшена

```bash
# Сборка десктоп-приложения
pnpm tauri build
```

Собранное приложение будет в `src-tauri/target/release/bundle/`.

## Настройка

### Настройка AI-провайдера

При первом запуске откройте **Настройки** (иконка шестерёнки) и настройте AI-провайдер:

| Провайдер | Что нужно |
|-----------|-----------|
| **Anthropic** | API-ключ или OAuth (вход через аккаунт Anthropic) |
| **OpenAI** | API-ключ с platform.openai.com |
| **Gemini** | API-ключ с ai.google.dev |
| **Custom** | URL любого OpenAI-совместимого эндпоинта (Ollama, LM Studio и др.) |

### Рабочее пространство

Выберите директорию проекта через иконку папки в верхней панели. Codemancer просканирует её и построит дерево файлов, граф зависимостей и список квестов.

## Система EXP

| Действие | EXP |
|----------|-----|
| Отправка сообщения | +10 |
| Сохранение файла | +5 |
| Применение кода | +50 |
| Исправление бага | +100 |
| Git коммит | варьируется |
| Режим фокуса | множитель x2 |

**Формула уровня**: `level = floor(sqrt(total_exp / 100))`

## Технологический стек

| Слой | Технология |
|------|-----------|
| Десктоп-оболочка | Tauri 2.0 (Rust) |
| Фронтенд | React 19, TypeScript, Vite 7 |
| Стилизация | Tailwind CSS 4.2, Framer Motion 12 |
| Стейт | Zustand 5 |
| Редактор | Monaco Editor |
| Иконки | Lucide React |
| Бэкенд | Python 3.12+, FastAPI, Uvicorn |
| AI SDK | anthropic, openai, google-genai |
| Пакетные менеджеры | pnpm (фронтенд), uv (бэкенд), cargo (Rust) |

## Дорожная карта

Полный план разработки — в [ROADMAP.md](ROADMAP.md).

- **v0.2** (текущая) — Визуальный Git-клиент
- **v0.3** — Журнал сессий и трекинг времени
- **v0.4** — Дашборд проекта и метрики кода
- **v0.5** — Интеграции с GitHub, CI/CD, Linear/Jira
- **v0.6** — Режим фокуса и аналитика продуктивности

## Лицензия

MIT
