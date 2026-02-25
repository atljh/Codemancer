import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair,
  ScanLine,
  Plus,
  Signal,
} from "lucide-react";
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
  const setPlayer = useGameStore((s) => s.setPlayer);
  const workspaceRoot = useGameStore((s) => s.settings.workspace_root);
  const setMissionBriefingActive = useGameStore(
    (s) => s.setMissionBriefingActive,
  );

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
    api.getOperations().then(setOperations).catch(() => {});
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
        const result = await api.completeOperation(opId);
        updateOperationInStore(opId, { status: "COMPLETED" as OperationStatus });
        if (result.player) setPlayer(result.player);
        playSound("mission_complete");
      } catch {
        // error
      }
    },
    [api, updateOperationInStore, setPlayer, playSound],
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

  const handleVoiceBriefing = useCallback(() => {
    setMissionBriefingActive(true);
  }, [setMissionBriefingActive]);

  // Split operations by status
  const activeOps = operations.filter((o) => o.status !== "COMPLETED");
  const completedOps = operations.filter((o) => o.status === "COMPLETED");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--theme-glass-border)] flex items-center gap-3 bridge-brackets">
        <Crosshair
          className="w-4 h-4 text-theme-accent"
          strokeWidth={1.5}
        />
        <h2 className="text-xs font-bold tracking-[0.15em] text-theme-accent uppercase">
          {t("bridge.title")}
        </h2>

        <div className="ml-auto flex items-center gap-2">
          {/* Stats */}
          <span className="text-[9px] font-mono text-theme-text-dimmer">
            {t("bridge.totalOps").replace(
              "{count}",
              String(operations.length),
            )}
          </span>

          {/* Scan button */}
          <button
            onClick={() => runScan(false)}
            disabled={scanning || !workspaceRoot}
            className={`flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-1 rounded transition-colors ${
              scanning
                ? "bg-theme-accent/20 text-theme-accent animate-pulse"
                : "bg-theme-accent/10 text-theme-accent hover:bg-theme-accent/20"
            }`}
          >
            <ScanLine
              className={`w-3 h-3 ${scanning ? "animate-spin" : ""}`}
              strokeWidth={1.5}
            />
            {scanning ? t("bridge.scanning") : t("bridge.scan")}
          </button>

          {/* New operation */}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="p-1 rounded bg-theme-accent/10 text-theme-accent hover:bg-theme-accent/20 transition-colors"
            title={t("bridge.newOperation")}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
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
            className="shrink-0 px-4 py-2 border-b border-[var(--theme-glass-border)] overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder={t("bridge.newOperation")}
                className="flex-1 text-xs font-mono bg-theme-bg-inset border border-[var(--theme-glass-border)] rounded px-2 py-1.5 text-theme-text placeholder-theme-text-dimmer focus:border-theme-accent/40 outline-none"
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="text-[9px] font-mono font-bold px-3 py-1 rounded bg-theme-accent/15 text-theme-accent hover:bg-theme-accent/25 transition-colors disabled:opacity-30"
              >
                {t("bridge.newOperation")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        {operations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Signal
              className="w-8 h-8 text-theme-text-dimmer"
              strokeWidth={1}
            />
            <p className="text-xs text-theme-text-dim font-mono max-w-xs">
              {t("bridge.noOperations")}
            </p>
            <button
              onClick={handleVoiceBriefing}
              className="text-[9px] font-mono text-theme-accent/60 hover:text-theme-accent underline underline-offset-2 transition-colors"
            >
              Mission Briefing Demo
            </button>
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
                onStatusChange={(status) =>
                  handleStatusChange(op.id, status)
                }
              />
            ))}

            {/* Completed operations */}
            {completedOps.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-emerald-500/20" />
                  <span className="text-[8px] font-mono text-emerald-500/50 tracking-wider uppercase">
                    {t("bridge.status.COMPLETED")} ({completedOps.length})
                  </span>
                  <div className="flex-1 h-px bg-emerald-500/20" />
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
