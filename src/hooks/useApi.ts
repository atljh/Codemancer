import { useMemo } from "react";
import type {
  Player,
  ActionType,
  ExpGainResponse,
  Quest,
  FileTreeNode,
  SyntaxCheckResponse,
  AppSettings,
  ProjectScanResult,
  ProjectContextResult,
  AIModel,
  AIProvider,
  ConversationMeta,
  ChatMessage,
  ImageAttachment,
  GitStatus,
  GitBranch,
  GitCommitResponse,
  ChronicleEvent,
  ChronicleSession,
  ChronicleReport,
  RecallResponse,
  HealthScanResult,
  HealthWatchResult,
  DepGraph,
  FocusStatus,
  IntelLog,
  IntelligenceResult,
  TelegramAnalysis,
} from "../types/game";

const API_BASE = "http://127.0.0.1:8420";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

interface ChatMessagePayload {
  role: string;
  content: string;
  images?: ImageAttachment[];
}

const api = {
  getStatus: () => fetchJson<Player>("/api/game/status"),

  performAction: (action: ActionType) =>
    fetchJson<ExpGainResponse>("/api/game/action", {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  resetPlayer: () => fetchJson<Player>("/api/game/reset", { method: "POST" }),

  awardMp: (amount = 5, reason = "voice_briefing") =>
    fetchJson<Player>("/api/game/mp_reward", {
      method: "POST",
      body: JSON.stringify({ amount, reason }),
    }),

  getQuests: () => fetchJson<Quest[]>("/api/quests/"),

  getActiveQuests: () => fetchJson<Quest[]>("/api/quests/active"),

  createQuest: (title: string, description = "", exp_reward = 50) =>
    fetchJson<Quest>("/api/quests/", {
      method: "POST",
      body: JSON.stringify({ title, description, exp_reward }),
    }),

  completeQuest: (questId: string) =>
    fetchJson<{ quest: Quest; player: Player }>(
      `/api/quests/${questId}/complete`,
      { method: "POST" },
    ),

  scanTodos: (directory: string) =>
    fetchJson<Quest[]>("/api/quests/scan", {
      method: "POST",
      body: JSON.stringify({ directory }),
    }),

  // File operations
  readFile: (path: string) =>
    fetchJson<{ content: string; language: string }>("/api/files/read", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),

  writeFile: (path: string, content: string) =>
    fetchJson<{ success: boolean; message: string }>("/api/files/write", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    }),

  getFileTree: (root: string, max_depth = 5) =>
    fetchJson<FileTreeNode[]>("/api/files/tree", {
      method: "POST",
      body: JSON.stringify({ root, max_depth }),
    }),

  checkSyntax: (path: string, content: string) =>
    fetchJson<SyntaxCheckResponse>("/api/files/check_syntax", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    }),

  searchFiles: (root: string, query: string, max_results = 100) =>
    fetchJson<{
      matches: { path: string; line: number; text: string }[];
      truncated: boolean;
    }>("/api/files/search", {
      method: "POST",
      body: JSON.stringify({ root, query, max_results }),
    }),

  // Settings
  getSettings: () => fetchJson<AppSettings>("/api/settings/"),

  updateSettings: (settings: AppSettings) =>
    fetchJson<AppSettings>("/api/settings/", {
      method: "POST",
      body: JSON.stringify(settings),
    }),

  // Project
  scanProject: (path: string, awardExp = true) =>
    fetchJson<ProjectScanResult>("/api/project/scan", {
      method: "POST",
      body: JSON.stringify({ path, award_exp: awardExp }),
    }),

  getProjectContext: (path: string) =>
    fetchJson<ProjectContextResult>("/api/project/context", {
      method: "POST",
      body: JSON.stringify({ path, award_exp: false }),
    }),

  // Chat / Claude API
  chatSend: (messages: ChatMessagePayload[], projectContext = "") =>
    fetchJson<{ content: string; model: string; tokens_used: number }>(
      "/api/chat/send",
      {
        method: "POST",
        body: JSON.stringify({ messages, project_context: projectContext }),
      },
    ),

  chatStream: (messages: ChatMessagePayload[], projectContext = "") =>
    fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, project_context: projectContext }),
    }),

  getChatModels: (provider?: AIProvider) =>
    fetchJson<AIModel[]>(
      `/api/chat/models${provider ? `?provider=${provider}` : ""}`,
    ),

  getAllChatModels: () =>
    fetchJson<Record<string, AIModel[]>>("/api/chat/models"),

  // Commands
  execCommand: (cmd: string, args: string[] = []) =>
    fetchJson<{ status: string; output: string; exit_code: number }>(
      "/api/commands/exec",
      {
        method: "POST",
        body: JSON.stringify({ cmd, args }),
      },
    ),

  // Recent projects
  getRecentProjects: () =>
    fetchJson<{ path: string; name: string; last_opened: number }[]>(
      "/api/settings/recent-projects",
    ),

  addRecentProject: (path: string, name?: string) =>
    fetchJson<{ path: string; name: string; last_opened: number }[]>(
      "/api/settings/add-project",
      {
        method: "POST",
        body: JSON.stringify({ path, name: name || "" }),
      },
    ),

  // Conversations
  getConversations: () => fetchJson<ConversationMeta[]>("/api/conversations/"),

  createConversation: () =>
    fetchJson<ConversationMeta>("/api/conversations/", { method: "POST" }),

  getConversation: (id: string) =>
    fetchJson<{
      id: string;
      title: string;
      created_at: number;
      updated_at: number;
      messages: ChatMessage[];
    }>(`/api/conversations/${id}`),

  saveMessages: (id: string, messages: ChatMessage[]) =>
    fetchJson<ConversationMeta>(`/api/conversations/${id}/messages`, {
      method: "PUT",
      body: JSON.stringify({ messages }),
    }),

  deleteConversation: (id: string) =>
    fetchJson<{ ok: boolean }>(`/api/conversations/${id}`, {
      method: "DELETE",
    }),

  renameConversation: (id: string, title: string) =>
    fetchJson<ConversationMeta>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  // Git
  gitStatus: () => fetchJson<GitStatus>("/api/git/status"),

  gitBranches: () => fetchJson<{ branches: GitBranch[] }>("/api/git/branches"),

  gitStage: (paths: string[]) =>
    fetchJson<{ ok: boolean }>("/api/git/stage", {
      method: "POST",
      body: JSON.stringify({ paths }),
    }),

  gitUnstage: (paths: string[]) =>
    fetchJson<{ ok: boolean }>("/api/git/unstage", {
      method: "POST",
      body: JSON.stringify({ paths }),
    }),

  gitCommit: (message: string) =>
    fetchJson<GitCommitResponse>("/api/git/commit", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  gitDiscard: (paths: string[]) =>
    fetchJson<{ ok: boolean }>("/api/git/discard", {
      method: "POST",
      body: JSON.stringify({ paths }),
    }),

  gitGenerateMessage: () =>
    fetchJson<{ message: string }>("/api/git/generate-message", {
      method: "POST",
    }),

  // Chronicle
  getChronicleEvents: (sessionId?: string, limit = 50, offset = 0) =>
    fetchJson<ChronicleEvent[]>(
      `/api/chronicle/events?limit=${limit}&offset=${offset}${sessionId ? `&session_id=${sessionId}` : ""}`,
    ),

  getChronicleSessions: (limit = 20) =>
    fetchJson<ChronicleSession[]>(`/api/chronicle/sessions?limit=${limit}`),

  generateReport: (format: string, sessionId?: string) =>
    fetchJson<ChronicleReport>("/api/chronicle/report", {
      method: "POST",
      body: JSON.stringify({ format, session_id: sessionId }),
    }),

  chronicleRecall: (message: string) =>
    fetchJson<RecallResponse>("/api/chronicle/recall", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Health / Tech Debt
  healthScan: () => fetchJson<HealthScanResult>("/api/health/scan"),
  healthWatch: () => fetchJson<HealthWatchResult>("/api/health/watch"),

  // Dependency graph
  getDependencyGraph: (scope?: string) =>
    fetchJson<DepGraph>("/api/deps/graph", {
      method: "POST",
      body: JSON.stringify({ scope: scope || null }),
    }),

  // Focus
  focusStart: (durationMinutes: number) =>
    fetchJson<FocusStatus>("/api/game/focus/start", {
      method: "POST",
      body: JSON.stringify({ duration_minutes: durationMinutes }),
    }),

  focusEnd: () =>
    fetchJson<FocusStatus>("/api/game/focus/end", { method: "POST" }),

  focusStatus: () => fetchJson<FocusStatus>("/api/game/focus/status"),

  replaceInFiles: (root: string, search: string, replace: string) =>
    fetchJson<{ files_modified: number; replacements_made: number }>(
      "/api/files/replace",
      {
        method: "POST",
        body: JSON.stringify({ root, search, replace }),
      },
    ),

  // Proactive analysis
  proactivePulse: () =>
    fetchJson<{
      has_findings: boolean;
      findings: {
        severity: string;
        type: string;
        message: string;
        detail: string;
      }[];
      diff_summary: string;
      changed_files: number;
    }>("/api/proactive/pulse"),

  // Intel logs
  getIntelLogs: (status?: string, limit = 50) =>
    fetchJson<IntelLog[]>(
      `/api/chronicle/intel?limit=${limit}${status ? `&status=${status}` : ""}`,
    ),

  createIntelLog: (data: {
    source: string;
    raw_input: string;
    intent: string;
    subtasks: string[];
    exp_multiplier?: number;
  }) =>
    fetchJson<IntelLog>("/api/chronicle/intel", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateIntelStatus: (intelId: number, status: string) =>
    fetchJson<{ ok: boolean }>(
      `/api/chronicle/intel/${intelId}?status=${status}`,
      {
        method: "PATCH",
      },
    ),

  // Intelligence processing
  processIntelligence: (
    rawInput: string,
    source = "text",
    projectContext = "",
  ) =>
    fetchJson<IntelligenceResult>("/api/chat/process_intelligence", {
      method: "POST",
      body: JSON.stringify({
        raw_input: rawInput,
        source,
        project_context: projectContext,
      }),
    }),

  // Telegram / COMMS
  analyzeTelegramMessage: (
    messageText: string,
    senderName: string,
    projectContext: string,
    projectFiles: string[],
  ) =>
    fetchJson<TelegramAnalysis>("/api/telegram/analyze", {
      method: "POST",
      body: JSON.stringify({
        message_text: messageText,
        sender_name: senderName,
        project_context: projectContext,
        project_files: projectFiles,
      }),
    }),

  extractTelegramQuest: (
    messageText: string,
    senderName: string,
    linkedFiles: string[],
    questTitle?: string,
  ) =>
    fetchJson<Quest>("/api/telegram/extract_quest", {
      method: "POST",
      body: JSON.stringify({
        message_text: messageText,
        sender_name: senderName,
        linked_files: linkedFiles,
        quest_title: questTitle || "",
      }),
    }),

  // Self-repair (streaming)
  selfRepairStream: () =>
    fetch(`${API_BASE}/api/repair/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
};

export { api };

export function useApi() {
  return useMemo(() => api, []);
}
