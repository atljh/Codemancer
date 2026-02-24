import { useState, useEffect } from "react";
import { Users, Megaphone, MessageSquare, Search } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useTelegram } from "../../hooks/useTelegram";
import { useTranslation } from "../../hooks/useTranslation";
import type { TelegramDialog } from "../../types/game";

export function CommsChatList() {
  const { t } = useTranslation();
  const dialogs = useGameStore((s) => s.commsDialogs);
  const activeDialogId = useGameStore((s) => s.commsActiveDialogId);
  const setCommsActiveDialogId = useGameStore((s) => s.setCommsActiveDialogId);
  const { fetchDialogs, fetchMessages } = useTelegram();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchDialogs();
  }, [fetchDialogs]);

  const filtered = filter
    ? dialogs.filter((d) =>
        d.title.toLowerCase().includes(filter.toLowerCase()),
      )
    : dialogs;

  const handleSelect = (dialog: TelegramDialog) => {
    setCommsActiveDialogId(dialog.id);
    fetchMessages(dialog.id);
  };

  const getIcon = (d: TelegramDialog) => {
    if (d.isChannel)
      return <Megaphone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />;
    if (d.isGroup)
      return <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />;
    return <MessageSquare className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />;
  };

  return (
    <div className="w-[280px] border-r border-[var(--theme-glass-border)] flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[var(--theme-glass-border)]">
        <h3 className="text-[10px] font-mono font-bold text-theme-accent tracking-[0.2em] uppercase mb-2">
          {t("comms.activeSignals")}
        </h3>
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-text-dimmer"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="w-full bg-theme-bg-base border border-[var(--theme-glass-border)] rounded pl-7 pr-2 py-1.5 text-[11px] text-theme-text placeholder-theme-text-dimmer outline-none focus:border-theme-accent/30 font-mono transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-[10px] text-theme-text-dimmer font-mono">
            {t("comms.noSignals")}
          </div>
        ) : (
          filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => handleSelect(d)}
              className={`w-full text-left px-3 py-2 border-b border-[var(--theme-glass-border)] transition-colors ${
                activeDialogId === d.id
                  ? "bg-theme-accent/8 border-l-2 border-l-theme-accent"
                  : "hover:bg-white/3"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={
                    activeDialogId === d.id
                      ? "text-theme-accent"
                      : "text-theme-text-dim"
                  }
                >
                  {getIcon(d)}
                </span>
                <span className="text-[11px] font-mono text-theme-text truncate flex-1">
                  {d.title}
                </span>
                {d.unreadCount > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-theme-accent/20 text-theme-accent shrink-0">
                    {d.unreadCount}
                  </span>
                )}
              </div>
              {d.lastMessage && (
                <div className="mt-0.5 text-[10px] text-theme-text-dimmer font-mono truncate pl-5.5">
                  {d.lastMessage}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
