import { motion } from "framer-motion";
import type { ActionLogData } from "../../types/game";

interface ActionLogLineProps {
  log: ActionLogData;
}

export function ActionLogLine({ log }: ActionLogLineProps) {
  const statusColor =
    log.status === "done"
      ? "text-theme-status-success"
      : log.status === "error"
        ? "text-theme-status-error"
        : "text-theme-text-dim";

  const statusLabel =
    log.status === "done" ? "DONE" : log.status === "error" ? "ERR" : "...";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="font-mono text-xs text-theme-text-dim py-0.5 tracking-wide"
    >
      <span className="text-theme-accent/30">&gt;&gt; </span>
      <span className="text-theme-text/60">{log.action}</span>
      <span className="ml-2">
        [<span className={`font-bold ${statusColor}`}>{statusLabel}</span>
        {log.expGained != null && log.expGained > 0 && (
          <span className="text-theme-status-warning"> +{log.expGained}</span>
        )}
        ]
      </span>
    </motion.div>
  );
}
