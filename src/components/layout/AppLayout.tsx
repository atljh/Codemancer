import { useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { TopStatsBar } from "./TopStatsBar";
import { OmniChat } from "../chat/OmniChat";
import { GitPanel } from "../git/GitPanel";
import { FileExplorer } from "../explorer/FileExplorer";
import { EditorTabs } from "../editor/EditorTabs";
import { CodeEditor } from "../editor/CodeEditor";
import { WelcomeScreen } from "../welcome/WelcomeScreen";
import { DiffViewerModal } from "../modals/DiffViewerModal";
import { ForgingOverlay } from "../forging/ForgingOverlay";
import { LevelUpModal } from "../modals/LevelUpModal";
import { SettingsModal } from "../modals/SettingsModal";
import { ChroniclePanel } from "../chronicle/ChroniclePanel";
import { IntelFeedPanel } from "../chronicle/IntelFeedPanel";
import { HealthPanel } from "../health/HealthPanel";
import { TacticalMap } from "../map/TacticalMap";
import { CommsPanel } from "../comms/CommsPanel";
import { MissionControl } from "../mission/MissionControl";
import { MissionBriefing } from "../mission/MissionBriefing";
import { QuickOpenModal } from "../modals/QuickOpenModal";
import { CommandPaletteModal } from "../modals/CommandPaletteModal";
import { GoToLineDialog } from "../modals/GoToLineDialog";
import { SearchPanel } from "../search/SearchPanel";
import { EditorRefProvider } from "../../hooks/useEditorRef";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useHealthWatch } from "../../hooks/useHealthWatch";
import { useProactivePulse } from "../../hooks/useProactivePulse";
import { useGameStore } from "../../stores/gameStore";

export function AppLayout() {
  useKeyboardShortcuts();
  useHealthWatch();
  useProactivePulse();
  const appReady = useGameStore((s) => s.appReady);
  const workspaceRoot = useGameStore((s) => s.settings.workspace_root);
  const showGitPanel = useGameStore((s) => s.showGitPanel);
  const showFileExplorer = useGameStore((s) => s.showFileExplorer);
  const showSearchPanel = useGameStore((s) => s.showSearchPanel);
  const activeTab = useGameStore((s) => s.activeTab);
  const playerHp = useGameStore((s) => s.player.hp);
  const playerMaxHp = useGameStore((s) => s.player.max_hp);
  const isLowHp = playerMaxHp > 0 && playerHp / playerMaxHp < 0.2;

  // Holographic parallax — track mouse and apply subtle offset
  const holographicRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!holographicRef.current) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = ((e.clientX - cx) / cx) * 1.5;
      const dy = ((e.clientY - cy) / cy) * 1.5;
      holographicRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    });
  }, []);

  const showWelcome = appReady && !workspaceRoot;

  if (!appReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-theme-bg-deep">
        <div className="tactical-grid" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border border-theme-accent/40 border-t-theme-accent rounded-full animate-spin" />
          <span className="text-xs text-theme-text-dim font-mono tracking-widest uppercase">
            Initializing systems...
          </span>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <>
        <WelcomeScreen />
        <SettingsModal />
      </>
    );
  }

  return (
    <EditorRefProvider>
      <div
        className={`h-screen w-screen flex flex-col bg-theme-bg-deep text-theme-text overflow-hidden ${isLowHp ? "low-hp-glitch" : ""}`}
        onMouseMove={handleMouseMove}
      >
        {/* Tactical grid background */}
        <div className="tactical-grid" />
        {/* Scanline overlay */}
        <div className="fixed inset-0 pointer-events-none z-[1] animate-scanline" />
        {/* Low HP vignette */}
        {isLowHp && <div className="low-hp-vignette" />}

        {/* Main content — holographic parallax layer */}
        <div
          ref={holographicRef}
          className="relative z-10 flex flex-col h-full holographic-layer hologram-flicker"
        >
          <TopStatsBar />
          <main className="flex-1 flex overflow-hidden">
            <AnimatePresence>
              {showFileExplorer && <FileExplorer />}
            </AnimatePresence>
            <AnimatePresence>
              {showSearchPanel && <SearchPanel />}
            </AnimatePresence>
            <div className="flex-1 flex flex-col min-w-0">
              <EditorTabs />
              {activeTab === "chat" ? (
                <OmniChat />
              ) : activeTab === "bridge" ? (
                <MissionControl />
              ) : activeTab === "map" ? (
                <TacticalMap />
              ) : activeTab === "comms" ? (
                <CommsPanel />
              ) : (
                <CodeEditor />
              )}
            </div>
            <AnimatePresence>{showGitPanel && <GitPanel />}</AnimatePresence>
          </main>
        </div>
      </div>
      <DiffViewerModal />
      <ForgingOverlay />
      <LevelUpModal />
      <SettingsModal />
      <ChroniclePanel />
      <IntelFeedPanel />
      <HealthPanel />
      <MissionBriefing />
      <QuickOpenModal />
      <CommandPaletteModal />
      <GoToLineDialog />
    </EditorRefProvider>
  );
}
