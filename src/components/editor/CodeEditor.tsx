import { useCallback, useEffect } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useEditorRef } from "../../hooks/useEditorRef";
import { useTranslation } from "../../hooks/useTranslation";
import {
  registerMonacoThemes,
  getMonacoThemeName,
} from "../../themes/monacoThemes";
import type { ThemeId } from "../../types/game";

export function CodeEditor() {
  const api = useApi();
  const { t } = useTranslation();
  const editorRef = useEditorRef();
  const activeTab = useGameStore((s) => s.activeTab);
  const openFiles = useGameStore((s) => s.openFiles);
  const updateFileContent = useGameStore((s) => s.updateFileContent);
  const markFileSaved = useGameStore((s) => s.markFileSaved);
  const addActionLog = useGameStore((s) => s.addActionLog);
  const themeId = useGameStore((s) => s.settings.theme) as ThemeId;
  const fontSize = useGameStore((s) => s.settings.font_size);

  const file = openFiles.find((f) => f.path === activeTab) ?? null;

  const handleSave = useCallback(async () => {
    if (!file) return;
    try {
      await api.writeFile(file.path, file.content);
      markFileSaved(file.path);
      try { await api.trackFile(file.path); } catch { /* non-critical */ }
      addActionLog({
        action: t("editor.savedSuccess"),
        status: "done",
      });
    } catch {
      addActionLog({ action: "Save failed", status: "error" });
    }
  }, [file, api, markFileSaved, addActionLog, t]);

  // Ctrl+S keybinding
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // Custom events: find & replace in Monaco
  useEffect(() => {
    const onFind = () => {
      editorRef.current?.getAction("actions.find")?.run();
    };
    const onReplace = () => {
      editorRef.current
        ?.getAction("editor.action.startFindReplaceAction")
        ?.run();
    };
    window.addEventListener("codemancer:editor-find", onFind);
    window.addEventListener("codemancer:editor-replace", onReplace);
    return () => {
      window.removeEventListener("codemancer:editor-find", onFind);
      window.removeEventListener("codemancer:editor-replace", onReplace);
    };
  }, [editorRef]);

  const handleBeforeMount: BeforeMount = (monaco) => {
    registerMonacoThemes(monaco);
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleChange = (value: string | undefined) => {
    if (file && value !== undefined) {
      updateFileContent(file.path, value);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-theme-text-dimmer font-mono">
        {t("editor.selectFile")}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <Editor
        height="100%"
        language={file.language}
        value={file.content}
        theme={getMonacoThemeName(themeId)}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        options={{
          fontSize,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          lineNumbers: "on",
          renderLineHighlight: "line",
          padding: { top: 8 },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
      />
    </div>
  );
}
