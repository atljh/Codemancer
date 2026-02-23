import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  Brain,
  Palette,
  Globe,
  FolderOpen,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  LogIn,
  LogOut,
  KeyRound,
  Shield,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import { themes, themeIds } from "../../themes/themeConfig";
import type { AppSettings, AuthMethod, Locale, ClaudeModel, ThemeId } from "../../types/game";
import type { TranslationKey } from "../../i18n/translations";

const FALLBACK_MODELS: ClaudeModel[] = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Fast & capable" },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4", description: "Most powerful" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Fast & affordable" },
];

type SettingsTab = "general" | "ai" | "appearance";

export function SettingsModal() {
  const showSettings = useGameStore((s) => s.showSettings);
  const settings = useGameStore((s) => s.settings);
  const toggleSettings = useGameStore((s) => s.toggleSettings);
  const setSettings = useGameStore((s) => s.setSettings);
  const setFileTreeRoot = useGameStore((s) => s.setFileTreeRoot);
  const player = useGameStore((s) => s.player);
  const api = useApi();
  const { t } = useTranslation();

  const [draft, setDraft] = useState<AppSettings>(settings);
  const [models, setModels] = useState<ClaudeModel[]>(FALLBACK_MODELS);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (showSettings) {
      setDraft(settings);
      setSaved(false);
      api.getChatModels().then(setModels).catch(() => setModels(FALLBACK_MODELS));
    }
  }, [showSettings, settings, api]);

  const handleSave = async () => {
    setSettings(draft);
    setFileTreeRoot(draft.workspace_root);
    try {
      await api.updateSettings(draft);
    } catch {
      // silent
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleBrowseWorkspace = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setDraft({ ...draft, workspace_root: selected as string });
      }
    } catch { /* cancelled */ }
  };

  const handleResetPlayer = async () => {
    try {
      const p = await api.resetPlayer();
      useGameStore.getState().setPlayer(p);
    } catch { /* silent */ }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: t("settings.tabGeneral"), icon: <Settings className="w-3.5 h-3.5" strokeWidth={1.5} /> },
    { id: "ai", label: t("settings.tabAi"), icon: <Brain className="w-3.5 h-3.5" strokeWidth={1.5} /> },
    { id: "appearance", label: t("settings.tabAppearance"), icon: <Palette className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  ];

  return (
    <AnimatePresence>
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
          onClick={toggleSettings}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[600px] max-h-[80vh] rounded-lg glass-panel-bright shadow-[0_0_40px_rgba(var(--theme-accent-rgb),0.08)] flex overflow-hidden tactical-corners"
          >
            {/* Sidebar */}
            <div className="w-40 bg-theme-bg-deep/60 border-r border-[var(--theme-glass-border)] py-4 px-2 flex flex-col shrink-0">
              <div className="flex items-center gap-2 px-3 mb-5">
                <Settings className="w-4 h-4 text-theme-accent" strokeWidth={1.5} />
                <span className="text-xs font-mono font-bold text-theme-text tracking-wider uppercase">{t("panel.settings")}</span>
              </div>

              <nav className="space-y-0.5 flex-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-mono tracking-wider transition-all ${
                      activeTab === tab.id
                        ? "bg-theme-accent/8 text-white border-l-2 border-theme-accent"
                        : "text-theme-text-dim hover:text-theme-text hover:bg-theme-accent/3"
                    }`}
                  >
                    <span className={activeTab === tab.id ? "text-theme-accent" : ""}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* Operative info */}
              <div className="mt-auto px-3 pt-3 border-t border-[var(--theme-glass-border)]">
                <div className="text-[10px] text-theme-text-dim font-mono tracking-wider">
                  {player.name} // LV.{player.level}
                </div>
                <div className="text-[9px] text-theme-text-dimmer font-mono mt-0.5">
                  EXP: {player.total_exp}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--theme-glass-border)]">
                <h2 className="text-xs font-mono font-bold text-theme-accent tracking-[0.15em] uppercase">
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h2>
                <button
                  onClick={toggleSettings}
                  className="text-theme-text-dim hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
                {activeTab === "general" && (
                  <GeneralTab
                    draft={draft}
                    setDraft={setDraft}
                    onBrowse={handleBrowseWorkspace}
                    onResetPlayer={handleResetPlayer}
                    t={t}
                  />
                )}
                {activeTab === "ai" && (
                  <AiTab
                    draft={draft}
                    setDraft={setDraft}
                    models={models}
                    showApiKey={showApiKey}
                    setShowApiKey={setShowApiKey}
                    t={t}
                  />
                )}
                {activeTab === "appearance" && (
                  <AppearanceTab draft={draft} setDraft={setDraft} t={t} />
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--theme-glass-border)]">
                <button
                  onClick={toggleSettings}
                  className="px-3 py-1.5 rounded text-xs font-mono text-theme-text-dim hover:text-white hover:bg-theme-accent/6 transition-colors tracking-wider uppercase"
                >
                  {t("settings.cancel")}
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-mono font-bold tracking-[0.1em] uppercase transition-all ${
                    saved
                      ? "glass-panel-bright text-theme-status-success border border-theme-status-success/20"
                      : "glass-panel-bright text-theme-accent hover:bg-theme-accent/10"
                  }`}
                >
                  {saved ? (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {t("settings.saved")}
                    </>
                  ) : (
                    t("settings.save")
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── General Tab ───── */
function GeneralTab({
  draft,
  setDraft,
  onBrowse,
  onResetPlayer,
  t,
}: {
  draft: AppSettings;
  setDraft: (d: AppSettings) => void;
  onBrowse: () => void;
  onResetPlayer: () => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <>
      <SettingsField label={t("settings.language")} icon={<Globe className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        <select
          value={draft.locale}
          onChange={(e) => setDraft({ ...draft, locale: e.target.value as Locale })}
          className="w-full bg-theme-bg-base border border-[var(--theme-glass-border)] rounded px-3 py-2 text-xs font-mono text-theme-text outline-none focus:border-theme-accent/30 transition-colors"
        >
          <option value="en">English</option>
          <option value="ru">Русский</option>
        </select>
      </SettingsField>

      <SettingsField label={t("settings.workspaceRoot")} icon={<FolderOpen className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft.workspace_root}
            onChange={(e) => setDraft({ ...draft, workspace_root: e.target.value })}
            placeholder="/path/to/project"
            className="flex-1 bg-theme-bg-base border border-[var(--theme-glass-border)] rounded px-3 py-2 text-xs text-theme-text placeholder-theme-text-dimmer outline-none focus:border-theme-accent/30 font-mono transition-colors"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onBrowse}
            className="px-3 py-2 rounded glass-panel-bright text-theme-text-dim hover:text-theme-accent text-xs font-mono tracking-wider transition-colors shrink-0"
          >
            {t("settings.browse")}
          </motion.button>
        </div>
        <p className="text-[10px] text-theme-text-dimmer mt-1.5 font-mono">{t("settings.workspaceHint")}</p>
      </SettingsField>

      <div className="mt-5 pt-4 border-t border-theme-status-error/10">
        <h3 className="text-[10px] font-mono font-bold text-theme-status-error/70 uppercase tracking-[0.15em] mb-3">
          {t("settings.dangerZone")}
        </h3>
        <button
          onClick={onResetPlayer}
          className="flex items-center gap-2 px-3 py-2 rounded border border-theme-status-error/15 bg-theme-status-error/5 text-theme-status-error hover:bg-theme-status-error/10 text-xs font-mono tracking-wider transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
          {t("settings.resetProgress")}
        </button>
        <p className="text-[10px] text-theme-text-dimmer mt-1.5 font-mono">{t("settings.resetHint")}</p>
      </div>
    </>
  );
}

/* ───── AI Tab ───── */
function AiTab({
  draft,
  setDraft,
  models,
  showApiKey,
  setShowApiKey,
  t,
}: {
  draft: AppSettings;
  setDraft: (d: AppSettings) => void;
  models: ClaudeModel[];
  showApiKey: boolean;
  setShowApiKey: (v: boolean) => void;
  t: (key: TranslationKey) => string;
}) {
  const [oauthPending, setOauthPending] = useState(false);

  const hasAuth = draft.auth_method === "oauth"
    ? draft.oauth_access_token.length > 0
    : draft.anthropic_api_key.length > 0;

  const handleOAuthSignIn = async () => {
    try {
      setOauthPending(true);
      const authUrl = await invoke<string>("start_oauth");
      window.open(authUrl, "_blank");
      const code = prompt("Paste the authorization code:");
      if (code) {
        const tokens = await invoke<{ access_token: string; refresh_token: string }>("complete_oauth", { code });
        setDraft({
          ...draft,
          oauth_access_token: tokens.access_token,
          oauth_refresh_token: tokens.refresh_token,
        });
      }
    } catch {
      // OAuth failed
    } finally {
      setOauthPending(false);
    }
  };

  const handleOAuthSignOut = () => {
    setDraft({
      ...draft,
      oauth_access_token: "",
      oauth_refresh_token: "",
    });
  };

  return (
    <>
      {/* Status indicator */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono tracking-wider ${
        hasAuth
          ? "bg-theme-status-success/5 border border-theme-status-success/15 text-theme-status-success"
          : "bg-theme-status-warning/5 border border-theme-status-warning/12 text-theme-status-warning"
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${hasAuth ? "bg-theme-status-success animate-glow-pulse" : "bg-theme-status-warning"}`} />
        {hasAuth
          ? (draft.auth_method === "oauth" ? t("settings.oauthConnected") : t("settings.aiConnected"))
          : t("settings.aiNotConfigured")}
      </div>

      {/* Auth Method Toggle */}
      <SettingsField label={t("settings.authMethod")} icon={<Shield className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        <div className="flex gap-2">
          {([
            { id: "api_key" as AuthMethod, label: t("settings.authApiKey"), icon: <KeyRound className="w-3 h-3" strokeWidth={1.5} /> },
            { id: "oauth" as AuthMethod, label: t("settings.authOAuth"), icon: <LogIn className="w-3 h-3" strokeWidth={1.5} /> },
          ]).map((method) => (
            <button
              key={method.id}
              onClick={() => setDraft({ ...draft, auth_method: method.id })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-mono tracking-wider transition-all ${
                draft.auth_method === method.id
                  ? "border border-theme-accent/20 bg-theme-accent/6 text-theme-accent"
                  : "border border-[var(--theme-glass-border)] bg-transparent text-theme-text-dim hover:text-theme-text"
              }`}
            >
              {method.icon}
              {method.label}
            </button>
          ))}
        </div>
      </SettingsField>

      {/* API Key */}
      {draft.auth_method === "api_key" && (
        <SettingsField label={t("settings.apiKey")} icon={<Brain className="w-3.5 h-3.5" strokeWidth={1.5} />}>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={draft.anthropic_api_key}
              onChange={(e) => setDraft({ ...draft, anthropic_api_key: e.target.value })}
              placeholder="sk-ant-api03-..."
              className="w-full bg-theme-bg-base border border-[var(--theme-glass-border)] rounded px-3 py-2 pr-10 text-xs text-theme-text placeholder-theme-text-dimmer outline-none focus:border-theme-accent/30 font-mono transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-text-dim hover:text-theme-text transition-colors"
            >
              {showApiKey ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
            </button>
          </div>
          <p className="text-[10px] text-theme-text-dimmer mt-1.5 font-mono">{t("settings.apiKeyHint")}</p>
        </SettingsField>
      )}

      {/* OAuth */}
      {draft.auth_method === "oauth" && (
        <SettingsField label={t("settings.authOAuth")} icon={<LogIn className="w-3.5 h-3.5" strokeWidth={1.5} />}>
          {draft.oauth_access_token ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-theme-status-success/5 border border-theme-status-success/15 text-theme-status-success text-xs font-mono">
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                {t("settings.oauthConnected")}
              </div>
              <button
                onClick={handleOAuthSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded border border-theme-status-error/15 bg-theme-status-error/5 text-theme-status-error hover:bg-theme-status-error/10 text-xs font-mono tracking-wider transition-colors"
              >
                <LogOut className="w-3 h-3" strokeWidth={1.5} />
                {t("settings.oauthSignOut")}
              </button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleOAuthSignIn}
              disabled={oauthPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded glass-panel-bright text-theme-accent text-xs font-mono font-bold tracking-[0.1em] uppercase hover:bg-theme-accent/8 transition-all disabled:opacity-50"
            >
              {oauthPending ? (
                <>{t("settings.oauthPending")}</>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {t("settings.oauthSignIn")}
                </>
              )}
            </motion.button>
          )}
        </SettingsField>
      )}

      {/* Model Selector */}
      <SettingsField label={t("settings.model")} icon={<Brain className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        <div className="space-y-1.5">
          {models.map((m) => (
            <label
              key={m.id}
              className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer transition-all ${
                draft.claude_model === m.id
                  ? "border-theme-accent/20 bg-theme-accent/6"
                  : "border-[var(--theme-glass-border)] hover:border-theme-accent/12"
              }`}
            >
              <input
                type="radio"
                name="model"
                value={m.id}
                checked={draft.claude_model === m.id}
                onChange={() => setDraft({ ...draft, claude_model: m.id })}
                className="sr-only"
              />
              <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                draft.claude_model === m.id ? "border-theme-accent" : "border-theme-text-dimmer"
              }`}>
                {draft.claude_model === m.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-accent" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs font-mono text-theme-text font-medium">{m.name}</div>
                <div className="text-[10px] font-mono text-theme-text-dim">{m.description}</div>
              </div>
            </label>
          ))}
        </div>
      </SettingsField>
    </>
  );
}

/* ───── Appearance Tab ───── */
function AppearanceTab({
  draft,
  setDraft,
  t,
}: {
  draft: AppSettings;
  setDraft: (d: AppSettings) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <>
      <SettingsField label={`${t("settings.fontSize")}: ${draft.font_size}px`} icon={<Palette className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-theme-text-dim font-mono w-6">12</span>
          <input
            type="range"
            min={12}
            max={24}
            value={draft.font_size}
            onChange={(e) => setDraft({ ...draft, font_size: parseInt(e.target.value) })}
            className="flex-1 accent-[var(--theme-accent)]"
          />
          <span className="text-[10px] text-theme-text-dim font-mono w-6">24</span>
        </div>
        <div
          className="mt-3 px-3 py-2 rounded bg-theme-bg-inset border border-[var(--theme-glass-border)] font-mono text-theme-text/70"
          style={{ fontSize: `${draft.font_size}px` }}
        >
          const protocol = "tactical";
        </div>
      </SettingsField>

      <SettingsField label={t("settings.theme")} icon={<Palette className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        <div className="grid grid-cols-2 gap-2">
          {themeIds.map((id) => {
            const cfg = themes[id];
            return (
              <button
                key={id}
                onClick={() => setDraft({ ...draft, theme: id as ThemeId })}
                className={`rounded border p-3 transition-all ${
                  draft.theme === id
                    ? "border-theme-accent/25 bg-theme-accent/4"
                    : "border-[var(--theme-glass-border)] hover:border-theme-accent/12"
                }`}
              >
                <div className="flex gap-1 mb-2">
                  <div className="w-5 h-5 rounded-sm border border-[var(--theme-glass-border)]" style={{ backgroundColor: cfg.previewBg }} />
                  <div className="w-5 h-5 rounded-sm border border-[var(--theme-glass-border)]" style={{ backgroundColor: cfg.previewSurface }} />
                  <div className="w-5 h-5 rounded-sm border border-[var(--theme-glass-border)]" style={{ backgroundColor: cfg.previewAccent }} />
                </div>
                <div className="text-[10px] font-mono text-theme-text-dim tracking-wider">{cfg.label}</div>
              </button>
            );
          })}
        </div>
      </SettingsField>
    </>
  );
}

/* ───── Shared Field Wrapper ───── */
function SettingsField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-mono text-theme-text-dim mb-2 font-bold tracking-[0.1em] uppercase">
        {icon && <span className="text-theme-accent/40">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}
