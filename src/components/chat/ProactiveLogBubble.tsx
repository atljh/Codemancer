import { motion } from "framer-motion";
import { BrainCog } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../../types/game";

interface Props {
  message: ChatMessage;
}

export function ProactiveLogBubble({ message }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="flex gap-2.5 px-3 py-2"
    >
      <div className="shrink-0 w-6 h-6 rounded glass-panel-bright flex items-center justify-center mt-0.5">
        <BrainCog
          className="w-3.5 h-3.5 text-theme-accent animate-pulse"
          strokeWidth={1.5}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-mono uppercase tracking-widest text-theme-accent/60 mb-1">
          [PROACTIVE_LOG]
        </div>
        <div className="text-xs font-mono text-theme-text-dim leading-relaxed prose-invert prose-xs max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
