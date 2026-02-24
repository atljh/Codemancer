import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useTranslation } from "../../hooks/useTranslation";
import type { ConversationMeta } from "../../types/game";

function timeAgo(ts: number, locale: string): string {
  const seconds = Math.floor((Date.now() - ts * 1000) / 1000);
  if (seconds < 60) return locale === "ru" ? "только что" : "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return locale === "ru" ? `${minutes} мин назад` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === "ru" ? `${hours} ч назад` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === "ru" ? `${days} дн назад` : `${days}d ago`;
}

interface ConversationDrawerProps {
  onNewMission: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationDrawer({
  onNewMission,
  onSelectConversation,
  onDeleteConversation,
}: ConversationDrawerProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const conversations = useGameStore((s) => s.conversations);
  const currentConversationId = useGameStore((s) => s.currentConversationId);
  const locale = useGameStore((s) => s.locale);
  const { t } = useTranslation();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (id: string) => {
    if (id !== currentConversationId) {
      onSelectConversation(id);
    }
    setOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteConversation(id);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded glass-panel-bright text-xs font-mono tracking-wider text-theme-text-dim hover:text-theme-accent transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span className="uppercase">{t("chat.missionLogs")}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 z-50 w-72 max-h-80 overflow-y-auto rounded-lg glass-panel border border-theme-accent/10 backdrop-blur-xl shadow-2xl scrollbar-thin"
          >
            {/* New Mission button */}
            <button
              onClick={() => {
                onNewMission();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-mono tracking-wider text-theme-accent hover:bg-theme-accent/10 transition-colors border-b border-theme-accent/10"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="uppercase">{t("chat.newMission")}</span>
            </button>

            {/* Conversation list */}
            {conversations.length === 0 ? (
              <div className="px-3 py-4 text-center text-[10px] text-theme-text-dimmer font-mono uppercase tracking-widest">
                {t("chat.noConversations")}
              </div>
            ) : (
              conversations.map((conv: ConversationMeta) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={`w-full group flex items-center gap-2 px-3 py-2 text-left hover:bg-theme-accent/8 transition-colors ${
                    conv.id === currentConversationId
                      ? "bg-theme-accent/10 border-l-2 border-theme-accent"
                      : "border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-theme-text truncate font-mono">
                      {conv.title || t("chat.newMission")}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-theme-text-dimmer font-mono">
                        {timeAgo(conv.updated_at, locale)}
                      </span>
                      <span className="text-[10px] text-theme-text-dimmer font-mono">
                        {conv.message_count} msg
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400 transition-all"
                    title={t("chat.deleteConfirm")}
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
