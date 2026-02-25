import { useGameStore } from "../stores/gameStore";
import { api } from "../hooks/useApi";

export interface Command {
  id: string;
  labelKey: string;
  shortcut?: string;
  category: string;
  execute: () => void | Promise<void>;
}

const TAB_ORDER = ["chat", "bridge", "map", "comms"] as const;

export function cycleTab(direction: 1 | -1) {
  const { activeTab, openFiles, setActiveTab } = useGameStore.getState();
  const allTabs: string[] = [...TAB_ORDER, ...openFiles.map((f) => f.path)];
  const idx = allTabs.indexOf(activeTab);
  const next = (idx + direction + allTabs.length) % allTabs.length;
  setActiveTab(allTabs[next]);
}

export function getCommands(): Command[] {
  return [
    // --- File ---
    {
      id: "file.newConversation",
      labelKey: "cmd.newConversation",
      shortcut: "⌘T",
      category: "File",
      execute: () => {
        const s = useGameStore.getState();
        s.clearMessages();
        s.setActiveTab("chat");
      },
    },
    {
      id: "file.openProject",
      labelKey: "cmd.openProject",
      shortcut: "⌘O",
      category: "File",
      execute: async () => {
        try {
          const { open } = await import("@tauri-apps/plugin-dialog");
          const selected = await open({ directory: true, multiple: false });
          if (!selected) return;
          const path = selected as string;
          const s = useGameStore.getState();
          const scan = await api.scanProject(path);
          const newSettings = { ...s.settings, workspace_root: path };
          await api.updateSettings(newSettings);
          s.setSettings(newSettings);
          s.setFileTreeRoot(path);
          s.setProjectScan(scan);
          const tree = await api.getFileTree(path);
          s.setFileTree(tree);
          const agent = await api.getStatus();
          s.setAgent(agent);
        } catch {
          /* not in Tauri or cancelled */
        }
      },
    },
    {
      id: "file.quickOpen",
      labelKey: "cmd.quickOpen",
      shortcut: "⌘P",
      category: "File",
      execute: () => useGameStore.getState().toggleQuickOpen(),
    },
    {
      id: "file.save",
      labelKey: "cmd.save",
      shortcut: "⌘S",
      category: "File",
      execute: () => window.dispatchEvent(new CustomEvent("codemancer:save")),
    },
    {
      id: "file.closeTab",
      labelKey: "cmd.closeTab",
      shortcut: "⌘W",
      category: "File",
      execute: () => {
        const { activeTab, closeFile } = useGameStore.getState();
        const systemTabs = ["chat", "bridge", "map", "comms"];
        if (!systemTabs.includes(activeTab)) closeFile(activeTab);
      },
    },
    {
      id: "file.newFile",
      labelKey: "cmd.newFile",
      shortcut: "⌘N",
      category: "File",
      execute: () => {
        const s = useGameStore.getState();
        const name = `untitled-${Date.now()}.txt`;
        const path = s.fileTreeRoot
          ? `${s.fileTreeRoot}/${name}`
          : `/tmp/${name}`;
        s.openFile({ path, content: "", language: "plaintext", isDirty: true });
        s.setActiveTab(path);
      },
    },

    // --- View ---
    {
      id: "view.toggleExplorer",
      labelKey: "cmd.toggleExplorer",
      shortcut: "⌘B",
      category: "View",
      execute: () => useGameStore.getState().toggleFileExplorer(),
    },
    {
      id: "view.toggleGit",
      labelKey: "cmd.toggleGit",
      shortcut: "⌘J",
      category: "View",
      execute: () => useGameStore.getState().toggleGitPanel(),
    },
    {
      id: "view.toggleChronicle",
      labelKey: "cmd.toggleChronicle",
      shortcut: "⇧⌘C",
      category: "View",
      execute: () => useGameStore.getState().toggleChronicle(),
    },
    {
      id: "view.toggleHealth",
      labelKey: "cmd.toggleHealth",
      shortcut: "⇧⌘H",
      category: "View",
      execute: () => useGameStore.getState().toggleHealthPanel(),
    },
    {
      id: "view.toggleBridge",
      labelKey: "cmd.toggleBridge",
      shortcut: "⇧⌘B",
      category: "View",
      execute: () => useGameStore.getState().setActiveTab("bridge"),
    },
    {
      id: "view.toggleIntelFeed",
      labelKey: "cmd.toggleIntelFeed",
      shortcut: "⇧⌘I",
      category: "View",
      execute: () => useGameStore.getState().toggleIntelFeed(),
    },
    {
      id: "view.toggleSettings",
      labelKey: "cmd.toggleSettings",
      shortcut: "⌘,",
      category: "View",
      execute: () => useGameStore.getState().toggleSettings(),
    },
    {
      id: "view.zoomIn",
      labelKey: "cmd.zoomIn",
      shortcut: "⌘+",
      category: "View",
      execute: () =>
        window.dispatchEvent(
          new CustomEvent("codemancer:zoom", { detail: "in" }),
        ),
    },
    {
      id: "view.zoomOut",
      labelKey: "cmd.zoomOut",
      shortcut: "⌘-",
      category: "View",
      execute: () =>
        window.dispatchEvent(
          new CustomEvent("codemancer:zoom", { detail: "out" }),
        ),
    },
    {
      id: "view.zoomReset",
      labelKey: "cmd.zoomReset",
      shortcut: "⌘0",
      category: "View",
      execute: () =>
        window.dispatchEvent(
          new CustomEvent("codemancer:zoom", { detail: "reset" }),
        ),
    },

    // --- Navigate ---
    {
      id: "nav.prevTab",
      labelKey: "cmd.prevTab",
      shortcut: "⇧⌘[",
      category: "Navigate",
      execute: () => cycleTab(-1),
    },
    {
      id: "nav.nextTab",
      labelKey: "cmd.nextTab",
      shortcut: "⇧⌘]",
      category: "Navigate",
      execute: () => cycleTab(1),
    },
    {
      id: "nav.goToLine",
      labelKey: "cmd.goToLine",
      shortcut: "⌘G",
      category: "Navigate",
      execute: () => {
        const { activeTab, openFiles } = useGameStore.getState();
        if (openFiles.some((f) => f.path === activeTab)) {
          useGameStore.getState().toggleGoToLine();
        }
      },
    },

    // --- Editor ---
    {
      id: "editor.find",
      labelKey: "cmd.findInFile",
      shortcut: "⌘F",
      category: "Editor",
      execute: () =>
        window.dispatchEvent(new CustomEvent("codemancer:editor-find")),
    },
    {
      id: "editor.replace",
      labelKey: "cmd.replaceInFile",
      shortcut: "⌘H",
      category: "Editor",
      execute: () =>
        window.dispatchEvent(new CustomEvent("codemancer:editor-replace")),
    },
    {
      id: "editor.searchFiles",
      labelKey: "cmd.searchFiles",
      shortcut: "⇧⌘F",
      category: "Editor",
      execute: () => useGameStore.getState().toggleSearchPanel(),
    },
    {
      id: "editor.replaceInFiles",
      labelKey: "cmd.replaceInFiles",
      shortcut: "⇧⌘R",
      category: "Editor",
      execute: () => {
        const s = useGameStore.getState();
        s.setSearchReplaceExpanded(true);
        if (!s.showSearchPanel) s.toggleSearchPanel();
      },
    },

    // --- Focus ---
    {
      id: "focus.toggle",
      labelKey: "cmd.toggleFocus",
      shortcut: "⇧⌘M",
      category: "Focus",
      execute: async () => {
        const s = useGameStore.getState();
        if (s.focusStatus?.active) {
          const status = await api.focusEnd();
          s.setFocusStatus(status);
        } else {
          const status = await api.focusStart(25);
          s.setFocusStatus(status);
        }
      },
    },

    // --- Git ---
    {
      id: "git.status",
      labelKey: "cmd.gitStatus",
      category: "Git",
      execute: () => {
        const s = useGameStore.getState();
        if (!s.showGitPanel) s.toggleGitPanel();
      },
    },

    // --- Operations ---
    {
      id: "quests.scanTodos",
      labelKey: "cmd.scanTodos",
      category: "Operations",
      execute: async () => {
        const { fileTreeRoot } = useGameStore.getState();
        if (fileTreeRoot) {
          await api.scanTodos(fileTreeRoot);
        }
      },
    },

    // --- General ---
    {
      id: "general.commandPalette",
      labelKey: "cmd.commandPalette",
      shortcut: "⇧⌘P",
      category: "General",
      execute: () => useGameStore.getState().toggleCommandPalette(),
    },
  ];
}
