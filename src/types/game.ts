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
  total_bytes_processed: number;
}

export type ActionType =
  | "message"
  | "code_apply"
  | "bug_fix"
  | "lines_written"
  | "syntax_check_pass"
  | "file_save"
  | "project_scan"
  | "git_commit";

export interface GitFileEntry {
  path: string;
  status: string;
  original_path: string | null;
}

export interface GitStatus {
  branch: string;
  remote_branch: string | null;
  ahead: number;
  behind: number;
  staged: GitFileEntry[];
  unstaged: GitFileEntry[];
  untracked: GitFileEntry[];
}

export interface GitBranch {
  name: string;
  current: boolean;
}

export interface GitCommitResponse {
  hash: string;
  message: string;
  exp_gained: number;
}

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
  toolName?: string;
  toolId?: string;
  bytesProcessed?: number;
}

export interface ImageAttachment {
  media_type: string; // "image/png", "image/jpeg", etc.
  data: string; // base64-encoded
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  type?: "message" | "action_card" | "action_log" | "health_alert" | "recall" | "blast_radius" | "command_result" | "proactive_log" | "intel_entry";
  actionCard?: ActionCardData;
  actionLog?: ActionLogData;
  images?: ImageAttachment[];
}

export interface ConversationMeta {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
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

// Chronicle types
export interface ChronicleEvent {
  id: number;
  timestamp: string;
  action_type: string;
  description: string;
  files_affected: string[];
  exp_gained: number;
  session_id: string;
}

export interface ChronicleSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_exp: number;
  total_actions: number;
}

export interface ChronicleReport {
  content: string;
  format: string;
  event_count: number;
}

export interface RecallMatch {
  session_id: string;
  session_date: string;
  files: string[];
  actions: string[];
  total_events: number;
}

export interface RecallResponse {
  has_recall: boolean;
  matches: RecallMatch[];
}

// Health / Tech Debt types
export interface HealthScores {
  complexity: number;
  coverage: number;
  cleanliness: number;
  file_size: number;
}

export interface ComplexFunction {
  file: string;
  name: string;
  lines: number;
  start_line: number;
}

export interface CodeAnomaly {
  file: string;
  line: number;
  tag: string;
  text: string;
}

export interface LargeFile {
  file: string;
  lines: number;
}

export interface HealthScanResult {
  scores: HealthScores;
  complex_functions: ComplexFunction[];
  untested_files: string[];
  anomalies: CodeAnomaly[];
  large_files: LargeFile[];
}

export interface CriticalAnomaly {
  severity: "critical" | "warning";
  category: string;
  sector: string;
  message: string;
  details: string[];
}

export interface HealthWatchResult {
  has_critical: boolean;
  anomalies: CriticalAnomaly[];
  scores: HealthScores;
}

// Dependency graph types
export interface DepNode {
  id: string;
  path: string;
  name: string;
  type: string;
  lines: number;
  extension: string;
}

export interface DepEdge {
  source: string;
  target: string;
}

export interface DepGraph {
  nodes: DepNode[];
  edges: DepEdge[];
}

// Focus types
export interface FocusStatus {
  active: boolean;
  started_at: string | null;
  duration_minutes: number;
  remaining_seconds: number;
  exp_multiplier: number;
}

// Intel log types
export interface IntelLog {
  id: number;
  timestamp: string;
  source: string;
  raw_input: string;
  intent: string;
  subtasks: string[];
  status: string;
  exp_multiplier: number;
  session_id: string;
}

export interface IntelligenceResult {
  intent: string;
  subtasks: string[];
  clarifying_question: string | null;
}

/** @deprecated Use AIModel instead */
export type ClaudeModel = AIModel;
