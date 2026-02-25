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
  | "self_repair_done"
  | "bridge_ambient"
  | "relay_click"
  | "hydraulic_hiss"
  | "radio_static"
  | "mission_registered"
  | "scan_sweep"
  | "smart_alert";

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

// ── DOOM E1M1 "At Doom's Gate" — procedural metal riff ───

// Distortion curve for heavy guitar tone
function makeDistortionCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

let doomMasterGain: GainNode | null = null;
let doomInterval: ReturnType<typeof setInterval> | null = null;
let doomNoteIndex = 0;

// E1M1 riff — the iconic Doom opening
// E2=82.41, D2=73.42, C2=65.41, Bb1=58.27, B1=61.74, A1=55
const DOOM_BPM = 140;
const DOOM_NOTE_LEN = 60 / DOOM_BPM / 2; // eighth notes

// Riff pattern: E E(oct) E E(oct) | D D(oct) D D(oct) | C C(oct) C C(oct) | Bb B C D
const E2 = 82.41,
  D2 = 73.42,
  C2 = 65.41,
  Bb1 = 58.27,
  B1 = 61.74;
const DOOM_RIFF = [
  E2,
  E2 * 2,
  E2,
  E2 * 2, // E power chord pumping
  E2,
  D2 * 2,
  E2,
  C2 * 2, // classic doom chromatic descend
  E2,
  E2 * 2,
  E2,
  E2 * 2,
  Bb1,
  B1,
  C2,
  D2, // ascending turnaround
];

function doomScheduleNote() {
  if (!doomMasterGain) return;
  const ctx = getCtx();
  const freq = DOOM_RIFF[doomNoteIndex % DOOM_RIFF.length];
  const now = ctx.currentTime;

  // Distortion node
  const distortion = ctx.createWaveShaper();
  distortion.curve = makeDistortionCurve(300);
  distortion.oversample = "4x";

  // Guitar 1 — main riff (sawtooth for metal crunch)
  const gtr1 = ctx.createOscillator();
  const gtr1Gain = ctx.createGain();
  gtr1.type = "sawtooth";
  gtr1.frequency.value = freq;
  gtr1Gain.gain.setValueAtTime(0.7, now);
  gtr1Gain.gain.exponentialRampToValueAtTime(0.01, now + DOOM_NOTE_LEN * 0.85);
  gtr1.connect(gtr1Gain).connect(distortion);
  gtr1.start(now);
  gtr1.stop(now + DOOM_NOTE_LEN);

  // Guitar 2 — slightly detuned for thickness
  const gtr2 = ctx.createOscillator();
  const gtr2Gain = ctx.createGain();
  gtr2.type = "sawtooth";
  gtr2.frequency.value = freq * 1.005; // slight detune
  gtr2Gain.gain.setValueAtTime(0.5, now);
  gtr2Gain.gain.exponentialRampToValueAtTime(0.01, now + DOOM_NOTE_LEN * 0.85);
  gtr2.connect(gtr2Gain).connect(distortion);
  gtr2.start(now);
  gtr2.stop(now + DOOM_NOTE_LEN);

  // Power chord fifth
  const fifth = ctx.createOscillator();
  const fifthGain = ctx.createGain();
  fifth.type = "sawtooth";
  fifth.frequency.value = freq * 1.498; // perfect fifth
  fifthGain.gain.setValueAtTime(0.35, now);
  fifthGain.gain.exponentialRampToValueAtTime(0.01, now + DOOM_NOTE_LEN * 0.8);
  fifth.connect(fifthGain).connect(distortion);
  fifth.start(now);
  fifth.stop(now + DOOM_NOTE_LEN);

  // Low-pass after distortion to tame harshness
  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = "lowpass";
  lpFilter.frequency.value = 2500;
  lpFilter.Q.value = 1.5;
  distortion.connect(lpFilter).connect(doomMasterGain);

  // Kick drum on beats 1 and 3 (every 4 eighth notes)
  if (doomNoteIndex % 4 === 0) {
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = "sine";
    kick.frequency.setValueAtTime(160, now);
    kick.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    kickGain.gain.setValueAtTime(0.6, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    kick.connect(kickGain).connect(doomMasterGain);
    kick.start(now);
    kick.stop(now + 0.18);

    // Kick click transient
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "square";
    click.frequency.value = 3500;
    clickGain.gain.setValueAtTime(0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
    click.connect(clickGain).connect(doomMasterGain);
    click.start(now);
    click.stop(now + 0.01);
  }

  // Double kick on beats 2 and 4
  if (doomNoteIndex % 4 === 2) {
    const kick2 = ctx.createOscillator();
    const kick2Gain = ctx.createGain();
    kick2.type = "sine";
    kick2.frequency.setValueAtTime(140, now);
    kick2.frequency.exponentialRampToValueAtTime(35, now + 0.1);
    kick2Gain.gain.setValueAtTime(0.45, now);
    kick2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    kick2.connect(kick2Gain).connect(doomMasterGain);
    kick2.start(now);
    kick2.stop(now + 0.14);
  }

  // Hi-hat on every eighth note
  const hhLen = ctx.sampleRate * 0.02;
  const hhBuf = ctx.createBuffer(1, hhLen, ctx.sampleRate);
  const hhData = hhBuf.getChannelData(0);
  for (let j = 0; j < hhLen; j++) hhData[j] = (Math.random() * 2 - 1) * 0.3;
  const hh = ctx.createBufferSource();
  hh.buffer = hhBuf;
  const hhGain = ctx.createGain();
  const hhFilter = ctx.createBiquadFilter();
  hhFilter.type = "highpass";
  hhFilter.frequency.value = 7000;
  hhGain.gain.setValueAtTime(0.15, now);
  hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  hh.connect(hhFilter).connect(hhGain).connect(doomMasterGain);
  hh.start(now);
  hh.stop(now + 0.03);

  doomNoteIndex++;
}

function startDoomMusic() {
  const ctx = getCtx();
  doomNoteIndex = 0;

  // Master gain for all doom music
  doomMasterGain = ctx.createGain();
  doomMasterGain.gain.value = 0.12;
  doomMasterGain.connect(ctx.destination);

  // Start looping riff
  doomScheduleNote();
  doomInterval = setInterval(doomScheduleNote, DOOM_NOTE_LEN * 1000);
}

function stopDoomMusic() {
  if (doomInterval) {
    clearInterval(doomInterval);
    doomInterval = null;
  }
  if (doomMasterGain) {
    try {
      const ctx = getCtx();
      doomMasterGain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.4,
      );
      const node = doomMasterGain;
      setTimeout(() => {
        node.disconnect();
      }, 500);
    } catch {
      doomMasterGain.disconnect();
    }
    doomMasterGain = null;
  }
}

// Self-repair sound events (one-shots) — work alongside doom music

function selfRepairStart() {
  startDoomMusic();
}

function selfRepairTick() {
  const ctx = getCtx();
  // Quick mechanical ratchet — audible over the music
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1200 + Math.random() * 600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.07);
}

function selfRepairDone() {
  stopDoomMusic();
  const ctx = getCtx();
  // Victory power chord — big open E major
  const chord = [82.41, 123.47, 164.81, 207.65, 329.63, 659.25];
  const distortion = ctx.createWaveShaper();
  distortion.curve = makeDistortionCurve(200);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3000;
  const masterG = ctx.createGain();
  masterG.gain.setValueAtTime(0.15, ctx.currentTime);
  masterG.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
  distortion.connect(lp).connect(masterG).connect(ctx.destination);

  chord.forEach((freq) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
    osc.connect(g).connect(distortion);
    osc.start();
    osc.stop(ctx.currentTime + 2.5);
  });

  // Crash cymbal
  const crashLen = ctx.sampleRate * 0.8;
  const crashBuf = ctx.createBuffer(1, crashLen, ctx.sampleRate);
  const crashData = crashBuf.getChannelData(0);
  for (let i = 0; i < crashLen; i++) {
    crashData[i] =
      (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3));
  }
  const crash = ctx.createBufferSource();
  crash.buffer = crashBuf;
  const crashFilter = ctx.createBiquadFilter();
  crashFilter.type = "highpass";
  crashFilter.frequency.value = 5000;
  const crashGain = ctx.createGain();
  crashGain.gain.setValueAtTime(0.2, ctx.currentTime);
  crashGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  crash.connect(crashFilter).connect(crashGain).connect(ctx.destination);
  crash.start();
  crash.stop(ctx.currentTime + 1.5);
}

// ── Smart Alert — low-frequency thud ──────────────────────

function smartAlertThud() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(55, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

// ── BRIDGE sounds (industrial / command bridge) ───────────

function bridgeRelayClick() {
  const ctx = getCtx();
  // Hard relay click — short burst + resonance
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = "square";
  click.frequency.value = 4500;
  clickGain.gain.setValueAtTime(0.12, ctx.currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
  click.connect(clickGain).connect(ctx.destination);
  click.start();
  click.stop(ctx.currentTime + 0.015);
  // Low resonance thud
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = "sine";
  thud.frequency.setValueAtTime(90, ctx.currentTime + 0.01);
  thud.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
  thudGain.gain.setValueAtTime(0.08, ctx.currentTime + 0.01);
  thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  thud.connect(thudGain).connect(ctx.destination);
  thud.start(ctx.currentTime + 0.01);
  thud.stop(ctx.currentTime + 0.1);
}

function bridgeHydraulicHiss() {
  const ctx = getCtx();
  // Filtered white noise — pneumatic hiss
  const bufSize = ctx.sampleRate * 0.3;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    const env = Math.exp(-i / (ctx.sampleRate * 0.08));
    data[i] = (Math.random() * 2 - 1) * env * 0.4;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3000;
  hp.Q.value = 0.5;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(8000, ctx.currentTime);
  lp.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.25);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  src.connect(hp).connect(lp).connect(gain).connect(ctx.destination);
  src.start();
  src.stop(ctx.currentTime + 0.3);
}

function bridgeRadioStatic() {
  const ctx = getCtx();
  // White noise with band-pass — radio crackle
  const bufSize = ctx.sampleRate * 0.6;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    const env =
      i < bufSize * 0.05
        ? i / (bufSize * 0.05)
        : Math.exp(-(i - bufSize * 0.05) / (ctx.sampleRate * 0.15));
    data[i] = (Math.random() * 2 - 1) * env * 0.3;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.07, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  src.connect(bp).connect(gain).connect(ctx.destination);
  src.start();
  src.stop(ctx.currentTime + 0.6);
}

function bridgeMissionRegistered() {
  const ctx = getCtx();
  // Low frequency confirmation tone + ascending data chirp
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.type = "sine";
  bass.frequency.value = 60;
  bassGain.gain.setValueAtTime(0.1, ctx.currentTime);
  bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  bass.connect(bassGain).connect(ctx.destination);
  bass.start();
  bass.stop(ctx.currentTime + 0.4);
  // Relay click at start
  bridgeRelayClick();
  // Data chirp sequence
  [800, 1000, 1200, 1500, 1800].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const t = ctx.currentTime + 0.08 + i * 0.04;
    g.gain.setValueAtTime(0.03, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  });
}

function bridgeScanSweep() {
  const ctx = getCtx();
  // Low-frequency sweep — sonar-like ping
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.7);
  // High ping reflection
  const ping = ctx.createOscillator();
  const pingGain = ctx.createGain();
  ping.type = "sine";
  ping.frequency.value = 2400;
  pingGain.gain.setValueAtTime(0.05, ctx.currentTime + 0.1);
  pingGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  ping.connect(pingGain).connect(ctx.destination);
  ping.start(ctx.currentTime + 0.1);
  ping.stop(ctx.currentTime + 0.3);
}

let bridgeAmbientSource: AudioBufferSourceNode | null = null;
let bridgeAmbientGain: GainNode | null = null;

function bridgeAmbientStart() {
  const ctx = getCtx();
  // Very low volume server room hum — continuous
  if (bridgeAmbientSource) return;
  const bufLen = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Layered low-frequency hum with subtle noise
  for (let i = 0; i < bufLen; i++) {
    const t = i / ctx.sampleRate;
    const hum60 = Math.sin(2 * Math.PI * 60 * t) * 0.3;
    const hum120 = Math.sin(2 * Math.PI * 120 * t) * 0.15;
    const hum180 = Math.sin(2 * Math.PI * 180 * t) * 0.05;
    const noise = (Math.random() * 2 - 1) * 0.02;
    data[i] = hum60 + hum120 + hum180 + noise;
  }
  bridgeAmbientSource = ctx.createBufferSource();
  bridgeAmbientSource.buffer = buf;
  bridgeAmbientSource.loop = true;
  bridgeAmbientGain = ctx.createGain();
  bridgeAmbientGain.gain.value = 0.015; // Very quiet
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 250;
  bridgeAmbientSource
    .connect(lp)
    .connect(bridgeAmbientGain)
    .connect(ctx.destination);
  bridgeAmbientSource.start();
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
  bridge_ambient: bridgeAmbientStart,
  relay_click: bridgeRelayClick,
  hydraulic_hiss: bridgeHydraulicHiss,
  radio_static: bridgeRadioStatic,
  mission_registered: bridgeMissionRegistered,
  scan_sweep: bridgeScanSweep,
  smart_alert: smartAlertThud,
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
  bridge_ambient: bridgeAmbientStart,
  relay_click: bridgeRelayClick,
  hydraulic_hiss: bridgeHydraulicHiss,
  radio_static: bridgeRadioStatic,
  mission_registered: bridgeMissionRegistered,
  scan_sweep: bridgeScanSweep,
  smart_alert: smartAlertThud,
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
  bridge_ambient: bridgeAmbientStart,
  relay_click: bridgeRelayClick,
  hydraulic_hiss: bridgeHydraulicHiss,
  radio_static: bridgeRadioStatic,
  mission_registered: bridgeMissionRegistered,
  scan_sweep: bridgeScanSweep,
  smart_alert: smartAlertThud,
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
  bridge_ambient: bridgeAmbientStart,
  relay_click: bridgeRelayClick,
  hydraulic_hiss: bridgeHydraulicHiss,
  radio_static: bridgeRadioStatic,
  mission_registered: bridgeMissionRegistered,
  scan_sweep: bridgeScanSweep,
  smart_alert: smartAlertThud,
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

  const stopRepairMusic = useCallback(() => {
    stopDoomMusic();
  }, []);

  return {
    playSound,
    sayText,
    stopTts,
    isSpeaking: getIsSpeaking,
    stopRepairMusic,
  };
}

export type { SoundEvent };
