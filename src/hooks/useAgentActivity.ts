import { useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";
import translations, { type TranslationKey } from "../i18n/translations";
import type { Locale } from "../types/game";

/** Minimum gap between activity log messages (ms) */
const THROTTLE_MS = 20_000;

/** Periodic integrity check interval (ms) — every 2.5 minutes */
const INTEGRITY_INTERVAL_MS = 150_000;

/** Periodic optimization scan interval (ms) — every 4 minutes */
const OPTIMIZATION_INTERVAL_MS = 240_000;

const SYSTEM_TABS = new Set(["chat", "bridge", "map", "comms"]);

function t(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  let text: string = translations[locale]?.[key] ?? translations.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

function basename(path: string): string {
  return path.split("/").pop() || path;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Observes store state changes and emits contextual
 * [PROACTIVE_LOG] messages, creating the "second pilot" presence.
 *
 * Event types:
 *  - FILE_OPEN     — user opens/switches to a file tab
 *  - FILE_SAVED    — user saves a file
 *  - INTEGRITY     — periodic system health report
 *  - OPTIMIZATION  — periodic scan of open files for complexity
 *  - COMMS_CONNECT — Telegram channel established
 *  - COMMS_SIGNAL  — new Telegram messages intercepted
 */
export function useAgentActivity() {
  const lastEmitRef = useRef(0);
  const prevRef = useRef({
    activeTab: "",
    commsConnected: false,
    commsMsgCount: 0,
    lastSaveTime: 0 as number | null,
  });

  useEffect(() => {
    function emit(content: string) {
      const now = Date.now();
      if (now - lastEmitRef.current < THROTTLE_MS) return;
      lastEmitRef.current = now;

      const { addMessage, isAiResponding, settings } =
        useGameStore.getState();
      if (isAiResponding || !settings.workspace_root) return;

      addMessage({
        role: "system",
        content,
        type: "proactive_log",
      });
    }

    // --- Reactive: subscribe to full state, compare diffs manually ---
    const unsub = useGameStore.subscribe((state) => {
      const prev = prevRef.current;

      // 1) FILE_OPEN
      if (state.activeTab !== prev.activeTab) {
        prev.activeTab = state.activeTab;
        if (!SYSTEM_TABS.has(state.activeTab)) {
          const name = basename(state.activeTab);
          const variants: TranslationKey[] = [
            "activity.fileOpen",
            "activity.fileAnalyze",
            "activity.filePatterns",
          ];
          emit(t(state.locale, pick(variants), { file: name }));
        }
      }

      // 2) COMMS_CONNECT
      if (state.commsConnected && !prev.commsConnected) {
        prev.commsConnected = state.commsConnected;
        emit(t(state.locale, "activity.commsConnected"));
      }
      prev.commsConnected = state.commsConnected;

      // 3) COMMS_SIGNAL
      const msgCount = state.commsMessages.length;
      if (msgCount > prev.commsMsgCount && prev.commsMsgCount > 0) {
        const delta = msgCount - prev.commsMsgCount;
        const last = state.commsMessages[msgCount - 1];
        const preview = last?.text?.slice(0, 40) || "";
        emit(
          t(state.locale, "activity.commsSignal", {
            count: delta,
            preview: preview ? `"${preview}..."` : "",
          }),
        );
      }
      prev.commsMsgCount = msgCount;

      // 4) FILE_SAVED
      if (
        state.lastSaveTime &&
        state.lastSaveTime !== prev.lastSaveTime
      ) {
        prev.lastSaveTime = state.lastSaveTime;
        if (state.currentFile) {
          const name = basename(state.currentFile.path);
          emit(t(state.locale, "activity.fileSaved", { file: name }));
        }
      }
    });

    // --- Periodic: INTEGRITY_CHECK ---
    const integrityTimer = setInterval(() => {
      const { locale, agent, settings } = useGameStore.getState();
      if (!settings.workspace_root) return;
      const score = agent.integrity_score;
      if (score >= 80) {
        emit(
          t(locale, "activity.integrityStable", {
            score: score.toFixed(1),
          }),
        );
      } else if (score >= 50) {
        emit(
          t(locale, "activity.integrityWarning", {
            score: score.toFixed(1),
          }),
        );
      } else {
        emit(
          t(locale, "activity.integrityCritical", {
            score: score.toFixed(1),
          }),
        );
      }
    }, INTEGRITY_INTERVAL_MS);

    // --- Periodic: OPTIMIZATION_SCAN ---
    const optimizationTimer = setInterval(() => {
      const { locale, openFiles, settings } = useGameStore.getState();
      if (!settings.workspace_root || openFiles.length === 0) return;

      const file = pick(openFiles);
      const name = basename(file.path);
      const lineCount = (file.content.match(/\n/g) || []).length + 1;

      if (lineCount > 300) {
        emit(
          t(locale, "activity.optimizationLarge", {
            file: name,
            lines: lineCount,
          }),
        );
      } else {
        const variants: TranslationKey[] = [
          "activity.optimizationClean",
          "activity.optimizationScan",
        ];
        emit(t(locale, pick(variants), { file: name }));
      }
    }, OPTIMIZATION_INTERVAL_MS);

    // Initialize prev state
    const s = useGameStore.getState();
    prevRef.current = {
      activeTab: s.activeTab,
      commsConnected: s.commsConnected,
      commsMsgCount: s.commsMessages.length,
      lastSaveTime: s.lastSaveTime,
    };

    return () => {
      unsub();
      clearInterval(integrityTimer);
      clearInterval(optimizationTimer);
    };
  }, []);
}
