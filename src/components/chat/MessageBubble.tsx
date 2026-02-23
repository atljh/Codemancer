import { motion } from "framer-motion";
import type { ChatMessage } from "../../types/game";
import { Terminal, Bot, User, Copy } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

interface MessageBubbleProps {
  message: ChatMessage;
  onApplyCode?: (code: string) => void;
}

interface ContentBlock {
  type: "text" | "code";
  content: string;
  language?: string;
}

function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) blocks.push({ type: "text", content: text });
    }
    blocks.push({
      type: "code",
      content: match[2].trim(),
      language: match[1] || undefined,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) blocks.push({ type: "text", content: text });
  }

  if (blocks.length === 0) {
    blocks.push({ type: "text", content });
  }

  return blocks;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function MessageBubble({ message, onApplyCode }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const { t } = useTranslation();
  const blocks = parseContent(message.content);
  const timestamp = formatTimestamp(message.timestamp);

  const prefix = isSystem
    ? "SYS.ALERT"
    : isUser
      ? "OPERATOR"
      : "SYSTEM.ANALYSIS";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Icon */}
      <div
        className={`
          w-7 h-7 rounded flex-shrink-0 flex items-center justify-center glass-panel
          ${isSystem ? "text-theme-status-warning" : ""}
          ${isUser ? "text-theme-accent" : ""}
          ${!isUser && !isSystem ? "text-theme-purple" : ""}
        `}
      >
        {isSystem ? (
          <Terminal className="w-3.5 h-3.5" strokeWidth={1.5} />
        ) : isUser ? (
          <User className="w-3.5 h-3.5" strokeWidth={1.5} />
        ) : (
          <Bot className="w-3.5 h-3.5" strokeWidth={1.5} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`
          rounded-lg px-3 py-2 text-sm font-mono
          ${isUser ? "max-w-[80%]" : "max-w-[95%]"}
          ${
            isUser
              ? "glass-panel border-[var(--theme-glass-border-bright)] text-theme-text"
              : isSystem
                ? "bg-theme-status-warning/5 border border-theme-status-warning/12 text-theme-status-warning/90"
                : "bg-theme-purple/4 border border-theme-purple/10 text-theme-text"
          }
        `}
      >
        {/* Timestamp + prefix header */}
        <div className={`text-[10px] mb-1.5 tracking-wider font-bold ${
          isSystem ? "text-theme-status-warning/50" : isUser ? "text-theme-accent/40" : "text-theme-purple/40"
        }`}>
          [{timestamp}] [{prefix}]
        </div>

        {blocks.map((block, i) =>
          block.type === "code" ? (
            <div key={i} className="my-2 relative group/code">
              {/* SOURCE_DATA header */}
              <div className="flex items-center justify-between px-2.5 py-1 bg-theme-accent/6 border border-[var(--theme-glass-border)] border-b-0 rounded-t text-[10px] text-theme-accent/60 font-bold tracking-widest uppercase">
                <span>SOURCE_DATA{block.language ? ` // ${block.language}` : ""}</span>
              </div>
              <pre className="bg-theme-bg-inset rounded-b border border-[var(--theme-glass-border)] border-t-0 p-2.5 overflow-x-auto text-xs text-theme-text/80 font-mono leading-relaxed">
                <code>{block.content}</code>
              </pre>
              {onApplyCode && (
                <button
                  onClick={() => onApplyCode(block.content)}
                  className="absolute top-1 right-1.5 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-theme-accent/10 text-theme-accent border border-theme-accent/15 opacity-0 group-hover/code:opacity-100 transition-opacity hover:bg-theme-accent/20"
                >
                  <Copy className="w-2.5 h-2.5" strokeWidth={1.5} />
                  {t("diff.viewDiff")}
                </button>
              )}
            </div>
          ) : (
            <p key={i} className="whitespace-pre-wrap leading-relaxed text-[13px]">
              {block.content}
            </p>
          )
        )}
      </div>
    </motion.div>
  );
}
