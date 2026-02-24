import type * as Monaco from "monaco-editor";
import { themes, type ThemeId } from "./themeConfig";

let registered = false;

export function getMonacoThemeName(themeId: ThemeId): string {
  return `codemancer-${themeId}`;
}

export function registerMonacoThemes(monaco: typeof Monaco) {
  if (registered) return;
  registered = true;

  for (const [id, cfg] of Object.entries(themes)) {
    const m = cfg.monaco;
    monaco.editor.defineTheme(getMonacoThemeName(id as ThemeId), {
      base: cfg.monacoBase,
      inherit: true,
      rules: [],
      colors: {
        "editor.background": m.bg,
        "editor.foreground": m.text,
        "editor.lineHighlightBackground": m.lineHighlight,
        "editor.selectionBackground": m.selection,
        "editorLineNumber.foreground": m.lineNumber,
        "editorLineNumber.activeForeground": m.lineNumberActive,
        "editorGutter.background": m.bg,
        "editorWidget.background": m.surface,
        "editorWidget.border": m.border,
        "input.background": m.surface,
        "input.border": m.border,
        "input.foreground": m.text,
        "editor.inactiveSelectionBackground": m.selection,
        "editorIndentGuide.background": m.border,
        "editorIndentGuide.activeBackground": m.textDim,
        "editorCursor.foreground": m.accent,
        "scrollbarSlider.background": m.border + "80",
        "scrollbarSlider.hoverBackground": m.border + "cc",
        "scrollbarSlider.activeBackground": m.accent + "40",
        "editorOverviewRuler.border": "#00000000",
        "minimap.background": m.bg,
      },
    });
  }
}
