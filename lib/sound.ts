"use client";

/** Tiny synthesized sound kit (Web Audio) — no audio files, works offline. */
export type SoundName = "tap" | "success" | "complete" | "water" | "delete" | "alarm" | "levelup" | "toggle" | "open" | "breathIn" | "breathOut";

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.5;

export function configureSound(opts: { enabled?: boolean; volume?: number }) {
  if (opts.enabled !== undefined) enabled = opts.enabled;
  if (opts.volume !== undefined) volume = opts.volume;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.2, slideTo?: number) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * volume, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function play(name: SoundName) {
  if (!enabled) return;
  switch (name) {
    case "tap":
      return tone(1200, 0, 0.05, "sine", 0.08);
    case "toggle":
      return tone(880, 0, 0.06, "triangle", 0.1);
    case "open":
      return tone(520, 0, 0.12, "sine", 0.08, 780);
    case "success":
      tone(660, 0, 0.14, "sine", 0.18);
      return tone(990, 0.09, 0.22, "sine", 0.18);
    case "complete":
      tone(523.25, 0, 0.12, "triangle", 0.18);
      tone(659.25, 0.08, 0.12, "triangle", 0.18);
      return tone(783.99, 0.16, 0.28, "triangle", 0.2);
    case "levelup":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.3, "triangle", 0.18));
      return;
    case "water":
      tone(400, 0, 0.18, "sine", 0.22, 1100);
      return tone(1300, 0.12, 0.08, "sine", 0.08);
    case "delete":
      return tone(320, 0, 0.18, "sawtooth", 0.06, 140);
    case "alarm":
      for (let i = 0; i < 6; i++) tone(i % 2 ? 1046.5 : 880, i * 0.22, 0.18, "square", 0.08);
      return;
    case "breathIn":
      return tone(220, 0, 3.8, "sine", 0.08, 330);
    case "breathOut":
      return tone(330, 0, 3.8, "sine", 0.08, 220);
  }
}

let hapticsOn = true;
export function configureHaptics(on: boolean) {
  hapticsOn = on;
}
/** Vibration API (Android). iOS Safari ignores it silently. */
export function haptic(pattern: number | number[] = 10) {
  if (!hapticsOn || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  // browsers block vibration until the user has interacted with the page
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate(pattern);
  } catch {}
}

/** Feedback = sound + haptic, used for most interactions. */
export function feedback(name: SoundName) {
  play(name);
  haptic(name === "complete" || name === "success" || name === "levelup" ? [12, 40, 18] : name === "delete" ? 30 : 8);
}
