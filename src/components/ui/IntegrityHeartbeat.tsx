import { useEffect, useRef } from "react";

interface Props {
  integrityScore: number;
  className?: string;
}

const WIDTH = 48;
const HEIGHT = 12;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function IntegrityHeartbeat({ integrityScore, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const interval = lerp(1500, 500, (100 - integrityScore) / 100);
    let phase = 0;

    // Color based on integrity
    const color =
      integrityScore > 80
        ? "74, 222, 128"  // green-400
        : integrityScore > 50
          ? "250, 204, 21" // yellow-400
          : "248, 113, 113"; // red-400

    const draw = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      phase += 16; // ~60fps

      const cyclePos = (phase % interval) / interval;
      const midY = HEIGHT / 2;

      ctx.beginPath();
      ctx.moveTo(0, midY);

      for (let x = 0; x < WIDTH; x++) {
        const normalized = x / WIDTH;
        // ECG-like waveform: flat line with periodic spike
        const spikeCenter = 1 - cyclePos;
        const dist = Math.abs(normalized - spikeCenter);

        let y = midY;
        if (dist < 0.08) {
          // Main spike (QRS complex)
          const t = dist / 0.08;
          const spike = Math.sin(t * Math.PI) * (midY - 1);
          y = t < 0.5 ? midY - spike : midY + spike * 0.4;
        } else if (dist > 0.08 && dist < 0.14) {
          // Small recovery wave
          const t = (dist - 0.08) / 0.06;
          y = midY - Math.sin(t * Math.PI) * 1.5;
        }

        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `rgba(${color}, 0.7)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animRef.current);
  }, [integrityScore]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className={className}
      style={{ width: `${WIDTH}px`, height: `${HEIGHT}px` }}
    />
  );
}
