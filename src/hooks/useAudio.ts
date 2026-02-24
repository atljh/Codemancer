import { useCallback, useRef, useEffect } from "react";
import { useGameStore } from "../stores/gameStore";

// ══════════════════════════════════════════════════════════
//  Procedural audio engine using Web Audio API
//  No external files needed — all sounds are synthesized
// ══════════════════════════════════════════════════════════

type SoundEvent = "tool_start" | "tool_error" | "mission_complete" | "alert" | "glitch" | "recall" | "recording_start" | "data_crunch" | "agent_question" | "plan_confirm";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ── Synthesizers ──────────────────────────────────────────

function playScanTone() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.35);
}

function playGlitchNoise() {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * 0.12;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2000;
  bandpass.Q.value = 5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  source.connect(bandpass).connect(gain).connect(ctx.destination);
  source.start();
  source.stop(ctx.currentTime + 0.15);
}

function playSuccessChime() {
  const ctx = getCtx();
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

function playAlertTone() {
  const ctx = getCtx();
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 440;
    const t = ctx.currentTime + i * 0.18;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }
}

function playRecallTone() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.35);
}

function playRecordingStart() {
  const ctx = getCtx();
  // High-tech activation signal: ascending sweep + click
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
  // Click at end
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = "square";
  click.frequency.value = 3000;
  clickGain.gain.setValueAtTime(0.06, ctx.currentTime + 0.18);
  clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  click.connect(clickGain).connect(ctx.destination);
  click.start(ctx.currentTime + 0.18);
  click.stop(ctx.currentTime + 0.22);
}

function playDataCrunch() {
  const ctx = getCtx();
  // Fast sequence of short digital tones — data processing feel
  const freqs = [600, 900, 750, 1200, 500];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.05;
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  });
}

function playAgentQuestion() {
  const ctx = getCtx();
  // Soft two-note beep (ascending) — agent needs clarification
  [523.25, 698.46].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

function playPlanConfirm() {
  const ctx = getCtx();
  // Mechanical lock sound: low thud + resonant metallic ring
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = "sine";
  thud.frequency.setValueAtTime(120, ctx.currentTime);
  thud.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
  thudGain.gain.setValueAtTime(0.12, ctx.currentTime);
  thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  thud.connect(thudGain).connect(ctx.destination);
  thud.start();
  thud.stop(ctx.currentTime + 0.15);
  // Metallic ring
  const ring = ctx.createOscillator();
  const ringGain = ctx.createGain();
  ring.type = "triangle";
  ring.frequency.value = 1046.5;
  ringGain.gain.setValueAtTime(0.06, ctx.currentTime + 0.08);
  ringGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  ring.connect(ringGain).connect(ctx.destination);
  ring.start(ctx.currentTime + 0.08);
  ring.stop(ctx.currentTime + 0.5);
}

const SOUND_MAP: Record<SoundEvent, () => void> = {
  tool_start: playScanTone,
  tool_error: playGlitchNoise,
  mission_complete: playSuccessChime,
  alert: playAlertTone,
  glitch: playGlitchNoise,
  recall: playRecallTone,
  recording_start: playRecordingStart,
  data_crunch: playDataCrunch,
  agent_question: playAgentQuestion,
  plan_confirm: playPlanConfirm,
};

// ── TTS via Web Speech API ─────────────────────────────

function speak(text: string, locale: string) {
  if (!("speechSynthesis" in window)) return;
  // Strip markdown
  const clean = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/---meta---[\s\S]*$/, "")
    .trim();
  if (!clean) return;

  // Limit TTS length
  const truncated = clean.length > 300 ? clean.slice(0, 300) + "..." : clean;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(truncated);
  utterance.lang = locale === "ru" ? "ru-RU" : "en-US";
  utterance.rate = 1.05;
  utterance.pitch = 0.9;
  utterance.volume = 0.8;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function isSpeaking(): boolean {
  return "speechSynthesis" in window && window.speechSynthesis.speaking;
}

// ── Hook ───────────────────────────────────────────────

export function useAudio() {
  const ttsEnabledRef = useRef(false);
  const soundEnabledRef = useRef(true);

  // Sync with store settings
  useEffect(() => {
    const unsub = useGameStore.subscribe((s) => {
      ttsEnabledRef.current = s.ttsEnabled;
      soundEnabledRef.current = s.soundEnabled;
    });
    const state = useGameStore.getState();
    ttsEnabledRef.current = state.ttsEnabled;
    soundEnabledRef.current = state.soundEnabled;
    return unsub;
  }, []);

  const playSound = useCallback((event: SoundEvent) => {
    if (!soundEnabledRef.current) return;
    try {
      SOUND_MAP[event]?.();
    } catch {
      // audio context may not be available
    }
  }, []);

  const sayText = useCallback((text: string) => {
    if (!ttsEnabledRef.current) return;
    const locale = useGameStore.getState().locale;
    speak(text, locale);
  }, []);

  const stopTts = useCallback(() => stopSpeaking(), []);

  const getIsSpeaking = useCallback(() => isSpeaking(), []);

  return { playSound, sayText, stopTts, isSpeaking: getIsSpeaking };
}

export type { SoundEvent };
