import { useEffect, useRef } from "react";
import { useGameStore } from "../../stores/gameStore";

interface Props {
  className?: string;
}

const BAR_COUNT = 16;
const BAR_WIDTH = 2;
const GAP = 1.5;
const HEIGHT = 16;

export function WaveformVisualizer({ className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const isAiResponding = useGameStore((s) => s.isAiResponding);

  const width = BAR_COUNT * (BAR_WIDTH + GAP);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    let phase = 0;
    const speeds = Array.from({ length: BAR_COUNT }, () => 0.8 + Math.random() * 1.2);
    const offsets = Array.from({ length: BAR_COUNT }, () => Math.random() * Math.PI * 2);

    const draw = () => {
      ctx.clearRect(0, 0, width, HEIGHT);
      phase += 0.06;

      const accentRgb = getComputedStyle(document.documentElement)
        .getPropertyValue("--theme-accent-rgb")
        .trim();

      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * (BAR_WIDTH + GAP);

        let amplitude: number;
        if (isAiResponding) {
          // Active: sine wave animation
          amplitude = 0.3 + 0.7 * Math.abs(Math.sin(phase * speeds[i] + offsets[i]));
        } else {
          // Idle: subtle breathing
          amplitude = 0.1 + 0.15 * Math.abs(Math.sin(phase * 0.3 + offsets[i]));
        }

        const barH = Math.max(1, amplitude * HEIGHT);
        const y = (HEIGHT - barH) / 2;
        const opacity = isAiResponding ? 0.4 + amplitude * 0.5 : 0.15 + amplitude * 0.2;

        ctx.fillStyle = accentRgb
          ? `rgba(${accentRgb}, ${opacity})`
          : `rgba(0, 200, 255, ${opacity})`;
        ctx.fillRect(x, y, BAR_WIDTH, barH);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animRef.current);
  }, [isAiResponding, width]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={HEIGHT}
      className={className}
      style={{ width: `${width}px`, height: `${HEIGHT}px` }}
    />
  );
}
