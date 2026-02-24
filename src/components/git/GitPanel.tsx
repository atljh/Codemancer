import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  GitBranch,
  RefreshCw,
  Plus,
  Minus,
  Check,
  ChevronUp,
  ChevronDown,
  Undo2,
  FileText,
  Sparkles,
} from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import type { GitFileEntry } from "../../types/game";

const STATUS_COLORS: Record<string, string> = {
  M: "text-yellow-400",
  A: "text-green-400",
  D: "text-red-400",
  R: "text-blue-400",
  C: "text-blue-400",
  U: "text-orange-400",
  "?": "text-theme-text-dimmer",
};

export function GitPanel() {
  const api = useApi();
  const { t } = useTranslation();
  const gitStatus = useGameStore((s) => s.gitStatus);
  const setGitStatus = useGameStore((s) => s.setGitStatus);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const addActionLog = useGameStore((s) => s.addActionLog);

  const [commitMsg, setCommitMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [untrackedOpen, setUntrackedOpen] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    try {
      const status = await api.gitStatus();
      setGitStatus(status);
      setError(null);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("400")) {
        setError(t("git.notARepo"));
        setGitStatus(null);
      }
    }
  }, [api, setGitStatus, t]);

  // Initial load + polling
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 5000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const handleStage = async (paths: string[]) => {
    await api.gitStage(paths);
    await refresh();
  };

  const handleUnstage = async (paths: string[]) => {
    await api.gitUnstage(paths);
    await refresh();
  };

  const handleDiscard = async (path: string) => {
    const confirmed = window.confirm(t("git.discardConfirm").replace("{path}", path));
    if (!confirmed) return;
    await api.gitDiscard([path]);
    await refresh();
  };

  const handleCommit = async () => {
    if (!commitMsg.trim() || !gitStatus?.staged.length) return;
    setLoading(true);
    try {
      const result = await api.gitCommit(commitMsg.trim());
      setCommitMsg("");
      addActionLog({
        action: `${t("git.committed")}: ${result.hash} — ${result.message}`,
        status: "done",
        expGained: result.exp_gained,
      });
      // Refresh player for EXP update
      const player = await api.getStatus();
      setPlayer(player);
      await refresh();
    } catch {
      addActionLog({ action: "Commit failed", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!gitStatus?.staged.length) return;
    setAiLoading(true);
    try {
      const { message } = await api.gitGenerateMessage();
      setCommitMsg(message);
    } catch {
      addActionLog({ action: t("git.aiError"), status: "error" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCommit();
    }
  };

  const totalChanges =
    (gitStatus?.staged.length ?? 0) +
    (gitStatus?.unstaged.length ?? 0) +
    (gitStatus?.untracked.length ?? 0);

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full shrink-0 overflow-hidden border-l border-[var(--theme-glass-border)]"
    >
      <div className="w-80 h-full flex flex-col glass-panel">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-glass-border)]">
          <GitBranch className="w-3.5 h-3.5 text-theme-accent" strokeWidth={1.5} />
          <span className="text-xs font-bold text-theme-text tracking-wide uppercase flex-1 truncate">
            {gitStatus?.branch ?? "—"}
          </span>
          {(gitStatus?.ahead ?? 0) > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">
              +{gitStatus!.ahead}
            </span>
          )}
          {(gitStatus?.behind ?? 0) > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">
              -{gitStatus!.behind}
            </span>
          )}
          <button
            onClick={refresh}
            className="p-1 rounded hover:bg-theme-accent/8 text-theme-text-dim hover:text-theme-accent transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="px-3 py-4 text-xs text-red-400/80 text-center font-mono">
            {error}
          </div>
        )}

        {/* Clean state */}
        {!error && gitStatus && totalChanges === 0 && (
          <div className="px-3 py-8 text-xs text-theme-text-dimmer text-center font-mono">
            {t("git.noChanges")}
          </div>
        )}

        {/* File sections */}
        {!error && gitStatus && totalChanges > 0 && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* Staged */}
            {gitStatus.staged.length > 0 && (
              <FileSection
                title={t("git.staged")}
                count={gitStatus.staged.length}
                open={stagedOpen}
                onToggle={() => setStagedOpen(!stagedOpen)}
                accentColor="text-green-400"
                bgColor="bg-green-500/8"
                headerAction={
                  <button
                    onClick={() => handleUnstage(gitStatus.staged.map((f) => f.path))}
                    className="text-[9px] font-mono text-theme-text-dimmer hover:text-theme-accent transition-colors"
                  >
                    {t("git.unstageAll")}
                  </button>
                }
              >
                {gitStatus.staged.map((f) => (
                  <FileRow
                    key={f.path}
                    file={f}
                    onClick={() => handleUnstage([f.path])}
                    icon={<Minus className="w-3 h-3" strokeWidth={1.5} />}
                    iconColor="text-red-400/60"
                    iconTitle="Unstage"
                  />
                ))}
              </FileSection>
            )}

            {/* Unstaged */}
            {gitStatus.unstaged.length > 0 && (
              <FileSection
                title={t("git.unstaged")}
                count={gitStatus.unstaged.length}
                open={unstagedOpen}
                onToggle={() => setUnstagedOpen(!unstagedOpen)}
                accentColor="text-yellow-400"
                bgColor="bg-yellow-500/8"
                headerAction={
                  <button
                    onClick={() => handleStage(gitStatus.unstaged.map((f) => f.path))}
                    className="text-[9px] font-mono text-theme-text-dimmer hover:text-theme-accent transition-colors"
                  >
                    {t("git.stageAll")}
                  </button>
                }
              >
                {gitStatus.unstaged.map((f) => (
                  <FileRow
                    key={f.path}
                    file={f}
                    onClick={() => handleStage([f.path])}
                    icon={<Plus className="w-3 h-3" strokeWidth={1.5} />}
                    iconColor="text-green-400/60"
                    iconTitle="Stage"
                    onDiscard={() => handleDiscard(f.path)}
                  />
                ))}
              </FileSection>
            )}

            {/* Untracked */}
            {gitStatus.untracked.length > 0 && (
              <FileSection
                title={t("git.untracked")}
                count={gitStatus.untracked.length}
                open={untrackedOpen}
                onToggle={() => setUntrackedOpen(!untrackedOpen)}
                accentColor="text-theme-text-dimmer"
                bgColor="bg-white/3"
                headerAction={
                  <button
                    onClick={() => handleStage(gitStatus.untracked.map((f) => f.path))}
                    className="text-[9px] font-mono text-theme-text-dimmer hover:text-theme-accent transition-colors"
                  >
                    {t("git.stageAll")}
                  </button>
                }
              >
                {gitStatus.untracked.map((f) => (
                  <FileRow
                    key={f.path}
                    file={f}
                    onClick={() => handleStage([f.path])}
                    icon={<Plus className="w-3 h-3" strokeWidth={1.5} />}
                    iconColor="text-green-400/60"
                    iconTitle="Stage"
                  />
                ))}
              </FileSection>
            )}
          </div>
        )}

        {/* Commit area */}
        {!error && gitStatus && (
          <div className="border-t border-[var(--theme-glass-border)] p-2 space-y-2">
            <div className="relative">
              <textarea
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("git.commitPlaceholder")}
                rows={2}
                className="w-full resize-none rounded bg-[var(--theme-bg-deep)] border border-[var(--theme-glass-border)] px-2 py-1.5 pr-8 text-xs font-mono text-theme-text placeholder:text-theme-text-dimmer focus:outline-none focus:border-theme-accent/40 transition-colors"
              />
              <button
                onClick={handleGenerateMessage}
                disabled={aiLoading || !gitStatus?.staged.length}
                className="absolute right-1.5 top-1.5 p-1 rounded hover:bg-theme-accent/15 text-theme-text-dimmer hover:text-theme-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={t("git.generateMessage")}
              >
                <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? "animate-pulse" : ""}`} strokeWidth={1.5} />
              </button>
            </div>
            <button
              onClick={handleCommit}
              disabled={loading || !commitMsg.trim() || !gitStatus.staged.length}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold tracking-wide uppercase bg-theme-accent/15 text-theme-accent border border-theme-accent/25 hover:bg-theme-accent/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-3 h-3" strokeWidth={2} />
              {t("git.commit")}
              {gitStatus.staged.length > 0 && (
                <span className="text-[9px] opacity-60 normal-case">
                  ({gitStatus.staged.length})
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Sub-components ---

function FileSection({
  title,
  count,
  open,
  onToggle,
  accentColor,
  bgColor,
  headerAction,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  accentColor: string;
  bgColor: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-1.5 ${bgColor} hover:brightness-125 transition-all`}
      >
        {open ? (
          <ChevronDown className={`w-3 h-3 ${accentColor}`} strokeWidth={1.5} />
        ) : (
          <ChevronUp className={`w-3 h-3 ${accentColor}`} strokeWidth={1.5} />
        )}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${accentColor}`}>
          {title}
        </span>
        <span className="text-[9px] font-mono text-theme-text-dimmer">{count}</span>
        <span className="flex-1" />
        {open && (
          <span onClick={(e) => e.stopPropagation()}>{headerAction}</span>
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function FileRow({
  file,
  onClick,
  icon,
  iconColor,
  iconTitle,
  onDiscard,
}: {
  file: GitFileEntry;
  onClick: () => void;
  icon: React.ReactNode;
  iconColor: string;
  iconTitle: string;
  onDiscard?: () => void;
}) {
  const filename = file.path.split("/").pop() || file.path;
  const dir = file.path.includes("/") ? file.path.substring(0, file.path.lastIndexOf("/")) : "";

  return (
    <div className="group flex items-center gap-1 px-3 py-1 hover:bg-white/3 transition-colors text-xs">
      <FileText className="w-3 h-3 text-theme-text-dimmer shrink-0" strokeWidth={1.5} />
      <span className={`w-4 text-center text-[9px] font-mono font-bold ${STATUS_COLORS[file.status] ?? "text-theme-text-dim"}`}>
        {file.status}
      </span>
      <span className="text-theme-text truncate flex-1" title={file.path}>
        {filename}
        {dir && (
          <span className="text-theme-text-dimmer ml-1 text-[9px]">{dir}</span>
        )}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/8 ${iconColor} transition-all`}
        title={iconTitle}
      >
        {icon}
      </button>
      {onDiscard && (
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/15 text-red-400/60 transition-all"
          title="Discard"
        >
          <Undo2 className="w-3 h-3" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
