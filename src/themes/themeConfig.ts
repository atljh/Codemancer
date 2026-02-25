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
    accentRgb: "88,166,255",
    accentHue: 212,
    previewBg: "#0d1117",
    previewAccent: "#58a6ff",
    previewSurface: "#161b22",
    monacoBase: "vs-dark",
    monaco: {
      bg: "#0d1117",
      surface: "#0d1117",
      border: "#21262d",
      text: "#8b949e",
      textDim: "#484f58",
      accent: "#58a6ff",
      lineHighlight: "#161b22",
      selection: "#58a6ff20",
      lineNumber: "#30363d",
      lineNumberActive: "#8b949e",
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
      border: "#151d2c",
      text: "#7a8a9e",
      textDim: "#3e4e62",
      accent: "#4d9fff",
      lineHighlight: "#0f1520",
      selection: "#4d9fff20",
      lineNumber: "#2a3848",
      lineNumberActive: "#7a8a9e",
    },
  },
  phantom: {
    id: "phantom",
    label: "PHANTOM",
    accentRgb: "224,152,0",
    accentHue: 40,
    previewBg: "#0f0d0a",
    previewAccent: "#e09800",
    previewSurface: "#1c1915",
    monacoBase: "vs-dark",
    monaco: {
      bg: "#0f0d0a",
      surface: "#141210",
      border: "#222018",
      text: "#9e9080",
      textDim: "#5e5448",
      accent: "#e09800",
      lineHighlight: "#1c1915",
      selection: "#e0980020",
      lineNumber: "#3e3830",
      lineNumberActive: "#9e9080",
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
      text: "#4a5e72",
      textDim: "#6a7e92",
      accent: "#0077b6",
      lineHighlight: "#e0e8f0",
      selection: "#0077b620",
      lineNumber: "#8a9bb0",
      lineNumberActive: "#4a5e72",
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
      border: "#0d240d",
      text: "#2a8a3a",
      textDim: "#1a5a2a",
      accent: "#00ff41",
      lineHighlight: "#0a1a0a",
      selection: "#00ff4120",
      lineNumber: "#0d3a18",
      lineNumberActive: "#2a8a3a",
    },
  },
};

export const themeIds = Object.keys(themes) as ThemeId[];
