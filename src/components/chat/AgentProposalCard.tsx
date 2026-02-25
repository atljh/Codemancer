import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BrainCog, ChevronDown, ChevronRight, Play, X, Shield } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { api } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import type { ChatMessage, PlanStep, PlanStepStatus } from "../../types/game";

interface ProposalMeta {
  plan_id: string;
  signal_title: string;
  signal_reason: string | null;
  sandbox_mode: boolean;
  steps: PlanStep[];
  affected_files: string[];
  status: string;
}

function parseMeta(content: string): ProposalMeta | null {
  const marker = "---meta---";
  const idx = content.indexOf(marker);
  if (idx < 0) return null;
  try {
    return JSON.parse(content.slice(idx + marker.length));
  } catch {
    return null;
  }
}

const STATUS_DOTS: Record<PlanStepStatus, string> = {
  pending: "bg-gray-500",
  running: "bg-yellow-400 animate-pulse",
  completed: "bg-green-400",
  simulated: "bg-blue-400",
  skipped: "bg-gray-400",
  failed: "bg-red-500",
};

const STATUS_LABELS: Record<PlanStepStatus, string> = {
  pending: "supervisor.statusPending",
  running: "supervisor.statusRunning",
  completed: "supervisor.statusCompleted",
  simulated: "supervisor.statusSimulated",
  skipped: "supervisor.statusSkipped",
  failed: "supervisor.statusFailed",
};

export function AgentProposalCard({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const addMessage = useGameStore((s) => s.addMessage);
  const showDiffViewer = useGameStore((s) => s.showDiffViewer);
  const setSupervisorActiveFiles = useGameStore((s) => s.setSupervisorActiveFiles);

  const [expanded, setExpanded] = useState(false);
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [executing, setExecuting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [planStatus, setPlanStatus] = useState<string>("proposed");

  const meta = parseMeta(message.content);
  if (!meta) return null;

  // Initialize steps from meta on first render
  if (steps.length === 0 && meta.steps.length > 0) {
    // Can't call setSteps in render, use initializer pattern
  }

  const currentSteps = steps.length > 0 ? steps : meta.steps;

  const handleExecute = useCallback(async () => {
    if (!meta) return;
    setExecuting(true);
    setPlanStatus("executing");
    setSteps([...meta.steps]);
    setSupervisorActiveFiles(meta.affected_files);

    try {
      const res = await api.executeSupervisorPlan(meta.plan_id);
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(eventType, data);
            } catch {
              // parse error
            }
            eventType = "";
          }
        }
      }
    } catch {
      setPlanStatus("failed");
    } finally {
      setExecuting(false);
      setSupervisorActiveFiles([]);
    }
  }, [meta, setSupervisorActiveFiles]);

  const handleSSEEvent = useCallback(
    (event: string, data: Record<string, unknown>) => {
      if (event === "step_start") {
        setSteps((prev) => {
          const next = [...prev];
          const idx = data.index as number;
          if (next[idx]) next[idx] = { ...next[idx], status: "running" };
          return next;
        });
      } else if (event === "step_result") {
        setSteps((prev) => {
          const next = [...prev];
          const idx = data.index as number;
          if (next[idx]) {
            next[idx] = {
              ...next[idx],
              status: data.status as PlanStepStatus,
              result_summary: (data.summary as string) || null,
            };
          }
          return next;
        });
      } else if (event === "step_diff") {
        const filePath = data.file_path as string;
        const fileName = filePath.split("/").pop() || filePath;
        const simulated = data.simulated as boolean;

        addMessage({
          role: "system",
          content: fileName,
          type: "action_card",
          actionCard: {
            fileName: `${simulated ? "[SIMULATED] " : ""}${fileName}`,
            status: simulated ? "simulated" : "applied",
            filePath,
            oldContent: (data.old_content as string) || "",
            newContent: (data.new_content as string) || "",
          },
        });
      } else if (event === "plan_complete") {
        setPlanStatus(data.status as string);
      }
    },
    [addMessage],
  );

  const handleDismiss = useCallback(async () => {
    if (!meta) return;
    try {
      await api.dismissSupervisorPlan(meta.plan_id);
      setDismissed(true);
      setPlanStatus("dismissed");
    } catch {
      // dismiss failed
    }
  }, [meta]);

  if (dismissed) return null;

  const isTerminal = ["completed", "failed", "dismissed"].includes(planStatus);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-panel border border-amber-500/20 rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <BrainCog className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.5} />
        <span className="text-[10px] font-mono font-bold text-amber-400/80 tracking-[0.2em] uppercase">
          {t("supervisor.proposalLabel")}
        </span>
        <span className="text-[11px] font-mono text-theme-text truncate flex-1">
          {meta.signal_title}
        </span>
        {meta.sandbox_mode && (
          <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 shrink-0">
            <Shield className="w-3 h-3" strokeWidth={1.5} />
            {t("supervisor.sandboxMode")}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-theme-text-dim shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-theme-text-dim shrink-0" />
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Reason */}
          {meta.signal_reason && (
            <p className="text-[10px] font-mono text-theme-text-dim leading-relaxed">
              {meta.signal_reason}
            </p>
          )}

          {/* Steps */}
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-theme-text-dimmer uppercase tracking-wider">
              {t("supervisor.step")} ({currentSteps.length})
            </span>
            {currentSteps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[10px] font-mono"
              >
                <span
                  className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${STATUS_DOTS[step.status]}`}
                  title={t(STATUS_LABELS[step.status] as Parameters<typeof t>[0])}
                />
                <span className="text-amber-400/60">{step.tool}</span>
                <span className="text-theme-text-dim flex-1">{step.description}</span>
                {step.result_summary && step.status !== "pending" && (
                  <span className="text-theme-text-dimmer text-[9px] truncate max-w-[120px]">
                    {step.result_summary}
                  </span>
                )}
                {/* Click to view diff for write_file steps */}
                {step.tool === "write_file" &&
                  step.old_content != null &&
                  step.new_content != null && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showDiffViewer(
                          step.file_path || "",
                          step.file_path?.split("/").pop() || "file",
                          step.old_content || "",
                          step.new_content || "",
                        );
                      }}
                      className="text-[9px] text-blue-400 hover:text-blue-300"
                    >
                      DIFF
                    </button>
                  )}
              </div>
            ))}
          </div>

          {/* Affected files */}
          {meta.affected_files.length > 0 && (
            <div className="text-[9px] font-mono text-theme-text-dimmer">
              <span className="uppercase tracking-wider">
                {t("supervisor.affectedFiles")}:
              </span>{" "}
              {meta.affected_files.join(", ")}
            </div>
          )}

          {/* Actions */}
          {!isTerminal && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
              >
                <Play className="w-3 h-3" strokeWidth={2} />
                {executing ? t("supervisor.statusRunning") : t("supervisor.execute")}
              </button>
              <button
                onClick={handleDismiss}
                disabled={executing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono tracking-wider uppercase bg-white/5 text-theme-text-dim hover:text-theme-text hover:bg-white/8 disabled:opacity-50 transition-colors"
              >
                <X className="w-3 h-3" strokeWidth={2} />
                {t("supervisor.dismiss")}
              </button>
            </div>
          )}

          {/* Terminal status */}
          {isTerminal && (
            <div
              className={`text-[10px] font-mono font-bold tracking-wider uppercase ${
                planStatus === "completed"
                  ? "text-green-400"
                  : planStatus === "failed"
                    ? "text-red-400"
                    : "text-theme-text-dimmer"
              }`}
            >
              {planStatus === "completed"
                ? t("supervisor.planComplete")
                : planStatus === "failed"
                  ? t("supervisor.executionError")
                  : t("supervisor.dismiss")}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
