import { createContext, useContext, useRef, type MutableRefObject } from "react";
import type { editor } from "monaco-editor";

type EditorRef = MutableRefObject<editor.IStandaloneCodeEditor | null>;

const EditorRefContext = createContext<EditorRef | null>(null);

export function EditorRefProvider({ children }: { children: React.ReactNode }) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  return (
    <EditorRefContext.Provider value={editorRef}>
      {children}
    </EditorRefContext.Provider>
  );
}

export function useEditorRef(): EditorRef {
  const ctx = useContext(EditorRefContext);
  if (!ctx) throw new Error("useEditorRef must be used within EditorRefProvider");
  return ctx;
}
