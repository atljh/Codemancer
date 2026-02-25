import { useEffect } from "react";
import { useGameStore } from "../stores/gameStore";
import { api } from "./useApi";
import { cycleTab } from "../commands/commandRegistry";

const ZOOM_KEY = "codemancer-zoom";
const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;

function getZoom(): number {
  const stored = localStorage.getItem(ZOOM_KEY);
  return stored ? parseFloat(stored) : 1.0;
}

function setZoom(level: number) {
  const clamped = Math.min(
    ZOOM_MAX,
    Math.max(ZOOM_MIN, Math.round(level * 100) / 100),
  );
  localStorage.setItem(ZOOM_KEY, String(clamped));
  document.documentElement.style.zoom = String(clamped);
}

// Apply persisted zoom on load
function initZoom() {
  const level = getZoom();
  if (level !== 1.0) {
    document.documentElement.style.zoom = String(level);
  }
}

// Listen for zoom events from command registry
function handleZoomEvent(e: Event) {
  const detail = (e as CustomEvent).detail;
  if (detail === "in") setZoom(getZoom() + ZOOM_STEP);
  else if (detail === "out") setZoom(getZoom() - ZOOM_STEP);
  else if (detail === "reset") setZoom(1.0);
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    initZoom();
    window.addEventListener("codemancer:zoom", handleZoomEvent);

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // --- Escape chain (no mod required) ---
      if (e.key === "Escape") {
        const s = useGameStore.getState();
        if (s.showCommandPalette) {
          s.setShowCommandPalette(false);
          e.preventDefault();
          return;
        }
        if (s.showQuickOpen) {
          s.toggleQuickOpen();
          e.preventDefault();
          return;
        }
        if (s.showGoToLine) {
          s.setShowGoToLine(false);
          e.preventDefault();
          return;
        }
        if (s.showSearchPanel) {
          s.toggleSearchPanel();
          e.preventDefault();
          return;
        }
        if (s.showSettings) {
          s.toggleSettings();
          e.preventDefault();
          return;
        }
        if (s.diffViewer.show) {
          s.closeDiffViewer();
          e.preventDefault();
          return;
        }
        if (s.showChronicle) {
          s.toggleChronicle();
          e.preventDefault();
          return;
        }
        if (s.showHealthPanel) {
          s.toggleHealthPanel();
          e.preventDefault();
          return;
        }
        return;
      }

      // --- Ctrl+Tab / Ctrl+Shift+Tab — cycle tabs (no Cmd needed) ---
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        cycleTab(e.shiftKey ? -1 : 1);
        return;
      }

      if (!mod) return;

      // Ignore if user is typing in an input/textarea (except for zoom, tab switches, and palette shortcuts)
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA";

      // --- Shift combos (before main switch) ---
      if (e.shiftKey) {
        switch (e.key) {
          // Cmd+Shift+P — Command Palette
          case "p":
          case "P": {
            e.preventDefault();
            useGameStore.getState().toggleCommandPalette();
            return;
          }
          // Cmd+Shift+F — global search
          case "f":
          case "F": {
            e.preventDefault();
            useGameStore.getState().toggleSearchPanel();
            return;
          }
          // Cmd+Shift+C — toggle Chronicle
          case "c":
          case "C": {
            e.preventDefault();
            useGameStore.getState().toggleChronicle();
            return;
          }
          // Cmd+Shift+H — toggle Health Panel
          case "h":
          case "H": {
            e.preventDefault();
            useGameStore.getState().toggleHealthPanel();
            return;
          }
          // Cmd+Shift+M — toggle Focus Mode
          case "m":
          case "M": {
            e.preventDefault();
            const s = useGameStore.getState();
            if (s.focusStatus?.active) {
              api.focusEnd().then((status) => s.setFocusStatus(status));
            } else {
              api.focusStart(25).then((status) => s.setFocusStatus(status));
            }
            return;
          }
          // Cmd+Shift+R — global replace
          case "r":
          case "R": {
            e.preventDefault();
            const s = useGameStore.getState();
            s.setSearchReplaceExpanded(true);
            if (!s.showSearchPanel) s.toggleSearchPanel();
            return;
          }
          // Cmd+Shift+[ — prev tab
          case "[": {
            e.preventDefault();
            cycleTab(-1);
            return;
          }
          // Cmd+Shift+] — next tab
          case "]": {
            e.preventDefault();
            cycleTab(1);
            return;
          }
          default:
            break;
        }
      }

      switch (e.key) {
        // Cmd+S — save (always prevent default, CodeEditor handles the actual save)
        case "s": {
          e.preventDefault();
          break;
        }

        // Cmd+T — new conversation
        case "t": {
          if (isInput) return;
          e.preventDefault();
          const { clearMessages, setActiveTab } = useGameStore.getState();
          clearMessages();
          setActiveTab("chat");
          break;
        }

        // Cmd+W — close current file tab
        case "w": {
          if (isInput) return;
          e.preventDefault();
          const { activeTab, closeFile } = useGameStore.getState();
          if (activeTab !== "chat" && activeTab !== "map") {
            closeFile(activeTab);
          }
          break;
        }

        // Cmd+O — open project folder
        case "o": {
          if (isInput) return;
          e.preventDefault();
          openProjectDialog();
          break;
        }

        // Cmd+P — quick open file
        case "p": {
          e.preventDefault();
          const { toggleQuickOpen } = useGameStore.getState();
          toggleQuickOpen();
          break;
        }

        // Cmd+N — new untitled file
        case "n": {
          if (isInput) return;
          e.preventDefault();
          const s = useGameStore.getState();
          const name = `untitled-${Date.now()}.txt`;
          const path = s.fileTreeRoot
            ? `${s.fileTreeRoot}/${name}`
            : `/tmp/${name}`;
          s.openFile({
            path,
            content: "",
            language: "plaintext",
            isDirty: true,
          });
          s.setActiveTab(path);
          break;
        }

        // Cmd+G — go to line
        case "g": {
          if (isInput) return;
          e.preventDefault();
          const s = useGameStore.getState();
          if (s.openFiles.some((f) => f.path === s.activeTab)) {
            s.toggleGoToLine();
          }
          break;
        }

        // Cmd+F — find in file (Monaco)
        case "f": {
          if (isInput) return;
          const s = useGameStore.getState();
          if (s.openFiles.some((f) => f.path === s.activeTab)) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("codemancer:editor-find"));
          }
          break;
        }

        // Cmd+H — find & replace in file (Monaco)
        case "h": {
          if (isInput) return;
          const s = useGameStore.getState();
          if (s.openFiles.some((f) => f.path === s.activeTab)) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("codemancer:editor-replace"));
          }
          break;
        }

        // Cmd+= / Cmd++ — zoom in
        case "=":
        case "+": {
          e.preventDefault();
          setZoom(getZoom() + ZOOM_STEP);
          break;
        }

        // Cmd+- — zoom out
        case "-": {
          e.preventDefault();
          setZoom(getZoom() - ZOOM_STEP);
          break;
        }

        // Cmd+0 — reset zoom
        case "0": {
          e.preventDefault();
          setZoom(1.0);
          break;
        }

        // Cmd+, — open settings
        case ",": {
          if (isInput) return;
          e.preventDefault();
          const { toggleSettings } = useGameStore.getState();
          toggleSettings();
          break;
        }

        // Cmd+B — toggle file explorer
        case "b": {
          if (isInput) return;
          e.preventDefault();
          const { toggleFileExplorer } = useGameStore.getState();
          toggleFileExplorer();
          break;
        }

        // Cmd+J — toggle git panel
        case "j": {
          if (isInput) return;
          e.preventDefault();
          const { toggleGitPanel } = useGameStore.getState();
          toggleGitPanel();
          break;
        }

        // Cmd+1..9 — switch tabs
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          e.preventDefault();
          const num = parseInt(e.key, 10);
          const { openFiles, setActiveTab: switchTab } =
            useGameStore.getState();
          if (num === 1) {
            switchTab("chat");
          } else if (num === 2) {
            switchTab("map");
          } else {
            const fileIndex = num - 3;
            if (fileIndex < openFiles.length) {
              switchTab(openFiles[fileIndex].path);
            }
          }
          break;
        }

        default:
          return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("codemancer:zoom", handleZoomEvent);
    };
  }, []);
}

async function openProjectDialog() {
  let path: string;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;
    path = selected as string;
  } catch {
    return; // Not in Tauri or user cancelled
  }

  const state = useGameStore.getState();

  // Update settings first (fast, always works)
  const newSettings = { ...state.settings, workspace_root: path };
  try {
    await api.updateSettings(newSettings);
  } catch {
    /* ignore */
  }
  state.setSettings(newSettings);
  state.setFileTreeRoot(path);

  // Scan project (may be slow for large repos)
  try {
    const scan = await api.scanProject(path);
    state.setProjectScan(scan);
  } catch {
    /* ignore */
  }

  // Load file tree
  try {
    const tree = await api.getFileTree(path);
    state.setFileTree(tree);
  } catch {
    /* ignore */
  }

  // Refresh agent status
  try {
    const agent = await api.getStatus();
    state.setAgent(agent);
  } catch {
    /* ignore */
  }
}
