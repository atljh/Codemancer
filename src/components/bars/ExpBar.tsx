import { motion } from "framer-motion";
import { useGameStore } from "../../stores/gameStore";
import { themes } from "../../themes/themeConfig";
import type { ThemeId } from "../../types/game";

const SEGMENTS = 24;

export function ExpBar() {
  const player = useGameStore((s) => s.player);
  const currentTheme = useGameStore((s) => s.settings.theme);
  const accentHue = themes[currentTheme as ThemeId]?.accentHue ?? 190;
  const pct = player.exp_progress;
  const filledSegments = Math.round(pct * SEGMENTS);

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold tracking-widest uppercase text-theme-accent">
          EXP
        </span>
        <span className="text-[10px] text-theme-text-dim font-mono tabular-nums">
          {player.total_exp} / {player.exp_for_next_level}
        </span>
      </div>
      <div className="flex gap-[2px] h-[8px] relative">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const isFilled = i < filledSegments;
          const hue = isFilled ? accentHue + (i / SEGMENTS) * 80 : 0;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.3, delay: i * 0.015 }}
              className={`flex-1 rounded-[1px] ${!isFilled ? "bg-theme-bg-empty" : ""}`}
              style={isFilled ? {
                backgroundColor: `hsl(${hue}, 80%, 55%)`,
                boxShadow: `0 0 4px hsla(${hue}, 80%, 55%, 0.5)`,
              } : undefined}
            />
          );
        })}
        {/* Shimmer overlay */}
        <div className="absolute inset-0 animate-shimmer pointer-events-none rounded-sm" />
      </div>
    </div>
  );
}
