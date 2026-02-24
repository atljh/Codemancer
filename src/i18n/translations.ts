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
    "chat.missionLogs": "Mission Logs",
    "chat.newMission": "New Mission",
    "chat.deleteConfirm": "Delete this conversation?",
    "chat.noConversations": "No missions yet",

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
    "explorer.title": "Explorer",
    "explorer.refresh": "Refresh",
    "explorer.noRoot": "Set a workspace root in settings",
    "explorer.empty": "No project loaded",
    "explorer.collapse": "Collapse",
    "explorer.openFile": "Open",

    // Editor tabs
    "editor.tabs.chat": "Chat",
    "editor.closeTab": "Close",
    "editor.save": "Save",
    "editor.savedSuccess": "File saved +5 EXP",

    // AI commit
    "git.generateMessage": "Generate commit message",
    "git.generating": "Generating...",
    "git.noStagedForAi": "Stage files first",
    "git.aiError": "Failed to generate message",

    // Project
    "project.selectFolder": "Select project folder",
    "project.noProject": "No project loaded",
    "project.loaded": "Project loaded",
    "project.scanning": "Scanning project...",
    "project.scanFailed": "Project scan failed",

    // Slash commands
    "slash.unknown": "Unknown command. Available: /status, /ls, /commit, /push, /git-status, /git-diff, /git-log",
    "slash.noProject": "No project loaded. Use the folder button to select one.",
    "slash.commitNoMsg": "Usage: /commit <message>",

    // AI
    "ai.thinking": "Processing...",
    "ai.noApiKey": "Configure authentication in Settings to get AI responses.",
    "ai.streamError": "AI response error",

    // Tool events
    "tool.scanning": "Scanning sector",
    "tool.reading": "Extracting data",
    "tool.writing": "Deploying patch",
    "tool.searching": "Signal sweep",
    "tool.executing": "Executing",
    "tool.runCommand": "Executing command",
    "tool.cmdSuccess": "Command completed successfully",
    "tool.cmdFailed": "Command failed — HP damage: -{hp}",
    "tool.cmdRepairHint": "Analyzing failure... initiating repair protocol",
    "tool.dataAcquired": "Data acquired",
    "tool.success": "Success",
    "tool.fault": "Fault",
    "stats.data": "DATA",

    // Multi-provider settings
    "settings.aiProvider": "AI Provider",
    "settings.providerAnthropic": "Anthropic",
    "settings.providerOpenAI": "OpenAI",
    "settings.providerGemini": "Gemini",
    "settings.providerCustom": "Custom",
    "settings.openaiApiKey": "OpenAI API Key",
    "settings.openaiApiKeyHint": "Your API key from platform.openai.com. Stored locally.",
    "settings.geminiApiKey": "Gemini API Key",
    "settings.geminiApiKeyHint": "Your API key from aistudio.google.com. Stored locally.",
    "settings.customBaseUrl": "Base URL",
    "settings.customBaseUrlHint": "OpenAI-compatible endpoint (e.g. http://localhost:11434/v1 for Ollama).",
    "settings.customApiKey": "API Key (optional)",
    "settings.customApiKeyHint": "API key for the custom endpoint, if required.",
    "settings.customModel": "Model Name",
    "settings.customModelHint": "Enter the model identifier (e.g. llama3, mixtral).",
    "settings.customModelPlaceholder": "model-name",

    // Git panel
    "git.panelTitle": "Git Status",
    "git.staged": "Staged",
    "git.unstaged": "Changes",
    "git.untracked": "Untracked",
    "git.commit": "Commit",
    "git.commitPlaceholder": "Commit message...",
    "git.noChanges": "Working tree clean",
    "git.notARepo": "Not a git repository",
    "git.discardConfirm": "Discard changes to {path}?",
    "git.committed": "Committed",
    "git.stageAll": "Stage All",
    "git.unstageAll": "Unstage All",
    "git.discard": "Discard",

    // Chronicle
    "chronicle.title": "Session Chronicle",
    "chronicle.events": "Events",
    "chronicle.sessions": "Sessions",
    "chronicle.noEvents": "No events recorded yet",
    "chronicle.generateReport": "GENERATE INTEL REPORT",
    "chronicle.generating": "Generating...",
    "chronicle.reportFormat": "Report Format",
    "chronicle.pr": "Pull Request",
    "chronicle.standup": "Standup",
    "chronicle.jira": "Jira",
    "chronicle.copied": "Copied to clipboard",
    "chronicle.copy": "Copy",
    "chronicle.error": "Report generation failed",
    "chronicle.recallPrefix": "[RECALLING_DATA]: Previously we worked on this module (session from {date}). Current changes build on the previous patch.",
    "chronicle.recallFiles": "Files affected",
    "chronicle.recallActions": "Past actions",

    // Health
    "health.title": "THREAT ASSESSMENT",
    "health.scanning": "Scanning...",
    "health.complexity": "Complexity",
    "health.coverage": "Coverage",
    "health.cleanliness": "Cleanliness",
    "health.fileSize": "File Size",
    "health.complexFunctions": "Complex Functions",
    "health.untestedFiles": "Untested Files",
    "health.anomalies": "Code Anomalies",
    "health.largeFiles": "Large Files",
    "health.lines": "lines",
    "health.noIssues": "All clear",
    "health.error": "Scan failed",
    "health.stabilize": "Initiate stabilization",
    "health.alertDismissed": "Alert acknowledged",
    "health.alertCritical": "[CRITICAL_ANOMALY]: Instability detected in sector `{sector}`. Bug probability elevated.",
    "health.alertFileSize": "Detected {count} file(s) exceeding 500 lines",
    "health.alertComplexity": "Detected {count} function(s) exceeding 100 lines",
    "health.alertScoreLow": "{category} score critically low: {value}/100",
    "health.alertBugMarkers": "High concentration of BUG/FIXME markers: {count}",
    "health.alertStabilize": "Initiate stabilization operation?",
    "health.catFileSize": "FILE SIZE",
    "health.catComplexity": "COMPLEXITY",
    "health.catCoverage": "COVERAGE",
    "health.catCleanliness": "CLEANLINESS",

    // Blast Radius
    "blast.warning": "[TACTICAL_WARNING]: High blast radius. Damaging this node will affect {count} dependent systems.",
    "blast.low": "[PRE_COMMIT_SCAN]: Blast radius: {count} dependent file(s).",
    "blast.dependents": "Affected systems",
    "blast.openMap": "Show on tactical map",

    // Map
    "map.title": "Tactical Map",
    "map.loading": "Building graph...",
    "map.noData": "No dependency data",
    "map.dependencies": "Dependencies",
    "map.dependents": "Dependents",
    "map.files": "files",
    "map.lines": "lines",
    "map.error": "Graph build failed",
    "map.tab": "MAP",
    "map.resetView": "Reset View",
    "map.fogOfWar": "Fog of War",

    // Quick Open
    "quickOpen.placeholder": "Search files by name...",
    "quickOpen.noResults": "No matching files",

    // Search
    "search.title": "Search in Files",
    "search.placeholder": "Search...",
    "search.hint": "Type to search across project files",
    "search.noResults": "No results found",
    "search.truncated": "Results truncated — refine your query",

    // Command Palette
    "cmd.palette.placeholder": "Type a command...",
    "cmd.palette.noResults": "No matching commands",
    "cmd.newConversation": "New Conversation",
    "cmd.openProject": "Open Project",
    "cmd.quickOpen": "Quick Open File",
    "cmd.save": "Save File",
    "cmd.closeTab": "Close Tab",
    "cmd.newFile": "New File",
    "cmd.toggleExplorer": "Toggle Explorer",
    "cmd.toggleGit": "Toggle Git Panel",
    "cmd.toggleChronicle": "Toggle Chronicle",
    "cmd.toggleHealth": "Toggle Health Panel",
    "cmd.toggleSettings": "Open Settings",
    "cmd.zoomIn": "Zoom In",
    "cmd.zoomOut": "Zoom Out",
    "cmd.zoomReset": "Reset Zoom",
    "cmd.prevTab": "Previous Tab",
    "cmd.nextTab": "Next Tab",
    "cmd.goToLine": "Go to Line",
    "cmd.findInFile": "Find in File",
    "cmd.replaceInFile": "Find & Replace in File",
    "cmd.searchFiles": "Search in Files",
    "cmd.replaceInFiles": "Replace in Files",
    "cmd.toggleFocus": "Toggle Focus Mode",
    "cmd.gitStatus": "Git Status",
    "cmd.scanTodos": "Scan TODOs",
    "cmd.commandPalette": "Command Palette",

    // Go to Line
    "goToLine.label": "Go to Line",
    "goToLine.placeholder": "Line number",

    // Search Replace
    "search.toggleReplace": "Toggle Replace",
    "search.replacePlaceholder": "Replace with...",
    "search.replaceAll": "Replace All",
    "search.replacing": "Replacing...",
    "search.replaceConfirm": "Replace all occurrences in project files?",

    // Focus
    "focus.title": "Mission Focus",
    "focus.start": "Focus",
    "focus.stop": "End Focus",
    "focus.active": "DEEP FOCUS",
    "focus.expBoost": "x2 EXP",
    "focus.min25": "25 MIN",
    "focus.min50": "50 MIN",
    "focus.lostSync": "Focus lost — window unfocused",
    "focus.expired": "Focus session complete",

    // Mission Objective
    "mission.label": "CURRENT OBJECTIVE",
    "mission.noObjective": "No active objective — scan TODOs or create one",
    "mission.scanHint": "No objectives found. Scan your project for TODOs or create one manually.",
    "mission.scanTodos": "Scan TODOs from code",
    "mission.complete": "Mark as complete",

    // Voice input
    "voice.start": "Start voice input",
    "voice.stop": "Stop recording",
    "voice.listening": "Listening...",
    "voice.noSupport": "Voice input not supported in this browser",

    // Audio settings
    "audio.tts": "Voice Output (TTS)",
    "audio.sounds": "Sound Effects",

    // Proactive analysis
    "proactive.header": "[PROACTIVE_LOG]: Background process analysis complete.",
    "proactive.changedFiles": "Detected {count} modified file(s) in workspace.",
    "proactive.suggestion": "Operator, shall we initiate stabilization protocol?",

    // Waveform
    "waveform.thinking": "Processing",
    "waveform.idle": "Standby",

    // Intel Feed
    "intel.title": "INTEL FEED",
    "intel.empty": "No intelligence entries yet. Use voice or text briefings to add operational data.",
    "intel.voiceTag": "VOICE",
    "intel.textTag": "TEXT",
    "intel.proactiveTag": "AUTO",
    "intel.intent": "Intent",
    "intel.subtasks": "Subtasks",
    "intel.question": "Clarification needed",
    "intel.pending": "Pending",
    "intel.active": "Active",
    "intel.done": "Complete",
    "intel.archived": "Archived",
    "intel.processing": "Processing intelligence...",
    "intel.processed": "[INTEL_PROCESSED]: Briefing analyzed. Intent formulated. Subtasks generated.",
    "intel.voiceCommand": "[VOICE_COMMAND]",
    "intel.expBonus": "x1.5 EXP (briefing bonus)",
    "intel.mpReward": "+5 MP (voice briefing)",
    "cmd.toggleIntelFeed": "Intel Feed",

    // Images
    "image.attach": "Attach image",
    "image.drop": "Drop image here",
    "image.pasteHint": "Paste image from clipboard (Cmd+V)",
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
    "chat.missionLogs": "Журнал миссий",
    "chat.newMission": "Новая миссия",
    "chat.deleteConfirm": "Удалить этот диалог?",
    "chat.noConversations": "Миссий пока нет",

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
    "explorer.title": "Проводник",
    "explorer.refresh": "Обновить",
    "explorer.noRoot": "Укажите корень проекта в настройках",
    "explorer.empty": "Проект не загружен",
    "explorer.collapse": "Свернуть",
    "explorer.openFile": "Открыть",

    // Editor tabs
    "editor.tabs.chat": "Чат",
    "editor.closeTab": "Закрыть",
    "editor.save": "Сохранить",
    "editor.savedSuccess": "Файл сохранён +5 EXP",

    // AI commit
    "git.generateMessage": "Сгенерировать сообщение коммита",
    "git.generating": "Генерация...",
    "git.noStagedForAi": "Сначала добавьте файлы",
    "git.aiError": "Не удалось сгенерировать сообщение",

    // Project
    "project.selectFolder": "Выбрать папку проекта",
    "project.noProject": "Проект не загружен",
    "project.loaded": "Проект загружен",
    "project.scanning": "Сканирование проекта...",
    "project.scanFailed": "Ошибка сканирования проекта",

    // Slash commands
    "slash.unknown": "Неизвестная команда. Доступны: /status, /ls, /commit, /push, /git-status, /git-diff, /git-log",
    "slash.noProject": "Проект не загружен. Используйте кнопку папки для выбора.",
    "slash.commitNoMsg": "Использование: /commit <сообщение>",

    // AI
    "ai.thinking": "Обработка...",
    "ai.noApiKey": "Настройте аутентификацию в Настройках для ответов ИИ.",
    "ai.streamError": "Ошибка ответа ИИ",

    // Tool events
    "tool.scanning": "Сканирование сектора",
    "tool.reading": "Извлечение данных",
    "tool.writing": "Развёртывание патча",
    "tool.searching": "Обзор сигналов",
    "tool.executing": "Выполнение",
    "tool.runCommand": "Выполнение команды",
    "tool.cmdSuccess": "Команда выполнена успешно",
    "tool.cmdFailed": "Команда провалена — урон HP: -{hp}",
    "tool.cmdRepairHint": "Анализ ошибки... запуск протокола ремонта",
    "tool.dataAcquired": "Данные получены",
    "tool.success": "Успех",
    "tool.fault": "Ошибка",
    "stats.data": "ДАННЫЕ",

    // Multi-provider settings
    "settings.aiProvider": "Провайдер ИИ",
    "settings.providerAnthropic": "Anthropic",
    "settings.providerOpenAI": "OpenAI",
    "settings.providerGemini": "Gemini",
    "settings.providerCustom": "Другой",
    "settings.openaiApiKey": "Ключ API OpenAI",
    "settings.openaiApiKeyHint": "Ваш API ключ с platform.openai.com. Хранится локально.",
    "settings.geminiApiKey": "Ключ API Gemini",
    "settings.geminiApiKeyHint": "Ваш API ключ с aistudio.google.com. Хранится локально.",
    "settings.customBaseUrl": "Базовый URL",
    "settings.customBaseUrlHint": "OpenAI-совместимый эндпоинт (напр. http://localhost:11434/v1 для Ollama).",
    "settings.customApiKey": "API ключ (опционально)",
    "settings.customApiKeyHint": "API ключ для кастомного эндпоинта, если требуется.",
    "settings.customModel": "Имя модели",
    "settings.customModelHint": "Введите идентификатор модели (напр. llama3, mixtral).",
    "settings.customModelPlaceholder": "имя-модели",

    // Git panel
    "git.panelTitle": "Git статус",
    "git.staged": "Подготовлено",
    "git.unstaged": "Изменения",
    "git.untracked": "Неотслеживаемые",
    "git.commit": "Коммит",
    "git.commitPlaceholder": "Сообщение коммита...",
    "git.noChanges": "Рабочее дерево чисто",
    "git.notARepo": "Не git-репозиторий",
    "git.discardConfirm": "Откатить изменения в {path}?",
    "git.committed": "Закоммичено",
    "git.stageAll": "Добавить всё",
    "git.unstageAll": "Убрать всё",
    "git.discard": "Откатить",

    // Chronicle
    "chronicle.title": "Хроника сессии",
    "chronicle.events": "События",
    "chronicle.sessions": "Сессии",
    "chronicle.noEvents": "Событий пока нет",
    "chronicle.generateReport": "СГЕНЕРИРОВАТЬ ОТЧЁТ",
    "chronicle.generating": "Генерация...",
    "chronicle.reportFormat": "Формат отчёта",
    "chronicle.pr": "Pull Request",
    "chronicle.standup": "Стендап",
    "chronicle.jira": "Jira",
    "chronicle.copied": "Скопировано",
    "chronicle.copy": "Копировать",
    "chronicle.error": "Ошибка генерации отчёта",
    "chronicle.recallPrefix": "[RECALLING_DATA]: Ранее мы работали над этим модулем (сессия от {date}). Текущие изменения дополняют прошлый патч.",
    "chronicle.recallFiles": "Затронутые файлы",
    "chronicle.recallActions": "Прошлые действия",

    // Health
    "health.title": "ОЦЕНКА УГРОЗ",
    "health.scanning": "Сканирование...",
    "health.complexity": "Сложность",
    "health.coverage": "Покрытие",
    "health.cleanliness": "Чистота",
    "health.fileSize": "Размер файлов",
    "health.complexFunctions": "Сложные функции",
    "health.untestedFiles": "Непротестированные файлы",
    "health.anomalies": "Аномалии кода",
    "health.largeFiles": "Большие файлы",
    "health.lines": "строк",
    "health.noIssues": "Всё чисто",
    "health.error": "Ошибка сканирования",
    "health.stabilize": "Начать стабилизацию",
    "health.alertDismissed": "Тревога принята",
    "health.alertCritical": "[CRITICAL_ANOMALY]: Обнаружена нестабильность в секторе `{sector}`. Вероятность багов повышена.",
    "health.alertFileSize": "Обнаружено {count} файл(ов) свыше 500 строк",
    "health.alertComplexity": "Обнаружено {count} функций свыше 100 строк",
    "health.alertScoreLow": "Показатель «{category}» критически низок: {value}/100",
    "health.alertBugMarkers": "Высокая концентрация маркеров BUG/FIXME: {count}",
    "health.alertStabilize": "Начать операцию по стабилизации?",
    "health.catFileSize": "РАЗМЕР ФАЙЛОВ",
    "health.catComplexity": "СЛОЖНОСТЬ",
    "health.catCoverage": "ПОКРЫТИЕ",
    "health.catCleanliness": "ЧИСТОТА",

    // Blast Radius
    "blast.warning": "[TACTICAL_WARNING]: Высокий радиус поражения (Blast Radius). Повреждение этого узла затронет {count} зависимых систем.",
    "blast.low": "[PRE_COMMIT_SCAN]: Радиус поражения: {count} зависимый файл(ов).",
    "blast.dependents": "Затронутые системы",
    "blast.openMap": "Показать на тактической карте",

    // Map
    "map.title": "Тактическая карта",
    "map.loading": "Построение графа...",
    "map.noData": "Нет данных о зависимостях",
    "map.dependencies": "Зависимости",
    "map.dependents": "Зависимые",
    "map.files": "файлов",
    "map.lines": "строк",
    "map.error": "Ошибка построения графа",
    "map.tab": "КАРТА",
    "map.resetView": "Сброс вида",
    "map.fogOfWar": "Туман войны",

    // Quick Open
    "quickOpen.placeholder": "Поиск файлов по имени...",
    "quickOpen.noResults": "Файлы не найдены",

    // Search
    "search.title": "Поиск по файлам",
    "search.placeholder": "Поиск...",
    "search.hint": "Введите запрос для поиска по файлам проекта",
    "search.noResults": "Ничего не найдено",
    "search.truncated": "Результаты обрезаны — уточните запрос",

    // Command Palette
    "cmd.palette.placeholder": "Введите команду...",
    "cmd.palette.noResults": "Команды не найдены",
    "cmd.newConversation": "Новый диалог",
    "cmd.openProject": "Открыть проект",
    "cmd.quickOpen": "Быстрое открытие файла",
    "cmd.save": "Сохранить файл",
    "cmd.closeTab": "Закрыть вкладку",
    "cmd.newFile": "Новый файл",
    "cmd.toggleExplorer": "Проводник",
    "cmd.toggleGit": "Git панель",
    "cmd.toggleChronicle": "Хроника",
    "cmd.toggleHealth": "Оценка угроз",
    "cmd.toggleSettings": "Настройки",
    "cmd.zoomIn": "Увеличить",
    "cmd.zoomOut": "Уменьшить",
    "cmd.zoomReset": "Сбросить масштаб",
    "cmd.prevTab": "Предыдущая вкладка",
    "cmd.nextTab": "Следующая вкладка",
    "cmd.goToLine": "Перейти к строке",
    "cmd.findInFile": "Поиск в файле",
    "cmd.replaceInFile": "Поиск и замена в файле",
    "cmd.searchFiles": "Поиск по файлам",
    "cmd.replaceInFiles": "Замена в файлах",
    "cmd.toggleFocus": "Режим фокуса",
    "cmd.gitStatus": "Git статус",
    "cmd.scanTodos": "Сканировать TODO",
    "cmd.commandPalette": "Палитра команд",

    // Go to Line
    "goToLine.label": "Перейти к строке",
    "goToLine.placeholder": "Номер строки",

    // Search Replace
    "search.toggleReplace": "Показать замену",
    "search.replacePlaceholder": "Заменить на...",
    "search.replaceAll": "Заменить всё",
    "search.replacing": "Замена...",
    "search.replaceConfirm": "Заменить все вхождения в файлах проекта?",

    // Focus
    "focus.title": "Фокус миссии",
    "focus.start": "Фокус",
    "focus.stop": "Завершить",
    "focus.active": "ГЛУБОКИЙ ФОКУС",
    "focus.expBoost": "x2 EXP",
    "focus.min25": "25 МИН",
    "focus.min50": "50 МИН",
    "focus.lostSync": "Фокус потерян — окно неактивно",
    "focus.expired": "Сессия фокуса завершена",

    // Mission Objective
    "mission.label": "ТЕКУЩАЯ ЦЕЛЬ",
    "mission.noObjective": "Нет активной цели — сканируй TODO или создай вручную",
    "mission.scanHint": "Цели не найдены. Сканируй проект на TODO или создай задачу вручную.",
    "mission.scanTodos": "Сканировать TODO из кода",
    "mission.complete": "Завершить задачу",

    // Voice input
    "voice.start": "Голосовой ввод",
    "voice.stop": "Остановить запись",
    "voice.listening": "Слушаю...",
    "voice.noSupport": "Голосовой ввод не поддерживается в этом браузере",

    // Audio settings
    "audio.tts": "Голосовой вывод (TTS)",
    "audio.sounds": "Звуковые эффекты",

    // Proactive analysis
    "proactive.header": "[PROACTIVE_LOG]: Анализ фоновых процессов завершён.",
    "proactive.changedFiles": "Обнаружено {count} изменённых файл(ов) в рабочем пространстве.",
    "proactive.suggestion": "Оператор, инициировать протокол стабилизации?",

    // Waveform
    "waveform.thinking": "Обработка",
    "waveform.idle": "Режим ожидания",

    // Intel Feed
    "intel.title": "РАЗВЕДДАННЫЕ",
    "intel.empty": "Записей нет. Используй голосовые или текстовые брифинги для добавления оперативных данных.",
    "intel.voiceTag": "ГОЛОС",
    "intel.textTag": "ТЕКСТ",
    "intel.proactiveTag": "АВТО",
    "intel.intent": "Намерение",
    "intel.subtasks": "Подзадачи",
    "intel.question": "Требуется уточнение",
    "intel.pending": "Ожидание",
    "intel.active": "Активно",
    "intel.done": "Выполнено",
    "intel.archived": "В архиве",
    "intel.processing": "Обработка разведданных...",
    "intel.processed": "[INTEL_PROCESSED]: Брифинг проанализирован. Намерение сформулировано. Подзадачи сгенерированы.",
    "intel.voiceCommand": "[VOICE_COMMAND]",
    "intel.expBonus": "x1.5 EXP (бонус брифинга)",
    "intel.mpReward": "+5 MP (голосовой брифинг)",
    "cmd.toggleIntelFeed": "Разведданные",

    // Images
    "image.attach": "Прикрепить изображение",
    "image.drop": "Перетащите изображение сюда",
    "image.pasteHint": "Вставьте изображение из буфера обмена (Cmd+V)",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
export type Locale = keyof typeof translations;

export default translations;
