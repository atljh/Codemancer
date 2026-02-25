import { Terminal, FileText, X, Map, Radio, Crosshair } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useTranslation } from "../../hooks/useTranslation";

export function EditorTabs() {
  const { t } = useTranslation();
  const openFiles = useGameStore((s) => s.openFiles);
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const closeFile = useGameStore((s) => s.closeFile);

  const tabClass = (tab: string) =>
    `flex items-center gap-1.5 px-3 h-full text-[11px] font-mono shrink-0 border-r border-[var(--theme-glass-border)] transition-colors ${
      activeTab === tab
        ? "bg-theme-accent/10 text-theme-accent"
        : "text-theme-text-dim hover:text-theme-text hover:bg-white/3"
    }`;

  return (
    <div className="flex items-center h-8 shrink-0 border-b border-[var(--theme-glass-border)] glass-panel overflow-x-auto scrollbar-thin">
      {/* Console tab — always first */}
      <button onClick={() => setActiveTab("chat")} className={tabClass("chat")}>
        <Terminal className="w-3 h-3" strokeWidth={1.5} />
        {t("editor.tabs.chat")}
      </button>

      {/* Bridge tab */}
      <button onClick={() => setActiveTab("bridge")} className={tabClass("bridge")}>
        <Crosshair className="w-3 h-3" strokeWidth={1.5} />
        {t("bridge.tab")}
      </button>

      {/* Strategic Radar tab */}
      <button onClick={() => setActiveTab("map")} className={tabClass("map")}>
        <Map className="w-3 h-3" strokeWidth={1.5} />
        {t("map.tab")}
      </button>

      {/* COMMS Intercept tab */}
      <button onClick={() => setActiveTab("comms")} className={tabClass("comms")}>
        <Radio className="w-3 h-3" strokeWidth={1.5} />
        {t("comms.tab")}
      </button>

      {/* File tabs */}
      {openFiles.map((file) => {
        const fileName = file.path.split("/").pop() ?? file.path;
        const isActive = activeTab === file.path;
        return (
          <div
            key={file.path}
            className={`group flex items-center gap-1 px-2 h-full text-[11px] font-mono shrink-0 border-r border-[var(--theme-glass-border)] transition-colors cursor-pointer ${
              isActive
                ? "bg-theme-accent/10 text-theme-accent"
                : "text-theme-text-dim hover:text-theme-text hover:bg-white/3"
            }`}
            onClick={() => setActiveTab(file.path)}
          >
            <FileText className="w-3 h-3 opacity-60" strokeWidth={1.5} />
            <span className="truncate max-w-[120px]">{fileName}</span>
            {file.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent shrink-0" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.path);
              }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/8 transition-all"
              title={t("editor.closeTab")}
            >
              <X className="w-2.5 h-2.5" strokeWidth={1.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
