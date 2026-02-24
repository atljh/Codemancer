import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, File } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import type { FileTreeNode } from "../../types/game";

function flattenTree(nodes: FileTreeNode[]): FileTreeNode[] {
  const result: FileTreeNode[] = [];
  for (const node of nodes) {
    if (!node.is_dir) {
      result.push(node);
    }
    if (node.children) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function relativePath(fullPath: string, root: string): string {
  if (root && fullPath.startsWith(root)) {
    return fullPath.slice(root.length).replace(/^\//, "");
  }
  return fullPath;
}

export function QuickOpenModal() {
  const show = useGameStore((s) => s.showQuickOpen);
  const toggle = useGameStore((s) => s.toggleQuickOpen);
  const fileTree = useGameStore((s) => s.fileTree);
  const fileTreeRoot = useGameStore((s) => s.fileTreeRoot);
  const openFile = useGameStore((s) => s.openFile);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const api = useApi();
  const { t } = useTranslation();

  const workspaceRoot = useGameStore((s) => s.settings.workspace_root);
  const setFileTree = useGameStore((s) => s.setFileTree);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allFiles = useMemo(() => flattenTree(fileTree), [fileTree]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 50);
    return allFiles
      .filter((f) => fuzzyMatch(query, f.name) || fuzzyMatch(query, f.path))
      .slice(0, 50);
  }, [query, allFiles]);

  useEffect(() => {
    if (show) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Load file tree if not yet loaded
      if (fileTree.length === 0 && workspaceRoot) {
        api
          .getFileTree(workspaceRoot)
          .then((tree) => setFileTree(tree))
          .catch(() => {});
      }
    }
  }, [show, fileTree.length, workspaceRoot, api, setFileTree]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleOpen = useCallback(
    async (node: FileTreeNode) => {
      toggle();
      try {
        const { content, language } = await api.readFile(node.path);
        openFile({ path: node.path, content, language, isDirty: false });
        setActiveTab(node.path);
      } catch {
        // ignore
      }
    },
    [api, openFile, setActiveTab, toggle],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) handleOpen(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        toggle();
      }
    },
    [filtered, selectedIndex, handleOpen, toggle],
  );

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
          onClick={toggle}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[520px] max-h-[60vh] rounded-lg glass-panel-bright border border-theme-accent/15 shadow-[0_0_40px_rgba(var(--theme-accent-rgb),0.1)] overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-accent/10">
              <Search
                className="w-4 h-4 text-theme-text-dim shrink-0"
                strokeWidth={1.5}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("quickOpen.placeholder")}
                className="flex-1 bg-transparent text-sm font-mono text-theme-text placeholder:text-theme-text-dim/50 outline-none"
              />
              <kbd className="text-[10px] text-theme-text-dim font-mono px-1.5 py-0.5 rounded bg-theme-bg-deep/60 border border-theme-accent/10">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="overflow-y-auto max-h-[calc(60vh-52px)] scrollbar-thin"
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-theme-text-dim font-mono">
                  {t("quickOpen.noResults")}
                </div>
              ) : (
                filtered.map((node, i) => (
                  <button
                    key={node.path}
                    onClick={() => handleOpen(node)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      i === selectedIndex
                        ? "bg-theme-accent/15 text-theme-text"
                        : "text-theme-text-dim hover:bg-theme-accent/5"
                    }`}
                  >
                    <File
                      className="w-3.5 h-3.5 shrink-0 opacity-50"
                      strokeWidth={1.5}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-mono truncate block">
                        {node.name}
                      </span>
                      <span className="text-[10px] text-theme-text-dim/60 font-mono truncate block">
                        {relativePath(node.path, fileTreeRoot)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
