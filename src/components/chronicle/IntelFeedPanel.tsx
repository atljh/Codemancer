import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BrainCircuit,
  Mic,
  MessageSquare,
  Bot,
  CheckCircle,
  Circle,
  Archive,
  Play,
} from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import type { IntelLog } from "../../types/game";

const STATUS_ICON: Record<string, typeof Circle> = {
  pending: Circle,
  active: Play,
  done: CheckCircle,
  archived: Archive,
};

const SOURCE_ICON: Record<string, typeof Mic> = {
  voice: Mic,
  text: MessageSquare,
  proactive: Bot,
};

export function IntelFeedPanel() {
  const show = useGameStore((s) => s.showIntelFeed);
  const toggle = useGameStore((s) => s.toggleIntelFeed);
  const api = useApi();
  const { t } = useTranslation();
  const [logs, setLogs] = useState<IntelLog[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await api.getIntelLogs(filter ?? undefined);
      setLogs(data);
    } catch {
      // ignore
    }
  }, [api, filter]);

  useEffect(() => {
    if (!show) return;
    fetchLogs();
    const iv = setInterval(fetchLogs, 10_000);
    return () => clearInterval(iv);
  }, [show, fetchLogs]);

  const handleStatusChange = useCallback(
    async (id: number, status: string) => {
      try {
        await api.updateIntelStatus(id, status);
        fetchLogs();
      } catch {
        // ignore
      }
    },
    [api, fetchLogs],
  );

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={toggle}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[340px] glass-panel z-50 flex flex-col border-l border-theme-accent/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme-accent/10">
              <div className="flex items-center gap-2">
                <BrainCircuit
                  className="w-4 h-4 text-theme-accent"
                  strokeWidth={1.5}
                />
                <span className="text-xs font-mono uppercase tracking-widest text-theme-accent">
                  {t("intel.title")}
                </span>
              </div>
              <button
                onClick={toggle}
                className="p-1 rounded hover:bg-theme-accent/10 transition-colors"
              >
                <X className="w-4 h-4 text-theme-text-dim" strokeWidth={1.5} />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-theme-accent/8">
              {[null, "pending", "active", "done"].map((f) => (
                <button
                  key={f ?? "all"}
                  onClick={() => setFilter(f)}
                  className={`text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                    filter === f
                      ? "bg-theme-accent/15 text-theme-accent"
                      : "text-theme-text-dimmer hover:text-theme-text-dim"
                  }`}
                >
                  {f === null
                    ? "All"
                    : f === "pending"
                      ? t("intel.pending")
                      : f === "active"
                        ? t("intel.active")
                        : t("intel.done")}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
              {logs.length === 0 && (
                <div className="text-[10px] font-mono text-theme-text-dimmer text-center py-8">
                  {t("intel.empty")}
                </div>
              )}

              {logs.map((log) => {
                const SourceIcon = SOURCE_ICON[log.source] ?? MessageSquare;
                const StatusIcon = STATUS_ICON[log.status] ?? Circle;

                return (
                  <div
                    key={log.id}
                    className="glass-panel rounded-lg p-2.5 border border-theme-accent/8"
                  >
                    {/* Top line: source + timestamp */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <SourceIcon
                        className="w-3 h-3 text-theme-accent/50"
                        strokeWidth={1.5}
                      />
                      <span className="text-[8px] font-mono text-theme-text-dimmer uppercase tracking-wider">
                        {log.source === "voice"
                          ? t("intel.voiceTag")
                          : log.source === "proactive"
                            ? t("intel.proactiveTag")
                            : t("intel.textTag")}
                      </span>
                      <span className="text-[8px] font-mono text-theme-text-dimmer ml-auto">
                        {log.timestamp.slice(11, 16)}
                      </span>
                    </div>

                    {/* Intent */}
                    <p className="text-[10px] font-mono text-theme-text leading-tight mb-1.5 line-clamp-3">
                      {log.intent || log.raw_input}
                    </p>

                    {/* Subtasks preview */}
                    {log.subtasks.length > 0 && (
                      <div className="text-[9px] font-mono text-theme-text-dim mb-1.5">
                        {log.subtasks.slice(0, 3).map((s, i) => (
                          <div key={i} className="flex gap-1 truncate">
                            <span className="text-theme-accent/40 shrink-0">
                              {i + 1}.
                            </span>
                            <span className="truncate">{s}</span>
                          </div>
                        ))}
                        {log.subtasks.length > 3 && (
                          <span className="text-theme-accent/30">
                            +{log.subtasks.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Status + actions */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <StatusIcon
                        className={`w-3 h-3 ${
                          log.status === "done"
                            ? "text-green-400/60"
                            : log.status === "active"
                              ? "text-theme-accent/60"
                              : "text-theme-text-dimmer"
                        }`}
                        strokeWidth={1.5}
                      />
                      <span className="text-[8px] font-mono text-theme-text-dimmer uppercase">
                        {log.status}
                      </span>

                      <div className="ml-auto flex gap-1">
                        {log.status === "pending" && (
                          <button
                            onClick={() => handleStatusChange(log.id, "active")}
                            className="text-[8px] font-mono text-theme-accent/50 hover:text-theme-accent px-1"
                          >
                            START
                          </button>
                        )}
                        {log.status === "active" && (
                          <button
                            onClick={() => handleStatusChange(log.id, "done")}
                            className="text-[8px] font-mono text-green-400/50 hover:text-green-400 px-1"
                          >
                            DONE
                          </button>
                        )}
                        {log.status !== "archived" && (
                          <button
                            onClick={() =>
                              handleStatusChange(log.id, "archived")
                            }
                            className="text-[8px] font-mono text-theme-text-dimmer hover:text-theme-text-dim px-1"
                          >
                            ARCH
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
