import { useEffect, useRef } from "react";
import { useApi } from "./useApi";
import { useGameStore } from "../stores/gameStore";
import translations, { type TranslationKey } from "../i18n/translations";
import type { CriticalAnomaly, HealthWatchResult } from "../types/game";
import type { Locale } from "../types/game";

const WATCH_INTERVAL_MS = 300_000; // 5 minutes

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

const CATEGORY_KEYS: Record<string, TranslationKey> = {
  file_size: "health.catFileSize",
  complexity: "health.catComplexity",
  coverage: "health.catCoverage",
  cleanliness: "health.catCleanliness",
};

function computeHash(result: HealthWatchResult): string {
  return result.anomalies
    .map((a) => `${a.severity}:${a.category}:${a.sector}`)
    .sort()
    .join("|");
}

function getAnomalyText(locale: Locale, anomaly: CriticalAnomaly): string {
  if (anomaly.category === "file_size") {
    return t(locale, "health.alertFileSize", {
      count: anomaly.details.length || 1,
    });
  }
  if (anomaly.category === "complexity") {
    return t(locale, "health.alertComplexity", {
      count: anomaly.details.length || 1,
    });
  }
  // Score-based anomalies (message contains the value)
  const scoreMatch = anomaly.message.match(/:\s*(\d+)\/100/);
  if (scoreMatch) {
    const catLabel = t(
      locale,
      CATEGORY_KEYS[anomaly.category] ?? "health.catComplexity",
    );
    return t(locale, "health.alertScoreLow", {
      category: catLabel,
      value: scoreMatch[1],
    });
  }
  // BUG/FIXME markers
  const markerMatch = anomaly.message.match(/:\s*(\d+)$/);
  if (markerMatch) {
    return t(locale, "health.alertBugMarkers", { count: markerMatch[1] });
  }
  return anomaly.message;
}

function buildAlertMessage(locale: Locale, result: HealthWatchResult): string {
  const critical = result.anomalies.filter((a) => a.severity === "critical");
  if (critical.length === 0) return "";

  const sectors = [...new Set(critical.map((a) => a.sector))];
  const sectorLabel = sectors.join(", ");

  const lines: string[] = [];
  lines.push(
    `**${t(locale, "health.alertCritical", { sector: sectorLabel })}**`,
  );
  lines.push("");

  for (const anomaly of critical) {
    const catLabel = t(
      locale,
      CATEGORY_KEYS[anomaly.category] ?? "health.catComplexity",
    );
    const text = getAnomalyText(locale, anomaly);
    lines.push(`- **${catLabel}**: ${text}`);
    for (const detail of anomaly.details.slice(0, 3)) {
      lines.push(`  - \`${detail}\``);
    }
  }

  lines.push("");
  lines.push(t(locale, "health.alertStabilize"));

  return lines.join("\n");
}

export function useHealthWatch() {
  const api = useApi();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const check = async () => {
      const {
        settings,
        locale,
        lastHealthAlertHash,
        addMessage,
        setLastHealthAlertHash,
        isAiResponding,
      } = useGameStore.getState();

      // Skip if no workspace or AI is responding
      if (!settings.workspace_root || isAiResponding) return;

      try {
        const result = await api.healthWatch();
        if (!result.has_critical) return;

        const hash = computeHash(result);
        if (hash === lastHealthAlertHash) return; // already alerted

        const message = buildAlertMessage(locale, result);
        if (!message) return;

        setLastHealthAlertHash(hash);
        addMessage({
          role: "system",
          content: message,
          type: "health_alert",
        });
      } catch {
        // silently ignore watch errors
      }
    };

    // Initial check after a short delay (let the app settle)
    const initTimeout = setTimeout(check, 5_000);

    // Periodic checks
    intervalRef.current = setInterval(check, WATCH_INTERVAL_MS);

    return () => {
      clearTimeout(initTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [api]);
}
