import { useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { ActionCard } from "./ActionCard";
import { ActionLogLine } from "./ActionLogLine";
import { CommandInput } from "./CommandInput";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import { shortenPath } from "../../utils/paths";

export function OmniChat() {
  const messages = useGameStore((s) => s.messages);
  const addMessage = useGameStore((s) => s.addMessage);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const triggerLevelUp = useGameStore((s) => s.triggerLevelUp);
  const player = useGameStore((s) => s.player);
  const settings = useGameStore((s) => s.settings);
  const projectScan = useGameStore((s) => s.projectScan);
  const isAiResponding = useGameStore((s) => s.isAiResponding);
  const setAiResponding = useGameStore((s) => s.setAiResponding);
  const updateLastMessage = useGameStore((s) => s.updateLastMessage);
  const showDiffViewer = useGameStore((s) => s.showDiffViewer);
  const scrollRef = useRef<HTMLDivElement>(null);
  const api = useApi();
  const { t } = useTranslation();

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSlashCommand = useCallback(
    (text: string): boolean => {
      const cmd = text.trim().toLowerCase();

      if (cmd === "/status") {
        let info = `**${player.name}** | Lv.${player.level} | EXP: ${player.total_exp}\nHP: ${player.hp}/${player.max_hp} | MP: ${player.mp}/${player.max_mp}`;
        if (projectScan) {
          info += `\n\nProject: ${shortenPath(projectScan.path)}\nFiles: ${projectScan.total_files} | Dirs: ${projectScan.total_dirs}`;
        } else {
          info += `\n\n${t("project.noProject")}`;
        }
        addMessage({ role: "system", content: info });
        return true;
      }

      if (cmd === "/ls") {
        if (!projectScan) {
          addMessage({ role: "system", content: t("slash.noProject") });
          return true;
        }
        const keys = projectScan.key_files.length > 0
          ? projectScan.key_files.map((f) => `- ${f}`).join("\n")
          : "No key files found";
        const topTypes = Object.entries(projectScan.file_types)
          .slice(0, 8)
          .map(([ext, count]) => `${ext}: ${count}`)
          .join(", ");
        addMessage({
          role: "system",
          content: `**Key files:**\n${keys}\n\n**Top extensions:** ${topTypes}`,
        });
        return true;
      }

      // Unknown slash command
      addMessage({ role: "system", content: t("slash.unknown") });
      return true;
    },
    [addMessage, player, projectScan, t]
  );

  const handleSend = useCallback(
    async (text: string) => {
      // Slash commands
      if (text.startsWith("/")) {
        handleSlashCommand(text);
        return;
      }

      if (player.mp < 5) {
        addMessage({ role: "system", content: t("chat.noMp") });
        return;
      }

      addMessage({ role: "user", content: text });

      try {
        const result = await api.performAction("message");
        setPlayer(result.player);

        if (result.leveled_up && result.new_level !== null) {
          triggerLevelUp(result.new_level);
        }
      } catch {
        // EXP/MP update failed
      }

      // Check for authentication based on provider
      const hasAuth = (() => {
        switch (settings.ai_provider) {
          case "openai":
            return (settings.openai_api_key ?? "").length > 0;
          case "gemini":
            return (settings.gemini_api_key ?? "").length > 0;
          case "custom":
            return (settings.custom_base_url ?? "").length > 0;
          default: // anthropic
            return settings.auth_method === "oauth"
              ? (settings.oauth_access_token ?? "").length > 0
              : (settings.anthropic_api_key ?? "").length > 0;
        }
      })();
      if (!hasAuth) {
        addMessage({ role: "system", content: t("ai.noApiKey") });
        return;
      }

      setAiResponding(true);

      const conversationMessages = useGameStore.getState().messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      let projectContext = "";
      if (projectScan) {
        const topTypes = Object.entries(projectScan.file_types)
          .slice(0, 10)
          .map(([ext, count]) => `${ext}(${count})`)
          .join(", ");
        projectContext = `Project: ${projectScan.path}\nFiles: ${projectScan.total_files}, Dirs: ${projectScan.total_dirs}\nKey files: ${projectScan.key_files.join(", ")}\nTop types: ${topTypes}`;
      }

      try {
        addMessage({ role: "assistant", content: "" });

        const response = await api.chatStream(conversationMessages, projectContext);

        if (!response.ok) {
          const err = await response.text();
          updateLastMessage(t("ai.streamError") + `: ${err}`);
          setAiResponding(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          updateLastMessage(t("ai.streamError"));
          setAiResponding(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.text) {
                accumulated += data.text;
                updateLastMessage(accumulated);
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        updateLastMessage(t("ai.streamError"));
      }

      setAiResponding(false);
    },
    [addMessage, api, setPlayer, triggerLevelUp, player.mp, settings.ai_provider, settings.anthropic_api_key, settings.auth_method, settings.oauth_access_token, settings.openai_api_key, settings.gemini_api_key, settings.custom_base_url, projectScan, handleSlashCommand, setAiResponding, updateLastMessage, t]
  );

  const handleApplyCode = useCallback(
    (code: string) => {
      showDiffViewer(
        "untitled",
        t("diff.codeBlock"),
        "",
        code
      );
    },
    [showDiffViewer, t]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-theme-accent/20 text-xs font-mono tracking-[0.3em] uppercase">
              {t("chat.emptyState")}
            </span>
            <span className="w-2 h-4 bg-theme-accent/30 animate-cursor-blink" />
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => {
            if (msg.type === "action_card" && msg.actionCard) {
              return <ActionCard key={msg.id} card={msg.actionCard} />;
            }
            if (msg.type === "action_log" && msg.actionLog) {
              return <ActionLogLine key={msg.id} log={msg.actionLog} />;
            }
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                onApplyCode={handleApplyCode}
              />
            );
          })}
        </AnimatePresence>
        {isAiResponding && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              <span className="w-1 h-3 bg-theme-accent/60 rounded-sm animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-3 bg-theme-accent/60 rounded-sm animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-3 bg-theme-accent/60 rounded-sm animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[10px] text-theme-text-dim font-mono tracking-wider uppercase">
              {t("ai.thinking")}
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <CommandInput onSend={handleSend} />
    </div>
  );
}
