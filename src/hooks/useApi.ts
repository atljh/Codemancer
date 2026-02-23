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
}

const api = {
  getStatus: () => fetchJson<Player>("/api/game/status"),

  performAction: (action: ActionType) =>
    fetchJson<ExpGainResponse>("/api/game/action", {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  resetPlayer: () =>
    fetchJson<Player>("/api/game/reset", { method: "POST" }),

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
      { method: "POST" }
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
    fetchJson<{ content: string; model: string; tokens_used: number }>("/api/chat/send", {
      method: "POST",
      body: JSON.stringify({ messages, project_context: projectContext }),
    }),

  chatStream: (messages: ChatMessagePayload[], projectContext = "") =>
    fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, project_context: projectContext }),
    }),

  getChatModels: (provider?: AIProvider) =>
    fetchJson<AIModel[]>(`/api/chat/models${provider ? `?provider=${provider}` : ""}`),

  getAllChatModels: () =>
    fetchJson<Record<string, AIModel[]>>("/api/chat/models"),

  // Commands
  execCommand: (cmd: string, args: string[] = []) =>
    fetchJson<{ status: string; output: string; exit_code: number }>("/api/commands/exec", {
      method: "POST",
      body: JSON.stringify({ cmd, args }),
    }),

  // Recent projects
  getRecentProjects: () =>
    fetchJson<{ path: string; name: string; last_opened: number }[]>("/api/settings/recent-projects"),

  addRecentProject: (path: string, name?: string) =>
    fetchJson<{ path: string; name: string; last_opened: number }[]>("/api/settings/add-project", {
      method: "POST",
      body: JSON.stringify({ path, name: name || "" }),
    }),
};

export function useApi() {
  return useMemo(() => api, []);
}
