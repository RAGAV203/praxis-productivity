import { addDays, addMonths, addWeeks, addYears, format, parseISO } from "date-fns";

export type Freq = "none" | "daily" | "weekly" | "monthly" | "yearly";
export interface RecurrenceRule {
  freq: Freq;
  interval: number;
}

export const NO_REPEAT: RecurrenceRule = { freq: "none", interval: 1 };

/** Local-date ISO string (yyyy-MM-dd). */
export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const todayIso = () => iso(new Date());

/** The occurrence after `date` for the rule, or null when it doesn't repeat. */
export function nextOccurrence(date: string, rule: RecurrenceRule | undefined): string | null {
  if (!rule || rule.freq === "none") return null;
  const n = Math.max(1, Math.floor(rule.interval || 1));
  const d = parseISO(date);
  switch (rule.freq) {
    case "daily":
      return iso(addDays(d, n));
    case "weekly":
      return iso(addWeeks(d, n));
    case "monthly":
      return iso(addMonths(d, n));
    case "yearly":
      return iso(addYears(d, n));
  }
}

/** Roll a due date forward until it is on/after `from` (used after long gaps). */
export function rollForward(date: string, rule: RecurrenceRule, from: string): string {
  let cur = date;
  for (let i = 0; i < 1000 && cur < from; i++) {
    const nxt = nextOccurrence(cur, rule);
    if (!nxt) break;
    cur = nxt;
  }
  return cur;
}

export function describeRule(rule?: RecurrenceRule): string {
  if (!rule || rule.freq === "none") return "Once";
  const unit = { daily: "day", weekly: "week", monthly: "month", yearly: "year" }[rule.freq];
  return rule.interval > 1 ? `Every ${rule.interval} ${unit}s` : `Every ${unit}`;
}
