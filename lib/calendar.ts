import { addDays, parseISO } from "date-fns";
import type { Bill, CareItem, Countdown, Doc, ImportantDate, JournalEntry, Maintenance, Meal, Task, Trip, Vehicle, Warranty, Workout } from "./db";
import { iso, nextOccurrence, type RecurrenceRule } from "./recurrence";

export interface CalEvent {
  date: string;
  title: string;
  kind: string;
  emoji: string;
  color: string;
  href: string;
}

export interface CalSources {
  bills?: Bill[];
  tasks?: Task[];
  dates?: ImportantDate[];
  countdowns?: Countdown[];
  trips?: Trip[];
  meals?: Meal[];
  journal?: JournalEntry[];
  maintenance?: Maintenance[];
  care?: CareItem[];
  docs?: Doc[];
  warranties?: Warranty[];
  vehicles?: Vehicle[];
  workouts?: Workout[];
}

const alive = <T extends { deletedAt?: number | null }>(xs?: T[]) => (xs ?? []).filter((x) => !x.deletedAt);

/** Every occurrence of a (possibly recurring) date that falls in [from, to]. */
export function occurrences(start: string, rule: RecurrenceRule | undefined, from: string, to: string, max = 400): string[] {
  const out: string[] = [];
  let cur: string | null = start;
  for (let i = 0; cur && cur <= to && i < max; i++) {
    if (cur >= from) out.push(cur);
    cur = nextOccurrence(cur, rule);
  }
  return out;
}

/** Same month-day in each year covered by the range (birthdays, anniversaries). */
export function annualIn(date: string, from: string, to: string): string[] {
  const md = date.slice(5);
  const out: string[] = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) {
    let d = `${y}-${md}`;
    if (md === "02-29" && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) d = `${y}-02-28`;
    if (d >= from && d <= to) out.push(d);
  }
  return out;
}

export function eventsInRange(src: CalSources, from: string, to: string): CalEvent[] {
  const ev: CalEvent[] = [];
  const push = (date: string, e: Omit<CalEvent, "date">) => date >= from && date <= to && ev.push({ date, ...e });

  for (const b of alive(src.bills)) for (const d of occurrences(b.nextDue, b.rule, from, to)) push(d, { title: `${b.name} · ₹${b.amount}`, kind: "Bill", emoji: "🧾", color: "#ff375f", href: "/money/bills/" });
  for (const t of alive(src.tasks)) if (t.due && !t.done) for (const d of occurrences(t.due, t.rule, from, to)) push(d, { title: t.title, kind: "Reminder", emoji: "☑️", color: "#0a84ff", href: "/life/tasks/" });
  for (const x of alive(src.dates)) for (const d of annualIn(x.date, from, to)) push(d, { title: x.title, kind: x.kind === "birthday" ? "Birthday" : x.kind === "anniversary" ? "Anniversary" : "Date", emoji: x.kind === "birthday" ? "🎂" : x.kind === "anniversary" ? "💞" : "📅", color: "#bf5af2", href: "/life/dates/" });
  for (const c of alive(src.countdowns)) push(c.date, { title: c.title, kind: "Countdown", emoji: c.emoji, color: "#bf5af2", href: "/life/countdowns/" });
  for (const t of alive(src.trips)) {
    const end = t.end ?? t.start;
    for (let d = t.start, i = 0; d <= end && i < 60; d = iso(addDays(parseISO(d), 1)), i++) push(d, { title: d === t.start ? `✈️ ${t.name} begins` : t.name, kind: "Trip", emoji: "✈️", color: "#64d2ff", href: "/more/travel/" });
  }
  for (const m of alive(src.meals)) push(m.date, { title: `${m.slot}: ${m.text}`, kind: "Meal", emoji: "🍳", color: "#ff9f0a", href: "/more/recipes/" });
  for (const m of alive(src.maintenance)) for (const d of occurrences(m.nextDue, m.rule, from, to)) push(d, { title: m.title, kind: "Home", emoji: "🏠", color: "#ac8e68", href: "/more/home/" });
  for (const c of alive(src.care)) for (const d of occurrences(c.nextDue, c.rule, from, to)) push(d, { title: `${c.emoji} ${c.name}: ${c.task}`, kind: "Care", emoji: "🐾", color: "#30d158", href: "/more/care/" });
  for (const x of alive(src.docs)) if (x.expiryDate) push(x.expiryDate, { title: `${x.title} expires`, kind: "Document", emoji: "🗂️", color: "#ff9f0a", href: "/more/documents/" });
  for (const w of alive(src.warranties)) push(w.warrantyEnd, { title: `${w.product} warranty ends`, kind: "Warranty", emoji: "🛡️", color: "#ff9f0a", href: "/more/warranties/" });
  for (const v of alive(src.vehicles)) {
    if (v.insuranceExpiry) push(v.insuranceExpiry, { title: `${v.name} insurance`, kind: "Vehicle", emoji: "🚗", color: "#ff9f0a", href: "/more/vehicles/" });
    if (v.pucExpiry) push(v.pucExpiry, { title: `${v.name} PUC`, kind: "Vehicle", emoji: "🚗", color: "#ff9f0a", href: "/more/vehicles/" });
    if (v.serviceDue) push(v.serviceDue, { title: `${v.name} service`, kind: "Vehicle", emoji: "🔧", color: "#ff9f0a", href: "/more/vehicles/" });
  }
  for (const j of alive(src.journal)) push(j.date, { title: j.text.slice(0, 60), kind: "Journal", emoji: "📔", color: "#8e8e93", href: "/life/journal/" });
  for (const w of alive(src.workouts)) push(w.date, { title: `${w.type} · ${w.minutes} min`, kind: "Workout", emoji: "🏃", color: "#30d158", href: "/health/workouts/" });

  return ev.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}
