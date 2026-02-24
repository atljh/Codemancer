import { memo } from "react";
import { motion } from "framer-motion";
import { Crosshair, Map } from "lucide-react";
import type { ChatMessage } from "../../types/game";
import { useTranslation } from "../../hooks/useTranslation";
import { useGameStore } from "../../stores/gameStore";

interface BlastRadiusBubbleProps {
  message: ChatMessage;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const BlastRadiusBubble = memo(function BlastRadiusBubble({ message }: BlastRadiusBubbleProps) {
  const { t } = useTranslation();
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const timestamp = formatTimestamp(message.timestamp);

  // Parse metadata from content (format: JSON after newline separator)
  const parts = message.content.split("\n---meta---\n");
  const text = parts[0];
  let dependents: string[] = [];
  let high = false;
  let sourceFile = "";
  if (parts[1]) {
    try {
      const meta = JSON.parse(parts[1]);
      dependents = meta.dependents || [];
      high = meta.high || false;
      sourceFile = meta.file || "";
    } catch { /* ignore */ }
  }

  const borderColor = high ? "border-orange-500/25" : "border-theme-accent/15";
  const bgColor = high ? "bg-orange-500/5" : "bg-theme-accent/3";
  const textColor = high ? "text-orange-400" : "text-theme-accent";
  const headerColor = high ? "text-orange-400/60" : "text-theme-accent/50";
  const badgeColor = high
    ? "bg-orange-500/15 text-orange-400 border-orange-500/20"
    : "bg-theme-accent/10 text-theme-accent border-theme-accent/15";

  const handleOpenMap = () => {
    const store = useGameStore.getState();
    if (sourceFile) {
      store.setBlastRadius(sourceFile, dependents);
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
      <div className={`w-7 h-7 rounded flex-shrink-0 flex items-center justify-center ${bgColor} border ${borderColor}`}>
        <Crosshair className={`w-3.5 h-3.5 ${textColor}`} strokeWidth={1.5} />
      </div>

      {/* Body */}
      <div className={`max-w-[95%] rounded-lg overflow-hidden border ${borderColor} ${bgColor} flex-1`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className={`text-[10px] font-bold tracking-wider ${headerColor}`}>
            [{timestamp}] [PRE_COMMIT_SCAN]
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border ${badgeColor}`}>
            {high ? "HIGH BLAST" : "SCAN"}
          </span>
        </div>

        {/* Message */}
        <div className="px-3 pb-2">
          <p className={`text-[13px] font-mono leading-relaxed ${textColor}/90`}>
            {text}
          </p>

          {/* Dependent files list */}
          {dependents.length > 0 && (
            <div className="mt-2">
              <span className={`text-[10px] font-bold tracking-wider uppercase ${headerColor}`}>
                {t("blast.dependents")}:
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {dependents.slice(0, 8).map((dep) => (
                  <span
                    key={dep}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${bgColor} border ${borderColor} ${textColor}/70`}
                  >
                    {dep.split("/").pop()}
                  </span>
                ))}
                {dependents.length > 8 && (
                  <span className={`text-[10px] font-mono ${textColor}/50`}>
                    +{dependents.length - 8}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Open map button */}
          <button
            onClick={handleOpenMap}
            className={`mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold tracking-wider uppercase ${bgColor} ${textColor} border ${borderColor} hover:brightness-125 transition-all`}
          >
            <Map className="w-3 h-3" strokeWidth={1.5} />
            {t("blast.openMap")}
          </button>
        </div>
      </div>
    </motion.div>
  );
});
