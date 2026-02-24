import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon, Link, Crosshair, Loader2 } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useAudio } from "../../hooks/useAudio";
import { useTranslation } from "../../hooks/useTranslation";
import type { TelegramMessage, TelegramAnalysis } from "../../types/game";

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
  const [analyses, setAnalyses] = useState<Record<number, TelegramAnalysis>>({});
  const [extractingId, setExtractingId] = useState<number | null>(null);
  const [glowActive, setGlowActive] = useState(false);
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
        projectFiles
      );
      setAnalyses((prev) => ({ ...prev, [msg.id]: result }));
      playSound("data_burst");

      if (result.has_references && result.linked_files.length > 0) {
        setBountyZone(result.linked_files[0], result.linked_files);
        const sector = result.linked_files[0].split("/").pop() ?? result.linked_files[0];
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
        analysis.quest_suggestion
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
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
        className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1 transition-shadow duration-800"
        style={{
          boxShadow: glowActive ? "inset 0 0 20px rgba(var(--theme-accent-rgb), 0.2)" : "none",
        }}
      >
        {messages.map((msg) => {
          const analysis = analyses[msg.id];
          return (
            <div key={msg.id} className="group">
              <div className={`font-mono text-[11px] leading-relaxed ${msg.out ? "text-theme-text-dim" : "text-theme-text"}`}>
                <span className="text-theme-text-dimmer">[{formatTime(msg.date)}]</span>{" "}
                <span className={msg.out ? "text-theme-accent-dim" : "text-theme-accent"}>
                  [{msg.out ? "OUT" : msg.senderName || "SRC"}]
                </span>
                : {msg.text}
              </div>

              {/* Action buttons on hover */}
              {msg.text && (
                <div className="flex items-center gap-1.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleAnalyze(msg)}
                    disabled={analyzingId === msg.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider border border-theme-accent/15 text-theme-accent/70 hover:bg-theme-accent/8 hover:text-theme-accent transition-all disabled:opacity-50"
                  >
                    {analyzingId === msg.id ? (
                      <><Loader2 className="w-2.5 h-2.5 animate-spin" strokeWidth={1.5} />{t("comms.analyzing")}</>
                    ) : (
                      <><SearchIcon className="w-2.5 h-2.5" strokeWidth={1.5} />{t("comms.analyze")}</>
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
                    className="mt-1 mb-1 flex items-center gap-1.5 px-2 py-1 rounded bg-theme-status-warning/5 border border-theme-status-warning/15"
                  >
                    <Link className="w-3 h-3 text-theme-status-warning shrink-0" strokeWidth={1.5} />
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
    </div>
  );
}
