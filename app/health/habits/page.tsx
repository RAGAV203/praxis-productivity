"use client";

import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { motion } from "motion/react";
import { Archive, BarChart3, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useCrud } from "@/components/CrudPage";
import { Empty, IconBtn, PageHeader, Sheet, SwipeRow } from "@/components/ui";
import { toggleHabit } from "@/lib/actions";
import { confetti } from "@/lib/confetti";
import type { Habit } from "@/lib/db";
import { update, useRows } from "@/lib/data";
import { cn } from "@/lib/format";
import { iso, todayIso } from "@/lib/recurrence";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";
import { habitStreak, longestDayStreak } from "@/lib/streaks";

export default function Habits() {
  const habits = useRows("habits");
  const logs = useRows("habitLogs");
  const [stats, setStats] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const today = todayIso();
  const week = Array.from({ length: 7 }, (_, i) => iso(addDays(parseISO(today), i - 6)));

  const crud = useCrud<Habit>({
    table: "habits",
    noun: "Habit",
    defaults: () => ({ emoji: "✨", color: "#30d158", perWeek: 7 }),
    fields: [
      { name: "emoji", label: "Icon", type: "emoji" },
      { name: "name", label: "Habit", type: "text", required: true, placeholder: "Read 10 pages, Walk 8k steps…" },
      { name: "color", label: "Colour", type: "color" },
      { name: "perWeek", label: "Times per week", type: "chips", options: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: n === 7 ? "Daily" : `${n}×` })) },
      { name: "reminder", label: "Reminder time", type: "time" },
      { name: "archived", label: "Archived", type: "toggle" },
    ],
    toRow: (v) => ({ ...v, perWeek: Number(v.perWeek) || 7 }),
    fromRow: (h) => ({ ...h, perWeek: String(h.perWeek) }),
  });

  const byHabit = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of logs ?? []) {
      if (!m.has(l.habitId)) m.set(l.habitId, new Set());
      m.get(l.habitId)!.add(l.date);
    }
    return m;
  }, [logs]);

  const list = (habits ?? []).filter((h) => !!h.archived === showArchived);
  const active = (habits ?? []).filter((h) => !h.archived);
  const doneToday = active.filter((h) => byHabit.get(h.id)?.has(today)).length;

  const tap = async (h: Habit, date: string) => {
    const on = await toggleHabit(h.id, date);
    if (on && date === today && doneToday + 1 === active.length) {
      confetti();
      feedback("levelup");
      toast("Perfect day! All habits done", { emoji: "🏆" });
    }
    const dates = [...(byHabit.get(h.id) ?? []), date];
    const st = habitStreak(dates, h.perWeek, today);
    if (on && [7, 21, 30, 50, 100, 365].includes(st)) {
      confetti();
      toast(`${st}-day streak on ${h.name}!`, { emoji: "🔥" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Habits"
        back
        subtitle={active.length ? `${doneToday} of ${active.length} done today` : undefined}
        actions={
          <>
            <IconBtn label={showArchived ? "Show active" : "Show archived"} onClick={() => setShowArchived((x) => !x)} className={showArchived ? "bg-accent! text-white" : ""}>
              <Archive size={17} />
            </IconBtn>
            <IconBtn label="New habit" onClick={crud.create} className="bg-accent! text-white">
              <Plus size={20} />
            </IconBtn>
          </>
        }
      />
      {habits && list.length === 0 && <Empty emoji={showArchived ? "🗄️" : "🌱"} title={showArchived ? "No archived habits" : "Start a habit"} hint="Tiny daily actions compound into a new you." action={!showArchived ? <button className="font-semibold text-accent" onClick={crud.create}>Create habit</button> : undefined} />}
      {list.map((h) => {
        const set = byHabit.get(h.id) ?? new Set<string>();
        const streak = habitStreak([...set], h.perWeek, today);
        return (
          <SwipeRow key={h.id} onDelete={() => crud.del(h)} onComplete={() => update("habits", h.id, { archived: !h.archived })} completeLabel={h.archived ? "Restore" : "Archive"}>
            <div className="p-3.5">
              <button className="flex w-full min-w-0 items-center gap-3 text-left" onClick={() => crud.edit(h)}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-2xl" style={{ background: `color-mix(in srgb, ${h.color} 18%, transparent)` }}>
                  {h.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{h.name}</span>
                  <span className="block text-[12px] text-muted">{h.perWeek >= 7 ? "Daily" : `${h.perWeek}× per week`}</span>
                </span>
                <span className="shrink-0 rounded-full bg-hairline px-2.5 py-1 text-[13px] font-semibold">
                  🔥 {streak} {h.perWeek >= 7 ? "d" : "wk"}
                </span>
              </button>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {week.map((d) => {
                  const on = set.has(d);
                  return (
                    <div key={d} className="flex flex-col items-center gap-1">
                      <span className={cn("text-[11px] font-semibold", d === today ? "text-fg" : "text-muted")}>{format(parseISO(d), "EEEEE")}</span>
                      <motion.button whileTap={{ scale: 0.75 }} aria-label={`${h.name} ${d}`} onClick={() => tap(h, d)} className={cn("grid aspect-square w-full max-w-10 place-items-center rounded-full border-2 text-[13px] font-bold transition-colors", d === today && !on && "border-dashed")} style={{ borderColor: h.color, background: on ? h.color : "transparent", color: on ? "white" : h.color }}>
                        {on ? "✓" : ""}
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setStats(h)} className="flex w-full items-center justify-center gap-1 border-t border-hairline py-1.5 text-[12px] font-medium text-muted">
              <BarChart3 size={13} /> History
            </button>
          </SwipeRow>
        );
      })}
      <Sheet open={!!stats} onClose={() => setStats(null)} title={stats ? `${stats.emoji} ${stats.name}` : ""}>
        {stats && <HabitStats habit={stats} dates={byHabit.get(stats.id) ?? new Set()} />}
      </Sheet>
      {crud.sheet}
    </div>
  );
}

function HabitStats({ habit, dates }: { habit: Habit; dates: Set<string> }) {
  const today = todayIso();
  const weeks = 20;
  const start = addDays(startOfWeek(parseISO(today), { weekStartsOn: 1 }), -(weeks - 1) * 7);
  const total = dates.size;
  const last30 = [...dates].filter((d) => d >= iso(addDays(parseISO(today), -29))).length;
  return (
    <div className="pb-2">
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-hairline p-3"><div className="text-[22px] font-bold">{habitStreak([...dates], habit.perWeek, today)}</div><div className="text-[12px] text-muted">current</div></div>
        <div className="rounded-2xl bg-hairline p-3"><div className="text-[22px] font-bold">{longestDayStreak(dates)}</div><div className="text-[12px] text-muted">best run</div></div>
        <div className="rounded-2xl bg-hairline p-3"><div className="text-[22px] font-bold">{total}</div><div className="text-[12px] text-muted">total</div></div>
      </div>
      <div className="mb-2 text-[13px] font-semibold text-muted">Last {weeks} weeks · {Math.round((last30 / 30) * 100)}% of last 30 days</div>
      <div className="overflow-x-auto">
        <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ width: "max-content" }}>
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const d = iso(addDays(start, i));
            const on = dates.has(d);
            return <motion.span key={d} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.003 }} title={d} className="h-4 w-4 rounded-[4px]" style={{ background: on ? habit.color : "var(--hairline)", opacity: d > today ? 0.3 : 1 }} />;
          })}
        </div>
      </div>
    </div>
  );
}
