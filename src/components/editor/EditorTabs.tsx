import { MessageSquare, FileText, X, Map } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useTranslation } from "../../hooks/useTranslation";

export function EditorTabs() {
  const { t } = useTranslation();
  const openFiles = useGameStore((s) => s.openFiles);
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const closeFile = useGameStore((s) => s.closeFile);

  return (
    <div className="flex items-center h-8 shrink-0 border-b border-[var(--theme-glass-border)] glass-panel overflow-x-auto scrollbar-thin">
      {/* Chat tab — always first */}
      <button
        onClick={() => setActiveTab("chat")}
        className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-mono shrink-0 border-r border-[var(--theme-glass-border)] transition-colors ${
          activeTab === "chat"
            ? "bg-theme-accent/10 text-theme-accent"
            : "text-theme-text-dim hover:text-theme-text hover:bg-white/3"
        }`}
      >
        <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
        {t("editor.tabs.chat")}
      </button>

      {/* Map tab */}
      <button
        onClick={() => setActiveTab("map")}
        className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-mono shrink-0 border-r border-[var(--theme-glass-border)] transition-colors ${
          activeTab === "map"
            ? "bg-theme-accent/10 text-theme-accent"
            : "text-theme-text-dim hover:text-theme-text hover:bg-white/3"
        }`}
      >
        <Map className="w-3 h-3" strokeWidth={1.5} />
        {t("map.tab")}
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
