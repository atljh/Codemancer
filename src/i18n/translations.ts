const translations = {
  en: {
    // Panels
    "panel.battleLog": "Operations Log",
    "panel.quests": "Objectives",
    "panel.explorer": "Explorer",
    "panel.settings": "Settings",

    // Stats
    "stats.level": "Level",
    "stats.totalExp": "Total EXP",
    "stats.hp": "HP",
    "stats.mp": "MP",
    "stats.exp": "EXP",
    "stats.arcaneCoder": "Tactical Operative",

    // Chat
    "chat.placeholder": "Execute command...",
    "chat.emptyState": "System initialized. Awaiting input...",
    "chat.spellReceived": "Command acknowledged.",
    "chat.connectionLost": "Connection to command server lost...",
    "chat.noMp": "Insufficient energy for this operation!",

    // Command Input
    "command.placeholder": "Enter your command...",

    // Level up
    "levelUp.title": "CLEARANCE UPGRADED",
    "levelUp.continue": "Continue",
    "levelUp.description": "System capabilities upgraded",

    // Files / Editor
    "editor.selectFile": "Select a file to begin coding...",
    "editor.fileSaved": "File saved",
    "editor.applyCode": "Apply Code",
    "editor.unsavedChanges": "Unsaved changes",

    // Diff Viewer
    "diff.viewDiff": "View Diff",
    "diff.apply": "Apply Changes +50 EXP",
    "diff.applied": "Changes applied to",
    "diff.applyError": "Failed to apply changes",
    "diff.loading": "Loading editor...",
    "diff.codeBlock": "Code Block",

    // Settings - Tabs
    "settings.tabGeneral": "General",
    "settings.tabAi": "AI",
    "settings.tabAppearance": "Appearance",

    // Settings - Fields
    "settings.language": "Language",
    "settings.workspaceRoot": "Project Directory",
    "settings.workspaceHint": "Root directory of your project. Used for file explorer and project scanning.",
    "settings.browse": "Browse",
    "settings.fontSize": "Font Size",
    "settings.theme": "Theme",
    "settings.save": "Save",
    "settings.saved": "Saved!",
    "settings.cancel": "Cancel",
    "settings.apiKey": "Anthropic API Key",
    "settings.apiKeyHint": "Your API key from console.anthropic.com. Stored locally, never sent to third parties.",
    "settings.model": "AI Model",
    "settings.aiConnected": "AI connected and ready",
    "settings.aiNotConfigured": "API key not configured",
    "settings.dangerZone": "Danger Zone",
    "settings.resetProgress": "Reset Operative Progress",
    "settings.resetHint": "Resets level, EXP, HP, and MP to starting values. This cannot be undone.",

    // Settings - Auth
    "settings.authMethod": "Authentication Method",
    "settings.authApiKey": "API Key",
    "settings.authOAuth": "OAuth (Anthropic Account)",
    "settings.oauthSignIn": "Sign in with Anthropic",
    "settings.oauthConnected": "Anthropic account connected",
    "settings.oauthSignOut": "Sign Out",
    "settings.oauthPending": "Completing sign-in...",

    // Welcome screen
    "welcome.selectProject": "Select a project to initialize operations",
    "welcome.openProject": "Open Project Folder",
    "welcome.exploreTitle": "Explore Codebase",
    "welcome.exploreDesc": "Scan project structure and discover files",
    "welcome.configureAiTitle": "Configure AI Assistant",
    "welcome.configureAiDesc": "Set up your Anthropic API key and choose a model",
    "welcome.questsTitle": "Scan Objectives",
    "welcome.questsDesc": "Find TODOs in your code and turn them into objectives",

    // Welcome (legacy)
    "welcome.back": "Operative {name} online. Clearance {level}. Operations resumed.",
    "welcome.error": "Command server unresponsive. Initialize backend to begin operations.",

    // Quests / Objectives
    "quests.active": "Active Objectives",
    "quests.completed": "Completed",
    "quests.addSample": "Add Sample Objective",
    "quests.noActive": "No active objectives",

    // File Explorer
    "explorer.refresh": "Refresh",
    "explorer.noRoot": "Set a workspace root in settings",

    // Project
    "project.selectFolder": "Select project folder",
    "project.noProject": "No project loaded",
    "project.loaded": "Project loaded",
    "project.scanning": "Scanning project...",
    "project.scanFailed": "Project scan failed",

    // Slash commands
    "slash.unknown": "Unknown command. Available: /status, /ls",
    "slash.noProject": "No project loaded. Use the folder button to select one.",

    // AI
    "ai.thinking": "Processing...",
    "ai.noApiKey": "Configure authentication in Settings to get AI responses.",
    "ai.streamError": "AI response error",
  },
  ru: {
    // Panels
    "panel.battleLog": "Журнал операций",
    "panel.quests": "Задачи",
    "panel.explorer": "Проводник",
    "panel.settings": "Настройки",

    // Stats
    "stats.level": "Уровень",
    "stats.totalExp": "Всего EXP",
    "stats.hp": "HP",
    "stats.mp": "MP",
    "stats.exp": "EXP",
    "stats.arcaneCoder": "Тактический оператор",

    // Chat
    "chat.placeholder": "Выполнить команду...",
    "chat.emptyState": "Система инициализирована. Ожидание ввода...",
    "chat.spellReceived": "Команда принята.",
    "chat.connectionLost": "Связь с командным сервером потеряна...",
    "chat.noMp": "Недостаточно энергии для операции!",

    // Command Input
    "command.placeholder": "Введите команду...",

    // Level up
    "levelUp.title": "ДОПУСК ПОВЫШЕН",
    "levelUp.continue": "Продолжить",
    "levelUp.description": "Возможности системы улучшены",

    // Files / Editor
    "editor.selectFile": "Выберите файл, чтобы начать...",
    "editor.fileSaved": "Файл сохранён",
    "editor.applyCode": "Применить код",
    "editor.unsavedChanges": "Несохранённые изменения",

    // Diff Viewer
    "diff.viewDiff": "Показать Diff",
    "diff.apply": "Применить +50 EXP",
    "diff.applied": "Изменения применены к",
    "diff.applyError": "Не удалось применить изменения",
    "diff.loading": "Загрузка редактора...",
    "diff.codeBlock": "Блок кода",

    // Settings - Tabs
    "settings.tabGeneral": "Основные",
    "settings.tabAi": "ИИ",
    "settings.tabAppearance": "Внешний вид",

    // Settings - Fields
    "settings.language": "Язык",
    "settings.workspaceRoot": "Директория проекта",
    "settings.workspaceHint": "Корневая директория проекта. Используется для проводника и сканирования.",
    "settings.browse": "Обзор",
    "settings.fontSize": "Размер шрифта",
    "settings.theme": "Тема",
    "settings.save": "Сохранить",
    "settings.saved": "Сохранено!",
    "settings.cancel": "Отмена",
    "settings.apiKey": "Ключ API Anthropic",
    "settings.apiKeyHint": "Ваш API ключ с console.anthropic.com. Хранится локально, не отправляется третьим лицам.",
    "settings.model": "Модель ИИ",
    "settings.aiConnected": "ИИ подключён и готов",
    "settings.aiNotConfigured": "API ключ не настроен",
    "settings.dangerZone": "Опасная зона",
    "settings.resetProgress": "Сбросить прогресс оператора",
    "settings.resetHint": "Сбрасывает уровень, EXP, HP и MP до начальных значений. Отменить нельзя.",

    // Settings - Auth
    "settings.authMethod": "Метод аутентификации",
    "settings.authApiKey": "API ключ",
    "settings.authOAuth": "OAuth (аккаунт Anthropic)",
    "settings.oauthSignIn": "Войти через Anthropic",
    "settings.oauthConnected": "Аккаунт Anthropic подключён",
    "settings.oauthSignOut": "Выйти",
    "settings.oauthPending": "Завершение входа...",

    // Welcome screen
    "welcome.selectProject": "Выберите проект для инициализации операций",
    "welcome.openProject": "Открыть папку проекта",
    "welcome.exploreTitle": "Исследовать проект",
    "welcome.exploreDesc": "Сканировать структуру проекта и найти файлы",
    "welcome.configureAiTitle": "Настроить ИИ-ассистента",
    "welcome.configureAiDesc": "Указать API ключ Anthropic и выбрать модель",
    "welcome.questsTitle": "Сканировать задачи",
    "welcome.questsDesc": "Найти TODO в коде и превратить их в задачи",

    // Welcome (legacy)
    "welcome.back": "Оператор {name} на связи. Допуск {level}. Операции возобновлены.",
    "welcome.error": "Командный сервер не отвечает. Запустите бэкенд для начала операций.",

    // Quests / Objectives
    "quests.active": "Активные задачи",
    "quests.completed": "Завершённые",
    "quests.addSample": "Добавить задачу",
    "quests.noActive": "Нет активных задач",

    // File Explorer
    "explorer.refresh": "Обновить",
    "explorer.noRoot": "Укажите корень проекта в настройках",

    // Project
    "project.selectFolder": "Выбрать папку проекта",
    "project.noProject": "Проект не загружен",
    "project.loaded": "Проект загружен",
    "project.scanning": "Сканирование проекта...",
    "project.scanFailed": "Ошибка сканирования проекта",

    // Slash commands
    "slash.unknown": "Неизвестная команда. Доступны: /status, /ls",
    "slash.noProject": "Проект не загружен. Используйте кнопку папки для выбора.",

    // AI
    "ai.thinking": "Обработка...",
    "ai.noApiKey": "Настройте аутентификацию в Настройках для ответов ИИ.",
    "ai.streamError": "Ошибка ответа ИИ",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
export type Locale = keyof typeof translations;

export default translations;
