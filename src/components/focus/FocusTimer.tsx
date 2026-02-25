import { useState, useEffect, useRef } from "react";
import { Timer, X } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";

export function FocusTimer() {
  const focusStatus = useGameStore((s) => s.focusStatus);
  const setFocusStatus = useGameStore((s) => s.setFocusStatus);
  const addActionLog = useGameStore((s) => s.addActionLog);
  const api = useApi();
  const { t } = useTranslation();

  const [showMenu, setShowMenu] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const isActive = focusStatus?.active ?? false;

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // Local countdown
  useEffect(() => {
    if (!isActive) {
      setRemainingSeconds(0);
      return;
    }
    setRemainingSeconds(focusStatus?.remaining_seconds ?? 0);

    tickRef.current = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s <= 1) {
          // Expired
          setFocusStatus(null);
          addActionLog({ action: t("focus.expired"), status: "done" });
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(tickRef.current);
  }, [isActive, focusStatus, setFocusStatus, addActionLog, t]);

  // Sync with backend every 30s
  useEffect(() => {
    if (!isActive) return;
    syncRef.current = setInterval(async () => {
      try {
        const status = await api.focusStatus();
        if (!status.active) {
          setFocusStatus(null);
          addActionLog({ action: t("focus.expired"), status: "done" });
        } else {
          setFocusStatus(status);
          setRemainingSeconds(status.remaining_seconds);
        }
      } catch {
        // ignore
      }
    }, 30_000);

    return () => clearInterval(syncRef.current);
  }, [isActive, api, setFocusStatus, addActionLog, t]);

  // Blur detection via document visibility
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      if (document.hidden && isActive) {
        addActionLog({ action: t("focus.lostSync"), status: "error" });
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isActive, addActionLog, t]);

  const handleStart = async (minutes: number) => {
    setShowMenu(false);
    try {
      const status = await api.focusStart(minutes);
      setFocusStatus(status);
    } catch {
      // ignore
    }
  };

  const handleStop = async () => {
    try {
      await api.focusEnd();
      setFocusStatus(null);
    } catch {
      // ignore
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (isActive) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded glass-panel-bright animate-glow-pulse">
          <Timer className="w-3 h-3 text-theme-accent" strokeWidth={1.5} />
          <span className="text-[10px] font-mono font-bold text-theme-accent tabular-nums">
            {formatTime(remainingSeconds)}
          </span>
          <span className="text-[8px] font-mono font-bold text-theme-accent/70">
            {t("focus.active")}
          </span>
        </div>
        <button
          onClick={handleStop}
          className="p-1 rounded hover:bg-theme-status-error/15 text-theme-text-dim hover:text-theme-status-error transition-colors"
          title={t("focus.stop")}
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1.5 rounded hover:bg-theme-accent/8 text-theme-text-dim hover:text-theme-accent transition-colors"
        title={t("focus.title")}
      >
        <Timer className="w-4 h-4" strokeWidth={1.5} />
      </button>

      {showMenu && (
        <div className="absolute top-full right-0 mt-1 z-50 glass-panel border border-[var(--theme-glass-border)] rounded shadow-lg py-1 min-w-[100px]">
          <button
            onClick={() => handleStart(25)}
            className="w-full text-left px-3 py-1.5 text-[10px] font-mono text-theme-text-dim hover:bg-theme-accent/10 hover:text-theme-accent transition-colors"
          >
            {t("focus.min25")}
          </button>
          <button
            onClick={() => handleStart(50)}
            className="w-full text-left px-3 py-1.5 text-[10px] font-mono text-theme-text-dim hover:bg-theme-accent/10 hover:text-theme-accent transition-colors"
          >
            {t("focus.min50")}
          </button>
        </div>
      )}
    </div>
  );
}
