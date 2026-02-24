import { useEffect } from "react";
import { useGameStore } from "../stores/gameStore";

const ZOOM_KEY = "codemancer-zoom";
const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;

function getZoom(): number {
  const stored = localStorage.getItem(ZOOM_KEY);
  return stored ? parseFloat(stored) : 1.0;
}

function setZoom(level: number) {
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(level * 100) / 100));
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

export function useKeyboardShortcuts() {
  useEffect(() => {
    initZoom();

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Ignore if user is typing in an input/textarea (except for zoom, tab switches, and palette shortcuts)
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA";

      // Cmd+Shift+F — global search (works even from inputs)
      if (e.shiftKey && e.key === "f") {
        e.preventDefault();
        const { toggleSearchPanel } = useGameStore.getState();
        toggleSearchPanel();
        return;
      }

      switch (e.key) {
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
          const { openFiles, setActiveTab: switchTab } = useGameStore.getState();
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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

async function openProjectDialog() {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;

    const path = selected as string;
    const API_BASE = "http://127.0.0.1:8420";

    // Scan the project
    const scanRes = await fetch(`${API_BASE}/api/project/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, award_exp: true }),
    });
    if (!scanRes.ok) return;
    const scan = await scanRes.json();

    // Update settings on backend
    const state = useGameStore.getState();
    const newSettings = { ...state.settings, workspace_root: path };
    await fetch(`${API_BASE}/api/settings/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });

    // Update store
    state.setSettings(newSettings);
    state.setFileTreeRoot(path);
    state.setProjectScan(scan);

    // Reload file tree
    const treeRes = await fetch(`${API_BASE}/api/files/tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: path, max_depth: 5 }),
    });
    if (treeRes.ok) {
      const tree = await treeRes.json();
      state.setFileTree(tree);
    }

    // Refresh player state (for exp gained)
    const playerRes = await fetch(`${API_BASE}/api/game/status`);
    if (playerRes.ok) {
      const player = await playerRes.json();
      state.setPlayer(player);
    }
  } catch {
    // Not in Tauri environment or user cancelled
  }
}
