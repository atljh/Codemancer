import { memo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../../types/game";
import { Terminal, Bot, User, Copy } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

interface MessageBubbleProps {
  message: ChatMessage;
  onApplyCode?: (code: string) => void;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onApplyCode,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const { t } = useTranslation();
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
        <div
          className={`text-[10px] mb-1.5 tracking-wider font-bold ${
            isSystem
              ? "text-theme-status-warning/50"
              : isUser
                ? "text-theme-accent/40"
                : "text-theme-purple/40"
          }`}
        >
          [{timestamp}] [{prefix}]
        </div>

        {/* Attached images */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.images.map((img, i) => (
              <a
                key={i}
                href={`data:${img.media_type};base64,${img.data}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={`data:${img.media_type};base64,${img.data}`}
                  alt={`Image ${i + 1}`}
                  className="max-h-48 max-w-[300px] rounded border border-theme-accent/15 hover:border-theme-accent/40 transition-colors cursor-pointer"
                />
              </a>
            ))}
          </div>
        )}

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Fenced code blocks — handled entirely in `pre`
            pre({ node }) {
              const codeEl = node?.children?.[0] as any;
              const classes = codeEl?.properties?.className || [];
              const langMatch = /language-(\w+)/.exec(classes[0] || "");
              const lang = langMatch?.[1];
              // Extract raw text from the code element
              const codeStr = (codeEl?.children || [])
                .map((c: any) => c.value ?? "")
                .join("")
                .replace(/\n$/, "");

              return (
                <div className="my-2 relative group/code">
                  <div className="flex items-center justify-between px-2.5 py-1 bg-theme-accent/6 border border-[var(--theme-glass-border)] border-b-0 rounded-t text-[10px] text-theme-accent/60 font-bold tracking-widest uppercase">
                    <span>SOURCE_DATA{lang ? ` // ${lang}` : ""}</span>
                  </div>
                  <pre className="bg-theme-bg-inset rounded-b border border-[var(--theme-glass-border)] border-t-0 p-2.5 overflow-x-auto text-xs text-theme-text/80 font-mono leading-relaxed">
                    <code>{codeStr}</code>
                  </pre>
                  {onApplyCode && (
                    <button
                      onClick={() => onApplyCode(codeStr)}
                      className="absolute top-1 right-1.5 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-theme-accent/10 text-theme-accent border border-theme-accent/15 opacity-0 group-hover/code:opacity-100 transition-opacity hover:bg-theme-accent/20"
                    >
                      <Copy className="w-2.5 h-2.5" strokeWidth={1.5} />
                      {t("diff.viewDiff")}
                    </button>
                  )}
                </div>
              );
            },
            // Inline code only (block code is handled by `pre` above)
            code({ children }) {
              return (
                <code className="px-1 py-0.5 rounded bg-theme-accent/10 text-theme-accent text-xs font-mono">
                  {children}
                </code>
              );
            },
            // Paragraphs
            p({ children }) {
              return (
                <p className="whitespace-pre-wrap leading-relaxed text-[13px] mb-1.5 last:mb-0">
                  {children}
                </p>
              );
            },
            // Bold
            strong({ children }) {
              return (
                <strong className="font-bold text-theme-text">
                  {children}
                </strong>
              );
            },
            // Lists
            ul({ children }) {
              return (
                <ul className="list-disc list-inside text-[13px] leading-relaxed mb-1.5 space-y-0.5">
                  {children}
                </ul>
              );
            },
            ol({ children }) {
              return (
                <ol className="list-decimal list-inside text-[13px] leading-relaxed mb-1.5 space-y-0.5">
                  {children}
                </ol>
              );
            },
            // Headings
            h1({ children }) {
              return (
                <h1 className="text-sm font-bold text-theme-text mb-1 mt-2">
                  {children}
                </h1>
              );
            },
            h2({ children }) {
              return (
                <h2 className="text-sm font-bold text-theme-text mb-1 mt-2">
                  {children}
                </h2>
              );
            },
            h3({ children }) {
              return (
                <h3 className="text-[13px] font-bold text-theme-text mb-1 mt-1.5">
                  {children}
                </h3>
              );
            },
            // Links
            a({ href, children }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-theme-accent underline underline-offset-2 hover:text-theme-accent/80"
                >
                  {children}
                </a>
              );
            },
            // Blockquote
            blockquote({ children }) {
              return (
                <blockquote className="border-l-2 border-theme-accent/30 pl-2.5 my-1.5 text-theme-text-dim italic">
                  {children}
                </blockquote>
              );
            },
            // Horizontal rule
            hr() {
              return <hr className="border-theme-accent/15 my-2" />;
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
});
