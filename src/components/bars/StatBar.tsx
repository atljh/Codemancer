import { motion } from "framer-motion";

interface StatBarProps {
  label: string;
  current: number;
  max: number;
  color: "cyan" | "purple" | "green" | "red";
  className?: string;
}

const SEGMENTS = 20;

const colorMap = {
  cyan: {
    filled: "bg-theme-accent",
    text: "text-theme-accent",
    dimText: "text-theme-accent/50",
    shadowColor: "var(--theme-accent)",
  },
  purple: {
    filled: "bg-theme-purple",
    text: "text-theme-purple",
    dimText: "text-theme-purple/50",
    shadowColor: "var(--theme-purple)",
  },
  green: {
    filled: "bg-theme-status-success",
    text: "text-theme-status-success",
    dimText: "text-theme-status-success/50",
    shadowColor: "var(--theme-status-success)",
  },
  red: {
    filled: "bg-theme-status-error",
    text: "text-theme-status-error",
    dimText: "text-theme-status-error/50",
    shadowColor: "var(--theme-status-error)",
  },
};

export function StatBar({ label, current, max, color, className = "" }: StatBarProps) {
  const pct = max > 0 ? current / max : 0;
  const filledSegments = Math.round(pct * SEGMENTS);
  const c = colorMap[color];
  const isLow = pct < 0.25;

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className="flex justify-between items-center">
        <span className={`text-[10px] font-bold tracking-widest uppercase ${c.text}`}>
          {label}
        </span>
        <span className="text-[10px] text-theme-text-dim font-mono tabular-nums">
          {current}/{max}
        </span>
      </div>
      <div className="flex gap-[2px] h-[6px]">
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{
              opacity: 1,
              scaleY: 1,
            }}
            transition={{ duration: 0.3, delay: i * 0.02 }}
            className={`flex-1 rounded-[1px] transition-colors duration-300 ${
              i < filledSegments
                ? `${c.filled} ${isLow ? "animate-bar-pulse" : ""}`
                : "bg-theme-bg-empty"
            }`}
            style={i < filledSegments ? {
              boxShadow: `0 0 3px color-mix(in srgb, ${c.shadowColor} 40%, transparent)`,
            } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
