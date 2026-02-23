import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";

const DiffEditor = lazy(() =>
  import("@monaco-editor/react").then((mod) => ({ default: mod.DiffEditor }))
);

export function DiffViewerModal() {
  const diffViewer = useGameStore((s) => s.diffViewer);
  const closeDiffViewer = useGameStore((s) => s.closeDiffViewer);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const triggerLevelUp = useGameStore((s) => s.triggerLevelUp);
  const addMessage = useGameStore((s) => s.addMessage);
  const api = useApi();
  const { t } = useTranslation();
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.writeFile(diffViewer.filePath, diffViewer.newContent);
      const result = await api.performAction("code_apply");
      setPlayer(result.player);
      addMessage({
        role: "system",
        content: `${t("diff.applied")} ${diffViewer.fileName} +${result.exp_gained} EXP`,
      });
      if (result.leveled_up && result.new_level !== null) {
        triggerLevelUp(result.new_level);
      }
      closeDiffViewer();
    } catch {
      addMessage({
        role: "system",
        content: t("diff.applyError"),
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <AnimatePresence>
      {diffViewer.show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
          onClick={closeDiffViewer}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[90vw] h-[80vh] max-w-6xl rounded-lg glass-panel-bright flex flex-col overflow-hidden shadow-[0_0_40px_rgba(0,212,255,0.1)] tactical-corners"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(0,212,255,0.08)]">
              <span className="text-xs font-mono font-bold text-[#00d4ff] tracking-wider uppercase">
                SOURCE_DIFF // {diffViewer.fileName}
              </span>
              <button
                onClick={closeDiffViewer}
                className="text-[#5a6b7f] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Diff Editor */}
            <div className="flex-1 overflow-hidden">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full text-[#5a6b7f]">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" strokeWidth={1.5} />
                    <span className="text-xs font-mono tracking-wider">{t("diff.loading")}</span>
                  </div>
                }
              >
                <DiffEditor
                  original={diffViewer.oldContent}
                  modified={diffViewer.newContent}
                  language="typescript"
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
              </Suspense>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-4 py-2.5 border-t border-[rgba(0,212,255,0.08)]">
              <button
                onClick={closeDiffViewer}
                className="px-4 py-1.5 rounded text-xs font-mono text-[#5a6b7f] hover:text-white hover:bg-[rgba(0,212,255,0.06)] transition-colors tracking-wider uppercase"
              >
                {t("settings.cancel")}
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleApply}
                disabled={applying}
                className="flex items-center gap-2 px-4 py-1.5 rounded glass-panel-bright text-xs font-mono font-bold text-[#00d4ff] tracking-wider uppercase hover:bg-[rgba(0,212,255,0.1)] transition-all disabled:opacity-50"
              >
                {applying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
                {t("diff.apply")}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
