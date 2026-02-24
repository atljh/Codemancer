import { useEffect, useRef } from "react";
import { useApi } from "./useApi";
import { useGameStore } from "../stores/gameStore";
import translations, { type TranslationKey } from "../i18n/translations";
import type { Locale } from "../types/game";

const PULSE_INTERVAL_MS = 5 * 60_000; // 5 minutes

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

interface PulseFinding {
  severity: string;
  type: string;
  message: string;
  detail: string;
}

interface PulseResponse {
  has_findings: boolean;
  findings: PulseFinding[];
  diff_summary: string;
  changed_files: number;
}

export function useProactivePulse() {
  const api = useApi();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDiffHashRef = useRef("");

  useEffect(() => {
    const pulse = async () => {
      const { settings, locale, isAiResponding, addMessage } =
        useGameStore.getState();

      // Skip if no workspace, AI is responding, or no workspace set
      if (!settings.workspace_root || isAiResponding) return;

      try {
        const result: PulseResponse = await api.proactivePulse();
        if (!result.has_findings || result.findings.length === 0) return;

        // Deduplicate: hash findings to avoid repeating same alert
        const hash = result.findings
          .map((f) => `${f.type}:${f.message}`)
          .sort()
          .join("|");
        if (hash === lastDiffHashRef.current) return;
        lastDiffHashRef.current = hash;

        const lines: string[] = [];
        lines.push(`**${t(locale, "proactive.header")}**`);
        lines.push("");

        if (result.changed_files > 0) {
          lines.push(
            t(locale, "proactive.changedFiles", {
              count: result.changed_files,
            }),
          );
          lines.push("");
        }

        for (const finding of result.findings) {
          const icon = finding.severity === "warning" ? "⚠" : "ℹ";
          lines.push(`${icon} **${finding.message}**`);
          if (finding.detail) {
            lines.push(`  \`${finding.detail}\``);
          }
        }

        lines.push("");
        lines.push(t(locale, "proactive.suggestion"));

        addMessage({
          role: "system",
          content: lines.join("\n"),
          type: "proactive_log",
        });
      } catch {
        // silently ignore pulse errors
      }
    };

    // First pulse after 30 seconds (let the app settle)
    const initTimeout = setTimeout(pulse, 30_000);

    // Periodic pulses
    intervalRef.current = setInterval(pulse, PULSE_INTERVAL_MS);

    return () => {
      clearTimeout(initTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [api]);
}
