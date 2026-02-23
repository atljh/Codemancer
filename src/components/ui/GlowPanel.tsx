import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlowPanelProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowPanel({
  children,
  className = "",
  glowColor = "cyan",
}: GlowPanelProps) {
  const shadowMap: Record<string, string> = {
    cyan: "shadow-[0_0_12px_rgba(0,212,255,0.15)]",
    purple: "shadow-[0_0_12px_rgba(168,85,247,0.15)]",
    green: "shadow-[0_0_12px_rgba(34,197,94,0.15)]",
    amber: "shadow-[0_0_12px_rgba(255,170,0,0.15)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        rounded-lg glass-panel tactical-corners
        ${shadowMap[glowColor] ?? shadowMap.cyan}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
