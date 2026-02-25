import { useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";
import { api } from "./useApi";
import { useAudio } from "./useAudio";

const POLL_INTERVAL = 5_000;
const AUTO_CLEAR_DELAY = 10_000;

/**
 * Polls shadow audit pending verifications and updates store.
 * When verification completes, emits proactive_log messages and schedules auto-clear.
 */
export function useShadowPolling() {
  const completedRef = useRef(new Set<string>());
  const { playSound } = useAudio();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function poll() {
      const { settings, pendingVerification, setPendingVerification, clearVerification, addMessage } =
        useGameStore.getState();

      // Only poll if auto-tests are enabled and there are pending entries
      if (!settings.shadow_auto_tests_enabled) return;

      const hasPending = Object.values(pendingVerification).some(
        (e) => e.status === "pending",
      );
      if (!hasPending) return;

      try {
        const results = await api.getShadowAuditPending();

        for (const [filePath, result] of Object.entries(results)) {
          if (completedRef.current.has(filePath)) continue;

          if (result.status === "pass") {
            completedRef.current.add(filePath);
            setPendingVerification(filePath, {
              ...pendingVerification[filePath],
              status: "verified",
              testResults: result,
              timestamp: Date.now(),
            });
            addMessage({
              role: "system",
              content: `[SECTOR_VERIFIED] ${filePath.split("/").pop()} — ${result.passed}/${result.test_count} tests passed`,
              type: "proactive_log",
            });
            // Auto-clear after delay
            setTimeout(() => {
              clearVerification(filePath);
              completedRef.current.delete(filePath);
            }, AUTO_CLEAR_DELAY);
          } else if (result.status === "fail") {
            completedRef.current.add(filePath);
            setPendingVerification(filePath, {
              ...pendingVerification[filePath],
              status: "failed",
              testResults: result,
              timestamp: Date.now(),
            });
            playSound("alert");
            addMessage({
              role: "system",
              content: `[LOGIC_COLLISION] ${filePath.split("/").pop()} — ${result.failed} tests failed: ${result.error_message.slice(0, 200)}`,
              type: "proactive_log",
            });
            setTimeout(() => {
              clearVerification(filePath);
              completedRef.current.delete(filePath);
            }, AUTO_CLEAR_DELAY);
          } else if (result.status === "error" || result.status === "skipped") {
            completedRef.current.add(filePath);
            clearVerification(filePath);
          }
        }
      } catch {
        // polling failed silently
      }
    }

    poll();
    timer = setInterval(poll, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [playSound]);
}
