import { motion } from "framer-motion";
import type { ActionLogData } from "../../types/game";

interface ActionLogLineProps {
  log: ActionLogData;
}

export function ActionLogLine({ log }: ActionLogLineProps) {
  const statusColor =
    log.status === "done"
      ? "text-[#22c55e]"
      : log.status === "error"
        ? "text-[#cc3333]"
        : "text-[#5a6b7f]";

  const statusLabel =
    log.status === "done"
      ? "DONE"
      : log.status === "error"
        ? "ERR"
        : "...";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="font-mono text-xs text-[#5a6b7f] py-0.5 tracking-wide"
    >
      <span className="text-[#00d4ff]/30">&gt;&gt; </span>
      <span className="text-[#c8d6e5]/60">{log.action}</span>
      <span className="ml-2">
        [<span className={`font-bold ${statusColor}`}>{statusLabel}</span>
        {log.expGained != null && log.expGained > 0 && (
          <span className="text-[#ffaa00]"> +{log.expGained}</span>
        )}
        ]
      </span>
    </motion.div>
  );
}
