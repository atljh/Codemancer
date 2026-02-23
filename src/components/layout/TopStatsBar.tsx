import { Settings, FolderOpen, Shield } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { StatBar } from "../bars/StatBar";
import { ExpBar } from "../bars/ExpBar";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import { shortenPath } from "../../utils/paths";

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
  const api = useApi();
  const { t } = useTranslation();

  const handlePickFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected) return;

      const path = selected as string;

      const newSettings = { ...settings, workspace_root: path };
      setSettings(newSettings);
      setFileTreeRoot(path);
      await api.updateSettings(newSettings);

      addActionLog({ action: t("project.scanning"), status: "pending" });

      const scan = await api.scanProject(path, true);
      setProjectScan(scan);

      const updatedPlayer = await api.getStatus();
      setPlayer(updatedPlayer);

      addActionCard({
        fileName: `[PROJECT LOADED]: ${shortenPath(path)}`,
        status: "done",
        filePath: path,
        expGained: scan.exp_gained,
      });
    } catch {
      addActionLog({ action: t("project.scanFailed"), status: "error" });
    }
  };

  return (
    <div className="h-11 flex items-center gap-4 px-4 glass-panel border-b border-[rgba(0,212,255,0.08)] shrink-0">
      {/* Operative ID + Level */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded glass-panel-bright flex items-center justify-center animate-glow-pulse">
          <Shield className="w-3 h-3 text-[#00d4ff]" strokeWidth={1.5} />
        </div>
        <span className="text-xs font-bold text-[#c8d6e5] tracking-wide uppercase">
          {player.name}
        </span>
        <span className="text-[10px] text-[#00d4ff] font-mono font-bold tracking-wider">
          LV.{player.level}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[rgba(0,212,255,0.1)]" />

      {/* Folder picker + project path */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          onClick={handlePickFolder}
          className="p-1 rounded hover:bg-[rgba(0,212,255,0.08)] text-[#5a6b7f] hover:text-[#00d4ff] transition-colors shrink-0"
          title={t("project.selectFolder")}
        >
          <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        {projectScan && (
          <span className="text-[10px] text-[#5a6b7f] font-mono truncate max-w-[200px]" title={projectScan.path}>
            {shortenPath(projectScan.path)}
            <span className="text-[#3a4a5f] ml-1.5">
              [{projectScan.total_files} files]
            </span>
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[rgba(0,212,255,0.1)]" />

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

      {/* Settings */}
      <button
        onClick={toggleSettings}
        className="ml-auto p-1.5 rounded hover:bg-[rgba(0,212,255,0.08)] text-[#5a6b7f] hover:text-[#00d4ff] transition-colors"
      >
        <Settings className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
