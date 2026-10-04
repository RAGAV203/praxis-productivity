"use client";

import { createStore } from "./store";

export interface Timer {
  id: string;
  label: string;
  total: number; // ms
  endsAt: number | null; // running
  remaining: number; // paused
  fired?: boolean;
}

const KEY = "praxis-timers";
const load = (): Timer[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
};

export const timersStore = createStore<Timer[]>([]);
if (typeof window !== "undefined") {
  timersStore.set(load());
  timersStore.subscribe(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(timersStore.get()));
    } catch {}
  });
}

export const timerLeft = (t: Timer, now = Date.now()) => (t.endsAt ? Math.max(0, t.endsAt - now) : t.remaining);

export const timerActions = {
  add(minutes: number, label: string) {
    const total = Math.round(minutes * 60_000);
    timersStore.set((ts) => [...ts, { id: Math.random().toString(36).slice(2), label, total, endsAt: Date.now() + total, remaining: total }]);
  },
  toggle(id: string) {
    timersStore.set((ts) => ts.map((t) => (t.id !== id ? t : t.endsAt ? { ...t, remaining: timerLeft(t), endsAt: null } : { ...t, endsAt: Date.now() + (t.remaining || t.total), fired: false, remaining: t.remaining || t.total })));
  },
  reset(id: string) {
    timersStore.set((ts) => ts.map((t) => (t.id === id ? { ...t, endsAt: null, remaining: t.total, fired: false } : t)));
  },
  remove(id: string) {
    timersStore.set((ts) => ts.filter((t) => t.id !== id));
  },
  markFired(id: string) {
    timersStore.set((ts) => ts.map((t) => (t.id === id ? { ...t, fired: true, endsAt: null, remaining: 0 } : t)));
  },
};

/** Password generator using the platform CSPRNG. */
export function generatePassword(len: number, opts: { upper: boolean; digits: boolean; symbols: boolean }) {
  const sets = ["abcdefghijkmnopqrstuvwxyz", opts.upper ? "ABCDEFGHJKLMNPQRSTUVWXYZ" : "", opts.digits ? "23456789" : "", opts.symbols ? "!@#$%^&*-_=+?" : ""].filter(Boolean);
  const all = sets.join("");
  const rand = (n: number) => {
    const buf = new Uint32Array(1);
    // rejection sampling avoids modulo bias
    const limit = Math.floor(0x100000000 / n) * n;
    do crypto.getRandomValues(buf);
    while (buf[0] >= limit);
    return buf[0] % n;
  };
  const chars = sets.map((s) => s[rand(s.length)]); // at least one from each set
  while (chars.length < len) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, len).join("");
}

export function passwordStrength(pw: string): { score: number; label: string } {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 14;
  const bits = pw.length * Math.log2(Math.max(1, pool));
  const score = bits >= 100 ? 4 : bits >= 70 ? 3 : bits >= 50 ? 2 : bits >= 30 ? 1 : 0;
  return { score, label: ["Very weak", "Weak", "Okay", "Strong", "Very strong"][score] };
}

export function textStats(t: string) {
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  return { words, chars: t.length, charsNoSpace: t.replace(/\s/g, "").length, lines: t ? t.split("\n").length : 0, readMin: Math.max(words ? 1 : 0, Math.round(words / 220)) };
}
