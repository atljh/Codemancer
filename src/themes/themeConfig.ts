export type ThemeId = "dark-ops" | "midnight" | "phantom" | "arctic" | "hacker";

export interface MonacoColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  lineHighlight: string;
  selection: string;
  lineNumber: string;
  lineNumberActive: string;
}

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  accentRgb: string;
  accentHue: number;
  previewBg: string;
  previewAccent: string;
  previewSurface: string;
  monacoBase: "vs-dark" | "vs";
  monaco: MonacoColors;
}

export const themes: Record<ThemeId, ThemeConfig> = {
  "dark-ops": {
    id: "dark-ops",
    label: "DARK OPS",
    accentRgb: "0,212,255",
    accentHue: 190,
    previewBg: "#0a0c10",
    previewAccent: "#00d4ff",
    previewSurface: "#111820",
    monacoBase: "vs-dark",
    monaco: {
      bg: "#0a0c10",
      surface: "#0d1117",
      border: "#1a2535",
      text: "#c8d6e5",
      textDim: "#5a6b7f",
      accent: "#00d4ff",
      lineHighlight: "#111820",
      selection: "#00d4ff20",
      lineNumber: "#3a4a5f",
      lineNumberActive: "#c8d6e5",
    },
  },
  midnight: {
    id: "midnight",
    label: "MIDNIGHT",
    accentRgb: "77,159,255",
    accentHue: 216,
    previewBg: "#050608",
    previewAccent: "#4d9fff",
    previewSurface: "#0f1520",
    monacoBase: "vs-dark",
    monaco: {
      bg: "#050608",
      surface: "#0a0e14",
      border: "#152030",
      text: "#b8c8dc",
      textDim: "#4a5e78",
      accent: "#4d9fff",
      lineHighlight: "#0f1520",
      selection: "#4d9fff20",
      lineNumber: "#2e3e54",
      lineNumberActive: "#b8c8dc",
    },
  },
  phantom: {
    id: "phantom",
    label: "PHANTOM",
    accentRgb: "255,170,0",
    accentHue: 40,
    previewBg: "#0f0d0a",
    previewAccent: "#ffaa00",
    previewSurface: "#1e1a15",
    monacoBase: "vs-dark",
    monaco: {
      bg: "#0f0d0a",
      surface: "#161310",
      border: "#2a2418",
      text: "#d4c8b0",
      textDim: "#7a6e5a",
      accent: "#ffaa00",
      lineHighlight: "#1e1a15",
      selection: "#ffaa0020",
      lineNumber: "#4a4235",
      lineNumberActive: "#d4c8b0",
    },
  },
  arctic: {
    id: "arctic",
    label: "ARCTIC",
    accentRgb: "0,119,182",
    accentHue: 201,
    previewBg: "#f0f4f8",
    previewAccent: "#0077b6",
    previewSurface: "#ffffff",
    monacoBase: "vs",
    monaco: {
      bg: "#f0f4f8",
      surface: "#e8edf3",
      border: "#cfd8e3",
      text: "#1a2a3a",
      textDim: "#5a6e82",
      accent: "#0077b6",
      lineHighlight: "#e0e8f0",
      selection: "#0077b620",
      lineNumber: "#8a9bb0",
      lineNumberActive: "#1a2a3a",
    },
  },
  hacker: {
    id: "hacker",
    label: "HACKER",
    accentRgb: "0,255,65",
    accentHue: 135,
    previewBg: "#020a02",
    previewAccent: "#00ff41",
    previewSurface: "#0a1a0a",
    monacoBase: "vs-dark",
    monaco: {
      bg: "#020a02",
      surface: "#061208",
      border: "#0a3a0a",
      text: "#33ff66",
      textDim: "#1a8a2e",
      accent: "#00ff41",
      lineHighlight: "#0a1a0a",
      selection: "#00ff4120",
      lineNumber: "#1a5a2a",
      lineNumberActive: "#33ff66",
    },
  },
};

export const themeIds = Object.keys(themes) as ThemeId[];
