import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, FileText, Loader2 } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";

interface SearchMatch {
  path: string;
  line: number;
  text: string;
}

function relativePath(fullPath: string, root: string): string {
  if (root && fullPath.startsWith(root)) {
    return fullPath.slice(root.length).replace(/^\//, "");
  }
  return fullPath;
}

export function SearchPanel() {
  const show = useGameStore((s) => s.showSearchPanel);
  const toggle = useGameStore((s) => s.toggleSearchPanel);
  const fileTreeRoot = useGameStore((s) => s.fileTreeRoot);
  const openFile = useGameStore((s) => s.openFile);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const api = useApi();
  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (show) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [show]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !fileTreeRoot) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const res = await api.searchFiles(fileTreeRoot, q);
        setResults(res.matches);
        setTruncated(res.truncated);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [api, fileTreeRoot]
  );

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch]
  );

  const handleOpenResult = useCallback(
    async (match: SearchMatch) => {
      try {
        const { content, language } = await api.readFile(match.path);
        openFile({ path: match.path, content, language, isDirty: false });
        setActiveTab(match.path);
      } catch {
        // ignore
      }
    },
    [api, openFile, setActiveTab]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Enter") {
        e.preventDefault();
        doSearch(query);
      }
    },
    [toggle, doSearch, query]
  );

  // Group results by file
  const grouped = results.reduce<Record<string, SearchMatch[]>>((acc, m) => {
    const key = m.path;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="h-full shrink-0 overflow-hidden border-r border-[var(--theme-glass-border)]"
        >
          <div className="w-[320px] h-full flex flex-col bg-theme-bg-deep/50">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-theme-accent/10">
              <span className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-theme-text-dim">
                {t("search.title")}
              </span>
              <button
                onClick={toggle}
                className="text-theme-text-dim hover:text-theme-text transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-theme-accent/10">
              <Search className="w-3.5 h-3.5 text-theme-text-dim shrink-0" strokeWidth={1.5} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("search.placeholder")}
                className="flex-1 bg-transparent text-xs font-mono text-theme-text placeholder:text-theme-text-dim/50 outline-none"
              />
              {loading && (
                <Loader2 className="w-3.5 h-3.5 text-theme-accent animate-spin shrink-0" strokeWidth={1.5} />
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {!searched ? (
                <div className="px-3 py-6 text-center text-[10px] text-theme-text-dim font-mono">
                  {t("search.hint")}
                </div>
              ) : results.length === 0 && !loading ? (
                <div className="px-3 py-6 text-center text-[10px] text-theme-text-dim font-mono">
                  {t("search.noResults")}
                </div>
              ) : (
                <>
                  {Object.entries(grouped).map(([filePath, matches]) => (
                    <div key={filePath} className="border-b border-theme-accent/5">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-bg-deep/30">
                        <FileText className="w-3 h-3 text-theme-accent/60 shrink-0" strokeWidth={1.5} />
                        <span className="text-[10px] font-mono text-theme-accent/80 truncate">
                          {relativePath(filePath, fileTreeRoot)}
                        </span>
                        <span className="text-[9px] text-theme-text-dim ml-auto shrink-0">
                          {matches.length}
                        </span>
                      </div>
                      {matches.map((m, i) => (
                        <button
                          key={`${m.path}:${m.line}:${i}`}
                          onClick={() => handleOpenResult(m)}
                          className="w-full flex items-start gap-2 px-3 py-1 text-left hover:bg-theme-accent/5 transition-colors"
                        >
                          <span className="text-[10px] font-mono text-theme-text-dim shrink-0 w-8 text-right">
                            {m.line}
                          </span>
                          <span className="text-[11px] font-mono text-theme-text-dim truncate">
                            {m.text.trim()}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {truncated && (
                    <div className="px-3 py-2 text-center text-[10px] text-theme-accent/60 font-mono">
                      {t("search.truncated")}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
