export interface Player {
  name: string;
  level: number;
  total_exp: number;
  exp_progress: number;
  exp_for_next_level: number;
  hp: number;
  max_hp: number;
  mp: number;
  max_mp: number;
}

export type ActionType =
  | "message"
  | "code_apply"
  | "bug_fix"
  | "lines_written"
  | "syntax_check_pass"
  | "file_save"
  | "project_scan";

export interface ExpGainResponse {
  exp_gained: number;
  player: Player;
  leveled_up: boolean;
  new_level: number | null;
}

export type QuestStatus = "active" | "completed" | "failed";

export interface Quest {
  id: string;
  title: string;
  description: string;
  exp_reward: number;
  status: QuestStatus;
  source_file: string | null;
  line_number: number | null;
}

export interface ActionCardData {
  fileName: string;
  status: string;
  filePath: string;
  oldContent?: string;
  newContent?: string;
  expGained?: number;
}

export interface ActionLogData {
  action: string;
  status: "pending" | "done" | "error";
  expGained?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  type?: "message" | "action_card" | "action_log";
  actionCard?: ActionCardData;
  actionLog?: ActionLogData;
}

export interface DiffViewerState {
  show: boolean;
  filePath: string;
  fileName: string;
  oldContent: string;
  newContent: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileTreeNode[];
}

export interface EditorFile {
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export interface SyntaxCheckResponse {
  errors: { line: number; column: number; message: string }[];
  valid: boolean;
}

export type Locale = "en" | "ru";

export type AuthMethod = "api_key" | "oauth";

export type AIProvider = "anthropic" | "openai" | "gemini" | "custom";

export type ThemeId = "dark-ops" | "midnight" | "phantom" | "arctic";

export interface AIModel {
  id: string;
  name: string;
  description: string;
}

export interface AppSettings {
  locale: Locale;
  workspace_root: string;
  font_size: number;
  theme: ThemeId;
  anthropic_api_key: string;
  claude_model: string;
  auth_method: AuthMethod;
  oauth_access_token: string;
  oauth_refresh_token: string;
  // Multi-provider fields
  ai_provider: AIProvider;
  openai_api_key: string;
  openai_model: string;
  gemini_api_key: string;
  gemini_model: string;
  custom_base_url: string;
  custom_api_key: string;
  custom_model: string;
}

export interface ProjectScanResult {
  path: string;
  total_files: number;
  total_dirs: number;
  key_files: string[];
  file_types: Record<string, number>;
  exp_gained: number;
}

export interface ProjectContextResult extends ProjectScanResult {
  summary: string;
}

/** @deprecated Use AIModel instead */
export type ClaudeModel = AIModel;
