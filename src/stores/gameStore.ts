import { create } from "zustand";
import type {
  Player,
  Quest,
  ChatMessage,
  EditorFile,
  FileTreeNode,
  Locale,
  AppSettings,
  DiffViewerState,
  ActionCardData,
  ActionLogData,
  ProjectScanResult,
  ConversationMeta,
  GitStatus,
  FocusStatus,
} from "../types/game";

interface GameState {
  player: Player;
  quests: Quest[];
  messages: ChatMessage[];
  showLevelUp: boolean;
  newLevel: number;
  isForging: boolean;

  // Editor state
  currentFile: EditorFile | null;
  openFiles: EditorFile[];
  fileTree: FileTreeNode[];
  fileTreeRoot: string;
  linesWritten: number;
  lastSaveTime: number | null;
  sessionStartTime: number;

  // Diff viewer
  diffViewer: DiffViewerState;

  // i18n & settings
  locale: Locale;
  settings: AppSettings;
  showSettings: boolean;

  // Project scan
  projectScan: ProjectScanResult | null;

  // AI state
  isAiResponding: boolean;

  // Tool stats
  totalBytesProcessed: number;

  // App lifecycle
  appReady: boolean;

  // File explorer
  showFileExplorer: boolean;
  activeTab: string; // "chat" or file path

  // Git panel
  showGitPanel: boolean;
  gitStatus: GitStatus | null;

  // Conversations
  currentConversationId: string | null;
  conversations: ConversationMeta[];

  // Chronicle
  showChronicle: boolean;

  // Health panel
  showHealthPanel: boolean;
  lastHealthAlertHash: string;

  // Blast radius (pre-commit scan)
  blastRadiusFiles: string[];
  blastRadiusSource: string | null;

  // Quick open & search
  showQuickOpen: boolean;
  showSearchPanel: boolean;

  // Command palette & go to line
  showCommandPalette: boolean;
  showGoToLine: boolean;
  searchReplaceExpanded: boolean;

  // Focus
  focusStatus: FocusStatus | null;

  // Actions
  setPlayer: (player: Player) => void;
  setQuests: (quests: Quest[]) => void;
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  triggerLevelUp: (level: number) => void;
  dismissLevelUp: () => void;
  setForging: (v: boolean) => void;

  // Editor actions
  openFile: (file: EditorFile) => void;
  closeFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileSaved: (path: string) => void;
  setFileTree: (tree: FileTreeNode[]) => void;
  setFileTreeRoot: (root: string) => void;
  incrementLines: (delta: number) => void;
  resetLinesWritten: () => void;

  // Diff viewer actions
  showDiffViewer: (filePath: string, fileName: string, oldContent: string, newContent: string) => void;
  closeDiffViewer: () => void;

  // Message helpers
  addActionCard: (card: ActionCardData) => void;
  addActionLog: (log: ActionLogData) => void;
  updateLastMessage: (content: string) => void;
  updateMessageById: (id: string, content: string) => void;

  // Settings actions
  setLocale: (locale: Locale) => void;
  setSettings: (settings: AppSettings) => void;
  toggleSettings: () => void;

  // Project actions
  setProjectScan: (scan: ProjectScanResult | null) => void;

  // AI actions
  setAiResponding: (v: boolean) => void;

  // Tool stats
  addBytesProcessed: (bytes: number) => void;

  // App lifecycle
  setAppReady: (v: boolean) => void;

  // File explorer actions
  toggleFileExplorer: () => void;
  setActiveTab: (tab: string) => void;

  // Git panel actions
  toggleGitPanel: () => void;
  setGitStatus: (status: GitStatus | null) => void;

  // Conversation actions
  setCurrentConversationId: (id: string | null) => void;
  setConversations: (list: ConversationMeta[]) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;

  // Chronicle actions
  toggleChronicle: () => void;

  // Health panel actions
  toggleHealthPanel: () => void;
  setLastHealthAlertHash: (hash: string) => void;

  // Blast radius actions
  setBlastRadius: (source: string, files: string[]) => void;
  clearBlastRadius: () => void;

  // Quick open & search actions
  toggleQuickOpen: () => void;
  toggleSearchPanel: () => void;

  // Command palette & go to line actions
  toggleCommandPalette: () => void;
  setShowCommandPalette: (v: boolean) => void;
  toggleGoToLine: () => void;
  setShowGoToLine: (v: boolean) => void;
  setSearchReplaceExpanded: (v: boolean) => void;

  // Focus actions
  setFocusStatus: (status: FocusStatus | null) => void;
}

const defaultPlayer: Player = {
  name: "Codemancer",
  level: 0,
  total_exp: 0,
  exp_progress: 0,
  exp_for_next_level: 100,
  hp: 100,
  max_hp: 100,
  mp: 50,
  max_mp: 50,
  total_bytes_processed: 0,
};

const defaultSettings: AppSettings = {
  locale: "en",
  workspace_root: "",
  font_size: 14,
  theme: "dark-ops",
  anthropic_api_key: "",
  claude_model: "claude-sonnet-4-20250514",
  auth_method: "api_key",
  oauth_access_token: "",
  oauth_refresh_token: "",
  ai_provider: "anthropic",
  openai_api_key: "",
  openai_model: "gpt-4o",
  gemini_api_key: "",
  gemini_model: "gemini-2.0-flash",
  custom_base_url: "",
  custom_api_key: "",
  custom_model: "",
};

export const useGameStore = create<GameState>((set) => ({
  player: defaultPlayer,
  quests: [],
  messages: [],
  showLevelUp: false,
  newLevel: 0,
  isForging: false,

  currentFile: null,
  openFiles: [],
  fileTree: [],
  fileTreeRoot: "",
  linesWritten: 0,
  lastSaveTime: null,
  sessionStartTime: Date.now(),

  diffViewer: { show: false, filePath: "", fileName: "", oldContent: "", newContent: "" },

  locale: "en",
  settings: defaultSettings,
  showSettings: false,

  projectScan: null,
  isAiResponding: false,
  totalBytesProcessed: 0,
  appReady: false,
  showFileExplorer: false,
  activeTab: "chat",
  showGitPanel: false,
  gitStatus: null,
  currentConversationId: null,
  conversations: [],
  showChronicle: false,
  showHealthPanel: false,
  lastHealthAlertHash: "",
  blastRadiusFiles: [],
  blastRadiusSource: null,
  showQuickOpen: false,
  showSearchPanel: false,
  showCommandPalette: false,
  showGoToLine: false,
  searchReplaceExpanded: false,
  focusStatus: null,

  setPlayer: (player) => set({ player }),
  setQuests: (quests) => set({ quests }),

  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: (msg as any).id || crypto.randomUUID(), timestamp: Date.now() },
      ],
    })),

  triggerLevelUp: (level) => set({ showLevelUp: true, newLevel: level }),
  dismissLevelUp: () => set({ showLevelUp: false }),
  setForging: (v) => set({ isForging: v }),

  // Editor actions
  openFile: (file) =>
    set((s) => {
      const exists = s.openFiles.find((f) => f.path === file.path);
      if (exists) {
        return { currentFile: exists };
      }
      return {
        openFiles: [...s.openFiles, file],
        currentFile: file,
      };
    }),

  closeFile: (path) =>
    set((s) => {
      const filtered = s.openFiles.filter((f) => f.path !== path);
      const newCurrent =
        s.currentFile?.path === path
          ? filtered[filtered.length - 1] ?? null
          : s.currentFile;
      const newActiveTab =
        s.activeTab === path
          ? (newCurrent?.path ?? "chat")
          : s.activeTab;
      return { openFiles: filtered, currentFile: newCurrent, activeTab: newActiveTab };
    }),

  updateFileContent: (path, content) =>
    set((s) => {
      const openFiles = s.openFiles.map((f) =>
        f.path === path ? { ...f, content, isDirty: true } : f
      );
      const currentFile =
        s.currentFile?.path === path
          ? { ...s.currentFile, content, isDirty: true }
          : s.currentFile;
      return { openFiles, currentFile };
    }),

  markFileSaved: (path) =>
    set((s) => {
      const openFiles = s.openFiles.map((f) =>
        f.path === path ? { ...f, isDirty: false } : f
      );
      const currentFile =
        s.currentFile?.path === path
          ? { ...s.currentFile, isDirty: false }
          : s.currentFile;
      return { openFiles, currentFile, lastSaveTime: Date.now() };
    }),

  setFileTree: (tree) => set({ fileTree: tree }),
  setFileTreeRoot: (root) => set({ fileTreeRoot: root }),

  incrementLines: (delta) =>
    set((s) => ({ linesWritten: s.linesWritten + Math.max(0, delta) })),

  resetLinesWritten: () => set({ linesWritten: 0 }),

  showDiffViewer: (filePath, fileName, oldContent, newContent) =>
    set({ diffViewer: { show: true, filePath, fileName, oldContent, newContent } }),

  closeDiffViewer: () =>
    set((s) => ({ diffViewer: { ...s.diffViewer, show: false } })),

  addActionCard: (card) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: crypto.randomUUID(),
          role: "system" as const,
          content: card.fileName,
          timestamp: Date.now(),
          type: "action_card" as const,
          actionCard: card,
        },
      ],
    })),

  addActionLog: (log) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: crypto.randomUUID(),
          role: "system" as const,
          content: log.action,
          timestamp: Date.now(),
          type: "action_log" as const,
          actionLog: log,
        },
      ],
    })),

  updateLastMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        msgs[msgs.length - 1] = { ...last, content };
      }
      return { messages: msgs };
    }),

  updateMessageById: (id, content) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    })),

  setLocale: (locale) =>
    set((s) => ({ locale, settings: { ...s.settings, locale } })),

  setSettings: (settings) =>
    set({ settings, locale: settings.locale }),

  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),

  setProjectScan: (scan) => set({ projectScan: scan }),

  setAiResponding: (v) => set({ isAiResponding: v }),

  addBytesProcessed: (bytes) =>
    set((s) => ({ totalBytesProcessed: s.totalBytesProcessed + bytes })),

  setAppReady: (v) => set({ appReady: v }),

  // File explorer actions
  toggleFileExplorer: () => set((s) => ({ showFileExplorer: !s.showFileExplorer })),
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Git panel actions
  toggleGitPanel: () => set((s) => ({ showGitPanel: !s.showGitPanel })),
  setGitStatus: (status) => set({ gitStatus: status }),

  // Conversation actions
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setConversations: (list) => set({ conversations: list }),
  setMessages: (msgs) => set({ messages: msgs }),
  clearMessages: () => set({ messages: [], currentConversationId: null }),

  // Chronicle
  toggleChronicle: () => set((s) => ({ showChronicle: !s.showChronicle })),

  // Health panel
  toggleHealthPanel: () => set((s) => ({ showHealthPanel: !s.showHealthPanel })),
  setLastHealthAlertHash: (hash) => set({ lastHealthAlertHash: hash }),

  // Blast radius
  setBlastRadius: (source, files) => set({ blastRadiusSource: source, blastRadiusFiles: files }),
  clearBlastRadius: () => set({ blastRadiusSource: null, blastRadiusFiles: [] }),

  // Quick open & search
  toggleQuickOpen: () => set((s) => ({ showQuickOpen: !s.showQuickOpen })),
  toggleSearchPanel: () => set((s) => ({ showSearchPanel: !s.showSearchPanel })),

  // Command palette & go to line
  toggleCommandPalette: () => set((s) => ({ showCommandPalette: !s.showCommandPalette })),
  setShowCommandPalette: (v) => set({ showCommandPalette: v }),
  toggleGoToLine: () => set((s) => ({ showGoToLine: !s.showGoToLine })),
  setShowGoToLine: (v) => set({ showGoToLine: v }),
  setSearchReplaceExpanded: (v) => set({ searchReplaceExpanded: v }),

  // Focus
  setFocusStatus: (status) => set({ focusStatus: status }),
}));
