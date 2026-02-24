import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, FileText, Zap, Clock } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import type { ChronicleEvent, ChronicleReport } from "../../types/game";

const ACTION_COLORS: Record<string, string> = {
  message: "var(--theme-accent)",
  git_commit: "var(--theme-status-success)",
  focus_start: "var(--theme-purple)",
  focus_end: "var(--theme-purple)",
  tool_write_file: "var(--theme-status-warning)",
  tool_read_file: "var(--theme-accent)",
  tool_search_text: "var(--theme-text-dim)",
};

type ReportFormat = "pr" | "standup" | "jira";

export function ChroniclePanel() {
  const show = useGameStore((s) => s.showChronicle);
  const toggle = useGameStore((s) => s.toggleChronicle);
  const api = useApi();
  const { t } = useTranslation();

  const [events, setEvents] = useState<ChronicleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<ReportFormat>("standup");
  const [report, setReport] = useState<ChronicleReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    api
      .getChronicleEvents(undefined, 100)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [show, api]);

  const handleGenerate = async () => {
    setGenerating(true);
    setReport(null);
    try {
      const r = await api.generateReport(format);
      setReport(r);
    } catch {
      setReport({ content: t("chronicle.error"), format, event_count: 0 });
    }
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return ts;
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggle} />

          {/* Panel */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 w-[640px] max-h-[80vh] glass-panel rounded-lg border border-[var(--theme-glass-border)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--theme-glass-border)]">
              <h2 className="text-sm font-bold text-theme-accent tracking-widest uppercase font-display">
                {t("chronicle.title")}
              </h2>
              <button onClick={toggle} className="p-1 rounded hover:bg-white/8 text-theme-text-dim hover:text-theme-text">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 min-h-0">
              {loading ? (
                <div className="text-center text-theme-text-dim text-xs py-8">{t("health.scanning")}</div>
              ) : events.length === 0 ? (
                <div className="text-center text-theme-text-dim text-xs py-8">{t("chronicle.noEvents")}</div>
              ) : (
                <div className="relative pl-6">
                  {/* Timeline line */}
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-[var(--theme-glass-border)]" />

                  {events.map((ev) => {
                    const color = ACTION_COLORS[ev.action_type] || "var(--theme-text-dim)";
                    return (
                      <div key={ev.id} className="relative mb-3 group">
                        {/* Dot */}
                        <div
                          className="absolute -left-[16px] top-1 w-2.5 h-2.5 rounded-full border-2"
                          style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
                        />
                        {/* Content */}
                        <div className="glass-panel rounded px-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-mono text-theme-text-dimmer flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" strokeWidth={1.5} />
                              {formatTime(ev.timestamp)}
                            </span>
                            <span
                              className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
                            >
                              {ev.action_type}
                            </span>
                            {ev.exp_gained > 0 && (
                              <span className="text-[9px] font-mono text-theme-accent flex items-center gap-0.5 ml-auto">
                                <Zap className="w-2.5 h-2.5" strokeWidth={1.5} />
                                +{ev.exp_gained}
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-[11px] text-theme-text-dim">{ev.description}</p>
                          )}
                          {ev.files_affected.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ev.files_affected.map((f) => (
                                <span key={f} className="text-[9px] font-mono text-theme-text-dimmer flex items-center gap-0.5">
                                  <FileText className="w-2 h-2" strokeWidth={1.5} />
                                  {f.split("/").pop()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Report section */}
            <div className="border-t border-[var(--theme-glass-border)] px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-theme-text-dim uppercase tracking-wider">
                  {t("chronicle.reportFormat")}
                </span>
                {(["standup", "pr", "jira"] as ReportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                      format === f
                        ? "bg-theme-accent/15 text-theme-accent"
                        : "text-theme-text-dim hover:text-theme-text hover:bg-white/5"
                    }`}
                  >
                    {t(`chronicle.${f}` as "chronicle.pr")}
                  </button>
                ))}
                <button
                  onClick={handleGenerate}
                  disabled={generating || events.length === 0}
                  className="ml-auto text-[10px] font-bold font-mono px-3 py-1 rounded bg-theme-accent/15 text-theme-accent hover:bg-theme-accent/25 transition-colors disabled:opacity-40 tracking-wider"
                >
                  {generating ? t("chronicle.generating") : t("chronicle.generateReport")}
                </button>
              </div>

              {report && (
                <div className="relative">
                  <textarea
                    readOnly
                    value={report.content}
                    className="w-full h-32 glass-panel-bright rounded p-2 text-[11px] font-mono text-theme-text resize-none scrollbar-thin"
                  />
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1 rounded bg-theme-accent/10 hover:bg-theme-accent/20 text-theme-accent transition-colors"
                    title={t("chronicle.copy")}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
