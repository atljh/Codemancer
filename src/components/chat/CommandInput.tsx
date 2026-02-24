import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";
import { Send, Mic, MicOff, Paperclip, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";
import { useGameStore } from "../../stores/gameStore";
import { useAudio } from "../../hooks/useAudio";
import { VoiceWaveform } from "../ui/VoiceWaveform";
import type { ImageAttachment } from "../../types/game";

interface CommandInputProps {
  onSend: (text: string, images?: ImageAttachment[]) => void;
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

function fileToBase64(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // "data:image/png;base64,iVBOR..." -> extract parts
      const commaIdx = dataUrl.indexOf(",");
      const data = dataUrl.slice(commaIdx + 1);
      resolve({ media_type: file.type || "image/png", data });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CommandInput({ onSend, disabled }: CommandInputProps) {
  const [text, setText] = useState("");
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if ((!trimmed && attachedImages.length === 0) || disabled) return;
    onSend(trimmed, attachedImages.length > 0 ? attachedImages : undefined);
    setText("");
    setAttachedImages([]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length === 0) return;
    e.preventDefault(); // prevent pasting image as text

    const newImages = await Promise.all(imageFiles.map(fileToBase64));
    setAttachedImages((prev) => [...prev, ...newImages].slice(0, 5)); // max 5 images
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const newImages = await Promise.all(imageFiles.map(fileToBase64));
    setAttachedImages((prev) => [...prev, ...newImages].slice(0, 5));

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const newImages = await Promise.all(files.map(fileToBase64));
    setAttachedImages((prev) => [...prev, ...newImages].slice(0, 5));
  }, []);

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
    <div
      className="relative group p-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Tactical glow on focus */}
      <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-theme-accent/8 via-transparent to-theme-accent/8 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />

      {/* Drop overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 rounded-lg border-2 border-dashed border-theme-accent/50 bg-theme-accent/5 flex items-center justify-center pointer-events-none"
          >
            <span className="text-theme-accent text-xs font-mono tracking-wider uppercase">
              {t("image.drop")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex flex-col gap-2 rounded-lg glass-panel p-3">
        {/* Image preview strip */}
        <AnimatePresence>
          {attachedImages.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {attachedImages.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative shrink-0 group/thumb"
                >
                  <img
                    src={`data:${img.media_type};base64,${img.data}`}
                    alt={`Attachment ${i + 1}`}
                    className="h-16 w-16 object-cover rounded border border-theme-accent/20"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-theme-status-error/80 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" strokeWidth={2} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-3">
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
            onPaste={handlePaste}
            placeholder={isListening ? t("voice.listening") : t("command.placeholder")}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent text-sm text-theme-text placeholder-theme-text-dimmer outline-none min-h-[36px] max-h-[120px] py-1 font-mono"
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Attach image button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 rounded glass-panel-bright text-theme-text-dim hover:text-theme-accent hover:bg-theme-accent/15 transition-all shrink-0"
            title={t("image.attach")}
          >
            <Paperclip className="w-4 h-4" strokeWidth={1.5} />
          </motion.button>

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
            disabled={disabled || (!text.trim() && attachedImages.length === 0)}
            className="p-2 rounded glass-panel-bright text-theme-accent disabled:opacity-20 hover:text-white hover:bg-theme-accent/15 transition-all shrink-0"
          >
            <Send className="w-4 h-4" strokeWidth={1.5} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
