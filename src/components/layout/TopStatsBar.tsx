import { useState, useRef, useEffect, useCallback } from "react";
import { Settings, FolderOpen, Shield, HardDrive, ChevronDown, GitBranch, FolderTree, ScrollText, Radar } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { StatBar } from "../bars/StatBar";
import { ExpBar } from "../bars/ExpBar";
import { FocusTimer } from "../focus/FocusTimer";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import { shortenPath } from "../../utils/paths";

interface RecentProject {
  path: string;
  name: string;
  last_opened: number;
}

export function TopStatsBar() {
  const player = useGameStore((s) => s.player);
  const settings = useGameStore((s) => s.settings);
  const projectScan = useGameStore((s) => s.projectScan);
  const toggleSettings = useGameStore((s) => s.toggleSettings);
  const setSettings = useGameStore((s) => s.setSettings);
  const setPlayer = useGameStore((s) => s.setPlayer);
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
  const api = useApi();
  const { t } = useTranslation();

  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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
        const updatedPlayer = await api.getStatus();
        setPlayer(updatedPlayer);
        await api.addRecentProject(path);
        addActionCard({
          fileName: `[PROJECT LOADED]: ${shortenPath(path)}`,
          status: "done",
          filePath: path,
          expGained: scan.exp_gained,
        });
      } catch {
        addActionLog({ action: t("project.scanFailed"), status: "error" });
      }
    },
    [settings, setSettings, setFileTreeRoot, api, addActionLog, setProjectScan, setPlayer, addActionCard, t]
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

  return (
    <div className="h-11 flex items-center gap-4 px-4 glass-panel border-b border-[var(--theme-glass-border)] shrink-0">
      {/* Operative ID + Level */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded glass-panel-bright flex items-center justify-center animate-glow-pulse">
          <Shield className="w-3 h-3 text-theme-accent" strokeWidth={1.5} />
        </div>
        <span className="text-xs font-bold text-theme-text tracking-wide uppercase">
          {player.name}
        </span>
        <span className="text-[10px] text-theme-accent font-mono font-bold tracking-wider">
          LV.{player.level}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--theme-glass-border)]" />

      {/* Folder picker + project path + recent projects dropdown */}
      <div className="flex items-center gap-1.5 min-w-0 relative" ref={dropdownRef}>
        <button
          onClick={handlePickFolder}
          className="p-1 rounded hover:bg-theme-accent/8 text-theme-text-dim hover:text-theme-accent transition-colors shrink-0"
          title={t("project.selectFolder")}
        >
          <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        {projectScan && (
          <button
            onClick={handleToggleDropdown}
            className="flex items-center gap-0.5 text-[10px] text-theme-text-dim font-mono truncate max-w-[200px] hover:text-theme-accent transition-colors"
            title={projectScan.path}
          >
            {shortenPath(projectScan.path)}
            <span className="text-theme-text-dimmer ml-1.5">
              [{projectScan.total_files} files]
            </span>
            <ChevronDown className="w-2.5 h-2.5 ml-0.5 shrink-0" strokeWidth={1.5} />
          </button>
        )}

        {/* Recent projects dropdown */}
        {showDropdown && recentProjects.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-50 glass-panel border border-[var(--theme-glass-border)] rounded shadow-lg min-w-[240px] py-1">
            {recentProjects.map((p) => (
              <button
                key={p.path}
                onClick={() => loadAndSwitchProject(p.path)}
                className="w-full text-left px-3 py-1.5 text-[10px] font-mono text-theme-text-dim hover:bg-theme-accent/10 hover:text-theme-accent transition-colors truncate"
                title={p.path}
              >
                <span className="text-theme-text">{p.name}</span>
                <span className="text-theme-text-dimmer ml-2">{shortenPath(p.path)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--theme-glass-border)]" />

      {/* Stat Bars */}
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <div className="flex-1">
          <StatBar label={t("stats.hp")} current={player.hp} max={player.max_hp} color="red" />
        </div>
        <div className="flex-1">
          <StatBar label={t("stats.mp")} current={player.mp} max={player.max_mp} color="purple" />
        </div>
        <div className="flex-1">
          <ExpBar />
        </div>
      </div>

      {/* Memory Usage */}
      {totalBytesProcessed > 0 && (
        <>
          <div className="w-px h-5 bg-[var(--theme-glass-border)]" />
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-theme-accent/60" strokeWidth={1.5} />
            <span className="text-[10px] font-mono text-theme-accent/60">
              {t("stats.data")}: {formatBytes(totalBytesProcessed)}
            </span>
          </div>
        </>
      )}

      {/* Focus timer */}
      <FocusTimer />

      {/* Chronicle + Health + Explorer + Git + Settings */}
      <button
        onClick={toggleChronicle}
        className={`ml-auto p-1.5 rounded transition-colors ${
          showChronicle
            ? "bg-theme-accent/15 text-theme-accent"
            : "hover:bg-theme-accent/8 text-theme-text-dim hover:text-theme-accent"
        }`}
        title={t("chronicle.title")}
      >
        <ScrollText className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={toggleHealthPanel}
        className={`p-1.5 rounded transition-colors ${
          showHealthPanel
            ? "bg-theme-accent/15 text-theme-accent"
            : "hover:bg-theme-accent/8 text-theme-text-dim hover:text-theme-accent"
        }`}
        title={t("health.title")}
      >
        <Radar className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={toggleFileExplorer}
        className={`p-1.5 rounded transition-colors ${
          showFileExplorer
            ? "bg-theme-accent/15 text-theme-accent"
            : "hover:bg-theme-accent/8 text-theme-text-dim hover:text-theme-accent"
        }`}
        title={t("explorer.title")}
      >
        <FolderTree className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={toggleGitPanel}
        className={`p-1.5 rounded transition-colors ${
          showGitPanel
            ? "bg-theme-accent/15 text-theme-accent"
            : "hover:bg-theme-accent/8 text-theme-text-dim hover:text-theme-accent"
        }`}
        title={t("git.panelTitle")}
      >
        <GitBranch className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={toggleSettings}
        className="p-1.5 rounded hover:bg-theme-accent/8 text-theme-text-dim hover:text-theme-accent transition-colors"
      >
        <Settings className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
