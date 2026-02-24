import { memo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BrainCircuit } from "lucide-react";
import type { ChatMessage } from "../../types/game";

interface RecallBubbleProps {
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

export const RecallBubble = memo(function RecallBubble({
  message,
}: RecallBubbleProps) {
  const timestamp = formatTimestamp(message.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-2.5"
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center bg-theme-purple/15 border border-theme-purple/25">
        <BrainCircuit
          className="w-3.5 h-3.5 text-theme-purple"
          strokeWidth={1.5}
        />
      </div>

      {/* Body */}
      <div className="max-w-[95%] rounded-lg px-3 py-2 text-sm font-mono bg-theme-purple/4 border border-theme-purple/12">
        <div className="text-[10px] mb-1.5 tracking-wider font-bold text-theme-purple/50">
          [{timestamp}] [CROSS_SESSION_MEMORY]
        </div>
        <div className="text-theme-purple/85">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p({ children }) {
                return (
                  <p className="whitespace-pre-wrap leading-relaxed text-[13px] mb-1.5 last:mb-0">
                    {children}
                  </p>
                );
              },
              strong({ children }) {
                return (
                  <strong className="font-bold text-theme-purple">
                    {children}
                  </strong>
                );
              },
              ul({ children }) {
                return (
                  <ul className="list-disc list-inside text-[13px] leading-relaxed mb-1.5 space-y-0.5">
                    {children}
                  </ul>
                );
              },
              code({ children }) {
                return (
                  <code className="px-1 py-0.5 rounded bg-theme-purple/10 text-theme-purple text-xs font-mono">
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
});
