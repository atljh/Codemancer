interface StatBarProps {
  label: string;
  current: number;
  max: number;
  color: "cyan" | "purple" | "green" | "red" | "integrity" | "thermal";
  className?: string;
  showPercent?: boolean;
}

export function StatBar({
  label,
  current,
  max,
  className = "",
  showPercent = false,
}: StatBarProps) {
  const pct = max > 0 ? current / max : 0;
  const isLow = pct < 0.25;

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-mono tracking-widest uppercase text-theme-text-dim">
          {label}
        </span>
        <span className="text-[11px] text-theme-text-dim font-mono tabular-nums">
          {showPercent ? `${Math.round(pct * 100)}%` : `${current}/${max}`}
        </span>
      </div>
      <div className="h-0.5 w-full bg-theme-bg-empty rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isLow ? "bg-theme-status-error" : "bg-theme-accent"
          }`}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
    </div>
  );
}
