import { useState, useRef, useEffect, useCallback } from "react";
import {
  Settings,
  FolderOpen,
  HardDrive,
  ChevronDown,
  GitBranch,
  FolderTree,
  ScrollText,
  Radar,
  Volume2,
  VolumeX,
  Wrench,
  Activity,
  Brain,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { FocusTimer } from "../focus/FocusTimer";
import { WaveformVisualizer } from "../ui/WaveformVisualizer";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useAudio } from "../../hooks/useAudio";
import { useTranslation } from "../../hooks/useTranslation";
import { shortenPath } from "../../utils/paths";

interface RecentProject {
  path: string;
  name: string;
  last_opened: number;
}

export function TopStatsBar() {
  const agent = useGameStore((s) => s.agent);
  const settings = useGameStore((s) => s.settings);
  const projectScan = useGameStore((s) => s.projectScan);
  const toggleSettings = useGameStore((s) => s.toggleSettings);
  const setSettings = useGameStore((s) => s.setSettings);
  const setAgent = useGameStore((s) => s.setAgent);
  const setProjectScan = useGameStore((s) => s.setProjectScan);
  const setFileTreeRoot = useGameStore((s) => s.setFileTreeRoot);
  const addActionCard = useGameStore((s) => s.addActionCard);
  const addActionLog = useGameStore((s) => s.addActionLog);
  const totalBytesProcessed = useGameStore((s) => s.totalBytesProcessed);
  const showGitPanel = useGameStore((s) => s.showGitPanel);
  const toggleGitPanel = useGameStore((s) => s.toggleGitPanel);
  const showFileExplorer = useGameStore((s) => s.showFileExplorer);
  const toggleFileExplorer = useGameStore((s) => s.toggleFileExplorer);
  const showChronicle = useGameStore((s) => s.showChronicle);
  const toggleChronicle = useGameStore((s) => s.toggleChronicle);
  const showHealthPanel = useGameStore((s) => s.showHealthPanel);
  const toggleHealthPanel = useGameStore((s) => s.toggleHealthPanel);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const ttsEnabled = useGameStore((s) => s.ttsEnabled);
  const setTtsEnabled = useGameStore((s) => s.setTtsEnabled);
  const selfRepairActive = useGameStore((s) => s.selfRepairActive);
  const setSelfRepairActive = useGameStore((s) => s.setSelfRepairActive);
  const isAiResponding = useGameStore((s) => s.isAiResponding);
  const api = useApi();
  const { playSound, stopRepairMusic } = useAudio();
  const { t } = useTranslation();

  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showDropdown]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const loadAndSwitchProject = useCallback(
    async (path: string) => {
      setShowDropdown(false);
      const newSettings = { ...settings, workspace_root: path };
      setSettings(newSettings);
      setFileTreeRoot(path);
      await api.updateSettings(newSettings);

      addActionLog({ action: t("project.scanning"), status: "pending" });

      try {
        const scan = await api.scanProject(path, true);
        setProjectScan(scan);
        const updatedAgent = await api.getStatus();
        setAgent(updatedAgent);
        await api.addRecentProject(path);
        addActionCard({
          fileName: `[PROJECT LOADED]: ${shortenPath(path)}`,
          status: "done",
          filePath: path,
        });
      } catch {
        addActionLog({ action: t("project.scanFailed"), status: "error" });
      }
    },
    [
      settings,
      setSettings,
      setFileTreeRoot,
      api,
      addActionLog,
      setProjectScan,
      setAgent,
      addActionCard,
      t,
    ],
  );

  const handlePickFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected) return;
      await loadAndSwitchProject(selected as string);
    } catch {
      addActionLog({ action: t("project.scanFailed"), status: "error" });
    }
  };

  const handleToggleDropdown = async () => {
    if (!showDropdown) {
      try {
        const projects = await api.getRecentProjects();
        setRecentProjects(projects);
      } catch {
        // ignore
      }
    }
    setShowDropdown(!showDropdown);
  };

  const handleSelfRepair = async () => {
    if (selfRepairActive) return;
    setSelfRepairActive(true);
    playSound("self_repair_start");
    addActionLog({ action: t("repair.running"), status: "pending" });

    try {
      const res = await api.selfRepairStream();
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "tool_start") {
              playSound("self_repair_tick");
              addActionLog({
                action: (t("repair.toolStart") as string).replace(
                  "{tool}",
                  data.tool,
                ),
                status: "pending",
                toolName: data.tool,
              });
            } else if (data.type === "tool_result") {
              const ok = data.status === "success";
              addActionLog({
                action: ok
                  ? (t("repair.toolDone") as string).replace(
                      "{tool}",
                      data.tool,
                    )
                  : (t("repair.toolFailed") as string).replace(
                      "{tool}",
                      data.tool,
                    ),
                status: ok ? "done" : "error",
                toolName: data.tool,
              });
            } else if (data.type === "complete") {
              playSound("self_repair_done");
              addActionLog({
                action: (t("repair.complete") as string)
                  .replace("{ok}", String(data.tools_succeeded))
                  .replace("{total}", String(data.tools_run)),
                status: data.tools_succeeded > 0 ? "done" : "error",
              });
            }
          } catch {
            // parse error, skip
          }
        }
      }
    } catch {
      stopRepairMusic();
      addActionLog({ action: t("repair.noTools"), status: "error" });
    } finally {
      setSelfRepairActive(false);
    }
  };

  const iconBtnClass = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active
        ? "text-[var(--theme-accent)]"
        : "text-[#484f58] hover:text-[#8b949e]"
    }`;

  // Integrity color
  const integrityColor =
    agent.integrity_score > 80
      ? "text-green-400"
      : agent.integrity_score > 50
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="h-11 flex items-center gap-3 px-4 bg-[var(--theme-bg-elevated)] border-b border-[rgba(255,255,255,0.1)] shrink-0">
      {/* Agent name */}
      <span className="text-xs font-bold text-theme-text-bright tracking-wide uppercase">
        {agent.name}
      </span>

      {/* Divider */}
      <div className="w-px h-5 bg-[rgba(255,255,255,0.1)]" />

      {/* Folder picker + project path + recent projects dropdown */}
      <div
        className="flex items-center gap-1.5 min-w-0 relative"
        ref={dropdownRef}
      >
        <button
          onClick={handlePickFolder}
          className="p-1 rounded text-[#484f58] hover:text-[#8b949e] transition-colors shrink-0"
          title={t("project.selectFolder")}
        >
          <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        {projectScan && (
          <button
            onClick={handleToggleDropdown}
            className="flex items-center gap-0.5 text-[10px] text-theme-text-dim font-mono truncate max-w-[200px] hover:text-[#8b949e] transition-colors"
            title={projectScan.path}
          >
            {shortenPath(projectScan.path)}
            <span className="text-theme-text-dimmer ml-1.5">
              [{projectScan.total_files} files]
            </span>
            <ChevronDown
              className="w-2.5 h-2.5 ml-0.5 shrink-0"
              strokeWidth={1.5}
            />
          </button>
        )}

        {/* Recent projects dropdown */}
        {showDropdown && recentProjects.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--theme-bg-elevated)] border border-[rgba(255,255,255,0.1)] rounded shadow-lg min-w-[240px] py-1">
            {recentProjects.map((p) => (
              <button
                key={p.path}
                onClick={() => loadAndSwitchProject(p.path)}
                className="w-full text-left px-3 py-1.5 text-[10px] font-mono text-theme-text-dim hover:text-[#8b949e] hover:bg-white/4 transition-colors truncate"
                title={p.path}
              >
                <span className="text-theme-text">{p.name}</span>
                <span className="text-theme-text-dimmer ml-2">
                  {shortenPath(p.path)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[rgba(255,255,255,0.1)]" />

      {/* Metrics */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Integrity */}
        <div className="flex items-center gap-1">
          <Activity className={`w-3 h-3 ${integrityColor}`} strokeWidth={1.5} />
          <span className={`text-[10px] font-mono font-bold ${integrityColor}`}>
            {t("stats.integrity")}:
          </span>
          <span className={`text-[10px] font-mono tabular-nums ${integrityColor}`}>
            {agent.integrity_score.toFixed(1)}%
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-theme-text-dim">
            {t("stats.agentStatus")}:
          </span>
          {isAiResponding ? (
            <span className="text-[10px] font-mono font-bold text-yellow-400 flex items-center gap-0.5">
              {t("stats.processing")}
              <span className="inline-block w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
            </span>
          ) : (
            <span className="text-[10px] font-mono text-green-400">
              {t("stats.idle")}
            </span>
          )}
        </div>

        {/* Knowledge */}
        <div className="flex items-center gap-1">
          <Brain className="w-3 h-3 text-theme-text-dimmer" strokeWidth={1.5} />
          <span className="text-[10px] font-mono text-theme-text-dim">
            {t("stats.knowledge")}:
          </span>
          <span className="text-[10px] font-mono text-theme-text tabular-nums">
            {agent.known_files_count}/{agent.total_files}
          </span>
        </div>

        {/* Data processed */}
        {totalBytesProcessed > 0 && (
          <div className="flex items-center gap-1">
            <HardDrive
              className="w-3 h-3 text-theme-text-dimmer"
              strokeWidth={1.5}
            />
            <span className="text-[10px] font-mono text-theme-text-dim">
              {t("stats.data")}: {formatBytes(totalBytesProcessed)}
            </span>
          </div>
        )}
      </div>

      {/* Focus timer */}
      <FocusTimer />

      {/* Waveform + Audio toggle */}
      <div className="ml-auto flex items-center gap-1.5">
        <WaveformVisualizer className="opacity-70" />
        <button
          onClick={() => {
            if (soundEnabled && ttsEnabled) {
              setTtsEnabled(false);
            } else if (soundEnabled) {
              setSoundEnabled(false);
            } else {
              setSoundEnabled(true);
              setTtsEnabled(true);
            }
          }}
          className={`p-1 rounded transition-colors ${
            soundEnabled
              ? "text-theme-text-dim hover:text-[#8b949e]"
              : "text-theme-text-dimmer hover:text-theme-text-dim"
          }`}
          title={
            soundEnabled ? (ttsEnabled ? "TTS + SFX" : "SFX only") : "Muted"
          }
        >
          {soundEnabled ? (
            <Volume2 className="w-3 h-3" strokeWidth={1.5} />
          ) : (
            <VolumeX className="w-3 h-3" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Toolbar buttons */}
      <button
        onClick={handleSelfRepair}
        disabled={selfRepairActive}
        className={`p-1.5 rounded transition-colors ${
          selfRepairActive
            ? "text-theme-status-warning animate-pulse"
            : "text-[#484f58] hover:text-[#8b949e]"
        }`}
        title={t("repair.title")}
      >
        <Wrench
          className={`w-4 h-4 ${selfRepairActive ? "animate-spin" : ""}`}
          strokeWidth={1.5}
        />
      </button>
      <button
        onClick={toggleChronicle}
        className={iconBtnClass(showChronicle)}
        title={t("chronicle.title")}
      >
        <ScrollText className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={toggleHealthPanel}
        className={iconBtnClass(showHealthPanel)}
        title={t("health.title")}
      >
        <Radar className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={toggleFileExplorer}
        className={iconBtnClass(showFileExplorer)}
        title={t("explorer.title")}
      >
        <FolderTree className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={toggleGitPanel}
        className={iconBtnClass(showGitPanel)}
        title={t("git.panelTitle")}
      >
        <GitBranch className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={toggleSettings}
        className="p-1.5 rounded text-[#484f58] hover:text-[#8b949e] transition-colors"
      >
        <Settings className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
