import { memo, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShieldAlert, ChevronDown, ChevronUp, Crosshair } from "lucide-react";
import type { ChatMessage } from "../../types/game";
import { useTranslation } from "../../hooks/useTranslation";
import { useGameStore } from "../../stores/gameStore";

interface HealthAlertBubbleProps {
  message: ChatMessage;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const HealthAlertBubble = memo(function HealthAlertBubble({ message }: HealthAlertBubbleProps) {
  const [expanded, setExpanded] = useState(true);
  const { t } = useTranslation();
  const toggleHealthPanel = useGameStore((s) => s.toggleHealthPanel);
  const timestamp = formatTimestamp(message.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex gap-2.5"
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center bg-red-500/15 border border-red-500/25 animate-pulse">
        <ShieldAlert className="w-3.5 h-3.5 text-red-400" strokeWidth={1.5} />
      </div>

      {/* Alert body */}
      <div className="max-w-[95%] rounded-lg overflow-hidden border border-red-500/20 bg-red-500/5 flex-1">
        {/* Header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-red-500/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-red-400/60">
              [{timestamp}] [HEALTH_SCANNER]
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-red-500/15 text-red-400 border border-red-500/20">
              CRITICAL
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-red-400/50" />
          ) : (
            <ChevronDown className="w-3 h-3 text-red-400/50" />
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
            <div className="text-sm font-mono text-red-300/90">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p({ children }) {
                    return <p className="whitespace-pre-wrap leading-relaxed text-[13px] mb-1.5 last:mb-0">{children}</p>;
                  },
                  strong({ children }) {
                    return <strong className="font-bold text-red-300">{children}</strong>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc list-inside text-[13px] leading-relaxed mb-1.5 space-y-0.5">{children}</ul>;
                  },
                  code({ children }) {
                    return (
                      <code className="px-1 py-0.5 rounded bg-red-500/10 text-red-300 text-xs font-mono">
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Action button */}
            <button
              onClick={toggleHealthPanel}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
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
