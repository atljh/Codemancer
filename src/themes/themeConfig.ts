export type ThemeId = "dark-ops" | "midnight" | "phantom" | "arctic";

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  accentRgb: string;
  accentHue: number;
  previewBg: string;
  previewAccent: string;
  previewSurface: string;
  monacoTheme: "vs-dark" | "vs";
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
    monacoTheme: "vs-dark",
  },
  midnight: {
    id: "midnight",
    label: "MIDNIGHT",
    accentRgb: "77,159,255",
    accentHue: 216,
    previewBg: "#050608",
    previewAccent: "#4d9fff",
    previewSurface: "#0f1520",
    monacoTheme: "vs-dark",
  },
  phantom: {
    id: "phantom",
    label: "PHANTOM",
    accentRgb: "255,170,0",
    accentHue: 40,
    previewBg: "#0f0d0a",
    previewAccent: "#ffaa00",
    previewSurface: "#1e1a15",
    monacoTheme: "vs-dark",
  },
  arctic: {
    id: "arctic",
    label: "ARCTIC",
    accentRgb: "0,119,182",
    accentHue: 201,
    previewBg: "#f0f4f8",
    previewAccent: "#0077b6",
    previewSurface: "#ffffff",
    monacoTheme: "vs",
  },
};

export const themeIds = Object.keys(themes) as ThemeId[];
