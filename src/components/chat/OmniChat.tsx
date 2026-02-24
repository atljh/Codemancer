import { useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { ActionCard } from "./ActionCard";
import { ActionLogLine } from "./ActionLogLine";
import { HealthAlertBubble } from "./HealthAlertBubble";
import { RecallBubble } from "./RecallBubble";
import { BlastRadiusBubble } from "./BlastRadiusBubble";
import { CommandInput } from "./CommandInput";
import { ConversationDrawer } from "./ConversationDrawer";
import { useGameStore } from "../../stores/gameStore";
import { useApi } from "../../hooks/useApi";
import { useTranslation } from "../../hooks/useTranslation";
import { shortenPath } from "../../utils/paths";

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  list_files: "Scanning sector",
  read_file: "Extracting data",
  write_file: "Deploying patch",
  search_text: "Signal sweep",
  run_command: "Executing command",
};

function getToolDisplayName(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

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
  const updateMessageById = useGameStore((s) => s.updateMessageById);
  const addActionLog = useGameStore((s) => s.addActionLog);
  const addActionCard = useGameStore((s) => s.addActionCard);
  const addBytesProcessed = useGameStore((s) => s.addBytesProcessed);
  const showDiffViewer = useGameStore((s) => s.showDiffViewer);
  const currentConversationId = useGameStore((s) => s.currentConversationId);
  const setCurrentConversationId = useGameStore((s) => s.setCurrentConversationId);
  const setConversations = useGameStore((s) => s.setConversations);
  const setMessages = useGameStore((s) => s.setMessages);
  const clearMessages = useGameStore((s) => s.clearMessages);
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

  // Save current messages to backend
  const saveCurrentMessages = useCallback(
    async (convId?: string | null) => {
      const id = convId ?? currentConversationId;
      if (!id) return;
      const msgs = useGameStore.getState().messages.filter(
        (m) => m.type !== "action_log" && !["health_alert", "recall", "blast_radius", "command_result"].includes(m.type!)
      );
      try {
        const meta = await api.saveMessages(id, msgs);
        // Update conversation in list
        setConversations(
          useGameStore.getState().conversations.map((c) =>
            c.id === meta.id ? meta : c
          )
        );
      } catch {
        // save failed silently
      }
    },
    [api, currentConversationId, setConversations]
  );

  // Ensure conversation exists, create if needed. Returns conversation id.
  const ensureConversation = useCallback(async (): Promise<string> => {
    const id = useGameStore.getState().currentConversationId;
    if (id) return id;
    const meta = await api.createConversation();
    setCurrentConversationId(meta.id);
    setConversations([meta, ...useGameStore.getState().conversations]);
    return meta.id;
  }, [api, setCurrentConversationId, setConversations]);

  // Conversation drawer handlers
  const handleNewMission = useCallback(async () => {
    await saveCurrentMessages();
    clearMessages();
  }, [saveCurrentMessages, clearMessages]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      await saveCurrentMessages();
      try {
        const conv = await api.getConversation(id);
        setMessages(conv.messages);
        setCurrentConversationId(id);
      } catch {
        // load failed
      }
    },
    [api, saveCurrentMessages, setMessages, setCurrentConversationId]
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await api.deleteConversation(id);
        const updated = useGameStore
          .getState()
          .conversations.filter((c) => c.id !== id);
        setConversations(updated);
        if (currentConversationId === id) {
          if (updated.length > 0) {
            const next = updated[0];
            const conv = await api.getConversation(next.id);
            setMessages(conv.messages);
            setCurrentConversationId(next.id);
          } else {
            clearMessages();
          }
        }
      } catch {
        // delete failed
      }
    },
    [api, currentConversationId, setConversations, setMessages, setCurrentConversationId, clearMessages]
  );

  const handleGitCommand = useCallback(
    async (cmd: string, args: string[] = []) => {
      addActionLog({ action: `[EXECUTING]: ${cmd} ${args.join(" ")}`.trim(), status: "pending" });
      try {
        const result = await api.execCommand(cmd, args);
        addActionLog({
          action: `[${result.status === "success" ? "COMPLETE" : "FAULT"}]: ${result.output.slice(0, 200)}`,
          status: result.status === "success" ? "done" : "error",
        });
      } catch {
        addActionLog({ action: "[FAULT]: Command execution failed", status: "error" });
      }
    },
    [api, addActionLog]
  );

  const handleSlashCommand = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      const cmd = trimmed.toLowerCase();

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

      // Git commands
      if (cmd === "/git-status") {
        handleGitCommand("git status");
        return true;
      }
      if (cmd === "/git-diff") {
        handleGitCommand("git diff");
        return true;
      }
      if (cmd === "/git-log") {
        handleGitCommand("git log --oneline -10");
        return true;
      }
      if (cmd === "/push") {
        handleGitCommand("git push");
        return true;
      }
      if (cmd.startsWith("/commit ")) {
        const msg = trimmed.slice(8).trim();
        if (msg) {
          handleGitCommand("git add .");
          handleGitCommand(`git commit -m`, [JSON.stringify(msg)]);
        } else {
          addMessage({ role: "system", content: t("slash.commitNoMsg") });
        }
        return true;
      }

      // Unknown slash command
      addMessage({ role: "system", content: t("slash.unknown") });
      return true;
    },
    [addMessage, player, projectScan, t, handleGitCommand]
  );

  const handleSend = useCallback(
    async (text: string) => {
      // Slash commands
      if (text.startsWith("/")) {
        handleSlashCommand(text);
        // Auto-save after slash command
        const cid = useGameStore.getState().currentConversationId;
        if (cid) saveCurrentMessages(cid);
        return;
      }

      if (player.mp < 5) {
        addMessage({ role: "system", content: t("chat.noMp") });
        return;
      }

      // Ensure conversation exists before first user message
      let convId: string;
      try {
        convId = await ensureConversation();
      } catch {
        // conversation creation failed, continue without persistence
        convId = "";
      }

      addMessage({ role: "user", content: text });

      // Save immediately after user message so it's never lost
      if (convId) saveCurrentMessages(convId);

      try {
        const result = await api.performAction("message");
        setPlayer(result.player);

        if (result.leveled_up && result.new_level !== null) {
          triggerLevelUp(result.new_level);
        }
      } catch (e) {
        console.warn("[OmniChat] performAction failed:", e);
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
        if (convId) saveCurrentMessages(convId);
        return;
      }

      setAiResponding(true);

      // Cross-Session Memory: check chronicle for related past work
      try {
        const recall = await api.chronicleRecall(text);
        if (recall.has_recall && recall.matches.length > 0) {
          const match = recall.matches[0];
          const dateStr = match.session_date;
          let recallContent = `**${t("chronicle.recallPrefix", { date: dateStr })}**`;
          if (match.files.length > 0) {
            recallContent += `\n\n**${t("chronicle.recallFiles")}:** ${match.files.slice(0, 5).map(f => `\`${f}\``).join(", ")}`;
          }
          if (match.actions.length > 0) {
            recallContent += `\n\n**${t("chronicle.recallActions")}:**`;
            for (const action of match.actions.slice(0, 3)) {
              recallContent += `\n- ${action}`;
            }
          }
          addMessage({ role: "system", content: recallContent, type: "recall" });
        }
      } catch {
        // recall failed silently — not critical
      }

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
        // Create assistant message with known ID so we can update it by ID
        // even after action logs are added to the message list
        const assistantMsgId = crypto.randomUUID();
        addMessage({ role: "assistant", content: "", id: assistantMsgId });

        const response = await api.chatStream(conversationMessages, projectContext);

        if (!response.ok) {
          const err = await response.text();
          console.error("[OmniChat] Stream response not ok:", response.status, err);
          updateMessageById(assistantMsgId, t("ai.streamError") + `: ${err}`);
          setAiResponding(false);
          if (convId) saveCurrentMessages(convId);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          console.error("[OmniChat] No reader from response body");
          updateMessageById(assistantMsgId, t("ai.streamError"));
          setAiResponding(false);
          if (convId) saveCurrentMessages(convId);
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

              if (data.done) {
                // Final event with totals
                if (data.total_bytes_processed) {
                  addBytesProcessed(data.total_bytes_processed);
                }
                // Refresh player to get updated stats
                try {
                  const updatedPlayer = await api.getStatus();
                  setPlayer(updatedPlayer);
                } catch {
                  // ignore
                }
                break;
              }

              // Error event from backend
              if (data.type === "error") {
                console.error("[OmniChat] Backend error event:", data.error);
                updateMessageById(assistantMsgId, data.error || t("ai.streamError"));
                break;
              }

              // Text chunk (both old format and new type:text format)
              if (data.text) {
                accumulated += data.text;
                updateMessageById(assistantMsgId, accumulated);
              }

              // Tool call event
              if (data.type === "tool_call") {
                const displayName = getToolDisplayName(data.tool_name);
                const pathInfo = data.input?.path ? ` ${data.input.path}` : "";
                addActionLog({
                  action: `[EXECUTING]: ${displayName}${pathInfo}`,
                  status: "pending",
                  toolName: data.tool_name,
                  toolId: data.tool_id,
                });
              }

              // Tool result event
              if (data.type === "tool_result") {
                const displayName = getToolDisplayName(data.tool_name);
                addActionLog({
                  action: `[DATA_ACQUIRED]: ${displayName} — ${data.summary}`,
                  status: data.status === "success" ? "done" : "error",
                  expGained: data.exp_gained || undefined,
                  toolName: data.tool_name,
                  toolId: data.tool_id,
                  bytesProcessed: data.bytes_processed,
                });
              }

              // Tool diff event (for write operations)
              if (data.type === "tool_diff") {
                addActionCard({
                  fileName: data.file_name || "file",
                  status: "patched",
                  filePath: data.file_path || "",
                  oldContent: data.old_content,
                  newContent: data.new_content,
                  expGained: data.exp_gained,
                });
              }

              // Command result event (run_command)
              if (data.type === "command_result") {
                const exitCode = data.exit_code as number;
                const hpDamage = data.hp_damage as number;
                const cmdOutput = (data.output || "") as string;
                const command = (data.command || "") as string;
                const isFail = exitCode !== 0;

                // Refresh player stats (HP may have changed)
                if (isFail && hpDamage > 0) {
                  try {
                    const p = await api.getStatus();
                    setPlayer(p);
                  } catch { /* ignore */ }
                }

                const statusLine = isFail
                  ? t("tool.cmdFailed", { hp: String(hpDamage) })
                  : t("tool.cmdSuccess");
                const outputPreview = cmdOutput.length > 1500
                  ? cmdOutput.slice(0, 750) + "\n...\n" + cmdOutput.slice(-500)
                  : cmdOutput;

                let content = `**${statusLine}**\n\n\`\`\`\n$ ${command}\n${outputPreview}\n\`\`\``;
                if (isFail) {
                  content += `\n\n_${t("tool.cmdRepairHint")}_`;
                }

                addMessage({
                  role: "system",
                  content,
                  type: "command_result",
                });
              }

              // Blast radius event (pre-commit scan)
              if (data.type === "blast_radius") {
                const count = data.count as number;
                const isHigh = data.high as boolean;
                const dependents = (data.dependents || []) as string[];
                const file = (data.file || "") as string;
                const warningText = isHigh
                  ? t("blast.warning", { count: String(count) })
                  : t("blast.low", { count: String(count) });
                const meta = JSON.stringify({ dependents, high: isHigh, file });
                addMessage({
                  role: "system",
                  content: `${warningText}\n---meta---\n${meta}`,
                  type: "blast_radius",
                });
                // Store for map highlighting
                useGameStore.getState().setBlastRadius(file, dependents);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (e) {
        console.error("[OmniChat] Stream error:", e);
        updateLastMessage(t("ai.streamError") + (e instanceof Error ? `: ${e.message}` : ""));
      }

      setAiResponding(false);

      // Auto-save after AI response completes
      if (convId) saveCurrentMessages(convId);
    },
    [addMessage, api, setPlayer, triggerLevelUp, player.mp, settings.ai_provider, settings.anthropic_api_key, settings.auth_method, settings.oauth_access_token, settings.openai_api_key, settings.gemini_api_key, settings.custom_base_url, projectScan, handleSlashCommand, setAiResponding, updateLastMessage, addActionLog, addActionCard, addBytesProcessed, t, ensureConversation, saveCurrentMessages]
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
      {/* Conversation header */}
      <div className="flex items-center px-4 py-2 border-b border-theme-accent/8">
        <ConversationDrawer
          onNewMission={handleNewMission}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

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
            if (msg.type === "health_alert") {
              return <HealthAlertBubble key={msg.id} message={msg} />;
            }
            if (msg.type === "recall") {
              return <RecallBubble key={msg.id} message={msg} />;
            }
            if (msg.type === "blast_radius") {
              return <BlastRadiusBubble key={msg.id} message={msg} />;
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
