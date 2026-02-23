import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`
        rounded-lg glass-panel tactical-corners
        p-4
        ${className}
      `}
    >
      {children}
    </div>
  );
}
