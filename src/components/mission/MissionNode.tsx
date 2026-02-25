import { useState } from "react";
import { motion } from "framer-motion";
import type { Operation, OperationStatus } from "../../types/game";
import { useTranslation } from "../../hooks/useTranslation";

const SOURCE_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  GITHUB: { label: "GH", className: "text-green-400 bg-green-400/10" },
  JIRA: { label: "JI", className: "text-sky-300 bg-sky-400/10" },
  SLACK: { label: "SL", className: "text-violet-400 bg-violet-400/10" },
  TELEGRAM: { label: "TG", className: "text-cyan-400 bg-cyan-400/10" },
  CODE_TODO: { label: "CD", className: "text-yellow-400 bg-yellow-400/10" },
  LSP_ERRORS: { label: "LS", className: "text-red-400 bg-red-400/10" },
};

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
            <div className="flex flex-wrap gap-1.5 mb-1">
              {Array.from(new Set(operation.signals.map((s) => s.source))).map(
                (source) => {
                  const sourceSignals = operation.signals.filter(
                    (s) => s.source === source,
                  );
                  const count = sourceSignals.length;
                  const badge = SOURCE_BADGE[source] || {
                    label: source.slice(0, 2),
                    className: "text-theme-text-dim bg-white/5",
                  };
                  const reasons = sourceSignals
                    .filter((s) => s.reason)
                    .map((s) => s.reason!)
                    .slice(0, 3);
                  return (
                    <SignalBadge
                      key={source}
                      badge={badge}
                      count={count}
                      reasons={reasons}
                    />
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

/* ── Signal badge with AI reason tooltip ── */
function SignalBadge({
  badge,
  count,
  reasons,
}: {
  badge: { label: string; className: string };
  count: number;
  reasons: string[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-default ${badge.className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {badge.label} x{count}
      {showTooltip && reasons.length > 0 && (
        <span className="absolute bottom-full left-0 mb-1.5 z-50 w-56 px-2 py-1.5 rounded bg-theme-bg-deep/95 border border-[var(--theme-glass-border)] shadow-lg text-[9px] font-mono font-normal text-theme-text-dim leading-snug whitespace-normal pointer-events-none">
          {reasons.map((r, i) => (
            <span key={i} className="block">
              {i > 0 && <span className="block h-px bg-white/5 my-1" />}
              {r}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
