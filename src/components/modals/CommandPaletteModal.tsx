import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useTranslation } from "../../hooks/useTranslation";
import { getCommands, type Command } from "../../commands/commandRegistry";

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPaletteModal() {
  const show = useGameStore((s) => s.showCommandPalette);
  const setShow = useGameStore((s) => s.setShowCommandPalette);
  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => getCommands(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return commands.filter(
      (cmd) =>
        fuzzyMatch(query, t(cmd.labelKey as any)) ||
        fuzzyMatch(query, cmd.category) ||
        fuzzyMatch(query, cmd.id)
    );
  }, [query, commands, t]);

  useEffect(() => {
    if (show) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [show]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const executeCommand = useCallback(
    (cmd: Command) => {
      setShow(false);
      cmd.execute();
    },
    [setShow]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) executeCommand(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShow(false);
      }
    },
    [filtered, selectedIndex, executeCommand, setShow]
  );

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[520px] max-h-[60vh] rounded-lg glass-panel-bright border border-theme-accent/15 shadow-[0_0_40px_rgba(var(--theme-accent-rgb),0.1)] overflow-hidden"
          >
            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-accent/10">
              <span className="text-theme-accent text-sm font-mono font-bold">&gt;</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("cmd.palette.placeholder" as any)}
                className="flex-1 bg-transparent text-sm font-mono text-theme-text placeholder:text-theme-text-dim/50 outline-none"
              />
              <kbd className="text-[10px] text-theme-text-dim font-mono px-1.5 py-0.5 rounded bg-theme-bg-deep/60 border border-theme-accent/10">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto max-h-[calc(60vh-52px)] scrollbar-thin">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-theme-text-dim font-mono">
                  {t("cmd.palette.noResults" as any)}
                </div>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      i === selectedIndex
                        ? "bg-theme-accent/15 text-theme-text"
                        : "text-theme-text-dim hover:bg-theme-accent/5"
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 shrink-0 opacity-50" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-mono truncate block">
                        <span className="text-theme-text-dim/60 text-xs">{cmd.category}: </span>
                        {t(cmd.labelKey as any)}
                      </span>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] text-theme-text-dim font-mono px-1.5 py-0.5 rounded bg-theme-bg-deep/60 border border-theme-accent/10 shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
