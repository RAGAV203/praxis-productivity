"use client";

import { useSyncExternalStore } from "react";

/** Minimal external store (no extra dependency). */
export function createStore<T>(initial: T) {
  let state = initial;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(next: T | ((s: T) => T)) {
      state = typeof next === "function" ? (next as (s: T) => T)(state) : next;
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) {
      subs.add(f);
      return () => subs.delete(f);
    },
  };
}

export function useStore<T>(store: ReturnType<typeof createStore<T>>, serverValue?: T): T {
  return useSyncExternalStore(store.subscribe, store.get, () => serverValue ?? store.get());
}

/* ---------- Toasts (Dynamic-Island style) ---------- */
export interface ToastItem {
  id: number;
  message: string;
  emoji?: string;
  undo?: () => void;
}
export const toasts = createStore<ToastItem[]>([]);
let tid = 0;
export function toast(message: string, opts: { emoji?: string; undo?: () => void; ms?: number } = {}) {
  const id = ++tid;
  toasts.set((t) => [...t.slice(-2), { id, message, emoji: opts.emoji, undo: opts.undo }]);
  setTimeout(() => toasts.set((t) => t.filter((x) => x.id !== id)), opts.ms ?? 3200);
}
export const dismissToast = (id: number) => toasts.set((t) => t.filter((x) => x.id !== id));

/* ---------- Focus timer (Live Activity) ---------- */
export interface FocusState {
  running: boolean;
  endsAt: number | null; // epoch ms when running
  remaining: number; // ms when paused
  total: number; // ms
  label: string;
  phase: "focus" | "break";
}
const FOCUS_KEY = "praxis-focus";
const initialFocus: FocusState = { running: false, endsAt: null, remaining: 25 * 60_000, total: 25 * 60_000, label: "Focus", phase: "focus" };

function loadFocus(): FocusState {
  if (typeof window === "undefined") return initialFocus;
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    return raw ? { ...initialFocus, ...JSON.parse(raw) } : initialFocus;
  } catch {
    return initialFocus;
  }
}
export const focusStore = createStore<FocusState>(initialFocus);
if (typeof window !== "undefined") {
  focusStore.set(loadFocus());
  focusStore.subscribe(() => {
    try {
      localStorage.setItem(FOCUS_KEY, JSON.stringify(focusStore.get()));
    } catch {}
  });
}

export const focusRemaining = (s: FocusState, now = Date.now()) => (s.running && s.endsAt ? Math.max(0, s.endsAt - now) : s.remaining);

export const focusActions = {
  start(minutes?: number, label?: string, phase: FocusState["phase"] = "focus") {
    focusStore.set((s) => {
      const total = minutes ? minutes * 60_000 : s.total;
      const remaining = minutes ? total : s.remaining > 0 ? s.remaining : total;
      return { running: true, endsAt: Date.now() + remaining, remaining, total, label: label ?? s.label, phase };
    });
  },
  pause() {
    focusStore.set((s) => ({ ...s, running: false, remaining: focusRemaining(s), endsAt: null }));
  },
  reset(minutes?: number) {
    focusStore.set((s) => {
      const total = minutes ? minutes * 60_000 : s.total;
      return { ...s, running: false, endsAt: null, remaining: total, total, phase: "focus" };
    });
  },
};

/* ---------- Command palette / quick add ---------- */
export const ui = createStore({ palette: false, quickAdd: false });
