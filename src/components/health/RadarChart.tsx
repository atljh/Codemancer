import type { HealthScores } from "../../types/game";

interface RadarChartProps {
  scores: HealthScores;
  size?: number;
  onAxisClick?: (axis: string) => void;
}

const AXES = ["complexity", "coverage", "cleanliness", "file_size"] as const;
type Axis = (typeof AXES)[number];

const AXIS_ANGLES: Record<Axis, number> = {
  complexity: -Math.PI / 2,
  coverage: 0,
  cleanliness: Math.PI / 2,
  file_size: Math.PI,
};

function polarToCart(angle: number, radius: number, cx: number, cy: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function polygonPoints(values: number[], maxR: number, cx: number, cy: number) {
  return AXES.map((axis, i) => {
    const r = (values[i] / 100) * maxR;
    const p = polarToCart(AXIS_ANGLES[axis], r, cx, cy);
    return `${p.x},${p.y}`;
  }).join(" ");
}

function gridPolygon(pct: number, maxR: number, cx: number, cy: number) {
  return AXES.map((axis) => {
    const r = pct * maxR;
    const p = polarToCart(AXIS_ANGLES[axis], r, cx, cy);
    return `${p.x},${p.y}`;
  }).join(" ");
}

function scoreColor(score: number): string {
  const hue = (score / 100) * 120; // 0=red, 120=green
  return `hsl(${hue}, 70%, 50%)`;
}

export function RadarChart({ scores, size = 280, onAxisClick }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;

  const values = AXES.map((a) => scores[a]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block mx-auto">
      <defs>
        <filter id="radar-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>{`
          @keyframes radar-sweep {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </defs>

      {/* Grid polygons */}
      {[0.25, 0.5, 0.75, 1.0].map((pct) => (
        <polygon
          key={pct}
          points={gridPolygon(pct, maxR, cx, cy)}
          fill="none"
          stroke="var(--theme-glass-border)"
          strokeWidth={0.5}
          opacity={0.5}
        />
      ))}

      {/* Axis lines */}
      {AXES.map((axis) => {
        const end = polarToCart(AXIS_ANGLES[axis], maxR, cx, cy);
        return (
          <line
            key={axis}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="var(--theme-glass-border)"
            strokeWidth={0.5}
            opacity={0.4}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints(values, maxR, cx, cy)}
        fill="rgba(var(--theme-accent-rgb), 0.12)"
        stroke="var(--theme-accent)"
        strokeWidth={1.5}
        filter="url(#radar-glow)"
      />

      {/* Data points */}
      {AXES.map((axis, i) => {
        const r = (values[i] / 100) * maxR;
        const p = polarToCart(AXIS_ANGLES[axis], r, cx, cy);
        return (
          <circle
            key={axis}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={scoreColor(values[i])}
            stroke="var(--theme-bg-deep)"
            strokeWidth={1.5}
            className="cursor-pointer"
            onClick={() => onAxisClick?.(axis)}
          />
        );
      })}

      {/* Sweep line */}
      <line
        x1={cx}
        y1={cy}
        x2={cx}
        y2={cy - maxR}
        stroke="var(--theme-accent)"
        strokeWidth={1}
        opacity={0.3}
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          animation: "radar-sweep 4s linear infinite",
        }}
      />

      {/* Axis labels */}
      {AXES.map((axis, i) => {
        const labelR = maxR + 20;
        const p = polarToCart(AXIS_ANGLES[axis], labelR, cx, cy);
        const labels: Record<Axis, string> = {
          complexity: "CMPLX",
          coverage: "COVER",
          cleanliness: "CLEAN",
          file_size: "SIZE",
        };
        return (
          <text
            key={axis}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="cursor-pointer"
            fill="var(--theme-text-dim)"
            fontSize={9}
            fontFamily="monospace"
            onClick={() => onAxisClick?.(axis)}
          >
            {labels[axis]} {values[i]}
          </text>
        );
      })}
    </svg>
  );
}
