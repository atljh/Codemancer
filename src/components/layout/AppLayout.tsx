import { TopStatsBar } from "./TopStatsBar";
import { OmniChat } from "../chat/OmniChat";
import { WelcomeScreen } from "../welcome/WelcomeScreen";
import { DiffViewerModal } from "../modals/DiffViewerModal";
import { ForgingOverlay } from "../forging/ForgingOverlay";
import { LevelUpModal } from "../modals/LevelUpModal";
import { SettingsModal } from "../modals/SettingsModal";
import { EditorRefProvider } from "../../hooks/useEditorRef";
import { useGameStore } from "../../stores/gameStore";

export function AppLayout() {
  const appReady = useGameStore((s) => s.appReady);
  const workspaceRoot = useGameStore((s) => s.settings.workspace_root);

  const showWelcome = appReady && !workspaceRoot;

  if (!appReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0c10]">
        <div className="tactical-grid" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border border-[#00d4ff]/40 border-t-[#00d4ff] rounded-full animate-spin" />
          <span className="text-xs text-[#5a6b7f] font-mono tracking-widest uppercase">
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
      <div className="h-screen w-screen flex flex-col bg-[#0a0c10] text-[#c8d6e5] overflow-hidden">
        {/* Tactical grid background */}
        <div className="tactical-grid" />
        {/* Scanline overlay */}
        <div className="fixed inset-0 pointer-events-none z-[1] animate-scanline" />

        {/* Main content */}
        <div className="relative z-10 flex flex-col h-full">
          <TopStatsBar />
          <main className="flex-1 flex justify-center overflow-hidden">
            <div className="w-full max-w-[80%] flex flex-col">
              <OmniChat />
            </div>
          </main>
        </div>
      </div>
      <DiffViewerModal />
      <ForgingOverlay />
      <LevelUpModal />
      <SettingsModal />
    </EditorRefProvider>
  );
}
