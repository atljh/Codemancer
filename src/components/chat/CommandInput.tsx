import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";

interface CommandInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function CommandInput({ onSend, disabled }: CommandInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative group p-4">
      {/* Tactical glow on focus */}
      <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-theme-accent/8 via-transparent to-theme-accent/8 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />

      <div className="relative flex items-end gap-3 rounded-lg glass-panel p-3">
        {/* Command prompt indicator */}
        <span className="text-theme-accent/40 text-xs font-bold tracking-wider self-center shrink-0 select-none">
          &gt;_
        </span>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("command.placeholder")}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm text-theme-text placeholder-theme-text-dimmer outline-none min-h-[36px] max-h-[120px] py-1 font-mono"
        />
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="p-2 rounded glass-panel-bright text-theme-accent disabled:opacity-20 hover:text-white hover:bg-theme-accent/15 transition-all shrink-0"
        >
          <Send className="w-4 h-4" strokeWidth={1.5} />
        </motion.button>
      </div>
    </div>
  );
}
