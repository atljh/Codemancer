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
      <div className={`h-screen w-screen flex flex-col bg-theme-bg-deep text-theme-text overflow-hidden ${isLowHp ? "low-hp-glitch" : ""}`}>
        {/* Tactical grid background */}
        <div className="tactical-grid" />
        {/* Scanline overlay */}
        <div className="fixed inset-0 pointer-events-none z-[1] animate-scanline" />
        {/* Low HP vignette */}
        {isLowHp && <div className="low-hp-vignette" />}

        {/* Main content */}
        <div className="relative z-10 flex flex-col h-full">
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
              {activeTab === "chat" ? <OmniChat /> : activeTab === "map" ? <TacticalMap /> : <CodeEditor />}
            </div>
            <AnimatePresence>
              {showGitPanel && <GitPanel />}
            </AnimatePresence>
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
      <QuickOpenModal />
      <CommandPaletteModal />
      <GoToLineDialog />
    </EditorRefProvider>
  );
}
