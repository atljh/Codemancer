export interface AgentStatus {
  name: string;
  known_files_count: number;
  total_files: number;
  total_bytes_processed: number;
  integrity_score: number; // 0-100
  focus_active: boolean;
}

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
}

export type QuestStatus = "active" | "completed" | "failed";

export interface Quest {
  id: string;
  title: string;
  description: string;
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
}

export interface ActionLogData {
  action: string;
  status: "pending" | "done" | "error";
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
  type?:
    | "message"
    | "action_card"
    | "action_log"
    | "health_alert"
    | "recall"
    | "blast_radius"
    | "command_result"
    | "proactive_log"
    | "intel_entry"
    | "agent_proposal";
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

export type ThemeId = "dark-ops" | "midnight" | "phantom" | "arctic" | "hacker";

export type SoundPackId = "default" | "jarvis" | "pipboy" | "retro";

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
  telegram_api_id: string;
  telegram_api_hash: string;
  sound_pack: SoundPackId;
  // Signal Refinery — GitHub
  github_token: string;
  github_owner: string;
  github_repo: string;
  signal_github_enabled: boolean;
  signal_github_poll_interval: number;
  // Signal Refinery — Jira
  jira_base_url: string;
  jira_email: string;
  jira_api_token: string;
  signal_jira_enabled: boolean;
  signal_jira_poll_interval: number;
  // Signal Refinery — Slack
  slack_bot_token: string;
  slack_channels: string;
  signal_slack_enabled: boolean;
  signal_slack_poll_interval: number;
  // AI Triage
  signal_ai_triage_enabled: boolean;
  signal_hide_low_priority: boolean;
  // Agentic Supervisor
  supervisor_enabled: boolean;
  supervisor_sandbox_mode: boolean;
}

export interface ProjectScanResult {
  path: string;
  total_files: number;
  total_dirs: number;
  key_files: string[];
  file_types: Record<string, number>;
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
  session_id: string;
}

export interface IntelligenceResult {
  intent: string;
  subtasks: string[];
  clarifying_question: string | null;
}

export interface TelegramDialog {
  id: string;
  title: string;
  unreadCount: number;
  isUser: boolean;
  isGroup: boolean;
  isChannel: boolean;
  lastMessage: string;
  lastMessageDate: number;
}

export interface TelegramMedia {
  type:
    | "photo"
    | "video"
    | "document"
    | "gif"
    | "sticker"
    | "voice"
    | "webpage";
  url?: string;
  fileName?: string;
  mimeType?: string;
  webpageTitle?: string;
  webpageDescription?: string;
  webpageUrl?: string;
}

export interface TelegramMessage {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  date: number;
  out: boolean;
  linkedFiles?: string[];
  media?: TelegramMedia;
}

export interface TelegramAnalysis {
  has_references: boolean;
  linked_files: string[];
  summary: string;
  quest_suggestion: string | null;
}

// MissionControl types
export type SignalSource =
  | "TELEGRAM"
  | "CODE_TODO"
  | "LSP_ERRORS"
  | "GITHUB"
  | "JIRA"
  | "SLACK";

export type OperationStatus =
  | "ANALYSIS"
  | "DEPLOYING"
  | "TESTING"
  | "COMPLETED";

export interface MissionSignal {
  id: string;
  source: SignalSource;
  content: string;
  file_path: string | null;
  line_number: number | null;
  timestamp: string;
  priority: number;
  url: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
}

export interface Operation {
  id: string;
  title: string;
  description: string;
  status: OperationStatus;
  signals: MissionSignal[];
  related_sectors: string[];
  created_at: string;
  updated_at: string;
  children: string[];
  parent_id: string | null;
}

export interface MissionScanResult {
  signals: MissionSignal[];
  operations_created: number;
  total_signals: number;
}

export interface MissionStatus {
  total_operations: number;
  by_status: Record<OperationStatus, number>;
  total_signals: number;
  last_scan: string | null;
}

// Signal Refinery types
export interface UnifiedSignal {
  id: string;
  source: string;
  external_id: string;
  title: string;
  content: string;
  url: string | null;
  file_path: string | null;
  line_number: number | null;
  priority: number;
  status: string;
  reason: string | null;
  provider_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  fetched_at: string;
  operation_id: string | null;
}

export interface RefineryProviderStatus {
  name: string;
  configured: boolean;
  enabled: boolean;
  last_poll: string | null;
  error_count: number;
  last_error: string | null;
}

export interface RefineryStatus {
  providers: Record<string, RefineryProviderStatus>;
  total_signals: number;
  new_signals: number;
  polling_active: boolean;
}

// Agentic Supervisor types
export type PlanStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "simulated";

export type PlanStatus =
  | "proposed"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "dismissed";

export interface PlanStep {
  index: number;
  tool: string;
  description: string;
  input: Record<string, unknown>;
  status: PlanStepStatus;
  result_summary: string | null;
  old_content: string | null;
  new_content: string | null;
  file_path: string | null;
}

export interface ActionPlan {
  id: string;
  signal_id: string;
  signal_title: string;
  signal_reason: string | null;
  steps: PlanStep[];
  status: PlanStatus;
  sandbox_mode: boolean;
  created_at: string;
  updated_at: string;
  affected_files: string[];
  execution_log: string[];
}

export type CommsAuthState =
  | "disconnected"
  | "qr_pending"
  | "phone_pending"
  | "code_pending"
  | "password_pending"
  | "connected";

/** @deprecated Use AIModel instead */
export type ClaudeModel = AIModel;
