import { addDays, parseISO, startOfWeek } from "date-fns";
import { iso } from "./recurrence";

/** Consecutive days ending today (or yesterday, so an unfinished today doesn't break it). */
export function dayStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates);
  let cur = parseISO(today);
  if (!set.has(today)) cur = addDays(cur, -1);
  let n = 0;
  while (set.has(iso(cur))) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

/** Consecutive weeks (Mon-start) that hit `perWeek` completions, counting the current week only if met. */
export function weekStreak(dates: Iterable<string>, perWeek: number, today: string): number {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const k = iso(startOfWeek(parseISO(d), { weekStartsOn: 1 }));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let wk = startOfWeek(parseISO(today), { weekStartsOn: 1 });
  if ((counts.get(iso(wk)) ?? 0) < perWeek) wk = addDays(wk, -7);
  let n = 0;
  while ((counts.get(iso(wk)) ?? 0) >= perWeek) {
    n++;
    wk = addDays(wk, -7);
  }
  return n;
}

export function habitStreak(dates: string[], perWeek: number, today: string) {
  return perWeek >= 7 ? dayStreak(dates, today) : weekStreak(dates, perWeek, today);
}

export function longestDayStreak(dates: Iterable<string>): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && iso(addDays(parseISO(prev), 1)) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
