"use client";

import { db, type Bill, type Maintenance, type Task } from "./db";
import { add, update } from "./data";
import { nextOccurrence, todayIso } from "./recurrence";
import { feedback } from "./sound";
import { toast } from "./store";
import { confetti } from "./confetti";
import { loadSettings } from "./settings";

export async function addWater(ml: number) {
  const date = todayIso();
  await add("water", { date, ml, at: Date.now() });
  feedback("water");
  const s = await loadSettings();
  const total = (await db.water.where("date").equals(date).toArray()).filter((w) => !w.deletedAt).reduce((a, w) => a + w.ml, 0);
  if (total >= s.waterGoal && total - ml < s.waterGoal) {
    confetti();
    feedback("levelup");
    toast("Hydration goal reached!", { emoji: "💧" });
  } else toast(`+${ml} ml water`, { emoji: "💧", ms: 1600 });
}

export async function toggleHabit(habitId: string, date = todayIso()) {
  const existing = (await db.habitLogs.where("[habitId+date]").equals([habitId, date]).toArray()).filter((l) => !l.deletedAt);
  if (existing.length) {
    await Promise.all(existing.map((l) => update("habitLogs", l.id, { deletedAt: Date.now() })));
    return false;
  }
  await add("habitLogs", { habitId, date });
  feedback("complete");
  return true;
}

/** Mark a bill paid: log the expense and roll the due date forward. */
export async function payBill(b: Bill) {
  await add("expenses", { kind: "expense", amount: b.amount, category: b.kind === "subscription" ? "Entertainment" : "Bills", date: todayIso(), mode: b.autopay ? "Card" : "UPI", note: b.name, billId: b.id, tags: [b.kind] });
  const next = nextOccurrence(b.nextDue, b.rule);
  if (next) await update("bills", b.id, { nextDue: next });
  else await update("bills", b.id, { deletedAt: Date.now() });
  feedback("success");
  toast(`${b.name} paid`, { emoji: "🧾" });
}

export async function completeTask(t: Task) {
  const next = t.due ? nextOccurrence(t.due, t.rule) : null;
  if (next) {
    await update("tasks", t.id, { due: next });
    toast(`Next: ${next}`, { emoji: "🔁" });
  } else await update("tasks", t.id, { done: !t.done });
  if (!t.done) feedback("complete");
}

export async function doneMaintenance(m: Maintenance) {
  const next = nextOccurrence(m.nextDue, m.rule) ?? m.nextDue;
  await update("maintenance", m.id, { lastDone: todayIso(), nextDue: next });
  if (m.cost) await add("expenses", { kind: "expense", amount: m.cost, category: "Bills", date: todayIso(), mode: "UPI", note: m.title, tags: ["home"] });
  feedback("complete");
  toast(`${m.title} done · next ${next}`, { emoji: "🏠" });
}
