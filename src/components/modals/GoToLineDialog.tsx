import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../stores/gameStore";
import { useEditorRef } from "../../hooks/useEditorRef";
import { useTranslation } from "../../hooks/useTranslation";

export function GoToLineDialog() {
  const show = useGameStore((s) => s.showGoToLine);
  const setShow = useGameStore((s) => s.setShowGoToLine);
  const activeTab = useGameStore((s) => s.activeTab);
  const openFiles = useGameStore((s) => s.openFiles);
  const editorRef = useEditorRef();
  const { t } = useTranslation();

  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isFile = openFiles.some((f) => f.path === activeTab);

  useEffect(() => {
    if (show) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [show]);

  const goToLine = useCallback(() => {
    const line = parseInt(value, 10);
    if (!line || line < 1 || !editorRef.current) return;
    editorRef.current.revealLineInCenter(line);
    editorRef.current.setPosition({ lineNumber: line, column: 1 });
    editorRef.current.focus();
    setShow(false);
  }, [value, editorRef, setShow]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        goToLine();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShow(false);
      }
    },
    [goToLine, setShow]
  );

  if (!isFile) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[300px] rounded-lg glass-panel-bright border border-theme-accent/15 shadow-[0_0_40px_rgba(var(--theme-accent-rgb),0.1)] overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="text-xs text-theme-text-dim font-mono">
                {t("goToLine.label" as any)}:
              </span>
              <input
                ref={inputRef}
                type="number"
                min="1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("goToLine.placeholder" as any)}
                className="flex-1 bg-transparent text-sm font-mono text-theme-text placeholder:text-theme-text-dim/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <kbd className="text-[10px] text-theme-text-dim font-mono px-1.5 py-0.5 rounded bg-theme-bg-deep/60 border border-theme-accent/10">
                ↵
              </kbd>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
