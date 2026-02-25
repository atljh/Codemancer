import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BrainCog } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../../types/game";

interface Props {
  message: ChatMessage;
}

/** Characters revealed per tick */
const CHARS_PER_TICK = 2;
/** Tick interval in ms — lower = faster typing */
const TICK_MS = 18;

export function ProactiveLogBubble({ message }: Props) {
  const [revealed, setRevealed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const content = message.content;

  useEffect(() => {
    // Start from 0 and reveal progressively
    setRevealed(0);
    timerRef.current = setInterval(() => {
      setRevealed((prev) => {
        const next = prev + CHARS_PER_TICK;
        if (next >= content.length) {
          clearInterval(timerRef.current);
          return content.length;
        }
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(timerRef.current);
  }, [content]);

  const displayText = content.slice(0, revealed);
  const isTyping = revealed < content.length;

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
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-theme-accent/60">
            [PROACTIVE_LOG]
          </span>
          {/* Pulse indicator */}
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-accent/40" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-theme-accent/70" />
          </span>
        </div>
        <div className="text-xs font-mono text-theme-text-dim leading-relaxed prose-invert prose-xs max-w-none">
          <ReactMarkdown>{displayText}</ReactMarkdown>
          {isTyping && (
            <span className="inline-block w-1.5 h-3 bg-theme-accent/50 ml-0.5 animate-cursor-blink align-middle" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
