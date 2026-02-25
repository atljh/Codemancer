import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MissionNode } from "./MissionNode";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useAudio } from "../../hooks/useAudio";
import { useTranslation } from "../../hooks/useTranslation";
import type { OperationStatus } from "../../types/game";

/** Polling interval for auto-scan: 5 minutes */
const SCAN_INTERVAL = 5 * 60 * 1000;

export function MissionControl() {
  const operations = useGameStore((s) => s.operations);
  const selectedOpId = useGameStore((s) => s.selectedOperationId);
  const setOperations = useGameStore((s) => s.setOperations);
  const updateOperationInStore = useGameStore((s) => s.updateOperation);
  const selectOperation = useGameStore((s) => s.selectOperation);
  const setAgent = useGameStore((s) => s.setAgent);
  const workspaceRoot = useGameStore((s) => s.settings.workspace_root);

  const api = useApi();
  const { playSound } = useAudio();
  const { t } = useTranslation();

  const [scanning, setScanning] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ambientStarted = useRef(false);

  // Start bridge ambient on first render
  useEffect(() => {
    if (!ambientStarted.current) {
      playSound("bridge_ambient");
      ambientStarted.current = true;
    }
  }, [playSound]);

  // Load operations on mount
  useEffect(() => {
    api
      .getOperations()
      .then(setOperations)
      .catch(() => {});
  }, [api, setOperations]);

  // Auto-scan every 5 minutes
  useEffect(() => {
    if (!workspaceRoot) return;

    scanTimerRef.current = setInterval(() => {
      runScan(true);
    }, SCAN_INTERVAL);

    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceRoot]);

  const runScan = useCallback(
    async (silent = false) => {
      if (!workspaceRoot || scanning) return;
      setScanning(true);
      if (!silent) playSound("scan_sweep");

      try {
        const result = await api.missionScan(workspaceRoot);
        // Reload operations after scan
        const ops = await api.getOperations();
        setOperations(ops);
        if (!silent && result.operations_created > 0) {
          playSound("mission_registered");
        }
      } catch {
        // scan failed silently
      } finally {
        setScanning(false);
      }
    },
    [workspaceRoot, scanning, api, setOperations, playSound],
  );

  const handleComplete = useCallback(
    async (opId: string) => {
      try {
        await api.completeOperation(opId);
        updateOperationInStore(opId, {
          status: "COMPLETED" as OperationStatus,
        });
        playSound("mission_complete");
      } catch {
        // error
      }
    },
    [api, updateOperationInStore, setAgent, playSound],
  );

  const handleStatusChange = useCallback(
    async (opId: string, status: OperationStatus) => {
      try {
        await api.updateOperation(opId, { status });
        updateOperationInStore(opId, { status });
        playSound("relay_click");
      } catch {
        // error
      }
    },
    [api, updateOperationInStore, playSound],
  );

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    try {
      const op = await api.createOperation(newTitle.trim());
      const ops = await api.getOperations();
      setOperations(ops);
      setNewTitle("");
      setShowCreateForm(false);
      playSound("mission_registered");
      selectOperation(op.id);
    } catch {
      // error
    }
  }, [newTitle, api, setOperations, playSound, selectOperation]);

  // Split operations by status
  const activeOps = operations.filter((o) => o.status !== "COMPLETED");
  const completedOps = operations.filter((o) => o.status === "COMPLETED");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-[rgba(255,255,255,0.1)] flex items-center gap-3">
        <h2 className="text-[11px] font-mono text-theme-text-dim tracking-widest uppercase">
          {t("bridge.title")}
        </h2>

        <div className="ml-auto flex items-center gap-2">
          {/* Stats */}
          <span className="text-[9px] font-mono text-theme-text-dimmer">
            {t("bridge.totalOps").replace("{count}", String(operations.length))}
          </span>

          {/* Scan button */}
          <button
            onClick={() => runScan(false)}
            disabled={scanning || !workspaceRoot}
            className={`text-[9px] font-mono font-bold px-2 py-1 rounded transition-colors ${
              scanning
                ? "text-[var(--theme-accent)] animate-pulse"
                : "text-theme-text-dim hover:text-[var(--theme-accent)]"
            }`}
          >
            [{scanning ? t("bridge.scanning") : t("bridge.scan")}]
          </button>

          {/* New operation */}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-[9px] font-mono text-theme-text-dim hover:text-[var(--theme-accent)] transition-colors"
            title={t("bridge.newOperation")}
          >
            [+NEW]
          </button>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 px-4 py-2 border-b border-[rgba(255,255,255,0.1)] overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder={t("bridge.newOperation")}
                className="flex-1 text-xs font-mono bg-theme-bg-inset border border-[rgba(255,255,255,0.1)] rounded px-2 py-1.5 text-theme-text placeholder-theme-text-dimmer focus:border-[var(--theme-accent)]/40 outline-none"
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="text-[9px] font-mono font-bold px-3 py-1 rounded text-[var(--theme-accent)] hover:text-theme-text-bright transition-colors disabled:opacity-30"
              >
                [CREATE]
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        {operations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-xs text-theme-text-dim font-mono">
              No active operations.
            </p>
          </div>
        ) : (
          <>
            {/* Active operations */}
            {activeOps.map((op, idx) => (
              <MissionNode
                key={op.id}
                operation={op}
                isSelected={selectedOpId === op.id}
                isLast={
                  idx === activeOps.length - 1 && completedOps.length === 0
                }
                onSelect={() =>
                  selectOperation(selectedOpId === op.id ? null : op.id)
                }
                onComplete={() => handleComplete(op.id)}
                onStatusChange={(status) => handleStatusChange(op.id, status)}
              />
            ))}

            {/* Completed operations */}
            {completedOps.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
                  <span className="text-[8px] font-mono text-theme-text-dimmer tracking-wider uppercase">
                    {t("bridge.status.COMPLETED")} ({completedOps.length})
                  </span>
                  <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
                </div>
                {completedOps.slice(0, 5).map((op, idx) => (
                  <MissionNode
                    key={op.id}
                    operation={op}
                    isSelected={selectedOpId === op.id}
                    isLast={idx === Math.min(completedOps.length, 5) - 1}
                    onSelect={() =>
                      selectOperation(selectedOpId === op.id ? null : op.id)
                    }
                    onComplete={() => {}}
                    onStatusChange={() => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
