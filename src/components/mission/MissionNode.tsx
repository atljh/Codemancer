import { motion } from "framer-motion";
import type { Operation, OperationStatus } from "../../types/game";
import { useTranslation } from "../../hooks/useTranslation";

const STATUS_LABEL: Record<OperationStatus, string> = {
  ANALYSIS: "PENDING",
  DEPLOYING: "ACTIVE",
  TESTING: "ACTIVE",
  COMPLETED: "DONE",
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
  onSelect,
  onComplete,
  onStatusChange,
}: Props) {
  const { t } = useTranslation();

  const statusLabel = STATUS_LABEL[operation.status];
  const isActive =
    operation.status === "DEPLOYING" || operation.status === "TESTING";
  const isDone = operation.status === "COMPLETED";

  const nextStatus: Record<OperationStatus, OperationStatus | null> = {
    ANALYSIS: "DEPLOYING",
    DEPLOYING: "TESTING",
    TESTING: "COMPLETED",
    COMPLETED: null,
  };

  const sectorLabel =
    operation.related_sectors.length > 0
      ? operation.related_sectors[0].split("/").slice(-2).join("/").toUpperCase()
      : "";

  const timeStr = new Date(operation.created_at || Date.now()).toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" },
  );

  return (
    <div>
      {/* Compact one-line row */}
      <button
        onClick={onSelect}
        className={`w-full text-left font-mono text-[11px] leading-relaxed px-2 py-1 rounded transition-colors ${
          isSelected
            ? "bg-white/4"
            : "hover:bg-white/2"
        }`}
      >
        <span
          className={`font-bold ${
            isActive
              ? "text-[var(--theme-accent)]"
              : isDone
                ? "text-theme-text-dimmer"
                : "text-theme-text-dim"
          }`}
        >
          [{statusLabel}]
        </span>{" "}
        <span
          className={
            isDone
              ? "text-theme-text-dimmer line-through"
              : "text-theme-text"
          }
        >
          {operation.title}
        </span>{" "}
        {sectorLabel && (
          <span className="text-theme-text-dimmer">{sectorLabel}</span>
        )}{" "}
        <span className="text-theme-text-dimmer">{timeStr}</span>
      </button>

      {/* Expanded details */}
      {isSelected && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="pl-4 pb-2 font-mono text-[11px]"
        >
          {/* Description */}
          {operation.description && (
            <p className="text-theme-text-dim whitespace-pre-wrap mb-1 max-h-24 overflow-y-auto">
              &gt; {operation.description}
            </p>
          )}

          {/* Signals */}
          {operation.signals.length > 0 && (
            <div className="text-theme-text-dim mb-1">
              {Array.from(new Set(operation.signals.map((s) => s.source))).map(
                (source) => {
                  const count = operation.signals.filter(
                    (s) => s.source === source,
                  ).length;
                  return (
                    <span key={source} className="mr-3">
                      Signal: {source} x{count}
                    </span>
                  );
                },
              )}
            </div>
          )}

          {/* Linked sectors */}
          {operation.related_sectors.length > 0 && (
            <div className="text-theme-text-dimmer mb-1">
              {t("bridge.sectors")}:{" "}
              {operation.related_sectors.slice(0, 8).join(", ")}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-1">
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
                  className="text-[var(--theme-accent)] hover:text-theme-text-bright transition-colors"
                >
                  {nextStatus[operation.status] === "COMPLETED"
                    ? "[COMPLETE]"
                    : `[→ ${t(`bridge.status.${nextStatus[operation.status]!}` as `bridge.status.${OperationStatus}`)}]`}
                </button>
              )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
