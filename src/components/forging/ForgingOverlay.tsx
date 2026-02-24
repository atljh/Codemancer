import { motion, AnimatePresence } from "framer-motion";
import { Cpu } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";

export function ForgingOverlay() {
  const isForging = useGameStore((s) => s.isForging);

  return (
    <AnimatePresence>
      {isForging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{
              scale: [0.5, 1.1, 1],
              rotate: [-10, 5, 0],
            }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px rgba(var(--theme-accent-rgb),0.4)",
                  "0 0 60px rgba(var(--theme-accent-rgb),0.8)",
                  "0 0 20px rgba(var(--theme-accent-rgb),0.4)",
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(to bottom right, var(--theme-accent), var(--theme-accent-dim))",
              }}
            >
              <Cpu className="w-12 h-12 text-theme-text-bright" />
            </motion.div>

            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-lg text-theme-accent font-semibold tracking-wider uppercase"
            >
              Compiling Protocol...
            </motion.p>

            {/* Data particles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-theme-accent"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                }}
                animate={{
                  x: Math.cos((i * Math.PI) / 4) * 100,
                  y: Math.sin((i * Math.PI) / 4) * 100,
                  opacity: 0,
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
