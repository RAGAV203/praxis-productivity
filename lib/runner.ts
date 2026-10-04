"use client";

import { format, startOfMonth } from "date-fns";
import { confetti } from "./confetti";
import { add, all, update } from "./data";
import { db, type Workflow, type WorkflowStep } from "./db";
import { endFast, startFast } from "./fasting";
import { iso, todayIso } from "./recurrence";
import { loadSettings, saveSettings, type FocusMode } from "./settings";
import { feedback, play, type SoundName } from "./sound";
import { setSteps, stepsOn } from "./steps";
import { createStore, focusActions, toast } from "./store";
import { guessAisle } from "./aisles";
import { compare, fillTemplate, stepDef, toNumber } from "./workflows";
import { addDays } from "date-fns";

export type StepStatus = "pending" | "running" | "done" | "error" | "stopped";

export interface Prompt {
  kind: "ask" | "choose" | "confirm" | "show";
  text: string;
  inputKind?: "text" | "number";
  options?: string[];
}

export interface RunState {
  wf: Workflow | null;
  statuses: StepStatus[];
  visible: boolean;
  prompt: Prompt | null;
  finished: boolean;
  outcome?: string;
  messages: string[];
}

const idle: RunState = { wf: null, statuses: [], visible: false, prompt: null, finished: false, messages: [] };
export const runStore = createStore<RunState>(idle);

let resolver: ((v: string | null) => void) | null = null;
let navigate: (href: string) => void = (href) => {
  window.location.href = href;
};
export const setNavigator = (fn: (href: string) => void) => {
  navigate = fn;
};

/** True while any workflow runs — event triggers are ignored to prevent loops. */
export let workflowRunning = false;

export function answerPrompt(v: string | null) {
  const r = resolver;
  resolver = null;
  runStore.set((s) => ({ ...s, prompt: null }));
  r?.(v);
}

export function closeRunner() {
  if (resolver) answerPrompt(null);
  runStore.set(idle);
}

function ask(p: Prompt): Promise<string | null> {
  runStore.set((s) => ({ ...s, visible: true, prompt: p }));
  feedback("open");
  return new Promise((res) => {
    resolver = res;
  });
}

/** Built-in variables available to every workflow. */
export async function builtinVars(): Promise<Record<string, unknown>> {
  const now = new Date();
  const today = todayIso();
  const s = await loadSettings();
  const [water, expenses, tasks, habits, logs] = await Promise.all([all("water"), all("expenses"), all("tasks"), all("habits"), all("habitLogs")]);
  const m0 = format(startOfMonth(now), "yyyy-MM-dd");
  const active = habits.filter((h) => !h.archived);
  const doneIds = new Set(logs.filter((l) => l.date === today).map((l) => l.habitId));
  const waterToday = water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
  return {
    name: s.name || "friend",
    date: format(now, "EEEE, d MMMM"),
    time: format(now, "h:mm a"),
    day: format(now, "EEEE"),
    water: waterToday,
    waterGoal: s.waterGoal,
    waterLeft: Math.max(0, s.waterGoal - waterToday),
    spentToday: expenses.filter((e) => e.kind === "expense" && e.date === today).reduce((a, e) => a + e.amount, 0),
    spentMonth: expenses.filter((e) => e.kind === "expense" && e.date >= m0).reduce((a, e) => a + e.amount, 0),
    tasksDue: tasks.filter((t) => !t.done && t.due && t.due <= today).length,
    habitsDone: active.filter((h) => doneIds.has(h.id)).length,
    habitsLeft: active.filter((h) => !doneIds.has(h.id)).length,
    steps: await stepsOn(today),
    stepGoal: s.stepGoal,
  };
}

async function buildSummary(v: Record<string, unknown>) {
  const bits = [
    `It's ${v.date}.`,
    Number(v.tasksDue) ? `You have ${v.tasksDue} reminder${Number(v.tasksDue) > 1 ? "s" : ""} due.` : "No reminders due.",
    Number(v.habitsLeft) ? `${v.habitsLeft} habit${Number(v.habitsLeft) > 1 ? "s" : ""} to go.` : "All habits done!",
    `${v.water} ml of water so far.`,
    Number(v.steps) ? `${v.steps} steps.` : "",
    Number(v.spentToday) ? `Spent ₹${v.spentToday} today.` : "",
  ];
  return bits.filter(Boolean).join(" ");
}

function speak(text: string): Promise<void> {
  return new Promise((res) => {
    if (typeof speechSynthesis === "undefined" || !text) return res();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.onend = () => res();
    u.onerror = () => res();
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setTimeout(res, Math.min(20000, 1500 + text.length * 90));
  });
}

async function notify(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, { body, icon: "/icon-192.png" });
    new Notification(title, { body });
  } else toast(`${title}${body ? ` · ${body}` : ""}`, { emoji: "🔔", ms: 5000 });
}

class Stop extends Error {}

/** Executes one step; returns a log line. Throws Stop to end the workflow early. */
async function exec(step: WorkflowStep, vars: Record<string, unknown>): Promise<string> {
  const p = step.params ?? {};
  const t = (k: string) => fillTemplate(p[k], vars);
  const today = todayIso();
  switch (step.type) {
    case "water": {
      const ml = Number(p.ml) || 250;
      await add("water", { date: today, ml, at: Date.now() });
      play("water");
      vars.water = Number(vars.water ?? 0) + ml;
      return `+${ml} ml water`;
    }
    case "steps": {
      const n = toNumber(t("count"));
      if (Number.isNaN(n)) throw new Error("Steps must be a number");
      vars.steps = await setSteps(today, n, p.mode === "add" ? "add" : "replace");
      return `Steps → ${vars.steps}`;
    }
    case "expense": {
      const amount = toNumber(t("amount"));
      if (Number.isNaN(amount) || amount <= 0) throw new Error("Amount must be a positive number");
      const kind = p.kind === "income" ? "income" : "expense";
      const category = t("category") || (kind === "income" ? "Salary" : "Other");
      await add("expenses", { kind, amount, category, date: today, mode: "UPI", note: t("note") || undefined, tags: ["workflow"] });
      if (kind === "expense") vars.spentToday = Number(vars.spentToday ?? 0) + amount;
      return `${kind} ₹${amount} · ${category}`;
    }
    case "task": {
      const title = t("title");
      await add("tasks", { title, done: false, priority: "med", due: iso(addDays(new Date(), Number(p.inDays) || 0)) });
      return `Reminder: ${title}`;
    }
    case "note": {
      await add("notes", { title: t("title") || "Note", body: t("body"), tags: ["workflow"] });
      return `Note saved`;
    }
    case "grocery": {
      const items = t("items").split(/,|\n/).map((x) => x.trim()).filter(Boolean);
      for (const name of items) await add("grocery", { name, aisle: guessAisle(name), done: false });
      return `${items.length} grocery item(s)`;
    }
    case "habit": {
      const id = String(p.habitId ?? "");
      if (!id) throw new Error("Pick a habit");
      const done = (await db.habitLogs.where("[habitId+date]").equals([id, today]).toArray()).some((l) => !l.deletedAt);
      if (!done) await add("habitLogs", { habitId: id, date: today });
      return done ? "Habit already done" : "Habit checked";
    }
    case "mood": {
      const v = Math.min(5, Math.max(1, Math.round(toNumber(t("value")) || 3)));
      await add("moods", { date: today, at: Date.now(), value: v, feelings: [], associations: [] });
      return `Mood ${v}`;
    }
    case "journal": {
      const text = t("text").trim();
      if (!text) return "Journal skipped (empty)";
      await add("journal", { date: today, text, gratitude: [] });
      return "Journal saved";
    }
    case "workout": {
      const minutes = toNumber(t("minutes"));
      if (Number.isNaN(minutes)) throw new Error("Minutes must be a number");
      await add("workouts", { date: today, type: t("type") || "Workout", minutes });
      return `Workout ${minutes} min`;
    }
    case "ask": {
      const v = await ask({ kind: "ask", text: t("prompt"), inputKind: p.kind === "number" ? "number" : "text" });
      if (v === null) throw new Stop("Cancelled");
      vars[String(p.var || "answer")] = v;
      return `${p.var || "answer"} = ${v}`;
    }
    case "choose": {
      const opts = (Array.isArray(p.options) ? p.options : []).map((o) => fillTemplate(o, vars));
      const v = await ask({ kind: "choose", text: t("prompt"), options: opts });
      if (v === null) throw new Stop("Cancelled");
      vars[String(p.var || "choice")] = v;
      return `${p.var || "choice"} = ${v}`;
    }
    case "confirm": {
      const v = await ask({ kind: "confirm", text: t("prompt") });
      if (v !== "yes") throw new Stop("You chose not to continue");
      return "Confirmed";
    }
    case "stopIf": {
      if (compare(t("left"), String(p.op ?? "="), t("right"))) throw new Stop(`Condition met: ${t("left")} ${p.op} ${t("right")}`);
      return "Condition not met, continuing";
    }
    case "wait": {
      const sec = Math.min(600, Math.max(0, Number(p.seconds) || 0));
      await new Promise((r) => setTimeout(r, sec * 1000));
      return `Waited ${sec}s`;
    }
    case "setVar": {
      vars[String(p.var || "x")] = t("value");
      return `${p.var} = ${t("value")}`;
    }
    case "summary": {
      Object.assign(vars, await builtinVars());
      vars.summary = await buildSummary(vars);
      return "Summary ready";
    }
    case "focus": {
      focusActions.start(Number(p.minutes) || 25, t("label") || "Focus");
      return `Focus ${p.minutes} min started`;
    }
    case "fast": {
      if (p.action === "end") {
        const f = await endFast();
        return f ? "Fast ended" : "No fast running";
      }
      await startFast(Number(p.hours) || 16);
      return `Fast started (${p.hours}h)`;
    }
    case "focusMode": {
      await saveSettings({ focusMode: (p.mode as FocusMode) ?? "personal" });
      return `Focus mode: ${p.mode}`;
    }
    case "open": {
      navigate(String(p.href || "/"));
      return `Opened ${p.href}`;
    }
    case "url": {
      const url = t("url");
      if (!/^https?:\/\//i.test(url)) throw new Error("Link must start with http(s)://");
      window.open(url, "_blank", "noopener");
      return `Opened link`;
    }
    case "copy": {
      try {
        await navigator.clipboard.writeText(t("text"));
        return "Copied";
      } catch {
        throw new Error("Clipboard not available");
      }
    }
    case "share": {
      const text = t("text");
      if (navigator.share) {
        try {
          await navigator.share({ text });
          return "Shared";
        } catch {
          return "Share cancelled";
        }
      }
      await navigator.clipboard?.writeText(text);
      return "Copied (sharing unavailable)";
    }
    case "speak": {
      await speak(t("text"));
      return "Spoke";
    }
    case "show": {
      const text = t("text");
      if (runStore.get().visible) {
        runStore.set((s) => ({ ...s, messages: [...s.messages, text] }));
        await ask({ kind: "show", text });
      } else toast(text, { emoji: "💬", ms: 4500 });
      return `Showed message`;
    }
    case "notify": {
      await notify(t("title"), t("body"));
      return "Notification sent";
    }
    case "sound": {
      play((p.sound as SoundName) || "success");
      return `Played ${p.sound}`;
    }
    case "confetti": {
      confetti();
      return "🎉";
    }
    default:
      throw new Error(`Unknown step: ${step.type}`);
  }
}

export interface RunOptions {
  source: "manual" | "time" | "open" | "event" | "test";
  eventRow?: Record<string, unknown>;
}

export async function runWorkflow(wf: Workflow, opts: RunOptions) {
  if (workflowRunning) {
    if (opts.source === "manual" || opts.source === "test") toast("Another workflow is running", { emoji: "⏳" });
    return;
  }
  workflowRunning = true;
  const visible = opts.source === "manual" || opts.source === "test";
  runStore.set({ wf, statuses: wf.steps.map(() => "pending"), visible, prompt: null, finished: false, messages: [] });
  const log: string[] = [];
  let ok = true;
  let outcome = "Done";
  try {
    const vars: Record<string, unknown> = { ...(await builtinVars()), ...(opts.eventRow ?? {}) };
    for (let i = 0; i < wf.steps.length; i++) {
      const step = wf.steps[i];
      if (!stepDef(step.type)) continue;
      runStore.set((s) => ({ ...s, statuses: s.statuses.map((x, j) => (j === i ? "running" : x)) }));
      if (runStore.get().visible) await new Promise((r) => setTimeout(r, 220));
      try {
        log.push(await exec(step, vars));
        runStore.set((s) => ({ ...s, statuses: s.statuses.map((x, j) => (j === i ? "done" : x)) }));
      } catch (e) {
        if (e instanceof Stop) {
          outcome = e.message || "Stopped";
          log.push(`Stopped: ${outcome}`);
          runStore.set((s) => ({ ...s, statuses: s.statuses.map((x, j) => (j === i ? "stopped" : x)) }));
          break;
        }
        ok = false;
        outcome = e instanceof Error ? e.message : "Step failed";
        log.push(`Error: ${outcome}`);
        runStore.set((s) => ({ ...s, statuses: s.statuses.map((x, j) => (j === i ? "error" : x)) }));
        break;
      }
    }
  } finally {
    workflowRunning = false;
  }
  if (ok) feedback("success");
  else play("delete");
  runStore.set((s) => ({ ...s, finished: true, outcome }));
  if (!runStore.get().visible) {
    toast(ok ? `${wf.emoji} ${wf.name} ran` : `${wf.name}: ${outcome}`, { emoji: "⚡" });
    setTimeout(() => {
      if (runStore.get().wf?.id === wf.id && runStore.get().finished && !runStore.get().visible) runStore.set(idle);
    }, 500);
  }
  await update("workflows", wf.id, { lastRun: Date.now(), runs: (wf.runs ?? 0) + 1, ...(opts.source === "time" ? { lastAutoDate: todayIso() } : {}) });
  await add("workflowRuns", { workflowId: wf.id, name: wf.name, at: Date.now(), ok, source: opts.source, log });
}
