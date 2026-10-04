"use client";

import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { ChevronRight, GripVertical, Settings2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle } from "@/components/Form";
import { Mascot, type MascotMood } from "@/components/Mascot";
import { WaterGlass } from "@/components/WaterGlass";
import { ModuleTile } from "@/components/Hub";
import { WeatherWidget } from "@/components/Weather";
import { moduleFor } from "@/lib/nav";
import { runWorkflow } from "@/lib/runner";
import { AnimatedNumber, Bar, Btn, Card, IconBtn, Ring, Sheet, Toggle } from "@/components/ui";
import { addWater, completeTask, payBill, toggleHabit } from "@/lib/actions";
import { confetti } from "@/lib/confetti";
import { JOURNAL_PROMPTS, MOOD_SCALE } from "@/lib/constants";
import { all, add } from "@/lib/data";
import { greeting, money, cn } from "@/lib/format";
import { buildReminders, dueLabel } from "@/lib/reminders";
import { todayIso } from "@/lib/recurrence";
import { saveSettings, useSettings, type FocusMode } from "@/lib/settings";
import { feedback } from "@/lib/sound";
import { focusActions, toast } from "@/lib/store";
import { habitStreak } from "@/lib/streaks";

const WIDGETS: { id: string; label: string }[] = [
  { id: "favorites", label: "Favorites" },
  { id: "weather", label: "Weather" },
  { id: "rings", label: "Daily Rings" },
  { id: "shortcuts", label: "Workflows" },
  { id: "fasting", label: "Fasting" },
  { id: "upnext", label: "Up Next" },
  { id: "habits", label: "Habits" },
  { id: "mood", label: "State of Mind" },
  { id: "water", label: "Water" },
  { id: "spending", label: "Spending" },
  { id: "countdowns", label: "Countdowns" },
  { id: "journal", label: "Journal prompt" },
  { id: "focus", label: "Focus" },
  { id: "onthisday", label: "On This Day" },
  { id: "recap", label: "Weekly Recap" },
];

const FOCUS_FILTER: Record<FocusMode, string[] | null> = {
  personal: null,
  off: null,
  fitness: ["favorites", "weather", "rings", "shortcuts", "fasting", "habits", "water", "mood", "countdowns"],
  sleep: ["shortcuts", "rings", "mood", "journal", "onthisday"],
};

function useTodayData() {
  return useLiveQuery(async () => {
    const [habits, habitLogs, water, workouts, moods, expenses, budgets, bills, tasks, docs, warranties, dates, maintenance, vehicles, wallet, capsules, medicines, journal, countdowns, focus, sleep, metrics, care, workflows, fasts] = await Promise.all([
      all("habits"), all("habitLogs"), all("water"), all("workouts"), all("moods"), all("expenses"), all("budgets"), all("bills"), all("tasks"), all("docs"), all("warranties"), all("dates"), all("maintenance"), all("vehicles"), all("wallet"), all("capsules"), all("medicines"), all("journal"), all("countdowns"), all("focus"), all("sleep"), all("metrics"), all("care"), all("workflows"), all("fasts"),
    ]);
    return { habits, habitLogs, water, workouts, moods, expenses, budgets, bills, tasks, docs, warranties, dates, maintenance, vehicles, wallet, capsules, medicines, journal, countdowns, focus, sleep, metrics, care, workflows, fasts };
  }, []);
}

export default function Today() {
  const s = useSettings();
  const d = useTodayData();
  const today = todayIso();
  const [editing, setEditing] = useState(false);
  const [hour] = useState(() => new Date().getHours());
  const [now] = useState(() => Date.now());
  const now2 = useMinuteClock();

  const m = useMemo(() => {
    if (!d) return null;
    const activeHabits = d.habits.filter((h) => !h.archived);
    const doneToday = new Set(d.habitLogs.filter((l) => l.date === today).map((l) => l.habitId));
    const water = d.water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
    const move = d.workouts.filter((w) => w.date === today).reduce((a, w) => a + w.minutes, 0);
    const habitsDone = activeHabits.filter((h) => doneToday.has(h.id)).length;
    const steps = d.metrics.find((x) => x.type === "steps" && x.date === today)?.value ?? 0;
    const rings = {
      move: steps / Math.max(1, s.stepGoal),
      water: water / Math.max(1, s.waterGoal),
      habits: activeHabits.length ? habitsDone / activeHabits.length : 0,
    };
    const reminders = buildReminders(d, today, 3, 14);
    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthExp = d.expenses.filter((e) => e.kind === "expense" && e.date >= monthStart);
    const spent = monthExp.reduce((a, e) => a + e.amount, 0);
    const budget = d.budgets.reduce((a, b) => a + b.amount, 0);
    const moodToday = d.moods.filter((x) => x.date === today).sort((a, b) => b.at - a.at)[0];
    const journaled = d.journal.some((j) => j.date === today);
    const mmdd = today.slice(5);
    const onThisDay = d.journal.filter((j) => j.date.slice(5) === mmdd && j.date < today).sort((a, b) => b.date.localeCompare(a.date))[0];
    const countdowns = d.countdowns.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    const weekAgo = format(addDays(new Date(), -6), "yyyy-MM-dd");
    const recap = {
      spent: d.expenses.filter((e) => e.kind === "expense" && e.date >= weekAgo).reduce((a, e) => a + e.amount, 0),
      habits: d.habitLogs.filter((l) => l.date >= weekAgo).length,
      water: d.water.filter((w) => w.date >= weekAgo).reduce((a, w) => a + w.ml, 0) / 7,
      focus: d.focus.filter((f) => f.date >= weekAgo).reduce((a, f) => a + f.minutes, 0),
      mood: (() => {
        const ms = d.moods.filter((x) => x.date >= weekAgo);
        return ms.length ? ms.reduce((a, x) => a + x.value, 0) / ms.length : 0;
      })(),
    };
    const focusToday = d.focus.filter((f) => f.date === today).reduce((a, f) => a + f.minutes, 0);
    return { activeHabits, doneToday, water, move, steps, habitsDone, rings, reminders, spent, budget, moodToday, journaled, onThisDay, countdowns, recap, focusToday };
  }, [d, today, s.waterGoal, s.stepGoal]);

  const mood: MascotMood = !m ? "calm" : hour >= 22 || hour < 5 || s.focusMode === "sleep" ? "sleepy" : m.rings.move >= 1 && m.rings.water >= 1 && m.rings.habits >= 1 ? "cheer" : m.reminders.some((r) => r.daysLeft < 0) ? "worried" : hour < 10 ? "calm" : "happy";

  const order = [...s.widgetOrder.filter((id) => WIDGETS.some((w) => w.id === id)), ...WIDGETS.map((w) => w.id).filter((id) => !s.widgetOrder.includes(id))];
  const allow = FOCUS_FILTER[s.focusMode];
  const visible = order.filter((id) => !s.hiddenWidgets.includes(id) && (!allow || allow.includes(id)));

  if (!d || !m) return <TodaySkeleton />;

  const widget = (id: string) => {
    switch (id) {
      case "favorites": {
        const favs = s.favorites.map(moduleFor).filter((x): x is NonNullable<typeof x> => !!x);
        if (!favs.length) return null;
        return (
          <div className="glass rounded-[26px] px-2 py-3">
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {favs.map((f, i) => (
                <ModuleTile key={f.href} m={f} i={i} compact />
              ))}
            </div>
          </div>
        );
      }
      case "weather":
        return <WeatherWidget />;
      case "shortcuts": {
        const flows = d.workflows.filter((w) => w.pinned && w.enabled).slice(0, 6);
        return (
          <Card>
            <WidgetTitle href="/more/workflows/" title="Workflows" />
            {flows.length === 0 ? (
              <Link href="/more/workflows/" className="text-[15px] font-medium text-accent">
                ⚡ Add ready-made workflows →
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {flows.map((w) => (
                  <motion.button key={w.id} whileTap={{ scale: 0.93 }} onClick={() => runWorkflow(w, { source: "manual" })} className="flex items-center gap-2 rounded-2xl p-2.5 text-left text-white" style={{ background: `linear-gradient(145deg, ${w.color}, color-mix(in srgb, ${w.color} 60%, black))` }}>
                    <span className="text-xl">{w.emoji}</span>
                    <span className="truncate text-[14px] font-semibold">{w.name}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </Card>
        );
      }
      case "fasting": {
        const f = d.fasts.find((x) => !x.end);
        if (!f) return null;
        const hrs = (now2 - f.start) / 3600_000;
        return (
          <Card href="/health/fasting/" className="flex items-center gap-4">
            <Ring value={hrs / f.goalHours} size={56} stroke={7} color="#30d158">
              <span className="text-lg">🥗</span>
            </Ring>
            <div className="flex-1">
              <div className="text-[13px] font-semibold uppercase text-muted">Fasting</div>
              <div className="text-[20px] font-bold">
                {Math.floor(hrs)}h {Math.floor((hrs % 1) * 60)}m <span className="text-[14px] font-medium text-muted">/ {f.goalHours}h</span>
              </div>
            </div>
          </Card>
        );
      }
      case "rings":
        return (
          <Card href="/health/">
            <div className="flex items-center gap-5">
              <div className="relative grid place-items-center">
                <Ring value={m.rings.move} size={118} stroke={13} color="#ff375f" />
                <div className="absolute">
                  <Ring value={m.rings.water} size={88} stroke={13} color="#64d2ff" />
                </div>
                <div className="absolute">
                  <Ring value={m.rings.habits} size={58} stroke={13} color="#30d158" />
                </div>
              </div>
              <div className="space-y-2 text-[15px]">
                <RingLabel color="#ff375f" label="Steps" value={`${m.steps.toLocaleString()}/${(s.stepGoal / 1000).toFixed(0)}k`} />
                <RingLabel color="#64d2ff" label="Hydrate" value={`${(m.water / 1000).toFixed(1)}/${(s.waterGoal / 1000).toFixed(1)} L`} />
                <RingLabel color="#30d158" label="Habits" value={`${m.habitsDone}/${m.activeHabits.length}`} />
                {m.move > 0 && <div className="text-[12px] text-muted">🏃 {m.move} min exercise</div>}
              </div>
            </div>
          </Card>
        );
      case "upnext":
        return (
          <Card>
            <WidgetTitle href="/life/tasks/" title="Up Next" />
            {m.reminders.length === 0 && <p className="py-2 text-[15px] text-muted">All clear. Nothing due soon 🎈</p>}
            <AnimatePresence initial={false}>
              {m.reminders.slice(0, 6).map((r) => {
                const bill = r.kind === "bill" ? d.bills.find((b) => `bill-${b.id}` === r.id) : undefined;
                const task = r.kind === "task" ? d.tasks.find((t) => `task-${t.id}` === r.id) : undefined;
                return (
                  <motion.div key={r.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, x: 40 }} className="flex items-center gap-3 border-b border-hairline py-2.5 last:border-0">
                    {bill || task ? <CheckCircle done={false} onClick={() => (bill ? payBill(bill) : completeTask(task!))} /> : <span className="w-6 text-center">{KIND_EMOJI[r.kind]}</span>}
                    <Link href={r.href} className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">{r.title}</div>
                      {r.subtitle && <div className="text-[12px] text-muted">{r.subtitle}</div>}
                    </Link>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold", r.daysLeft < 0 ? "bg-bad/15 text-bad" : r.daysLeft === 0 ? "bg-warn/15 text-warn" : "bg-hairline text-muted")}>{dueLabel(r.daysLeft)}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Card>
        );
      case "habits":
        return (
          <Card>
            <WidgetTitle href="/health/habits/" title="Habits" />
            {m.activeHabits.length === 0 ? (
              <Link href="/health/habits/" className="text-[15px] font-medium text-accent">
                Create your first habit →
              </Link>
            ) : (
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {m.activeHabits.map((h) => {
                  const done = m.doneToday.has(h.id);
                  const streak = habitStreak(d.habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date), h.perWeek, today);
                  return (
                    <motion.button
                      key={h.id}
                      whileTap={{ scale: 0.88 }}
                      onClick={async () => {
                        const on = await toggleHabit(h.id);
                        if (on && m.habitsDone + 1 === m.activeHabits.length) {
                          confetti();
                          toast("All habits done today!", { emoji: "🏆" });
                        }
                      }}
                      className="flex w-[72px] shrink-0 flex-col items-center gap-1"
                    >
                      <Ring value={done ? 1 : 0} size={60} stroke={5} color={h.color}>
                        <motion.span animate={{ scale: done ? [1, 1.35, 1] : 1 }} className="text-2xl">
                          {h.emoji}
                        </motion.span>
                      </Ring>
                      <span className="w-full truncate text-center text-[12px] font-medium">{h.name}</span>
                      <span className="text-[11px] text-muted">🔥 {streak}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      case "water":
        return (
          <Card>
            <WidgetTitle href="/health/water/" title="Water" />
            <div className="flex items-center gap-4">
              <WaterGlass value={m.water / s.waterGoal} />
              <div className="flex-1">
                <div className="text-[28px] font-bold tracking-tight">
                  <AnimatedNumber value={m.water} /> <span className="text-[15px] font-medium text-muted">/ {s.waterGoal} ml</span>
                </div>
                <div className="mt-2 flex gap-2">
                  {[150, 250, 500].map((ml) => (
                    <Btn key={ml} variant="soft" sound={null} className="px-3.5 py-2 text-[14px]" onClick={() => addWater(ml)}>
                      +{ml}
                    </Btn>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
      case "mood":
        return (
          <Card>
            <WidgetTitle href="/health/mood/" title="How are you feeling?" />
            {m.moodToday ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl">{MOOD_SCALE[m.moodToday.value - 1].emoji}</span>
                <div>
                  <div className="font-semibold">{MOOD_SCALE[m.moodToday.value - 1].label}</div>
                  <div className="text-[13px] text-muted">{m.moodToday.feelings.join(", ") || "Logged today"}</div>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                {MOOD_SCALE.map((x) => (
                  <motion.button
                    key={x.v}
                    whileTap={{ scale: 0.8 }}
                    whileHover={{ scale: 1.15, y: -3 }}
                    aria-label={x.label}
                    onClick={async () => {
                      await add("moods", { date: today, at: Date.now(), value: x.v, feelings: [], associations: [] });
                      feedback("success");
                      toast(`Feeling ${x.label.toLowerCase()}`, { emoji: x.emoji });
                    }}
                    className="grid h-12 w-12 place-items-center rounded-full text-3xl"
                    style={{ background: `color-mix(in srgb, ${x.color} 18%, transparent)` }}
                  >
                    {x.emoji}
                  </motion.button>
                ))}
              </div>
            )}
          </Card>
        );
      case "spending": {
        const ratio = m.budget ? m.spent / m.budget : 0;
        return (
          <Card href="/money/">
            <WidgetTitle title="This month" />
            <div className="text-[28px] font-bold tracking-tight">
              <AnimatedNumber value={m.spent} format={(n) => money(n, s.currency)} />
            </div>
            {m.budget > 0 ? (
              <>
                <Bar value={ratio} className="mt-2" color={ratio > 1 ? "var(--bad)" : ratio > 0.8 ? "var(--warn)" : "var(--good)"} />
                <div className="mt-1 text-[13px] text-muted">
                  {ratio > 1 ? `${money(m.spent - m.budget, s.currency)} over budget` : `${money(m.budget - m.spent, s.currency)} left of ${money(m.budget, s.currency)}`}
                </div>
              </>
            ) : (
              <div className="text-[13px] text-muted">Set budgets to track limits</div>
            )}
          </Card>
        );
      }
      case "countdowns":
        if (!m.countdowns.length) return null;
        return (
          <div className="grid grid-cols-2 gap-3">
            {m.countdowns.map((c) => (
              <Card key={c.id} href="/life/countdowns/">
                <div className="text-2xl">{c.emoji}</div>
                <div className="mt-1 text-[32px] font-bold leading-none tracking-tight">{differenceInCalendarDays(parseISO(c.date), parseISO(today))}</div>
                <div className="text-[12px] text-muted">days until</div>
                <div className="truncate text-[14px] font-semibold">{c.title}</div>
              </Card>
            ))}
          </div>
        );
      case "journal":
        return (
          <Card href="/life/journal/?new=1">
            <WidgetTitle title={m.journaled ? "Journal ✓" : "Today's prompt"} />
            <p className="text-[17px] font-medium leading-snug">{m.journaled ? "You've written today. Beautiful. ✨" : JOURNAL_PROMPTS[parseInt(today.replaceAll("-", "")) % JOURNAL_PROMPTS.length]}</p>
          </Card>
        );
      case "focus":
        return (
          <Card>
            <WidgetTitle href="/life/focus/" title="Focus" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[28px] font-bold tracking-tight">{m.focusToday} min</div>
                <div className="text-[13px] text-muted">focused today</div>
              </div>
              <Btn onClick={() => (focusActions.start(s.focusMinutes, "Focus"), toast("Focus started", { emoji: "⏱️" }))}>Start {s.focusMinutes}m</Btn>
            </div>
          </Card>
        );
      case "onthisday":
        if (!m.onThisDay) return null;
        return (
          <Card href="/life/journal/">
            <WidgetTitle title={`On this day · ${m.onThisDay.date.slice(0, 4)}`} />
            <p className="line-clamp-3 text-[15px] italic">“{m.onThisDay.text}”</p>
          </Card>
        );
      case "recap":
        return (
          <Card>
            <WidgetTitle title="Last 7 days" />
            <div className="grid grid-cols-2 gap-3 text-[14px]">
              <RecapItem emoji="💸" label="Spent" value={money(m.recap.spent, s.currency)} />
              <RecapItem emoji="✅" label="Habit check-ins" value={String(m.recap.habits)} />
              <RecapItem emoji="💧" label="Avg water" value={`${(m.recap.water / 1000).toFixed(1)} L`} />
              <RecapItem emoji="⏱️" label="Focus" value={`${m.recap.focus} min`} />
              <RecapItem emoji="🌈" label="Avg mood" value={m.recap.mood ? MOOD_SCALE[Math.round(m.recap.mood) - 1].emoji + " " + m.recap.mood.toFixed(1) : "—"} />
              <RecapItem emoji="🌙" label="Sleep logs" value={String(d.sleep.filter((x) => x.date >= format(addDays(new Date(), -6), "yyyy-MM-dd")).length)} />
            </div>
          </Card>
        );
    }
  };

  return (
    <div className="pt-safe">
      <div className="flex items-start justify-between pt-6">
        <div>
          <div className="text-[13px] font-semibold uppercase tracking-wide text-muted">{format(new Date(), "EEEE, d MMMM")}</div>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight">
            {greeting(hour)}
            {s.name ? `, ${s.name}` : ""}
          </h1>
        </div>
        <div className="flex gap-2">
          <IconBtn label="Edit widgets" onClick={() => setEditing(true)}>
            <Settings2 size={18} />
          </IconBtn>
        </div>
      </div>

      <FocusModePicker />

      {s.mascot && (
        <div className="my-3">
          <Mascot mood={mood} />
        </div>
      )}

      {(!s.lastBackup || now - s.lastBackup > 14 * 864e5) && <BackupNudge />}

      <motion.div className="mt-3 space-y-3" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
        {visible.map((id) => {
          const w = widget(id);
          if (!w) return null;
          return (
            <motion.div key={id} layout variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>
              {w}
            </motion.div>
          );
        })}
      </motion.div>

      <WidgetEditor open={editing} onClose={() => setEditing(false)} order={order} hidden={s.hiddenWidgets} />
      <Onboarding show={!s.onboarded} />
    </div>
  );
}

function useMinuteClock() {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function TodaySkeleton() {
  return (
    <div className="pt-safe animate-pulse space-y-3 pt-8">
      <div className="h-4 w-32 rounded-full bg-hairline" />
      <div className="h-9 w-56 rounded-full bg-hairline" />
      {[96, 150, 200, 120].map((h, i) => (
        <div key={i} className="glass rounded-[26px]" style={{ height: h }} />
      ))}
    </div>
  );
}

const KIND_EMOJI: Record<string, string> = { care: "🐾", bill: "🧾", task: "☑️", document: "🗂️", warranty: "🛡️", birthday: "🎂", anniversary: "💞", date: "📅", maintenance: "🏠", vehicle: "🚗", wallet: "💳", capsule: "💌", medicine: "💊" };

function RingLabel({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div>
      <div className="text-[13px] font-semibold" style={{ color }}>
        {label}
      </div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}

function WidgetTitle({ title, href }: { title: string; href?: string }) {
  const inner = (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</span>
      {href && <ChevronRight size={16} className="text-faint" />}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function RecapItem({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-hairline/60 p-2.5">
      <span className="text-xl">{emoji}</span>
      <div className="min-w-0">
        <div className="truncate text-[12px] text-muted">{label}</div>
        <div className="truncate font-semibold">{value}</div>
      </div>
    </div>
  );
}

function FocusModePicker() {
  const s = useSettings();
  const modes: { id: FocusMode; label: string; emoji: string }[] = [
    { id: "personal", label: "Personal", emoji: "🙂" },
    { id: "fitness", label: "Fitness", emoji: "🏃" },
    { id: "sleep", label: "Sleep", emoji: "🌙" },
  ];
  return (
    <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
      {modes.map((mo) => {
        const on = s.focusMode === mo.id;
        return (
          <motion.button key={mo.id} whileTap={{ scale: 0.92 }} onClick={() => (feedback("toggle"), saveSettings({ focusMode: mo.id }), toast(`${mo.label} focus on`, { emoji: mo.emoji, ms: 1500 }))} className={cn("relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold", on ? "text-white" : "glass")}>
            {on && <motion.span layoutId="focus-mode" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative">{mo.emoji}</span>
            <span className="relative">{mo.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function BackupNudge() {
  return (
    <Link href="/more/settings/#backup" className="glass mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px]">
      <span className="text-xl">🛟</span>
      <span className="flex-1">Your data lives only on this device. Back it up.</span>
      <ChevronRight size={16} className="text-faint" />
    </Link>
  );
}

function WidgetEditor({ open, onClose, order, hidden }: { open: boolean; onClose: () => void; order: string[]; hidden: string[] }) {
  const [items, setItems] = useState(order);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setItems(order);
  }
  return (
    <Sheet open={open} onClose={onClose} title="Edit Today" footer={<Btn full onClick={() => (saveSettings({ widgetOrder: items }), onClose())}>Done</Btn>}>
      <p className="mb-3 text-[14px] text-muted">Drag to reorder. Toggle to show or hide.</p>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
        {items.map((id) => (
          <Reorder.Item key={id} value={id} className="flex items-center gap-3 rounded-2xl bg-hairline px-3 py-2.5">
            <GripVertical size={18} className="cursor-grab text-muted" />
            <span className="flex-1 font-medium">{WIDGETS.find((w) => w.id === id)?.label}</span>
            <Toggle checked={!hidden.includes(id)} onChange={(v) => saveSettings({ hiddenWidgets: v ? hidden.filter((x) => x !== id) : [...hidden, id] })} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </Sheet>
  );
}

function Onboarding({ show }: { show: boolean }) {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  return (
    <Sheet open={show} onClose={() => saveSettings({ onboarded: true })} title={step === 0 ? "Welcome to Praxis" : "Make it yours"}>
      {step === 0 ? (
        <div className="space-y-4 pb-2 text-center">
          <div className="flex justify-center">
            <Mascot mood="cheer" speak={false} size={110} />
          </div>
          <p className="text-[16px]">I&apos;m your <b>Praxis Companion</b>! I&apos;ll help you keep track of money, health, habits, and everything in life, all private and on your device.</p>
          <Btn full onClick={() => setStep(1)}>Let&apos;s go</Btn>
        </div>
      ) : (
        <div className="space-y-4 pb-2">
          <input className="field" autoFocus placeholder="What should I call you?" value={name} onChange={(e) => setName(e.target.value)} />
          <Btn
            full
            sound="levelup"
            onClick={async () => {
              await saveSettings({ name: name.trim(), onboarded: true });
              confetti();
            }}
          >
            Start
          </Btn>
          <button className="w-full text-[14px] text-muted" onClick={async () => {
            const { seedDemo } = await import("@/lib/seed");
            await seedDemo();
            await saveSettings({ name: name.trim() || "Alex", onboarded: true });
            confetti();
          }}>
            Or explore with demo data
          </button>
        </div>
      )}
    </Sheet>
  );
}
