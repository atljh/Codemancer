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
    filled: "bg-[#00d4ff]",
    shadow: "shadow-[0_0_4px_rgba(0,212,255,0.6)]",
    text: "text-[#00d4ff]",
    dimText: "text-[#00d4ff]/50",
  },
  purple: {
    filled: "bg-purple-400",
    shadow: "shadow-[0_0_4px_rgba(168,85,247,0.6)]",
    text: "text-purple-400",
    dimText: "text-purple-400/50",
  },
  green: {
    filled: "bg-[#22c55e]",
    shadow: "shadow-[0_0_4px_rgba(34,197,94,0.6)]",
    text: "text-[#22c55e]",
    dimText: "text-[#22c55e]/50",
  },
  red: {
    filled: "bg-[#cc3333]",
    shadow: "shadow-[0_0_4px_rgba(204,51,51,0.6)]",
    text: "text-[#cc3333]",
    dimText: "text-[#cc3333]/50",
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
        <span className="text-[10px] text-[#5a6b7f] font-mono tabular-nums">
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
                : "bg-[#1a2030]"
            }`}
            style={i < filledSegments ? {
              boxShadow: `0 0 3px ${color === "cyan" ? "rgba(0,212,255,0.4)" : color === "red" ? "rgba(204,51,51,0.4)" : color === "purple" ? "rgba(168,85,247,0.4)" : "rgba(34,197,94,0.4)"}`,
            } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
