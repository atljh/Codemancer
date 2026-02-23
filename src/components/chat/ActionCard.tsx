import { motion } from "framer-motion";
import { FileCode, Eye } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useTranslation } from "../../hooks/useTranslation";
import type { ActionCardData } from "../../types/game";

interface ActionCardProps {
  card: ActionCardData;
}

export function ActionCard({ card }: ActionCardProps) {
  const showDiffViewer = useGameStore((s) => s.showDiffViewer);
  const { t } = useTranslation();

  const hasDiff = card.oldContent != null && card.newContent != null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg glass-panel px-4 py-3 flex items-center gap-3 tactical-corners"
    >
      <FileCode className="w-4 h-4 text-theme-accent shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-mono font-medium text-theme-text truncate block">
          {card.fileName}
        </span>
        <span className="text-[10px] font-mono text-theme-text-dim uppercase tracking-wider">
          {card.status}
        </span>
      </div>
      {card.expGained != null && card.expGained > 0 && (
        <span className="text-[10px] text-theme-status-warning font-mono font-bold tracking-wider">
          +{card.expGained} EXP
        </span>
      )}
      {hasDiff && (
        <button
          onClick={() =>
            showDiffViewer(card.filePath, card.fileName, card.oldContent!, card.newContent!)
          }
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase glass-panel-bright text-theme-accent hover:bg-theme-accent/12 transition-colors"
        >
          <Eye className="w-3 h-3" strokeWidth={1.5} />
          {t("diff.viewDiff")}
        </button>
      )}
    </motion.div>
  );
}
