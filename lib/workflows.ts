import type { FieldDef } from "@/components/Form";
import type { Habit, Workflow, WorkflowStep, WorkflowTrigger } from "./db";

/* ------------------------------------------------------------------ */
/* Step catalog                                                        */
/* ------------------------------------------------------------------ */

export type StepCategory = "Log" | "Ask" | "Control" | "Do" | "Speak & Show";

export interface StepDef {
  type: string;
  label: string;
  emoji: string;
  color: string;
  category: StepCategory;
  fields: (ctx: { habits: Habit[] }) => FieldDef[];
  defaults: () => Record<string, unknown>;
  summary: (p: Record<string, unknown>) => string;
}

const MODULE_OPTIONS = [
  { value: "/", label: "Today" },
  { value: "/money/expenses/", label: "Transactions" },
  { value: "/money/budgets/", label: "Budgets" },
  { value: "/health/habits/", label: "Habits" },
  { value: "/health/water/", label: "Water" },
  { value: "/health/steps/", label: "Steps" },
  { value: "/health/mood/", label: "State of Mind" },
  { value: "/health/breathe/", label: "Breathe" },
  { value: "/health/fasting/", label: "Fasting" },
  { value: "/life/journal/", label: "Journal" },
  { value: "/life/tasks/", label: "Reminders" },
  { value: "/life/calendar/", label: "Calendar" },
  { value: "/life/focus/", label: "Focus timer" },
  { value: "/life/review/", label: "Life review" },
  { value: "/more/grocery/", label: "Grocery" },
  { value: "/more/notes/", label: "Notes" },
  { value: "/more/toolkit/", label: "Toolkit" },
  { value: "/more/vehicles/", label: "Vehicles" },
];

const SOUNDS = ["tap", "success", "complete", "water", "levelup", "alarm", "toggle"];

const s = (v: unknown, fb = "") => (v === undefined || v === null || v === "" ? fb : String(v));

export const STEPS: StepDef[] = [
  // ---- Log
  { type: "water", label: "Log water", emoji: "💧", color: "#64d2ff", category: "Log", fields: () => [{ name: "ml", label: "Amount (ml)", type: "number", required: true }], defaults: () => ({ ml: 250 }), summary: (p) => `Log ${s(p.ml, "250")} ml water` },
  { type: "steps", label: "Log steps", emoji: "👣", color: "#30d158", category: "Log", fields: () => [{ name: "count", label: "Steps (number or {{variable}})", type: "text", required: true }, { name: "mode", label: "Mode", type: "chips", options: [{ value: "replace", label: "Set today's total" }, { value: "add", label: "Add to today" }] }], defaults: () => ({ count: "{{answer}}", mode: "replace" }), summary: (p) => `${p.mode === "add" ? "Add" : "Set"} steps: ${s(p.count)}` },
  {
    type: "expense",
    label: "Add transaction",
    emoji: "💸",
    color: "#ff9f0a",
    category: "Log",
    fields: () => [
      { name: "kind", label: "Type", type: "chips", options: [{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }] },
      { name: "amount", label: "Amount (number or {{variable}})", type: "text", required: true },
      { name: "category", label: "Category (or {{variable}})", type: "text", placeholder: "Food" },
      { name: "note", label: "Note", type: "text" },
    ],
    defaults: () => ({ kind: "expense", amount: "{{amount}}", category: "{{category}}" }),
    summary: (p) => `${p.kind === "income" ? "Income" : "Expense"} ${s(p.amount)} · ${s(p.category, "Other")}`,
  },
  { type: "task", label: "Add reminder", emoji: "☑️", color: "#0a84ff", category: "Log", fields: () => [{ name: "title", label: "Title", type: "text", required: true }, { name: "inDays", label: "Due in (days)", type: "number" }], defaults: () => ({ title: "", inDays: 0 }), summary: (p) => `Reminder: ${s(p.title)}` },
  { type: "note", label: "Save note", emoji: "📝", color: "#ffd60a", category: "Log", fields: () => [{ name: "title", label: "Title", type: "text", required: true }, { name: "body", label: "Text", type: "textarea" }], defaults: () => ({ title: "Note {{date}}", body: "{{answer}}" }), summary: (p) => `Note: ${s(p.title)}` },
  { type: "grocery", label: "Add to grocery", emoji: "🛒", color: "#30d158", category: "Log", fields: () => [{ name: "items", label: "Items (comma separated or {{variable}})", type: "text", required: true }], defaults: () => ({ items: "{{answer}}" }), summary: (p) => `Grocery: ${s(p.items)}` },
  {
    type: "habit",
    label: "Check off habit",
    emoji: "✅",
    color: "#30d158",
    category: "Log",
    fields: ({ habits }) => [{ name: "habitId", label: "Habit", type: "select", required: true, options: habits.map((h) => ({ value: h.id, label: `${h.emoji} ${h.name}` })) }],
    defaults: () => ({}),
    summary: () => "Check off a habit",
  },
  { type: "mood", label: "Log mood", emoji: "🌈", color: "#bf5af2", category: "Log", fields: () => [{ name: "value", label: "Mood (1–5 or {{variable}})", type: "text", required: true }], defaults: () => ({ value: "{{mood}}" }), summary: (p) => `Mood ${s(p.value)}` },
  { type: "journal", label: "Write journal", emoji: "📔", color: "#ff9f0a", category: "Log", fields: () => [{ name: "text", label: "Text", type: "textarea", required: true }], defaults: () => ({ text: "{{answer}}" }), summary: (p) => `Journal: ${s(p.text).slice(0, 30)}` },
  { type: "workout", label: "Log workout", emoji: "🏃", color: "#ff375f", category: "Log", fields: () => [{ name: "type", label: "Activity", type: "text" }, { name: "minutes", label: "Minutes (or {{variable}})", type: "text", required: true }], defaults: () => ({ type: "Walk", minutes: "30" }), summary: (p) => `${s(p.type, "Workout")} ${s(p.minutes)} min` },

  // ---- Ask
  { type: "ask", label: "Ask for input", emoji: "⌨️", color: "#5e5ce6", category: "Ask", fields: () => [{ name: "prompt", label: "Question", type: "text", required: true }, { name: "kind", label: "Answer type", type: "chips", options: [{ value: "text", label: "Text" }, { value: "number", label: "Number" }] }, { name: "var", label: "Save as variable", type: "text", required: true }], defaults: () => ({ prompt: "", kind: "text", var: "answer" }), summary: (p) => `Ask “${s(p.prompt)}” → {{${s(p.var, "answer")}}}` },
  { type: "choose", label: "Choose from menu", emoji: "📋", color: "#5e5ce6", category: "Ask", fields: () => [{ name: "prompt", label: "Question", type: "text", required: true }, { name: "options", label: "Options", type: "list", placeholder: "Add option…" }, { name: "var", label: "Save as variable", type: "text", required: true }], defaults: () => ({ prompt: "", options: [], var: "choice" }), summary: (p) => `Choose → {{${s(p.var, "choice")}}}` },
  { type: "confirm", label: "Ask to continue", emoji: "❓", color: "#5e5ce6", category: "Ask", fields: () => [{ name: "prompt", label: "Question", type: "text", required: true }], defaults: () => ({ prompt: "Continue?" }), summary: (p) => `Confirm: ${s(p.prompt)}` },

  // ---- Control
  {
    type: "stopIf",
    label: "Stop if…",
    emoji: "🛑",
    color: "#ff453a",
    category: "Control",
    fields: () => [
      { name: "left", label: "Value", type: "text", required: true, placeholder: "{{water}}" },
      { name: "op", label: "Is", type: "select", required: true, options: [{ value: ">", label: "greater than" }, { value: "<", label: "less than" }, { value: "=", label: "equal to" }, { value: "!=", label: "not equal to" }, { value: "contains", label: "contains" }, { value: "empty", label: "empty" }] },
      { name: "right", label: "Compared to", type: "text", when: (v) => v.op !== "empty" },
    ],
    defaults: () => ({ left: "{{water}}", op: ">", right: "2000" }),
    summary: (p) => `Stop if ${s(p.left)} ${s(p.op)} ${p.op === "empty" ? "" : s(p.right)}`,
  },
  { type: "wait", label: "Wait", emoji: "⏳", color: "#8e8e93", category: "Control", fields: () => [{ name: "seconds", label: "Seconds", type: "number", required: true }], defaults: () => ({ seconds: 3 }), summary: (p) => `Wait ${s(p.seconds, "3")} s` },
  { type: "setVar", label: "Set variable", emoji: "🔤", color: "#8e8e93", category: "Control", fields: () => [{ name: "var", label: "Name", type: "text", required: true }, { name: "value", label: "Value", type: "text" }], defaults: () => ({ var: "x", value: "" }), summary: (p) => `{{${s(p.var)}}} = ${s(p.value)}` },
  { type: "summary", label: "Get today's summary", emoji: "📊", color: "#8e8e93", category: "Control", fields: () => [], defaults: () => ({}), summary: () => "Build {{summary}} from today's data" },

  // ---- Do
  { type: "focus", label: "Start focus timer", emoji: "⏱️", color: "#ff375f", category: "Do", fields: () => [{ name: "minutes", label: "Minutes", type: "number", required: true }, { name: "label", label: "Label", type: "text" }], defaults: () => ({ minutes: 25, label: "Focus" }), summary: (p) => `Focus ${s(p.minutes, "25")} min` },
  { type: "fast", label: "Start / end fast", emoji: "🥗", color: "#30d158", category: "Do", fields: () => [{ name: "action", label: "Action", type: "chips", options: [{ value: "start", label: "Start" }, { value: "end", label: "End" }] }, { name: "hours", label: "Goal hours", type: "number", when: (v) => v.action !== "end" }], defaults: () => ({ action: "start", hours: 16 }), summary: (p) => (p.action === "end" ? "End fast" : `Start ${s(p.hours, "16")}h fast`) },
  { type: "focusMode", label: "Set focus mode", emoji: "🌙", color: "#5e5ce6", category: "Do", fields: () => [{ name: "mode", label: "Mode", type: "chips", options: [{ value: "personal", label: "🙂 Personal" }, { value: "fitness", label: "🏃 Fitness" }, { value: "sleep", label: "🌙 Sleep" }] }], defaults: () => ({ mode: "sleep" }), summary: (p) => `Focus mode: ${s(p.mode)}` },
  { type: "open", label: "Open page", emoji: "🧭", color: "#0a84ff", category: "Do", fields: () => [{ name: "href", label: "Page", type: "select", required: true, options: MODULE_OPTIONS }], defaults: () => ({ href: "/" }), summary: (p) => `Open ${MODULE_OPTIONS.find((m) => m.value === p.href)?.label ?? s(p.href)}` },
  { type: "url", label: "Open link", emoji: "🔗", color: "#0a84ff", category: "Do", fields: () => [{ name: "url", label: "URL", type: "text", required: true, placeholder: "https://" }], defaults: () => ({ url: "https://" }), summary: (p) => `Open ${s(p.url)}` },
  { type: "copy", label: "Copy to clipboard", emoji: "📋", color: "#8e8e93", category: "Do", fields: () => [{ name: "text", label: "Text", type: "textarea", required: true }], defaults: () => ({ text: "{{summary}}" }), summary: (p) => `Copy “${s(p.text).slice(0, 24)}”` },
  { type: "share", label: "Share text", emoji: "📤", color: "#0a84ff", category: "Do", fields: () => [{ name: "text", label: "Text", type: "textarea", required: true }], defaults: () => ({ text: "{{summary}}" }), summary: () => "Share via share sheet" },

  // ---- Speak & Show
  { type: "speak", label: "Speak text", emoji: "🗣️", color: "#bf5af2", category: "Speak & Show", fields: () => [{ name: "text", label: "Text", type: "textarea", required: true }], defaults: () => ({ text: "Good morning {{name}}!" }), summary: (p) => `Say “${s(p.text).slice(0, 30)}”` },
  { type: "show", label: "Show message", emoji: "💬", color: "#bf5af2", category: "Speak & Show", fields: () => [{ name: "text", label: "Message", type: "textarea", required: true }], defaults: () => ({ text: "" }), summary: (p) => `Show “${s(p.text).slice(0, 30)}”` },
  { type: "notify", label: "Send notification", emoji: "🔔", color: "#ff375f", category: "Speak & Show", fields: () => [{ name: "title", label: "Title", type: "text", required: true }, { name: "body", label: "Body", type: "textarea" }], defaults: () => ({ title: "Praxis", body: "" }), summary: (p) => `Notify: ${s(p.title)}` },
  { type: "sound", label: "Play sound", emoji: "🔊", color: "#ff9f0a", category: "Speak & Show", fields: () => [{ name: "sound", label: "Sound", type: "chips", options: SOUNDS }], defaults: () => ({ sound: "success" }), summary: (p) => `Play ${s(p.sound, "success")}` },
  { type: "confetti", label: "Celebrate", emoji: "🎉", color: "#ff9f0a", category: "Speak & Show", fields: () => [], defaults: () => ({}), summary: () => "Confetti!" },
];

export const stepDef = (type: string) => STEPS.find((d) => d.type === type);
export const STEP_CATEGORIES: StepCategory[] = ["Log", "Ask", "Control", "Do", "Speak & Show"];

/* ------------------------------------------------------------------ */
/* Variables & conditions (pure — unit tested)                         */
/* ------------------------------------------------------------------ */

/** Replace {{var}} tokens. Unknown variables become empty strings. */
export function fillTemplate(text: unknown, vars: Record<string, unknown>): string {
  return String(text ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Parse a number out of user text ("₹1,250.50" → 1250.5). NaN when none. */
export function toNumber(text: string): number {
  const m = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

export function compare(left: string, op: string, right: string): boolean {
  const ln = toNumber(left);
  const rn = toNumber(right);
  const numeric = !Number.isNaN(ln) && !Number.isNaN(rn) && left.trim() !== "" && right.trim() !== "";
  switch (op) {
    case ">":
      return numeric ? ln > rn : left > right;
    case "<":
      return numeric ? ln < rn : left < right;
    case "=":
      return numeric ? ln === rn : left.trim().toLowerCase() === right.trim().toLowerCase();
    case "!=":
      return numeric ? ln !== rn : left.trim().toLowerCase() !== right.trim().toLowerCase();
    case "contains":
      return left.toLowerCase().includes(right.toLowerCase());
    case "empty":
      return left.trim() === "";
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Triggers                                                            */
/* ------------------------------------------------------------------ */

export const EVENT_TABLES: { value: string; label: string; fields: string[] }[] = [
  { value: "expenses", label: "💸 Transaction", fields: ["amount", "category", "kind", "mode", "note"] },
  { value: "water", label: "💧 Water", fields: ["ml"] },
  { value: "habitLogs", label: "✅ Habit check-in", fields: ["habitId"] },
  { value: "moods", label: "🌈 Mood", fields: ["value"] },
  { value: "journal", label: "📔 Journal entry", fields: ["text", "mood"] },
  { value: "workouts", label: "🏃 Workout", fields: ["type", "minutes"] },
  { value: "focus", label: "⏱️ Focus session", fields: ["minutes", "label"] },
  { value: "tasks", label: "☑️ Reminder", fields: ["title"] },
  { value: "metrics", label: "⚖️ Body metric / steps", fields: ["type", "value"] },
  { value: "sleep", label: "🌙 Sleep log", fields: ["quality"] },
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function describeTrigger(t: WorkflowTrigger): string {
  switch (t.type) {
    case "manual":
      return "Tap to run";
    case "open":
      return "When Praxis opens";
    case "time": {
      const days = t.days?.length ? (t.days.length === 7 ? "Every day" : t.days.map((d) => DAY_LABELS[d]).join(", ")) : "Every day";
      return `${days} at ${t.time ?? "08:00"}`;
    }
    case "event": {
      const tbl = EVENT_TABLES.find((e) => e.value === t.table)?.label ?? t.table;
      const cond = t.field && t.op ? ` where ${t.field} ${t.op} ${t.op === "empty" ? "" : (t.value ?? "")}` : "";
      return `When ${tbl} is logged${cond}`;
    }
  }
}

/** Should a time trigger fire now? (fires once per day, any time after its time) */
export function timeTriggerDue(t: WorkflowTrigger, now: Date, lastAutoDate: string | undefined, todayIso: string): boolean {
  if (t.type !== "time" || !t.time) return false;
  if (lastAutoDate === todayIso) return false;
  const days = t.days?.length ? t.days : [0, 1, 2, 3, 4, 5, 6];
  if (!days.includes(now.getDay())) return false;
  const [h, m] = t.time.split(":").map(Number);
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

/** Does an added record match an event trigger? */
export function eventMatches(t: WorkflowTrigger, table: string, row: Record<string, unknown>): boolean {
  if (t.type !== "event" || t.table !== table) return false;
  if (!t.field || !t.op) return true;
  return compare(String(row[t.field] ?? ""), t.op, t.value ?? "");
}

/* ------------------------------------------------------------------ */
/* Ready-made workflows                                                */
/* ------------------------------------------------------------------ */

let n = 0;
const st = (type: string, params: Record<string, unknown> = {}): WorkflowStep => ({ id: `t${++n}`, type, params });

export type WorkflowTemplate = Pick<Workflow, "name" | "emoji" | "color" | "description" | "trigger" | "steps"> & { key: string };

export const TEMPLATES: WorkflowTemplate[] = [
  {
    key: "morning",
    name: "Good Morning",
    emoji: "☀️",
    color: "#ff9f0a",
    description: "Briefing out loud, a glass of water and your day at a glance.",
    trigger: { type: "manual" },
    steps: [st("focusMode", { mode: "personal" }), st("summary"), st("speak", { text: "Good morning {{name}}. {{summary}}" }), st("water", { ml: 250 }), st("open", { href: "/" })],
  },
  {
    key: "winddown",
    name: "Wind Down",
    emoji: "🌙",
    color: "#5e5ce6",
    description: "Sleep focus, a quick mood check, one-line journal, then breathe.",
    trigger: { type: "time", time: "22:00", days: [0, 1, 2, 3, 4, 5, 6] },
    steps: [
      st("focusMode", { mode: "sleep" }),
      st("choose", { prompt: "How was today?", options: ["1 😣", "2 😕", "3 😐", "4 🙂", "5 😄"], var: "mood" }),
      st("mood", { value: "{{mood}}" }),
      st("ask", { prompt: "One line about today", kind: "text", var: "answer" }),
      st("journal", { text: "{{answer}}" }),
      st("open", { href: "/health/breathe/" }),
    ],
  },
  {
    key: "hydrate",
    name: "Hydrate",
    emoji: "💧",
    color: "#64d2ff",
    description: "One tap: +250 ml and a cheerful splash.",
    trigger: { type: "manual" },
    steps: [st("water", { ml: 250 }), st("show", { text: "💧 {{water}} ml today. Keep going!" })],
  },
  {
    key: "quickspend",
    name: "Quick Spend",
    emoji: "💸",
    color: "#ff9f0a",
    description: "Ask amount and category, then log it.",
    trigger: { type: "manual" },
    steps: [
      st("ask", { prompt: "How much did you spend?", kind: "number", var: "amount" }),
      st("choose", { prompt: "On what?", options: ["Food", "Groceries", "Transport", "Shopping", "Bills", "Entertainment", "Other"], var: "category" }),
      st("ask", { prompt: "Note (optional)", kind: "text", var: "note" }),
      st("expense", { kind: "expense", amount: "{{amount}}", category: "{{category}}", note: "{{note}}" }),
      st("show", { text: "Logged ₹{{amount}} on {{category}}. Spent today: ₹{{spentToday}}" }),
    ],
  },
  {
    key: "grocery",
    name: "Grocery Run",
    emoji: "🛒",
    color: "#30d158",
    description: "Dictate or type items, then open your sorted list.",
    trigger: { type: "manual" },
    steps: [st("ask", { prompt: "What do you need? (comma separated)", kind: "text", var: "answer" }), st("grocery", { items: "{{answer}}" }), st("open", { href: "/more/grocery/" })],
  },
  {
    key: "deepwork",
    name: "Deep Work",
    emoji: "🎧",
    color: "#ff375f",
    description: "50-minute focus block with a heads-up.",
    trigger: { type: "manual" },
    steps: [st("speak", { text: "Focus time. Phone down, you've got this." }), st("focus", { minutes: 50, label: "Deep work" }), st("open", { href: "/life/focus/" })],
  },
  {
    key: "steps",
    name: "Log My Steps",
    emoji: "👣",
    color: "#30d158",
    description: "Type today's step count from your phone's health app.",
    trigger: { type: "manual" },
    steps: [st("ask", { prompt: "How many steps today?", kind: "number", var: "answer" }), st("steps", { count: "{{answer}}", mode: "replace" }), st("show", { text: "👣 {{steps}} steps logged" })],
  },
  {
    key: "fast",
    name: "Start 16:8 Fast",
    emoji: "🥗",
    color: "#30d158",
    description: "Starts a 16-hour fast after dinner.",
    trigger: { type: "manual" },
    steps: [st("fast", { action: "start", hours: 16 }), st("show", { text: "Fast started. You can eat again in 16 hours 💪" })],
  },
  {
    key: "bigspend",
    name: "Big Spend Alert",
    emoji: "🚨",
    color: "#ff453a",
    description: "Warns you when a single expense is over ₹5,000.",
    trigger: { type: "event", table: "expenses", field: "amount", op: ">", value: "5000" },
    steps: [st("sound", { sound: "alarm" }), st("notify", { title: "Big spend: ₹{{amount}}", body: "{{category}} · month total ₹{{spentMonth}}" })],
  },
  {
    key: "waternudge",
    name: "Afternoon Water Check",
    emoji: "🚰",
    color: "#64d2ff",
    description: "At 3 PM, nudges you if you're under 1.5 L.",
    trigger: { type: "time", time: "15:00", days: [0, 1, 2, 3, 4, 5, 6] },
    steps: [st("stopIf", { left: "{{water}}", op: ">", right: "1500" }), st("notify", { title: "Drink some water 💧", body: "Only {{water}} ml so far today." })],
  },
  {
    key: "weekly",
    name: "Sunday Reset",
    emoji: "🧹",
    color: "#ac8e68",
    description: "Weekly planning nudge every Sunday evening.",
    trigger: { type: "time", time: "18:00", days: [0] },
    steps: [st("summary"), st("task", { title: "Plan next week", inDays: 0 }), st("task", { title: "Grocery & meal plan", inDays: 0 }), st("notify", { title: "Sunday reset 🧹", body: "{{summary}}" })],
  },
  {
    key: "workoutdone",
    name: "Workout Cheer",
    emoji: "🏆",
    color: "#ff375f",
    description: "Celebrates whenever you log a workout.",
    trigger: { type: "event", table: "workouts" },
    steps: [st("confetti"), st("sound", { sound: "levelup" }), st("show", { text: "Nice {{type}}! {{minutes}} minutes in the bank 💪" })],
  },
  {
    key: "payday",
    name: "Payday",
    emoji: "💰",
    color: "#30d158",
    description: "Log salary and set a savings reminder.",
    trigger: { type: "manual" },
    steps: [
      st("ask", { prompt: "Salary amount", kind: "number", var: "amount" }),
      st("expense", { kind: "income", amount: "{{amount}}", category: "Salary", note: "Salary" }),
      st("task", { title: "Move 20% to savings", inDays: 0 }),
      st("confetti"),
    ],
  },
  {
    key: "share",
    name: "Share My Day",
    emoji: "📤",
    color: "#0a84ff",
    description: "Share today's summary with someone.",
    trigger: { type: "manual" },
    steps: [st("summary"), st("share", { text: "My day so far: {{summary}}" })],
  },
];

export function fromTemplate(t: WorkflowTemplate): Omit<Workflow, "id" | "createdAt" | "updatedAt"> {
  return {
    name: t.name,
    emoji: t.emoji,
    color: t.color,
    description: t.description,
    trigger: { ...t.trigger },
    steps: t.steps.map((x) => ({ ...x, id: Math.random().toString(36).slice(2, 10), params: { ...x.params } })),
    enabled: true,
    pinned: t.trigger.type === "manual",
    runs: 0,
    template: t.key,
  };
}
