import { addYears, differenceInCalendarDays, parseISO, setYear } from "date-fns";
import type { Bill, Capsule, CareItem, Doc, ImportantDate, Maintenance, Task, Vehicle, WalletCard, Warranty, Medicine } from "./db";
import { iso } from "./recurrence";

export type ReminderKind = "care" | "bill" | "task" | "document" | "warranty" | "birthday" | "anniversary" | "date" | "maintenance" | "vehicle" | "wallet" | "capsule" | "medicine";

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  subtitle?: string;
  date: string;
  daysLeft: number;
  href: string;
}

export interface ReminderSources {
  bills?: Bill[];
  tasks?: Task[];
  docs?: Doc[];
  warranties?: Warranty[];
  dates?: ImportantDate[];
  maintenance?: Maintenance[];
  vehicles?: Vehicle[];
  wallet?: WalletCard[];
  capsules?: Capsule[];
  medicines?: Medicine[];
  care?: CareItem[];
}

/** Next anniversary of a yyyy-MM-dd (or MM-dd) date on/after today. */
export function nextAnnual(date: string, today: string): string {
  const t = parseISO(today);
  const base = parseISO(date.length === 5 ? `2000-${date}` : date);
  let d = setYear(base, t.getFullYear());
  if (iso(d) < today) d = addYears(d, 1);
  return iso(d);
}

const alive = <T extends { deletedAt?: number | null }>(xs?: T[]) => (xs ?? []).filter((x) => !x.deletedAt);

/**
 * Unified upcoming list. Overdue items are included (negative daysLeft);
 * expiry-type items surface `expiryLead` days ahead, everything else `horizon` days ahead.
 */
export function buildReminders(src: ReminderSources, today: string, horizon = 7, expiryLead = 30): Reminder[] {
  const out: Reminder[] = [];
  const t = parseISO(today);
  const push = (r: Omit<Reminder, "daysLeft">, lead = horizon) => {
    const daysLeft = differenceInCalendarDays(parseISO(r.date), t);
    if (daysLeft <= lead) out.push({ ...r, daysLeft });
  };

  for (const b of alive(src.bills)) push({ id: `bill-${b.id}`, kind: "bill", title: b.name, subtitle: `₹${b.amount}`, date: b.nextDue, href: "/money/bills/" });
  for (const x of alive(src.tasks)) if (!x.done && x.due) push({ id: `task-${x.id}`, kind: "task", title: x.title, date: x.due, href: "/life/tasks/" });
  for (const d of alive(src.docs)) if (d.expiryDate) push({ id: `doc-${d.id}`, kind: "document", title: `${d.title} expires`, date: d.expiryDate, href: "/more/documents/" }, expiryLead);
  for (const w of alive(src.warranties)) push({ id: `war-${w.id}`, kind: "warranty", title: `${w.product} warranty ends`, date: w.warrantyEnd, href: "/more/warranties/" }, expiryLead);
  for (const c of alive(src.wallet)) if (c.expiry) push({ id: `wal-${c.id}`, kind: "wallet", title: `${c.name} expires`, date: c.expiry, href: "/more/wallet/" }, expiryLead);
  for (const m of alive(src.maintenance)) push({ id: `mnt-${m.id}`, kind: "maintenance", title: m.title, subtitle: m.provider, date: m.nextDue, href: "/more/home/" });
  for (const v of alive(src.vehicles)) {
    if (v.insuranceExpiry) push({ id: `vins-${v.id}`, kind: "vehicle", title: `${v.name} insurance`, date: v.insuranceExpiry, href: "/more/vehicles/" }, expiryLead);
    if (v.pucExpiry) push({ id: `vpuc-${v.id}`, kind: "vehicle", title: `${v.name} PUC`, date: v.pucExpiry, href: "/more/vehicles/" }, expiryLead);
    if (v.serviceDue) push({ id: `vsvc-${v.id}`, kind: "vehicle", title: `${v.name} service`, date: v.serviceDue, href: "/more/vehicles/" });
  }
  for (const d of alive(src.dates)) {
    const kind: ReminderKind = d.kind === "birthday" ? "birthday" : d.kind === "anniversary" ? "anniversary" : "date";
    push({ id: `date-${d.id}`, kind, title: d.title, subtitle: d.person, date: nextAnnual(d.date, today), href: "/life/dates/" }, 14);
  }
  for (const c of alive(src.care)) push({ id: `care-${c.id}`, kind: "care", title: `${c.emoji} ${c.name}: ${c.task}`, date: c.nextDue, href: "/more/care/" });
  for (const c of alive(src.capsules)) if (!c.opened) push({ id: `cap-${c.id}`, kind: "capsule", title: `Time capsule: ${c.title}`, date: c.unlockAt, href: "/more/capsule/" }, 3);
  for (const m of alive(src.medicines))
    if (m.active && m.stock != null && m.perDose) {
      const daysLeft = Math.floor(m.stock / (m.perDose * Math.max(1, m.times.length)));
      if (daysLeft <= 5) out.push({ id: `med-${m.id}`, kind: "medicine", title: `Refill ${m.name}`, subtitle: `${m.stock} left`, date: today, daysLeft, href: "/health/medicines/" });
    }

  return out.sort((a, b) => a.daysLeft - b.daysLeft || a.title.localeCompare(b.title));
}

export function dueLabel(daysLeft: number): string {
  if (daysLeft < -1) return `${-daysLeft} days overdue`;
  if (daysLeft === -1) return "Yesterday";
  if (daysLeft === 0) return "Today";
  if (daysLeft === 1) return "Tomorrow";
  return `In ${daysLeft} days`;
}
