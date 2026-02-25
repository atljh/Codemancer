import { memo, useState, useMemo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Ruler,
  Cpu,
  ShieldCheck,
  FileCode,
} from "lucide-react";
import type { ChatMessage } from "../../types/game";
import { useTranslation } from "../../hooks/useTranslation";
import { useGameStore } from "../../stores/gameStore";

interface HealthAlertBubbleProps {
  message: ChatMessage;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type Severity = "critical" | "warning" | "info" | "notice";

/** Detect severity from message content badges */
function detectSeverity(content: string): Severity {
  if (content.includes("[CRITICAL]")) return "critical";
  if (content.includes("[WARNING]")) return "warning";
  return "info";
}

const SEVERITY_STYLES: Record<
  Severity,
  { border: string; glow: string; badge: string; badgeText: string; text: string; accent: string }
> = {
  critical: {
    border: "border-red-500/30",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.12)]",
    badge: "bg-red-500/15 text-red-400 border-red-500/25",
    badgeText: "CRITICAL",
    text: "text-theme-text-dim",
    accent: "text-red-400",
  },
  warning: {
    border: "border-amber-500/25",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.1)]",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    badgeText: "WARNING",
    text: "text-theme-text-dim",
    accent: "text-amber-400",
  },
  info: {
    border: "border-blue-500/20",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.08)]",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    badgeText: "INFO",
    text: "text-theme-text-dim",
    accent: "text-blue-400",
  },
  notice: {
    border: "border-[var(--theme-glass-border)]",
    glow: "",
    badge: "bg-white/5 text-theme-text-dim border-white/10",
    badgeText: "NOTICE",
    text: "text-theme-text-dim",
    accent: "text-theme-text-dim",
  },
};

/** Category icons */
function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "file_size":
      return <Ruler className="w-3 h-3" strokeWidth={1.5} />;
    case "complexity":
      return <Cpu className="w-3 h-3" strokeWidth={1.5} />;
    case "coverage":
      return <ShieldCheck className="w-3 h-3" strokeWidth={1.5} />;
    case "cleanliness":
      return <FileCode className="w-3 h-3" strokeWidth={1.5} />;
    default:
      return <Activity className="w-3 h-3" strokeWidth={1.5} />;
  }
}

/** Extract score values and categories from markdown content for progress bars */
function parseScoreEntries(content: string): { category: string; value: number }[] {
  const entries: { category: string; value: number }[] = [];
  const regex = /\[(?:CRITICAL|WARNING|INFO)\]\s*([\w\s]+)\*\*:.*?(\d+)\/100/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const cat = m[1].trim().toLowerCase().replace(/\s+/g, "_");
    entries.push({ category: cat, value: parseInt(m[2]) });
  }
  return entries;
}

function scoreColor(value: number): string {
  if (value >= 70) return "rgb(74, 222, 128)";    // green
  if (value >= 40) return "rgb(250, 204, 21)";    // yellow
  if (value >= 20) return "rgb(251, 146, 60)";    // orange
  return "rgb(248, 113, 113)";                     // red
}

export const HealthAlertBubble = memo(function HealthAlertBubble({
  message,
}: HealthAlertBubbleProps) {
  const [expanded, setExpanded] = useState(true);
  const { t } = useTranslation();
  const toggleHealthPanel = useGameStore((s) => s.toggleHealthPanel);
  const timestamp = formatTimestamp(message.timestamp);
  const severity = detectSeverity(message.content);
  const style = SEVERITY_STYLES[severity];
  const scores = useMemo(() => parseScoreEntries(message.content), [message.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex gap-2.5"
    >
      {/* Icon */}
      <div className={`w-7 h-7 rounded flex-shrink-0 flex items-center justify-center bg-theme-bg-elevated border ${style.border}`}>
        <Activity className={`w-3.5 h-3.5 ${style.accent}`} strokeWidth={1.5} />
      </div>

      {/* Alert body */}
      <div className={`max-w-[95%] rounded-lg overflow-hidden border ${style.border} ${style.glow} bg-theme-bg-elevated flex-1`}>
        {/* Header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-wider text-theme-text-dimmer">
              [{timestamp}]
            </span>
            <span className="text-[10px] font-mono font-semibold tracking-wider text-theme-text-dim">
              STABILITY_REPORT
            </span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest uppercase border ${style.badge}`}>
              {style.badgeText}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-theme-text-dimmer" />
          ) : (
            <ChevronDown className="w-3 h-3 text-theme-text-dimmer" />
          )}
        </button>

        {/* Content */}
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-3"
          >
            <div className={`text-sm font-mono ${style.text}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p({ children }) {
                    return (
                      <p className="whitespace-pre-wrap leading-relaxed text-[12px] mb-1.5 last:mb-0">
                        {children}
                      </p>
                    );
                  },
                  strong({ children }) {
                    return (
                      <strong className="font-semibold text-theme-text">
                        {children}
                      </strong>
                    );
                  },
                  ul({ children }) {
                    return (
                      <ul className="text-[12px] leading-relaxed mb-1.5 space-y-1">
                        {children}
                      </ul>
                    );
                  },
                  li({ children }) {
                    // Try to detect category from the content
                    const text = String(children);
                    const catMatch = text.match(/\[(CRITICAL|WARNING|INFO)\]\s*([\w\s]+)\*\*/);
                    const cat = catMatch
                      ? catMatch[2].trim().toLowerCase().replace(/\s+/g, "_")
                      : "";

                    return (
                      <li className="flex items-start gap-1.5 pl-1">
                        {cat && <CategoryIcon category={cat} />}
                        {!cat && <span className="text-theme-text-dimmer mt-px">·</span>}
                        <span className="flex-1">{children}</span>
                      </li>
                    );
                  },
                  code({ children }) {
                    return (
                      <code className="px-1 py-0.5 rounded bg-white/5 text-theme-accent text-[11px] font-mono">
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Score bars */}
            {scores.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                {scores.map((s) => (
                  <div key={s.category} className="flex items-center gap-2">
                    <CategoryIcon category={s.category} />
                    <span className="text-[10px] font-mono text-theme-text-dimmer uppercase tracking-wider w-20">
                      {s.category.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.value}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: scoreColor(s.value) }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-theme-text-dimmer w-6 text-right">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action button */}
            <button
              onClick={toggleHealthPanel}
              className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase border transition-colors ${
                severity === "critical" || severity === "warning"
                  ? `${style.border} ${style.accent} bg-white/[0.02] hover:bg-white/[0.05]`
                  : "border-white/10 text-theme-text-dim bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <Crosshair className="w-3 h-3" strokeWidth={1.5} />
              {t("health.stabilize")}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});
