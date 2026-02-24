import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, ChevronDown, ChevronUp, Check, RefreshCw } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import type { Quest } from "../../types/game";

export function MissionObjective() {
  const quests = useGameStore((s) => s.quests);
  const setQuests = useGameStore((s) => s.setQuests);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const workspaceRoot = useGameStore((s) => s.settings.workspace_root);
  const api = useApi();
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Fetch quests on mount and periodically
  useEffect(() => {
    if (!workspaceRoot) return;
    const fetch = async () => {
      try {
        const all = await api.getQuests();
        setQuests(all);
      } catch {
        // ignore
      }
    };
    fetch();
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [api, setQuests, workspaceRoot]);

  const handleScanTodos = useCallback(async () => {
    if (!workspaceRoot || scanning) return;
    setScanning(true);
    try {
      await api.scanTodos(workspaceRoot);
      const all = await api.getQuests();
      setQuests(all);
    } catch {
      // ignore
    }
    setScanning(false);
  }, [api, workspaceRoot, scanning, setQuests]);

  const handleComplete = useCallback(
    async (questId: string) => {
      try {
        const result = await api.completeQuest(questId);
        setPlayer(result.player);
        const all = await api.getQuests();
        setQuests(all);
      } catch {
        // ignore
      }
    },
    [api, setPlayer, setQuests]
  );

  const activeQuests = quests.filter((q) => q.status === "active");
  const primary = activeQuests[0] ?? null;

  if (!workspaceRoot) return null;

  return (
    <div className="border-b border-theme-accent/8">
      {/* Primary objective bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-theme-accent/4 transition-colors group"
      >
        <Crosshair
          className="w-3.5 h-3.5 text-theme-status-warning shrink-0 animate-pulse"
          strokeWidth={1.5}
        />
        <div className="flex-1 min-w-0 text-left">
          {primary ? (
            <div className="flex items-baseline gap-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-theme-status-warning/70">
                {t("mission.label")}
              </span>
              <span className="text-xs font-mono text-theme-text truncate">
                {primary.title}
              </span>
              {primary.exp_reward > 0 && (
                <span className="text-[9px] font-mono text-theme-accent/50 shrink-0">
                  +{primary.exp_reward} EXP
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-theme-text-dimmer">
                {t("mission.label")}
              </span>
              <span className="text-[10px] font-mono text-theme-text-dimmer italic">
                {t("mission.noObjective")}
              </span>
            </div>
          )}
        </div>
        {activeQuests.length > 1 && (
          <span className="text-[9px] font-mono text-theme-accent/40 shrink-0">
            +{activeQuests.length - 1}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-theme-text-dimmer shrink-0" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="w-3 h-3 text-theme-text-dimmer shrink-0" strokeWidth={1.5} />
        )}
      </button>

      {/* Expanded quest list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1">
              {activeQuests.length === 0 && (
                <div className="text-[10px] font-mono text-theme-text-dimmer py-1">
                  {t("mission.scanHint")}
                </div>
              )}
              {activeQuests.map((quest, i) => (
                <QuestRow
                  key={quest.id}
                  quest={quest}
                  isPrimary={i === 0}
                  onComplete={handleComplete}
                />
              ))}

              {/* Scan button */}
              <button
                onClick={handleScanTodos}
                disabled={scanning}
                className="flex items-center gap-1.5 text-[9px] font-mono text-theme-accent/50 hover:text-theme-accent mt-1.5 transition-colors disabled:opacity-40"
              >
                <RefreshCw
                  className={`w-2.5 h-2.5 ${scanning ? "animate-spin" : ""}`}
                  strokeWidth={1.5}
                />
                {t("mission.scanTodos")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuestRow({
  quest,
  isPrimary,
  onComplete,
}: {
  quest: Quest;
  isPrimary: boolean;
  onComplete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-start gap-2 rounded px-2 py-1.5 transition-colors ${
        isPrimary ? "bg-theme-status-warning/5" : "hover:bg-white/3"
      }`}
    >
      <button
        onClick={() => onComplete(quest.id)}
        className="mt-0.5 w-3.5 h-3.5 rounded-sm border border-theme-accent/25 hover:border-theme-accent/60 hover:bg-theme-accent/10 flex items-center justify-center transition-all shrink-0 group"
        title={t("mission.complete")}
      >
        <Check className="w-2 h-2 text-theme-accent opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono text-theme-text leading-tight truncate">
          {quest.title}
        </div>
        {quest.description && (
          <div className="text-[9px] font-mono text-theme-text-dimmer mt-0.5 truncate">
            {quest.description}
          </div>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {quest.source_file && (
            <span className="text-[8px] font-mono text-theme-accent/40 truncate max-w-[180px]">
              {quest.source_file}
              {quest.line_number ? `:${quest.line_number}` : ""}
            </span>
          )}
          {quest.exp_reward > 0 && (
            <span className="text-[8px] font-mono text-theme-accent/40">
              +{quest.exp_reward} EXP
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
