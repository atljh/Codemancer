import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";
import { useAudio } from "../../hooks/useAudio";
import { useGameStore } from "../../stores/gameStore";

/**
 * MissionBriefing — Terminal-style animation for voice command processing.
 * Shows "DECODING COMMAND... → IDENTIFYING TARGET SECTORS... → MISSION REGISTERED."
 * with radio static sound, flickering text, and scan-line effect.
 */

const BRIEFING_STEPS = [
  { key: "bridge.briefing.decoding" as const, delay: 0, duration: 1200 },
  { key: "bridge.briefing.identifying" as const, delay: 1400, duration: 1000 },
  { key: "bridge.briefing.registered" as const, delay: 2600, duration: 800 },
];

export function MissionBriefing() {
  const active = useGameStore((s) => s.missionBriefingActive);
  const setActive = useGameStore((s) => s.setMissionBriefingActive);
  const { t } = useTranslation();
  const { playSound } = useAudio();
  const [currentStep, setCurrentStep] = useState(-1);
  const [displayText, setDisplayText] = useState("");

  const runBriefing = useCallback(() => {
    setCurrentStep(-1);
    setDisplayText("");

    // Play radio static at start
    playSound("radio_static");

    BRIEFING_STEPS.forEach((step, idx) => {
      setTimeout(() => {
        setCurrentStep(idx);
        const fullText = t(step.key);
        // Typewriter effect
        let charIdx = 0;
        const typeInterval = setInterval(() => {
          charIdx++;
          setDisplayText(fullText.slice(0, charIdx));
          if (charIdx >= fullText.length) {
            clearInterval(typeInterval);
            // Play relay click on each step completion
            playSound("relay_click");
          }
        }, 30);
      }, step.delay);
    });

    // End briefing
    const totalDuration =
      BRIEFING_STEPS[BRIEFING_STEPS.length - 1].delay +
      BRIEFING_STEPS[BRIEFING_STEPS.length - 1].duration;
    setTimeout(() => {
      playSound("mission_registered");
      setTimeout(() => setActive(false), 600);
    }, totalDuration);
  }, [t, playSound, setActive]);

  useEffect(() => {
    if (active) {
      runBriefing();
    } else {
      setCurrentStep(-1);
      setDisplayText("");
    }
  }, [active, runBriefing]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <div className="glass-panel bridge-brackets border border-[var(--theme-glass-border-bright)] rounded-lg p-6 max-w-md w-full mx-4 relative overflow-hidden">
            {/* Scan line effect */}
            <div className="absolute inset-0 pointer-events-none animate-scanline opacity-30" />

            {/* Terminal header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-theme-accent animate-pulse" />
              <span className="text-[10px] font-mono text-theme-accent tracking-[0.3em] uppercase">
                Mission Briefing Protocol
              </span>
            </div>

            {/* Terminal output */}
            <div className="font-mono text-sm space-y-2 min-h-[80px]">
              {BRIEFING_STEPS.map((step, idx) => (
                <div key={step.key} className="flex items-start gap-2">
                  <span className="text-theme-accent/50 shrink-0">$</span>
                  <span
                    className={`transition-colors duration-200 ${
                      idx < currentStep
                        ? "text-theme-text-dim"
                        : idx === currentStep
                          ? "text-theme-accent"
                          : "text-transparent"
                    }`}
                  >
                    {idx === currentStep ? (
                      <>
                        {displayText}
                        <span className="inline-block w-1.5 h-3.5 bg-theme-accent ml-0.5 animate-pulse" />
                      </>
                    ) : idx < currentStep ? (
                      t(step.key)
                    ) : (
                      ""
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-px bg-[var(--theme-glass-border)] relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-theme-accent"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: 3.4,
                  ease: "linear",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
