"use client";

import { db, type Fast } from "./db";
import { add, update } from "./data";

export async function currentFast(): Promise<Fast | undefined> {
  return (await db.fasts.toArray()).filter((f) => !f.deletedAt && !f.end).sort((a, b) => b.start - a.start)[0];
}

export async function startFast(goalHours: number) {
  const cur = await currentFast();
  if (cur) return cur.id;
  return add("fasts", { start: Date.now(), goalHours });
}

export async function endFast() {
  const cur = await currentFast();
  if (cur) await update("fasts", cur.id, { end: Date.now() });
  return cur;
}

/** Approximate metabolic stages by hours fasted (general wellness info, not medical advice). */
export const FAST_STAGES = [
  { h: 0, label: "Fed state", emoji: "🍽️", info: "Digesting your last meal." },
  { h: 4, label: "Post-absorptive", emoji: "📉", info: "Blood sugar settles." },
  { h: 12, label: "Fat burning", emoji: "🔥", info: "Body leans more on stored fat." },
  { h: 16, label: "Deeper fast", emoji: "✨", info: "A common 16:8 goal." },
  { h: 18, label: "Ketosis (approx.)", emoji: "⚡", info: "Ketone levels typically rise." },
  { h: 24, label: "Extended fast", emoji: "🧘", info: "Check with a doctor for longer fasts." },
];

export function fastStage(hours: number) {
  return [...FAST_STAGES].reverse().find((s) => hours >= s.h) ?? FAST_STAGES[0];
}
