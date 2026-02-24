import { motion } from "framer-motion";
import { WifiOff, Settings } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useTelegram } from "../../hooks/useTelegram";
import { useTranslation } from "../../hooks/useTranslation";
import { CommsAuthPanel } from "./CommsAuthPanel";
import { CommsChatList } from "./CommsChatList";
import { CommsMessageViewer } from "./CommsMessageViewer";

export function CommsPanel() {
  const { t } = useTranslation();
  const commsConnected = useGameStore((s) => s.commsConnected);
  const toggleSettings = useGameStore((s) => s.toggleSettings);
  const { hasCredentials, disconnect } = useTelegram();

  // No credentials — prompt to configure
  if (!hasCredentials) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-lg p-6 text-center tactical-corners"
        >
          <WifiOff
            className="w-8 h-8 text-theme-text-dimmer mx-auto mb-3"
            strokeWidth={1}
          />
          <p className="text-xs text-theme-text-dim font-mono mb-4">
            {t("comms.noApiCredentials")}
          </p>
          <button
            onClick={toggleSettings}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded glass-panel-bright text-theme-accent text-xs font-mono font-bold tracking-[0.1em] uppercase hover:bg-theme-accent/8 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
            {t("panel.settings")}
          </button>
        </motion.div>
      </div>
    );
  }

  // Auth flow
  if (!commsConnected) {
    return <CommsAuthPanel />;
  }

  // Connected — show chat list + messages
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--theme-glass-border)] bg-theme-status-success/3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-theme-status-success animate-glow-pulse" />
          <span className="text-[10px] font-mono text-theme-status-success tracking-wider">
            {t("comms.connected")}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="text-[9px] font-mono text-theme-status-error/60 hover:text-theme-status-error tracking-wider transition-colors"
        >
          {t("comms.disconnect")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        <CommsChatList />
        <CommsMessageViewer />
      </div>
    </div>
  );
}
