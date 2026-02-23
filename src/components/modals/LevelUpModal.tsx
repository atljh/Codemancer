import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, X } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useTranslation } from "../../hooks/useTranslation";

export function LevelUpModal() {
  const showLevelUp = useGameStore((s) => s.showLevelUp);
  const newLevel = useGameStore((s) => s.newLevel);
  const dismiss = useGameStore((s) => s.dismissLevelUp);
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {showLevelUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 250 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-80 rounded-lg glass-panel-bright p-8 text-center shadow-[0_0_60px_rgba(0,212,255,0.2)] tactical-corners"
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-[#5a6b7f] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {/* Chevron indicators */}
            <div className="relative flex justify-center gap-1 mb-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.1 }}
                >
                  <ChevronUp
                    className={`w-7 h-7 text-[#00d4ff] ${i === 1 ? "scale-125" : "opacity-60"}`}
                    strokeWidth={1.5}
                  />
                </motion.div>
              ))}
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg font-display font-bold tracking-[0.2em] uppercase text-[#00d4ff]"
            >
              {t("levelUp.title")}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4"
            >
              <div className="text-5xl font-display font-black text-white animate-glow-pulse inline-block px-4 py-1">
                {newLevel}
              </div>
              <p className="text-xs text-[#5a6b7f] mt-3 font-mono tracking-wider">
                {t("levelUp.description")}
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={dismiss}
              className="mt-6 px-6 py-2 rounded glass-panel-bright text-[#00d4ff] text-xs font-mono font-bold tracking-[0.15em] uppercase hover:bg-[rgba(0,212,255,0.1)] transition-all"
            >
              {t("levelUp.continue")}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
