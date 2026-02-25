import { memo } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Map } from "lucide-react";
import type { ChatMessage } from "../../types/game";
import { useTranslation } from "../../hooks/useTranslation";
import { useGameStore } from "../../stores/gameStore";

interface ShadowAuditBubbleProps {
  message: ChatMessage;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const CHANGE_BADGE: Record<string, { label: string; color: string }> = {
  added: { label: "ADDED", color: "bg-green-500/15 text-green-400 border-green-500/20" },
  removed: { label: "REMOVED", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  modified: { label: "MODIFIED", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
};

export const ShadowAuditBubble = memo(function ShadowAuditBubble({
  message,
}: ShadowAuditBubbleProps) {
  const { t } = useTranslation();
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const timestamp = formatTimestamp(message.timestamp);

  // Parse metadata
  const parts = message.content.split("\n---meta---\n");
  const text = parts[0];
  let changes: Array<{
    kind: string;
    name: string;
    change_type: string;
    old_signature?: string;
    new_signature?: string;
  }> = [];
  let hasBreaking = false;
  let filePath = "";
  let dependentCount = 0;

  if (parts[1]) {
    try {
      const meta = JSON.parse(parts[1]);
      changes = meta.changes || [];
      hasBreaking = meta.has_breaking || false;
      filePath = meta.file_path || "";
      dependentCount = meta.dependent_count || 0;
    } catch {
      /* ignore */
    }
  }

  const borderColor = hasBreaking
    ? "border-purple-500/25"
    : "border-blue-500/15";
  const bgColor = hasBreaking ? "bg-purple-500/5" : "bg-blue-500/3";
  const textColor = hasBreaking ? "text-purple-400" : "text-blue-400";
  const headerColor = hasBreaking
    ? "text-purple-400/60"
    : "text-blue-400/50";
  const badgeColor = hasBreaking
    ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
    : "bg-blue-500/10 text-blue-400 border-blue-500/15";

  const Icon = hasBreaking ? ShieldAlert : ShieldCheck;

  const handleOpenMap = () => {
    if (filePath) {
      const store = useGameStore.getState();
      store.setBlastRadius(filePath, []);
    }
    setActiveTab("map");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-2.5"
    >
      {/* Icon */}
      <div
        className={`w-7 h-7 rounded flex-shrink-0 flex items-center justify-center ${bgColor} border ${borderColor}`}
      >
        <Icon className={`w-3.5 h-3.5 ${textColor}`} strokeWidth={1.5} />
      </div>

      {/* Body */}
      <div
        className={`max-w-[95%] rounded-lg overflow-hidden border ${borderColor} ${bgColor} flex-1`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span
            className={`text-[10px] font-bold tracking-wider ${headerColor}`}
          >
            [{timestamp}]{" "}
            {hasBreaking ? t("shadow.signatureBreach") : t("shadow.title")}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border ${badgeColor}`}
          >
            {hasBreaking ? "BREACH" : "AUDIT"}
          </span>
        </div>

        {/* Message */}
        <div className="px-3 pb-2">
          <p
            className={`text-[13px] font-mono leading-relaxed ${textColor}/90`}
          >
            {text}
          </p>

          {/* Signature changes list */}
          {changes.length > 0 && (
            <div className="mt-2 space-y-1">
              {changes.slice(0, 10).map((ch, i) => {
                const badge = CHANGE_BADGE[ch.change_type] || CHANGE_BADGE.modified;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-[10px] font-mono"
                  >
                    <span
                      className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    <span className={`${textColor}/80`}>
                      {ch.kind}:{" "}
                      <span className="font-bold">{ch.name}</span>
                    </span>
                    {ch.change_type === "modified" &&
                      ch.old_signature &&
                      ch.new_signature && (
                        <span className="text-theme-text-dimmer truncate">
                          {ch.old_signature} → {ch.new_signature}
                        </span>
                      )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Dependents count */}
          {dependentCount > 0 && (
            <div className="mt-2">
              <span
                className={`text-[10px] font-bold tracking-wider uppercase ${headerColor}`}
              >
                {t("shadow.dependents")}: {dependentCount}
              </span>
            </div>
          )}

          {/* Open map button */}
          <button
            onClick={handleOpenMap}
            className={`mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold tracking-wider uppercase ${bgColor} ${textColor} border ${borderColor} hover:brightness-125 transition-all`}
          >
            <Map className="w-3 h-3" strokeWidth={1.5} />
            {t("shadow.openMap")}
          </button>
        </div>
      </div>
    </motion.div>
  );
});
