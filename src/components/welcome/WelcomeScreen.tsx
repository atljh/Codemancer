import { useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Brain, Crosshair, Target, Shield } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import { shortenPath } from "../../utils/paths";

export function WelcomeScreen() {
  const settings = useGameStore((s) => s.settings);
  const setSettings = useGameStore((s) => s.setSettings);
  const setFileTreeRoot = useGameStore((s) => s.setFileTreeRoot);
  const setProjectScan = useGameStore((s) => s.setProjectScan);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const toggleSettings = useGameStore((s) => s.toggleSettings);
  const addActionCard = useGameStore((s) => s.addActionCard);
  const api = useApi();
  const { t } = useTranslation();

  const [isScanning, setIsScanning] = useState(false);

  const handlePickFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected) return;
      const path = selected as string;
      await loadProject(path);
    } catch {
      // user cancelled
    }
  };

  const loadProject = async (path: string) => {
    setIsScanning(true);
    try {
      const newSettings = { ...settings, workspace_root: path };
      setSettings(newSettings);
      setFileTreeRoot(path);
      await api.updateSettings(newSettings);

      const scan = await api.scanProject(path, true);
      setProjectScan(scan);

      try {
        const updatedPlayer = await api.getStatus();
        setPlayer(updatedPlayer);
      } catch { /* ok */ }

      addActionCard({
        fileName: `[PROJECT LOADED]: ${shortenPath(path)}`,
        status: "done",
        filePath: path,
        expGained: scan.exp_gained,
      });
    } catch {
      // scan failed
    }
    setIsScanning(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-theme-bg-deep text-theme-text overflow-hidden relative">
      {/* Tactical grid background */}
      <div className="tactical-grid" />
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none z-[1] animate-scanline" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Tactical Logo */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-lg glass-panel-bright flex items-center justify-center shadow-[0_0_40px_rgba(var(--theme-accent-rgb),0.15)] tactical-corners animate-glow-pulse">
            <Shield className="w-10 h-10 text-theme-accent" strokeWidth={1} />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-2xl font-display font-bold text-white tracking-[0.25em] uppercase mb-1"
        >
          Codemancer
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-[11px] text-theme-text-dim font-mono tracking-[0.15em] uppercase mb-10"
        >
          {t("welcome.selectProject")}
        </motion.p>

        {/* Folder Picker Button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mb-10"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePickFolder}
            disabled={isScanning}
            className="flex items-center gap-3 px-6 py-3 rounded-lg glass-panel-bright hover:bg-theme-accent/6 transition-all text-sm group tactical-corners"
          >
            <FolderOpen className="w-4 h-4 text-theme-text-dim group-hover:text-theme-accent transition-colors" strokeWidth={1.5} />
            <span className="text-theme-text/70 group-hover:text-white transition-colors font-mono text-xs tracking-wider uppercase">
              {isScanning ? t("project.scanning") : t("welcome.openProject")}
            </span>
          </motion.button>
        </motion.div>

        {/* Quick Action Cards */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="w-full max-w-lg space-y-2"
        >
          <QuickCard
            icon={<Crosshair className="w-4 h-4" strokeWidth={1.5} />}
            title={t("welcome.exploreTitle")}
            description={t("welcome.exploreDesc")}
            onClick={handlePickFolder}
            preview={
              <div className="text-[9px] font-mono text-theme-text-dim leading-relaxed">
                <div className="text-theme-accent/50">src/</div>
                <div className="pl-2 text-theme-text/30">index.ts</div>
                <div className="pl-2 text-theme-text/30">utils/</div>
              </div>
            }
          />
          <QuickCard
            icon={<Brain className="w-4 h-4" strokeWidth={1.5} />}
            title={t("welcome.configureAiTitle")}
            description={t("welcome.configureAiDesc")}
            onClick={toggleSettings}
            preview={
              <div className="text-[9px] font-mono text-theme-text-dim leading-relaxed">
                <div className="text-theme-accent/50">API_KEY</div>
                <div className="text-theme-text/30">sk-***</div>
                <div className="text-theme-purple/50 mt-0.5">Sonnet 4</div>
              </div>
            }
          />
          <QuickCard
            icon={<Target className="w-4 h-4" strokeWidth={1.5} />}
            title={t("welcome.questsTitle")}
            description={t("welcome.questsDesc")}
            onClick={handlePickFolder}
            preview={
              <div className="text-[9px] font-mono text-theme-text-dim leading-relaxed">
                <div className="text-theme-status-warning/50">TODO</div>
                <div className="text-theme-text/30">fix auth</div>
                <div className="text-theme-status-success/50 mt-0.5">+50 EXP</div>
              </div>
            }
          />
        </motion.div>
      </div>
    </div>
  );
}

function QuickCard({
  icon,
  title,
  description,
  onClick,
  preview,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  preview?: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.005, x: 2 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 rounded-lg glass-panel hover:bg-theme-accent/3 transition-all text-left group"
    >
      <div className="text-theme-text-dim group-hover:text-theme-accent transition-colors shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono font-medium text-theme-text/80 group-hover:text-white transition-colors tracking-wider uppercase">
          {title}
        </div>
        <div className="text-[10px] font-mono text-theme-text-dim mt-0.5">
          {description}
        </div>
      </div>
      {preview && (
        <div className="shrink-0 w-16 h-12 rounded glass-panel p-1.5 overflow-hidden">
          {preview}
        </div>
      )}
    </motion.button>
  );
}
