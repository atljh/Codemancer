import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { Send, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";
import { useGameStore } from "../../stores/gameStore";
import { useAudio } from "../../hooks/useAudio";
import { VoiceWaveform } from "../ui/VoiceWaveform";

interface CommandInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

// Web Speech API types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export function CommandInput({ onSend, disabled }: CommandInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const isListening = useGameStore((s) => s.isListening);
  const setListening = useGameStore((s) => s.setListening);
  const locale = useGameStore((s) => s.locale);
  const recognitionRef = useRef<any>(null);
  const { playSound } = useAudio();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
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

  const toggleListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = locale === "ru" ? "ru-RU" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(transcript);

      // Auto-send on final result with [VOICE_COMMAND] prefix
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal && transcript.trim()) {
        onSend(`[VOICE_COMMAND] ${transcript.trim()}`);
        setText("");
        setListening(false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("[VoiceInput] Error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    playSound("recording_start");
  }, [isListening, locale, setListening, onSend, playSound]);

  const hasSpeechApi =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="relative group p-4">
      {/* Tactical glow on focus */}
      <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-theme-accent/8 via-transparent to-theme-accent/8 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />

      <div className="relative flex items-end gap-3 rounded-lg glass-panel p-3">
        {/* Voice waveform overlay */}
        <AnimatePresence>
          <VoiceWaveform isActive={isListening} />
        </AnimatePresence>

        {/* Command prompt indicator */}
        <span className="text-theme-accent/40 text-xs font-bold tracking-wider self-center shrink-0 select-none">
          &gt;_
        </span>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? t("voice.listening") : t("command.placeholder")}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm text-theme-text placeholder-theme-text-dimmer outline-none min-h-[36px] max-h-[120px] py-1 font-mono"
        />

        {/* Voice input button */}
        {hasSpeechApi && (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleListening}
            disabled={disabled}
            className={`p-2 rounded glass-panel-bright transition-all shrink-0 ${
              isListening
                ? "text-theme-status-error bg-theme-status-error/15 animate-pulse"
                : "text-theme-text-dim hover:text-theme-accent hover:bg-theme-accent/15"
            }`}
            title={isListening ? t("voice.stop") : t("voice.start")}
          >
            <AnimatePresence mode="wait">
              {isListening ? (
                <motion.div key="mic-off" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                  <MicOff className="w-4 h-4" strokeWidth={1.5} />
                </motion.div>
              ) : (
                <motion.div key="mic" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                  <Mic className="w-4 h-4" strokeWidth={1.5} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}

        {/* Listening indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex items-center gap-1 overflow-hidden shrink-0"
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-0.5 bg-theme-status-error rounded-full"
                  animate={{
                    height: [4, 12, 4],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

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
