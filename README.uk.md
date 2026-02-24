# Codemancer

**Геймiфiкований компаньйон розробника** — десктопний додаток, що перетворює робочий процес на RPG-пригоду.

Побудований на Tauri 2.0 + React 19 + Python FastAPI. Працює як візуальний компаньйон для CLI-інструментів на кшталт Claude Code, надаючи UI для того, чого термінал не може: візуалізація, трекінг та інтерактивні панелі.

[English README](README.md) | [README на русском](README.ru.md)

![Codemancer Screenshot](docs/screenshot.png)

## Можливості

### RPG-система прогресу
- **EXP та рівні** — отримуйте досвід за дії з кодом (повідомлення, коміти, виправлення багів, збереження файлів)
- **HP / MP** — HP зменшується при неактивності, MP відновлюється під час простою
- **Режим фокусу** — таймер у стилі Pomodoro з множником EXP x2
- **Сповіщення про підвищення рівня** з візуальними ефектами

### AI-чат асистент
- **Мульти-провайдерна підтримка** — Anthropic Claude, OpenAI GPT, Google Gemini, Custom (Ollama, локальні LLM)
- **Потокові відповіді** з інтеграцією інструментів
- **Збереження діалогів** — автозбереження, відновлення між сесіями
- **Ін'єкція контексту проєкту** — AI розуміє вашу кодову базу
- **OAuth автентифікація** через Anthropic

### Вбудований редактор коду
- **Monaco Editor** з 4 sci-fi темами
- **Табове редагування** кількох файлів
- **Перевірка синтаксису** (Python, JavaScript, TypeScript)
- **Перегляд diff** — порівняння коду side-by-side
- **Файловий експлорер** з деревом навігації

### Візуальний Git-клієнт
- **Панель Git-статусу** — staged, unstaged, untracked файли з іконками статусу
- **Stage/unstage** окремих файлів
- **Inline коміт** з полем введення повідомлення
- **AI-генерація повідомлень комітів**
- **Скасування змін** по файлах

### Аналіз якості коду
- **Панель здоров'я** — складність, покриття тестами, чистота коду
- **Виявлення** великих файлів та складних функцій
- **Індикатори технічного боргу**
- **Детекція аномалій**

### Візуалізація залежностей
- **Тактична карта** — інтерактивний граф залежностей
- **Мапінг зв'язків** між модулями
- **Ефект «туману війни»**

### Трекінг сесій (Хроніка)
- **Таймлайн усіх дій** — коміти, правки, відповіді AI, квести
- **Звіти по сесіях** у форматах PR, стендап, Jira
- **Історія активності** між сесіями

### Інструменти продуктивності
- **Палітра команд** (Cmd+K) — 20+ вбудованих команд
- **Швидке відкриття** (Cmd+P) — fuzzy-пошук файлів
- **Пошук по файлах** з превʼю результатів
- **Знайти та замінити** по всьому проєкту
- **Система квестів** — автосканування TODO/FIXME та перетворення їх на квести

### Теми та локалізація
- **4 теми**: Dark Ops (cyan), Midnight (blue), Phantom (amber), Arctic (light blue)
- **2 мови**: англійська, російська
- **Sci-fi / тактична естетика** з ефектами glass morphism

## Архітектура

```
src/                        # React 19 + TypeScript + Vite 7
  components/               # 30 компонентів у 13 функціональних областях
    bars/                   # Смужка EXP, стат-бари
    chat/                   # OmniChat, бульбашки повідомлень, картки дій
    editor/                 # Monaco-редактор, таби файлів
    explorer/               # Файлове дерево
    focus/                  # Таймер фокусу
    git/                    # Панель Git-статусу
    health/                 # Метрики коду, радар-чарт
    layout/                 # 3-панельний layout, верхній стат-бар
    map/                    # Тактична карта залежностей
    modals/                 # Палітра команд, налаштування, diff-перегляд тощо
    chronicle/              # Журнал сесій
    welcome/                # Екран першого запуску
    ui/                     # Glass card, glow panel примітиви
  stores/gameStore.ts       # Zustand 5 — єдиний глобальний стор
  hooks/useApi.ts           # Синглтон API-клієнт
  types/game.ts             # Усі TypeScript-інтерфейси
  i18n/translations.ts      # EN/RU переклади (200+ ключів)
  themes/                   # CSS custom properties, 4 теми

backend/                    # Python 3.12+ FastAPI
  routes/                   # 12 API-роутерів, 50+ ендпоінтів
  models/                   # Pydantic-моделі
  services/                 # Бізнес-логіка
    providers/              # AI-провайдери (Anthropic, OpenAI, Gemini, Custom)
  conversations/            # JSON-файли — збережені діалоги
  state.json                # Стан гравця

src-tauri/                  # Rust — Tauri 2.0 оболонка
  src/lib.rs                # Налаштування додатку, життєвий цикл Python-процесу, OAuth
```

## Вимоги

- **Node.js** >= 18
- **pnpm** (рекомендовано) або npm
- **Rust** (остання стабільна версія) — [встановлення через rustup](https://rustup.rs/)
- **Python** >= 3.12
- **uv** — менеджер пакетів Python — [встановлення](https://docs.astral.sh/uv/getting-started/installation/)
- **Системні залежності Tauri 2** — [посібник для платформ](https://v2.tauri.app/start/prerequisites/)

### macOS

```bash
# Встановлення Xcode Command Line Tools (якщо ще не встановлено)
xcode-select --install

# Встановлення Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Встановлення uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Встановлення pnpm (якщо не встановлено)
npm install -g pnpm
```

### Linux (Debian/Ubuntu)

```bash
# Системні залежності для Tauri
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Встановлення Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Встановлення uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Встановлення pnpm
npm install -g pnpm
```

### Windows

```powershell
# Встановлення Rust через rustup (завантажити з https://rustup.rs)
# Встановлення Microsoft C++ Build Tools (через Visual Studio Installer)
# Встановлення WebView2 (попередньо встановлено у Windows 11)

# Встановлення uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Встановлення pnpm
npm install -g pnpm
```

## Встановлення

```bash
# Клонування репозиторію
git clone https://github.com/fyodorlukashov/codemancer.git
cd codemancer

# Встановлення фронтенд-залежностей
pnpm install

# Встановлення бекенд-залежностей
cd backend && uv sync && cd ..
```

## Розробка

```bash
# Повний десктопний додаток (Vite + Rust + Python бекенд)
pnpm tauri dev

# Тільки фронтенд (Vite dev-сервер на http://localhost:1420)
pnpm dev

# Тільки бекенд (FastAPI на http://127.0.0.1:8420)
cd backend && uv run python -m uvicorn main:app --host 127.0.0.1 --port 8420

# Перевірка типів
pnpm exec tsc --noEmit
```

### Як це працює

1. `pnpm tauri dev` запускає Tauri-оболонку (Rust)
2. Tauri породжує Python FastAPI бекенд як дочірній процес на порті **8420**
3. Vite dev-сервер запускає React-фронтенд на порті **1420**
4. Фронтенд спілкується з бекендом через HTTP/SSE

## Збірка для продакшену

```bash
# Збірка десктопного додатку
pnpm tauri build
```

Зібраний додаток буде у `src-tauri/target/release/bundle/`.

## Налаштування

### Налаштування AI-провайдера

При першому запуску відкрийте **Налаштування** (іконка шестірні) та налаштуйте AI-провайдер:

| Провайдер | Що потрібно |
|-----------|-------------|
| **Anthropic** | API-ключ або OAuth (вхід через акаунт Anthropic) |
| **OpenAI** | API-ключ з platform.openai.com |
| **Gemini** | API-ключ з ai.google.dev |
| **Custom** | URL будь-якого OpenAI-сумісного ендпоінту (Ollama, LM Studio тощо) |

### Робочий простір

Оберіть директорію проєкту через іконку папки у верхній панелі. Codemancer просканує її та побудує дерево файлів, граф залежностей та список квестів.

## Система EXP

| Дія | EXP |
|-----|-----|
| Відправлення повідомлення | +10 |
| Збереження файлу | +5 |
| Застосування коду | +50 |
| Виправлення багу | +100 |
| Git коміт | варіюється |
| Режим фокусу | множник x2 |

**Формула рівня**: `level = floor(sqrt(total_exp / 100))`

## Технологічний стек

| Шар | Технологія |
|-----|-----------|
| Десктопна оболонка | Tauri 2.0 (Rust) |
| Фронтенд | React 19, TypeScript, Vite 7 |
| Стилізація | Tailwind CSS 4.2, Framer Motion 12 |
| Стейт | Zustand 5 |
| Редактор | Monaco Editor |
| Іконки | Lucide React |
| Бекенд | Python 3.12+, FastAPI, Uvicorn |
| AI SDK | anthropic, openai, google-genai |
| Пакетні менеджери | pnpm (фронтенд), uv (бекенд), cargo (Rust) |

## Дорожня карта

Повний план розробки — у [ROADMAP.md](ROADMAP.md).

- **v0.2** (поточна) — Візуальний Git-клієнт
- **v0.3** — Журнал сесій та трекінг часу
- **v0.4** — Дашборд проєкту та метрики коду
- **v0.5** — Інтеграції з GitHub, CI/CD, Linear/Jira
- **v0.6** — Режим фокусу та аналітика продуктивності

## Ліцензія

MIT
