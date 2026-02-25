import { motion } from "framer-motion";
import {
  Radar,
  Cpu,
  FlaskConical,
  CheckCircle2,
  ChevronRight,
  MapPin,
} from "lucide-react";
import type { Operation, OperationStatus } from "../../types/game";
import { useTranslation } from "../../hooks/useTranslation";

const STATUS_CONFIG: Record<
  OperationStatus,
  { icon: typeof Radar; color: string; pulse: boolean }
> = {
  ANALYSIS: { icon: Radar, color: "text-yellow-400", pulse: true },
  DEPLOYING: { icon: Cpu, color: "text-blue-400", pulse: true },
  TESTING: { icon: FlaskConical, color: "text-purple-400", pulse: true },
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-400", pulse: false },
};

const SOURCE_COLORS: Record<string, string> = {
  CODE_TODO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  TELEGRAM: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  LSP_ERRORS: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface Props {
  operation: Operation;
  isSelected: boolean;
  isLast: boolean;
  onSelect: () => void;
  onComplete: () => void;
  onStatusChange: (status: OperationStatus) => void;
}

export function MissionNode({
  operation,
  isSelected,
  isLast,
  onSelect,
  onComplete,
  onStatusChange,
}: Props) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[operation.status];
  const Icon = config.icon;

  const statusKey =
    `bridge.status.${operation.status}` as `bridge.status.${OperationStatus}`;

  const nextStatus: Record<OperationStatus, OperationStatus | null> = {
    ANALYSIS: "DEPLOYING",
    DEPLOYING: "TESTING",
    TESTING: "COMPLETED",
    COMPLETED: null,
  };

  return (
    <div className="relative flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center shrink-0">
        {/* Status dot */}
        <motion.div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
            isSelected
              ? "border-theme-accent bg-theme-accent/20"
              : operation.status === "COMPLETED"
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-[var(--theme-glass-border-bright)] bg-[var(--theme-glass-bg)]"
          }`}
          animate={
            config.pulse && !isSelected
              ? { scale: [1, 1.05, 1], opacity: [1, 0.8, 1] }
              : {}
          }
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Icon className={`w-3.5 h-3.5 ${config.color}`} strokeWidth={1.5} />
        </motion.div>
        {/* Vertical neon line */}
        {!isLast && (
          <div
            className={`w-px flex-1 min-h-4 ${
              operation.status === "COMPLETED"
                ? "bg-emerald-500/30"
                : "neon-connector"
            }`}
          />
        )}
      </div>

      {/* Content card */}
      <motion.button
        onClick={onSelect}
        className={`flex-1 text-left glass-panel bridge-brackets bridge-panel-chromatic rounded p-3 mb-2 transition-all cursor-pointer border ${
          isSelected
            ? "border-theme-accent/40 bg-theme-accent/5"
            : "border-transparent hover:border-[var(--theme-glass-border-bright)]"
        }`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded ${
              operation.status === "COMPLETED"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-theme-accent/10 text-theme-accent"
            }`}
          >
            {t(statusKey)}
          </span>
          <span className="text-[9px] text-theme-text-dimmer font-mono">
            {t("bridge.expReward").replace("{exp}", String(operation.exp_reward))}
          </span>
          <ChevronRight
            className={`w-3 h-3 ml-auto transition-transform ${
              isSelected
                ? "rotate-90 text-theme-accent"
                : "text-theme-text-dimmer"
            }`}
            strokeWidth={1.5}
          />
        </div>

        {/* Title */}
        <h4
          className={`text-xs font-bold tracking-wide ${
            operation.status === "COMPLETED"
              ? "text-theme-text-dim line-through"
              : "text-theme-text"
          }`}
        >
          {operation.title}
        </h4>

        {/* Signal badges */}
        {operation.signals.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Array.from(
              new Set(operation.signals.map((s) => s.source)),
            ).map((source) => {
              const count = operation.signals.filter(
                (s) => s.source === source,
              ).length;
              const sourceKey =
                `bridge.signalSource.${source}` as `bridge.signalSource.${typeof source}`;
              return (
                <span
                  key={source}
                  className={`text-[8px] font-mono px-1 py-0.5 rounded border ${
                    SOURCE_COLORS[source] || "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {t(sourceKey)} x{count}
                </span>
              );
            })}
          </div>
        )}

        {/* Expanded details */}
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t border-[var(--theme-glass-border)]"
          >
            {/* Description */}
            {operation.description && (
              <p className="text-[10px] text-theme-text-dim font-mono whitespace-pre-wrap mb-2 max-h-24 overflow-y-auto">
                {operation.description}
              </p>
            )}

            {/* Linked sectors */}
            {operation.related_sectors.length > 0 && (
              <div className="mb-2">
                <span className="text-[9px] text-theme-text-dimmer font-mono uppercase tracking-wider">
                  {t("bridge.sectors")}:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {operation.related_sectors.slice(0, 8).map((sector) => (
                    <span
                      key={sector}
                      className="text-[8px] font-mono text-theme-accent/70 bg-theme-accent/5 px-1 py-0.5 rounded flex items-center gap-0.5"
                    >
                      <MapPin className="w-2 h-2" strokeWidth={1.5} />
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-1">
              {nextStatus[operation.status] &&
                operation.status !== "COMPLETED" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = nextStatus[operation.status];
                      if (next === "COMPLETED") {
                        onComplete();
                      } else if (next) {
                        onStatusChange(next);
                      }
                    }}
                    className="text-[9px] font-mono font-bold text-theme-accent hover:text-theme-text-bright bg-theme-accent/10 hover:bg-theme-accent/20 px-2 py-1 rounded transition-colors"
                  >
                    {nextStatus[operation.status] === "COMPLETED"
                      ? t("bridge.complete")
                      : `→ ${t(`bridge.status.${nextStatus[operation.status]!}` as `bridge.status.${OperationStatus}`)}`}
                  </button>
                )}
            </div>
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
