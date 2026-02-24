import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  Bug,
} from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import { RadarChart } from "./RadarChart";
import type { HealthScanResult } from "../../types/game";

type DrillSection = "complexity" | "coverage" | "cleanliness" | "file_size";

export function HealthPanel() {
  const show = useGameStore((s) => s.showHealthPanel);
  const toggle = useGameStore((s) => s.toggleHealthPanel);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const openFile = useGameStore((s) => s.openFile);
  const workspaceRoot = useGameStore((s) => s.settings.workspace_root);
  const api = useApi();
  const { t } = useTranslation();

  const [data, setData] = useState<HealthScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<DrillSection | null>(
    null,
  );

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    api
      .healthScan()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [show, api]);

  const handleAxisClick = (axis: string) => {
    setExpandedSection(
      expandedSection === axis ? null : (axis as DrillSection),
    );
  };

  const handleFileClick = async (relPath: string) => {
    const fullPath = workspaceRoot ? `${workspaceRoot}/${relPath}` : relPath;
    try {
      const result = await api.readFile(fullPath);
      openFile({
        path: fullPath,
        content: result.content,
        language: result.language,
        isDirty: false,
      });
      setActiveTab(fullPath);
      toggle();
    } catch {
      // ignore
    }
  };

  const sectionIcon = (s: DrillSection) => {
    switch (s) {
      case "complexity":
        return <Bug className="w-3 h-3" strokeWidth={1.5} />;
      case "cleanliness":
        return <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />;
      default:
        return <FileText className="w-3 h-3" strokeWidth={1.5} />;
    }
  };

  const sectionLabel = (s: DrillSection) => {
    const map: Record<DrillSection, string> = {
      complexity: t("health.complexFunctions"),
      coverage: t("health.untestedFiles"),
      cleanliness: t("health.anomalies"),
      file_size: t("health.largeFiles"),
    };
    return map[s];
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={toggle}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 w-[600px] max-h-[85vh] glass-panel rounded-lg border border-[var(--theme-glass-border)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--theme-glass-border)]">
              <h2 className="text-sm font-bold text-theme-accent tracking-widest uppercase font-display">
                {t("health.title")}
              </h2>
              <button
                onClick={toggle}
                className="p-1 rounded hover:bg-white/8 text-theme-text-dim hover:text-theme-text"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border border-theme-accent/40 border-t-theme-accent rounded-full animate-spin" />
                  <span className="ml-3 text-xs text-theme-text-dim font-mono">
                    {t("health.scanning")}
                  </span>
                </div>
              ) : !data ? (
                <div className="text-center text-theme-text-dim text-xs py-16">
                  {t("health.error")}
                </div>
              ) : (
                <>
                  {/* Radar chart */}
                  <div className="px-4 py-4">
                    <RadarChart
                      scores={data.scores}
                      onAxisClick={handleAxisClick}
                    />
                  </div>

                  {/* Drill-down sections */}
                  <div className="px-4 pb-4 space-y-1">
                    {(
                      [
                        "complexity",
                        "coverage",
                        "cleanliness",
                        "file_size",
                      ] as DrillSection[]
                    ).map((section) => {
                      const isExpanded = expandedSection === section;
                      return (
                        <div
                          key={section}
                          className="glass-panel rounded overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setExpandedSection(isExpanded ? null : section)
                            }
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono text-theme-text-dim hover:text-theme-text hover:bg-white/3 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown
                                className="w-3 h-3 shrink-0"
                                strokeWidth={1.5}
                              />
                            ) : (
                              <ChevronRight
                                className="w-3 h-3 shrink-0"
                                strokeWidth={1.5}
                              />
                            )}
                            {sectionIcon(section)}
                            <span className="uppercase tracking-wider">
                              {sectionLabel(section)}
                            </span>
                            <span className="ml-auto text-theme-accent font-bold">
                              {data.scores[section]}
                            </span>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-2 space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
                                  {section === "complexity" &&
                                    (data.complex_functions.length === 0 ? (
                                      <p className="text-[10px] text-theme-text-dimmer py-1">
                                        {t("health.noIssues")}
                                      </p>
                                    ) : (
                                      data.complex_functions.map((f, i) => (
                                        <button
                                          key={i}
                                          onClick={() =>
                                            handleFileClick(f.file)
                                          }
                                          className="w-full text-left text-[10px] font-mono py-0.5 px-1 rounded hover:bg-white/5 text-theme-text-dim flex items-center gap-2"
                                        >
                                          <span className="text-theme-accent">
                                            {f.name}
                                          </span>
                                          <span className="text-theme-text-dimmer truncate">
                                            {f.file}
                                          </span>
                                          <span className="ml-auto text-theme-status-warning shrink-0">
                                            {f.lines} {t("health.lines")}
                                          </span>
                                        </button>
                                      ))
                                    ))}

                                  {section === "coverage" &&
                                    (data.untested_files.length === 0 ? (
                                      <p className="text-[10px] text-theme-text-dimmer py-1">
                                        {t("health.noIssues")}
                                      </p>
                                    ) : (
                                      data.untested_files.map((f) => (
                                        <button
                                          key={f}
                                          onClick={() => handleFileClick(f)}
                                          className="w-full text-left text-[10px] font-mono py-0.5 px-1 rounded hover:bg-white/5 text-theme-text-dim"
                                        >
                                          {f}
                                        </button>
                                      ))
                                    ))}

                                  {section === "cleanliness" &&
                                    (data.anomalies.length === 0 ? (
                                      <p className="text-[10px] text-theme-text-dimmer py-1">
                                        {t("health.noIssues")}
                                      </p>
                                    ) : (
                                      data.anomalies.map((a, i) => (
                                        <button
                                          key={i}
                                          onClick={() =>
                                            handleFileClick(a.file)
                                          }
                                          className="w-full text-left text-[10px] font-mono py-0.5 px-1 rounded hover:bg-white/5 text-theme-text-dim flex items-center gap-2"
                                        >
                                          <span className="text-theme-status-warning font-bold">
                                            {a.tag}
                                          </span>
                                          <span className="truncate">
                                            {a.text || a.file}
                                          </span>
                                          <span className="ml-auto text-theme-text-dimmer shrink-0">
                                            :{a.line}
                                          </span>
                                        </button>
                                      ))
                                    ))}

                                  {section === "file_size" &&
                                    (data.large_files.length === 0 ? (
                                      <p className="text-[10px] text-theme-text-dimmer py-1">
                                        {t("health.noIssues")}
                                      </p>
                                    ) : (
                                      data.large_files.map((f) => (
                                        <button
                                          key={f.file}
                                          onClick={() =>
                                            handleFileClick(f.file)
                                          }
                                          className="w-full text-left text-[10px] font-mono py-0.5 px-1 rounded hover:bg-white/5 text-theme-text-dim flex items-center gap-2"
                                        >
                                          <span className="truncate">
                                            {f.file}
                                          </span>
                                          <span className="ml-auto text-theme-status-error shrink-0">
                                            {f.lines} {t("health.lines")}
                                          </span>
                                        </button>
                                      ))
                                    ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
