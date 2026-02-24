import { motion } from "framer-motion";
import { BrainCircuit, ListChecks, HelpCircle } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import type { ChatMessage } from "../../types/game";

interface IntelBubbleProps {
  message: ChatMessage;
}

export function IntelBubble({ message }: IntelBubbleProps) {
  const { t } = useTranslation();

  // Parse intent/subtasks/question from content
  let intent = "";
  let subtasks: string[] = [];
  let question: string | null = null;
  let source = "text";

  try {
    const metaIdx = message.content.indexOf("---meta---");
    if (metaIdx >= 0) {
      const meta = JSON.parse(message.content.slice(metaIdx + 10));
      intent = meta.intent || "";
      subtasks = meta.subtasks || [];
      question = meta.clarifying_question || null;
      source = meta.source || "text";
    }
  } catch {
    intent = message.content;
  }

  const sourceTag =
    source === "voice" ? t("intel.voiceTag") : t("intel.textTag");
  const sourceColor =
    source === "voice" ? "text-theme-status-error" : "text-theme-accent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-2 my-1"
    >
      <div className="glass-panel rounded-lg p-3 border border-theme-accent/15">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <BrainCircuit
            className="w-3.5 h-3.5 text-theme-accent shrink-0"
            strokeWidth={1.5}
          />
          <span className="text-[9px] font-mono uppercase tracking-widest text-theme-accent/70">
            {t("intel.processed")}
          </span>
          <span
            className={`text-[8px] font-mono uppercase tracking-wider ${sourceColor} ml-auto px-1.5 py-0.5 rounded bg-current/10`}
          >
            {sourceTag}
          </span>
        </div>

        {/* Intent */}
        {intent && (
          <div className="mb-2">
            <span className="text-[8px] font-mono uppercase tracking-wider text-theme-text-dimmer">
              {t("intel.intent")}
            </span>
            <p className="text-[11px] font-mono text-theme-text mt-0.5 leading-relaxed">
              {intent}
            </p>
          </div>
        )}

        {/* Subtasks */}
        {subtasks.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1 mb-1">
              <ListChecks
                className="w-3 h-3 text-theme-accent/50"
                strokeWidth={1.5}
              />
              <span className="text-[8px] font-mono uppercase tracking-wider text-theme-text-dimmer">
                {t("intel.subtasks")}
              </span>
            </div>
            <ul className="space-y-0.5 pl-4">
              {subtasks.map((task, i) => (
                <li
                  key={i}
                  className="text-[10px] font-mono text-theme-text/80 flex items-start gap-1.5"
                >
                  <span className="text-theme-accent/40 shrink-0">
                    {i + 1}.
                  </span>
                  {task}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Clarifying question */}
        {question && (
          <div className="mt-2 pt-2 border-t border-theme-accent/10">
            <div className="flex items-center gap-1.5">
              <HelpCircle
                className="w-3 h-3 text-theme-status-warning shrink-0"
                strokeWidth={1.5}
              />
              <span className="text-[8px] font-mono uppercase tracking-wider text-theme-status-warning/70">
                {t("intel.question")}
              </span>
            </div>
            <p className="text-[10px] font-mono text-theme-status-warning/80 mt-0.5 italic">
              {question}
            </p>
          </div>
        )}

        {/* EXP bonus indicator for voice briefings */}
        {source === "voice" && (
          <div className="mt-2 flex items-center gap-2 text-[8px] font-mono text-theme-accent/40">
            <span>{t("intel.mpReward")}</span>
            <span>{t("intel.expBonus")}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
