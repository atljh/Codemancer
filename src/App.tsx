import { useEffect, useRef } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { useGameStore } from "./stores/gameStore";
import { useApi } from "./hooks/useApi";
import { useThemeEffect } from "./hooks/useThemeEffect";
import translations from "./i18n/translations";

function App() {
  const setPlayer = useGameStore((s) => s.setPlayer);
  const addMessage = useGameStore((s) => s.addMessage);
  const setSettings = useGameStore((s) => s.setSettings);
  const setFileTreeRoot = useGameStore((s) => s.setFileTreeRoot);
  const setProjectScan = useGameStore((s) => s.setProjectScan);
  const setAppReady = useGameStore((s) => s.setAppReady);
  const sessionStartTime = useGameStore((s) => s.sessionStartTime);
  const theme = useGameStore((s) => s.settings.theme);
  const api = useApi();

  useThemeEffect(theme);
  const timersRef = useRef<{ hp?: ReturnType<typeof setInterval>; mp?: ReturnType<typeof setInterval> }>({});
  const initRef = useRef(false);

  // Initialize
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      let locale: "en" | "ru" = "en";

      try {
        const settings = await api.getSettings();
        setSettings(settings);
        locale = settings.locale as "en" | "ru" || "en";
        if (settings.workspace_root) {
          setFileTreeRoot(settings.workspace_root);

          try {
            const scan = await api.scanProject(settings.workspace_root, false);
            setProjectScan(scan);
          } catch {
            // scan not critical
          }
        }
      } catch {
        // settings not critical
      }

      try {
        const player = await api.getStatus();
        setPlayer(player);

        const ws = useGameStore.getState().settings.workspace_root;
        if (ws) {
          const msg = translations[locale]["welcome.back"]
            .replace("{name}", player.name)
            .replace("{level}", String(player.level));
          addMessage({ role: "system", content: msg });
        }
      } catch {
        // player load failed
      }

      setAppReady(true);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // HP drain after 2 hours
  useEffect(() => {
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    timersRef.current.hp = setInterval(() => {
      const elapsed = Date.now() - sessionStartTime;
      if (elapsed > TWO_HOURS) {
        const store = useGameStore.getState();
        if (store.player.hp > 1) {
          setPlayer({ ...store.player, hp: store.player.hp - 1 });
        }
      }
    }, 60_000);

    return () => clearInterval(timersRef.current.hp);
  }, [sessionStartTime, setPlayer]);

  // MP regen every 30 seconds of idle
  useEffect(() => {
    timersRef.current.mp = setInterval(() => {
      const store = useGameStore.getState();
      if (store.player.mp < store.player.max_mp) {
        setPlayer({ ...store.player, mp: store.player.mp + 1 });
      }
    }, 30_000);

    return () => clearInterval(timersRef.current.mp);
  }, [setPlayer]);

  return <AppLayout />;
}

export default App;
