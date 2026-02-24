import { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface VoiceWaveformProps {
  isActive: boolean;
}

export function VoiceWaveform({ isActive }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const bars = 32;
    const barW = w / bars - 2;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      phase += 0.08;

      // Get accent color from CSS
      const style = getComputedStyle(document.documentElement);
      const rgb = style.getPropertyValue("--theme-accent-rgb").trim() || "0,255,200";

      for (let i = 0; i < bars; i++) {
        const x = i * (barW + 2) + 1;
        const amp = 0.3 + 0.7 * Math.abs(Math.sin(phase + i * 0.3)) * Math.abs(Math.cos(phase * 0.5 + i * 0.15));
        const barH = amp * h * 0.8;
        const y = (h - barH) / 2;

        const alpha = 0.4 + amp * 0.6;
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 1);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0.5 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{ opacity: 0, scaleY: 0.5 }}
      className="absolute inset-x-0 bottom-full mb-1 h-10 pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </motion.div>
  );
}
