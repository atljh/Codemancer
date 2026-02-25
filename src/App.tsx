import { useEffect, useRef } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { useGameStore } from "./stores/gameStore";
import { useApi } from "./hooks/useApi";
import { useThemeEffect } from "./hooks/useThemeEffect";
import translations from "./i18n/translations";

function App() {
  const setAgent = useGameStore((s) => s.setAgent);
  const addMessage = useGameStore((s) => s.addMessage);
  const setSettings = useGameStore((s) => s.setSettings);
  const setFileTreeRoot = useGameStore((s) => s.setFileTreeRoot);
  const setProjectScan = useGameStore((s) => s.setProjectScan);
  const setAppReady = useGameStore((s) => s.setAppReady);
  const setConversations = useGameStore((s) => s.setConversations);
  const setCurrentConversationId = useGameStore(
    (s) => s.setCurrentConversationId,
  );
  const setMessages = useGameStore((s) => s.setMessages);
  const setFocusStatus = useGameStore((s) => s.setFocusStatus);
  const theme = useGameStore((s) => s.settings.theme);
  const api = useApi();

  useThemeEffect(theme);
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
        locale = (settings.locale as "en" | "ru") || "en";
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
        const agentData = await api.getStatus();
        setAgent(agentData);
      } catch {
        // agent load failed
      }

      // Load conversations and restore last one
      let restoredConversation = false;
      try {
        const convList = await api.getConversations();
        setConversations(convList);
        if (convList.length > 0) {
          const last = convList[0]; // sorted by updated_at desc
          const conv = await api.getConversation(last.id);
          if (conv.messages.length > 0) {
            setMessages(conv.messages);
            setCurrentConversationId(last.id);
            restoredConversation = true;
          }
        }
      } catch {
        // conversations not critical
      }

      // Restore focus timer
      try {
        const focus = await api.focusStatus();
        if (focus.active) setFocusStatus(focus);
      } catch {
        // not critical
      }

      // Show welcome message only for fresh sessions (no restored conversation)
      if (!restoredConversation) {
        const ws = useGameStore.getState().settings.workspace_root;
        const a = useGameStore.getState().agent;
        if (ws) {
          const msg = translations[locale]["welcome.back"]
            .replace("{name}", a.name)
            .replace("{integrity}", String(a.integrity_score));
          addMessage({ role: "system", content: msg });
        }
      }

      setAppReady(true);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic status refresh (every 5 min)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        setAgent(await api.getStatus());
      } catch {
        // ignore
      }
    }, 300_000);
    return () => clearInterval(interval);
  }, [api, setAgent]);

  return <AppLayout />;
}

export default App;
