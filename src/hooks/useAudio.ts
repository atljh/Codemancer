import { useCallback, useRef, useEffect } from "react";
import { useGameStore } from "../stores/gameStore";
import type { SoundPackId } from "../types/game";

// ══════════════════════════════════════════════════════════
//  Procedural audio engine using Web Audio API
//  Supports multiple sound packs: default, jarvis, pipboy, retro
// ══════════════════════════════════════════════════════════

type SoundEvent =
  | "tool_start"
  | "tool_error"
  | "mission_complete"
  | "alert"
  | "glitch"
  | "recall"
  | "recording_start"
  | "data_crunch"
  | "agent_question"
  | "plan_confirm"
  | "data_burst"
  | "self_repair_start"
  | "self_repair_tick"
  | "self_repair_done";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ── DEFAULT pack (tactical) ───────────────────────────────

function defaultScanTone() {
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

function defaultGlitchNoise() {
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

function defaultSuccessChime() {
  const ctx = getCtx();
  [523.25, 659.25, 783.99].forEach((freq, i) => {
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

function defaultAlertTone() {
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

function defaultRecallTone() {
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

function defaultRecordingStart() {
  const ctx = getCtx();
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

function defaultDataCrunch() {
  const ctx = getCtx();
  [600, 900, 750, 1200, 500].forEach((freq, i) => {
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

function defaultAgentQuestion() {
  const ctx = getCtx();
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

function defaultPlanConfirm() {
  const ctx = getCtx();
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

function defaultDataBurst() {
  const ctx = getCtx();
  const pulse = ctx.createOscillator();
  const pulseGain = ctx.createGain();
  pulse.type = "sine";
  pulse.frequency.value = 80;
  pulseGain.gain.setValueAtTime(0.1, ctx.currentTime);
  pulseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  pulse.connect(pulseGain).connect(ctx.destination);
  pulse.start();
  pulse.stop(ctx.currentTime + 0.3);
  [1200, 1400, 1100, 1600, 1000].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + 0.05 + i * 0.06;
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  });
}

// ── Self-repair epic sounds ──────────────────────────────

function selfRepairStart() {
  const ctx = getCtx();
  // Dramatic power-up: rising sweep + bass drop + electronic arpeggios
  // Bass rumble
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.type = "sine";
  bass.frequency.setValueAtTime(40, ctx.currentTime);
  bass.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.8);
  bassGain.gain.setValueAtTime(0.15, ctx.currentTime);
  bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
  bass.connect(bassGain).connect(ctx.destination);
  bass.start();
  bass.stop(ctx.currentTime + 1);

  // Rising sweep
  const sweep = ctx.createOscillator();
  const sweepGain = ctx.createGain();
  sweep.type = "sawtooth";
  sweep.frequency.setValueAtTime(100, ctx.currentTime);
  sweep.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.8);
  sweepGain.gain.setValueAtTime(0.06, ctx.currentTime);
  sweepGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
  sweep.connect(sweepGain).connect(ctx.destination);
  sweep.start();
  sweep.stop(ctx.currentTime + 0.9);

  // Arpeggio notes
  [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = ctx.currentTime + 0.3 + i * 0.1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

function selfRepairTick() {
  const ctx = getCtx();
  // Quick mechanical ratchet sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

function selfRepairDone() {
  const ctx = getCtx();
  // Victory fanfare: chord + shimmer
  const chord = [523.25, 659.25, 783.99, 1046.5];
  chord.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  });
  // Shimmer cascade
  [1568, 2093, 2637, 3136].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + 0.3 + i * 0.08;
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

// ── JARVIS pack (smooth AI assistant) ─────────────────────

function jarvisScanTone() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
  // Warm harmonic
  const h = ctx.createOscillator();
  const hg = ctx.createGain();
  h.type = "sine";
  h.frequency.value = 600;
  hg.gain.setValueAtTime(0.03, ctx.currentTime);
  hg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  h.connect(hg).connect(ctx.destination);
  h.start();
  h.stop(ctx.currentTime + 0.4);
}

function jarvisGlitch() {
  const ctx = getCtx();
  // Soft descending tone
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

function jarvisSuccess() {
  const ctx = getCtx();
  // Warm ascending thirds
  [349.23, 440, 523.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  });
}

function jarvisAlert() {
  const ctx = getCtx();
  // Gentle two-note warning
  [392, 349.23].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.2;
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

function jarvisDataCrunch() {
  const ctx = getCtx();
  // Soft processing hum
  [400, 500, 450, 550, 480].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.06;
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  });
}

// ── PIP-BOY pack (retro 8-bit Fallout) ───────────────────

function pipboyScanTone() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
  osc.frequency.setValueAtTime(440, ctx.currentTime + 0.16);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.setValueAtTime(0.06, ctx.currentTime + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

function pipboyGlitch() {
  const ctx = getCtx();
  // Harsh 8-bit buzz
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 120;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

function pipboySuccess() {
  const ctx = getCtx();
  // Classic 8-bit victory jingle
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.setValueAtTime(0.05, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  });
}

function pipboyAlert() {
  const ctx = getCtx();
  // Radiation click
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1000;
    const t = ctx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }
}

function pipboyDataCrunch() {
  const ctx = getCtx();
  // Classic data loading beeps
  [262, 330, 392, 262, 330].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.04;
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  });
}

// ── RETRO-TERMINAL pack (old computer / dial-up) ─────────

function retroScanTone() {
  const ctx = getCtx();
  // Dial-up modem warble
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.setValueAtTime(2400, ctx.currentTime + 0.05);
  osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
  osc.frequency.setValueAtTime(1800, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3000;
  osc.connect(lp).connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

function retroGlitch() {
  const ctx = getCtx();
  // Harsh static burst
  const bufferSize = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (i < bufferSize / 2 ? 0.4 : 0.1);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  source.connect(lp).connect(gain).connect(ctx.destination);
  source.start();
  source.stop(ctx.currentTime + 0.2);
}

function retroSuccess() {
  const ctx = getCtx();
  // Teletype bell
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 2000;
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

function retroAlert() {
  const ctx = getCtx();
  // Old buzzer alarm
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 300;
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.setValueAtTime(0.06, ctx.currentTime + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1500;
  osc.connect(lp).connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

function retroDataCrunch() {
  const ctx = getCtx();
  // Floppy disk seek
  for (let i = 0; i < 4; i++) {
    const bufSize = ctx.sampleRate * 0.02;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let j = 0; j < bufSize; j++) d[j] = (Math.random() * 2 - 1) * 0.3;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.06;
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(g).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.03);
  }
}

// ── Sound pack maps ──────────────────────────────────────

type SoundMap = Record<SoundEvent, () => void>;

const DEFAULT_PACK: SoundMap = {
  tool_start: defaultScanTone,
  tool_error: defaultGlitchNoise,
  mission_complete: defaultSuccessChime,
  alert: defaultAlertTone,
  glitch: defaultGlitchNoise,
  recall: defaultRecallTone,
  recording_start: defaultRecordingStart,
  data_crunch: defaultDataCrunch,
  agent_question: defaultAgentQuestion,
  plan_confirm: defaultPlanConfirm,
  data_burst: defaultDataBurst,
  self_repair_start: selfRepairStart,
  self_repair_tick: selfRepairTick,
  self_repair_done: selfRepairDone,
};

const JARVIS_PACK: SoundMap = {
  ...DEFAULT_PACK,
  tool_start: jarvisScanTone,
  tool_error: jarvisGlitch,
  mission_complete: jarvisSuccess,
  alert: jarvisAlert,
  glitch: jarvisGlitch,
  recall: jarvisScanTone,
  data_crunch: jarvisDataCrunch,
  agent_question: jarvisAlert,
  data_burst: jarvisDataCrunch,
};

const PIPBOY_PACK: SoundMap = {
  ...DEFAULT_PACK,
  tool_start: pipboyScanTone,
  tool_error: pipboyGlitch,
  mission_complete: pipboySuccess,
  alert: pipboyAlert,
  glitch: pipboyGlitch,
  recall: pipboyScanTone,
  data_crunch: pipboyDataCrunch,
  agent_question: pipboyAlert,
  data_burst: pipboyDataCrunch,
};

const RETRO_PACK: SoundMap = {
  ...DEFAULT_PACK,
  tool_start: retroScanTone,
  tool_error: retroGlitch,
  mission_complete: retroSuccess,
  alert: retroAlert,
  glitch: retroGlitch,
  recall: retroScanTone,
  data_crunch: retroDataCrunch,
  agent_question: retroAlert,
  data_burst: retroDataCrunch,
};

const SOUND_PACKS: Record<SoundPackId, SoundMap> = {
  default: DEFAULT_PACK,
  jarvis: JARVIS_PACK,
  pipboy: PIPBOY_PACK,
  retro: RETRO_PACK,
};

// ── TTS via Web Speech API ─────────────────────────────

function speak(text: string, locale: string) {
  if (!("speechSynthesis" in window)) return;
  const clean = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/---meta---[\s\S]*$/, "")
    .trim();
  if (!clean) return;

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
  const soundPackRef = useRef<SoundPackId>("default");

  useEffect(() => {
    const unsub = useGameStore.subscribe((s) => {
      ttsEnabledRef.current = s.ttsEnabled;
      soundEnabledRef.current = s.soundEnabled;
      soundPackRef.current =
        (s.settings.sound_pack as SoundPackId) || "default";
    });
    const state = useGameStore.getState();
    ttsEnabledRef.current = state.ttsEnabled;
    soundEnabledRef.current = state.soundEnabled;
    soundPackRef.current =
      (state.settings.sound_pack as SoundPackId) || "default";
    return unsub;
  }, []);

  const playSound = useCallback((event: SoundEvent) => {
    if (!soundEnabledRef.current) return;
    try {
      const pack = SOUND_PACKS[soundPackRef.current] || DEFAULT_PACK;
      pack[event]?.();
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
