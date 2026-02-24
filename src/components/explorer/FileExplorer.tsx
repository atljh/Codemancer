import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import type { FileTreeNode } from "../../types/game";

const CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "c", "cpp", "h",
  "css", "scss", "html", "json", "yaml", "yml", "toml", "md", "sh",
]);

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return CODE_EXTENSIONS.has(ext) ? FileCode : FileText;
}

export function FileExplorer() {
  const api = useApi();
  const { t } = useTranslation();
  const fileTree = useGameStore((s) => s.fileTree);
  const setFileTree = useGameStore((s) => s.setFileTree);
  const workspaceRoot = useGameStore((s) => s.settings.workspace_root);
  const openFile = useGameStore((s) => s.openFile);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  const [loading, setLoading] = useState(false);

  const loadTree = useCallback(async () => {
    if (!workspaceRoot) return;
    setLoading(true);
    try {
      const tree = await api.getFileTree(workspaceRoot);
      setFileTree(tree);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [workspaceRoot, api, setFileTree]);

  useEffect(() => {
    if (workspaceRoot && fileTree.length === 0) {
      loadTree();
    }
  }, [workspaceRoot, fileTree.length, loadTree]);

  const handleFileClick = async (node: FileTreeNode) => {
    if (node.is_dir) return;
    try {
      const { content, language } = await api.readFile(node.path);
      openFile({ path: node.path, content, language, isDirty: false });
      setActiveTab(node.path);
    } catch {
      // ignore
    }
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 240, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full shrink-0 overflow-hidden border-r border-[var(--theme-glass-border)]"
    >
      <div className="w-60 h-full flex flex-col glass-panel">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--theme-glass-border)]">
          <span className="text-xs font-bold text-theme-text tracking-wide uppercase flex-1">
            {t("explorer.title")}
          </span>
          <button
            onClick={loadTree}
            className="p-1 rounded hover:bg-theme-accent/8 text-theme-text-dim hover:text-theme-accent transition-colors"
            title={t("explorer.refresh")}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {!workspaceRoot && (
            <div className="px-3 py-4 text-xs text-theme-text-dimmer text-center font-mono">
              {t("explorer.empty")}
            </div>
          )}
          {workspaceRoot && fileTree.length === 0 && !loading && (
            <div className="px-3 py-4 text-xs text-theme-text-dimmer text-center font-mono">
              {t("explorer.empty")}
            </div>
          )}
          {fileTree.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} onFileClick={handleFileClick} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TreeNode({
  node,
  depth,
  onFileClick,
}: {
  node: FileTreeNode;
  depth: number;
  onFileClick: (node: FileTreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const currentFile = useGameStore((s) => s.currentFile);
  const isActive = !node.is_dir && currentFile?.path === node.path;

  if (node.is_dir) {
    const FolderIcon = expanded ? FolderOpen : Folder;
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1 py-0.5 hover:bg-white/4 transition-colors text-xs"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-theme-text-dimmer shrink-0" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="w-3 h-3 text-theme-text-dimmer shrink-0" strokeWidth={1.5} />
          )}
          <FolderIcon className="w-3.5 h-3.5 text-theme-accent/70 shrink-0" strokeWidth={1.5} />
          <span className="text-theme-text-dim truncate">{node.name}</span>
        </button>
        {expanded && node.children.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} onFileClick={onFileClick} />
        ))}
      </div>
    );
  }

  const Icon = getFileIcon(node.name);
  return (
    <button
      onClick={() => onFileClick(node)}
      className={`w-full flex items-center gap-1 py-0.5 transition-colors text-xs ${
        isActive
          ? "bg-theme-accent/10 text-theme-accent"
          : "hover:bg-white/4 text-theme-text-dim"
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 opacity-60" strokeWidth={1.5} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
