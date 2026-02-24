import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Search as SearchIcon,
  Link,
  Crosshair,
  Loader2,
  FileText,
  Film,
  Globe,
  Mic,
  X,
} from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useAudio } from "../../hooks/useAudio";
import { useTranslation } from "../../hooks/useTranslation";
import type {
  TelegramMessage,
  TelegramAnalysis,
  TelegramMedia,
} from "../../types/game";
import type { TranslationKey } from "../../i18n/translations";

export function CommsMessageViewer() {
  const { t } = useTranslation();
  const messages = useGameStore((s) => s.commsMessages);
  const activeDialogId = useGameStore((s) => s.commsActiveDialogId);
  const projectScan = useGameStore((s) => s.projectScan);
  const setBountyZone = useGameStore((s) => s.setBountyZone);
  const setQuests = useGameStore((s) => s.setQuests);
  const quests = useGameStore((s) => s.quests);
  const api = useApi();
  const { playSound, sayText } = useAudio();

  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analyses, setAnalyses] = useState<Record<number, TelegramAnalysis>>(
    {},
  );
  const [extractingId, setExtractingId] = useState<number | null>(null);
  const [glowActive, setGlowActive] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom & glow on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (messages.length > 0) {
      setGlowActive(true);
      const timer = setTimeout(() => setGlowActive(false), 800);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleAnalyze = async (msg: TelegramMessage) => {
    setAnalyzingId(msg.id);
    playSound("data_crunch");
    try {
      const projectFiles = projectScan?.key_files ?? [];
      const result = await api.analyzeTelegramMessage(
        msg.text,
        msg.senderName,
        "",
        projectFiles,
      );
      setAnalyses((prev) => ({ ...prev, [msg.id]: result }));
      playSound("data_burst");

      if (result.has_references && result.linked_files.length > 0) {
        setBountyZone(result.linked_files[0], result.linked_files);
        const sector =
          result.linked_files[0].split("/").pop() ?? result.linked_files[0];
        sayText(t("comms.signalReceived").replace("{sector}", sector));
      }
    } catch {
      // analysis failed
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleExtractQuest = async (msg: TelegramMessage) => {
    const analysis = analyses[msg.id];
    if (!analysis?.quest_suggestion) return;
    setExtractingId(msg.id);
    try {
      const quest = await api.extractTelegramQuest(
        msg.text,
        msg.senderName,
        analysis.linked_files,
        analysis.quest_suggestion,
      );
      setQuests([...quests, quest]);
      playSound("mission_complete");
    } catch {
      // extract failed
    } finally {
      setExtractingId(null);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (!activeDialogId) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-theme-text-dimmer font-mono">
        {t("comms.noMessages")}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[var(--theme-glass-border)]">
        <h3 className="text-[10px] font-mono font-bold text-theme-accent tracking-[0.2em] uppercase">
          {t("comms.intercepted")}
        </h3>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2 transition-shadow duration-800"
        style={{
          boxShadow: glowActive
            ? "inset 0 0 20px rgba(var(--theme-accent-rgb), 0.2)"
            : "none",
        }}
      >
        {messages.map((msg) => {
          const analysis = analyses[msg.id];
          return (
            <div key={msg.id} className="group">
              {/* Sender + time header */}
              <div className="font-mono text-[11px] leading-relaxed">
                <span className="text-theme-text-dimmer">
                  [{formatTime(msg.date)}]
                </span>{" "}
                <span
                  className={
                    msg.out ? "text-theme-accent-dim" : "text-theme-accent"
                  }
                >
                  [{msg.out ? "OUT" : msg.senderName || "SRC"}]
                </span>
              </div>

              {/* Message content */}
              <div
                className={`mt-0.5 pl-2 border-l border-[var(--theme-glass-border)] ${msg.out ? "text-theme-text-dim" : "text-theme-text"}`}
              >
                {/* Media */}
                {msg.media && (
                  <MediaRenderer
                    media={msg.media}
                    onImageClick={setLightboxUrl}
                    t={t}
                  />
                )}

                {/* Text with markdown */}
                {msg.text && (
                  <div className="comms-markdown text-[12px] font-mono leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Action buttons on hover */}
              {(msg.text || msg.media) && (
                <div className="flex items-center gap-1.5 mt-0.5 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleAnalyze(msg)}
                    disabled={analyzingId === msg.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider border border-theme-accent/15 text-theme-accent/70 hover:bg-theme-accent/8 hover:text-theme-accent transition-all disabled:opacity-50"
                  >
                    {analyzingId === msg.id ? (
                      <>
                        <Loader2
                          className="w-2.5 h-2.5 animate-spin"
                          strokeWidth={1.5}
                        />
                        {t("comms.analyzing")}
                      </>
                    ) : (
                      <>
                        <SearchIcon
                          className="w-2.5 h-2.5"
                          strokeWidth={1.5}
                        />
                        {t("comms.analyze")}
                      </>
                    )}
                  </button>

                  {analysis?.quest_suggestion && (
                    <button
                      onClick={() => handleExtractQuest(msg)}
                      disabled={extractingId === msg.id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider border border-theme-status-success/15 text-theme-status-success/70 hover:bg-theme-status-success/8 hover:text-theme-status-success transition-all disabled:opacity-50"
                    >
                      <Crosshair className="w-2.5 h-2.5" strokeWidth={1.5} />
                      {t("comms.extractQuest")}
                    </button>
                  )}
                </div>
              )}

              {/* Analysis result */}
              <AnimatePresence>
                {analysis?.has_references && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1 mb-1 ml-2 flex items-center gap-1.5 px-2 py-1 rounded bg-theme-status-warning/5 border border-theme-status-warning/15"
                  >
                    <Link
                      className="w-3 h-3 text-theme-status-warning shrink-0"
                      strokeWidth={1.5}
                    />
                    <span className="text-[9px] font-mono text-theme-status-warning tracking-wider font-bold">
                      {t("comms.linkedSector")}:
                    </span>
                    <span className="text-[9px] font-mono text-theme-text-dim truncate">
                      {analysis.linked_files.join(", ")}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Lightbox overlay */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxUrl}
              alt="Full size"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Media renderer sub-component
function MediaRenderer({
  media,
  onImageClick,
  t,
}: {
  media: TelegramMedia;
  onImageClick: (url: string) => void;
  t: (key: TranslationKey) => string;
}) {
  if (media.type === "photo" || media.type === "sticker" || media.type === "gif") {
    if (media.url) {
      return (
        <div className="my-1.5">
          <img
            src={media.url}
            alt={media.type}
            className={`rounded border border-[var(--theme-glass-border)] hover:border-theme-accent/40 transition-colors cursor-pointer ${
              media.type === "sticker"
                ? "max-h-[150px]"
                : "max-h-[300px] max-w-full"
            }`}
            onClick={() => onImageClick(media.url!)}
          />
        </div>
      );
    }
    // Photo not yet downloaded — show placeholder
    return (
      <div className="my-1.5 flex items-center gap-1.5 px-2.5 py-2 rounded border border-[var(--theme-glass-border)] bg-white/2 w-fit">
        <Loader2
          className="w-3.5 h-3.5 text-theme-accent/50 animate-spin"
          strokeWidth={1.5}
        />
        <span className="text-[10px] font-mono text-theme-text-dimmer tracking-wider">
          {t("comms.loadingMedia")}
        </span>
      </div>
    );
  }

  if (media.type === "video") {
    return (
      <div className="my-1.5 flex items-center gap-1.5 px-2.5 py-2 rounded border border-[var(--theme-glass-border)] bg-white/2 w-fit">
        <Film className="w-3.5 h-3.5 text-theme-accent/60" strokeWidth={1.5} />
        <span className="text-[10px] font-mono text-theme-text-dim tracking-wider">
          {t("comms.video")}
          {media.fileName ? ` — ${media.fileName}` : ""}
        </span>
      </div>
    );
  }

  if (media.type === "voice") {
    return (
      <div className="my-1.5 flex items-center gap-1.5 px-2.5 py-2 rounded border border-[var(--theme-glass-border)] bg-white/2 w-fit">
        <Mic className="w-3.5 h-3.5 text-theme-accent/60" strokeWidth={1.5} />
        <span className="text-[10px] font-mono text-theme-text-dim tracking-wider">
          {t("comms.voice")}
        </span>
      </div>
    );
  }

  if (media.type === "document") {
    return (
      <div className="my-1.5 flex items-center gap-1.5 px-2.5 py-2 rounded border border-[var(--theme-glass-border)] bg-white/2 w-fit">
        <FileText
          className="w-3.5 h-3.5 text-theme-accent/60"
          strokeWidth={1.5}
        />
        <span className="text-[10px] font-mono text-theme-text-dim tracking-wider">
          {media.fileName || t("comms.document")}
        </span>
      </div>
    );
  }

  if (media.type === "webpage" && media.webpageUrl) {
    return (
      <a
        href={media.webpageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="my-1.5 block rounded border border-[var(--theme-glass-border)] bg-white/2 hover:bg-white/4 transition-colors overflow-hidden max-w-[400px]"
      >
        <div className="px-2.5 py-2 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Globe
              className="w-3 h-3 text-theme-accent/60 shrink-0"
              strokeWidth={1.5}
            />
            <span className="text-[10px] font-mono text-theme-accent truncate">
              {new URL(media.webpageUrl).hostname}
            </span>
          </div>
          {media.webpageTitle && (
            <div className="text-[11px] font-mono text-theme-text font-bold leading-snug">
              {media.webpageTitle}
            </div>
          )}
          {media.webpageDescription && (
            <div className="text-[10px] font-mono text-theme-text-dim leading-snug line-clamp-3">
              {media.webpageDescription}
            </div>
          )}
        </div>
      </a>
    );
  }

  return null;
}

// Markdown component overrides for compact comms styling
const markdownComponents = {
  p({ children }: any) {
    return (
      <p className="whitespace-pre-wrap leading-relaxed mb-1 last:mb-0">
        {children}
      </p>
    );
  },
  strong({ children }: any) {
    return <strong className="font-bold text-theme-text">{children}</strong>;
  },
  em({ children }: any) {
    return <em className="italic text-theme-text/90">{children}</em>;
  },
  del({ children }: any) {
    return <del className="line-through text-theme-text-dim">{children}</del>;
  },
  a({ href, children }: any) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-theme-accent underline underline-offset-2 hover:text-theme-accent/80 break-all"
      >
        {children}
      </a>
    );
  },
  code({ children }: any) {
    return (
      <code className="px-1 py-0.5 rounded bg-theme-accent/10 text-theme-accent text-[11px]">
        {children}
      </code>
    );
  },
  pre({ children }: any) {
    return (
      <pre className="my-1.5 bg-theme-bg-inset rounded border border-[var(--theme-glass-border)] p-2 overflow-x-auto text-[11px] text-theme-text/80 leading-relaxed">
        {children}
      </pre>
    );
  },
  blockquote({ children }: any) {
    return (
      <blockquote className="border-l-2 border-theme-accent/30 pl-2 my-1 text-theme-text-dim italic text-[11px]">
        {children}
      </blockquote>
    );
  },
  ul({ children }: any) {
    return (
      <ul className="list-disc list-inside leading-relaxed mb-1 space-y-0.5">
        {children}
      </ul>
    );
  },
  ol({ children }: any) {
    return (
      <ol className="list-decimal list-inside leading-relaxed mb-1 space-y-0.5">
        {children}
      </ol>
    );
  },
  h1({ children }: any) {
    return (
      <h1 className="text-[13px] font-bold text-theme-text mb-1 mt-1.5">
        {children}
      </h1>
    );
  },
  h2({ children }: any) {
    return (
      <h2 className="text-[13px] font-bold text-theme-text mb-1 mt-1.5">
        {children}
      </h2>
    );
  },
  h3({ children }: any) {
    return (
      <h3 className="text-[12px] font-bold text-theme-text mb-0.5 mt-1">
        {children}
      </h3>
    );
  },
  hr() {
    return <hr className="border-theme-accent/15 my-1.5" />;
  },
};
