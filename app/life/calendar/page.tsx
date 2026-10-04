"use client";

import { addDays, addMonths, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Btn, Card, Empty, IconBtn, PageHeader, Segmented, Toggle } from "@/components/ui";
import { eventsInRange, type CalEvent } from "@/lib/calendar";
import { add, all } from "@/lib/data";
import { cn, money } from "@/lib/format";
import { iso, todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";

export default function CalendarPage() {
  const s = useSettings();
  const today = todayIso();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<"month" | "agenda">("month");
  const [dir, setDir] = useState(0);
  const [draft, setDraft] = useState("");
  const [activity, setActivity] = useState(false);

  const gridStart = startOfWeek(month, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => iso(addDays(gridStart, i)));
  const from = view === "month" ? days[0] : today;
  const to = view === "month" ? days[41] : iso(addDays(new Date(), 45));

  const data = useLiveQuery(async () => {
    const [bills, tasks, dates, countdowns, trips, meals, journal, maintenance, care, docs, warranties, vehicles, workouts, expenses] = await Promise.all([
      all("bills"), all("tasks"), all("dates"), all("countdowns"), all("trips"), all("meals"), all("journal"), all("maintenance"), all("care"), all("docs"), all("warranties"), all("vehicles"), all("workouts"), all("expenses"),
    ]);
    const events = eventsInRange({ bills, tasks, dates, countdowns, trips, meals, journal, maintenance, care, docs, warranties, vehicles, workouts }, from, to);
    const spent = new Map<string, number>();
    for (const e of expenses) if (e.kind === "expense" && e.date >= from && e.date <= to) spent.set(e.date, (spent.get(e.date) ?? 0) + e.amount);
    return { events, spent };
  }, [from, to]);

  const byDay = new Map<string, CalEvent[]>();
  for (const e of (data?.events ?? []).filter((x) => activity || (x.kind !== "Journal" && x.kind !== "Workout"))) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const go = (n: number) => {
    feedback("tap");
    setDir(n);
    setMonth((m) => addMonths(m, n));
  };

  const dayEvents = byDay.get(selected) ?? [];
  const addTask = async () => {
    if (!draft.trim()) return;
    await add("tasks", { title: draft.trim(), done: false, priority: "med", due: selected });
    feedback("success");
    toast(`Reminder on ${format(parseISO(selected), "d MMM")}`, { emoji: "📅" });
    setDraft("");
  };

  return (
    <div>
      <PageHeader title="Calendar" back subtitle="Bills, reminders, birthdays, trips & more" actions={<IconBtn label="Today" onClick={() => (setMonth(startOfMonth(new Date())), setSelected(today))}><span className="text-[12px] font-bold">{format(new Date(), "d")}</span></IconBtn>} />
      <Segmented id="cal-view" value={view} onChange={setView} options={[{ value: "month", label: "Month" }, { value: "agenda", label: "Next 45 days" }]} />
      <div className="mt-2 flex items-center justify-end gap-2 text-[13px] text-muted">
        Show journal & workouts
        <Toggle checked={activity} onChange={setActivity} label="Show activity" />
      </div>

      {view === "month" ? (
        <>
          <div className="my-3 flex items-center justify-between">
            <IconBtn label="Previous month" onClick={() => go(-1)}>
              <ChevronLeft size={18} />
            </IconBtn>
            <span className="text-[18px] font-semibold">{format(month, "MMMM yyyy")}</span>
            <IconBtn label="Next month" onClick={() => go(1)}>
              <ChevronRight size={18} />
            </IconBtn>
          </div>
          <Card className="overflow-hidden p-2!">
            <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-semibold text-muted">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={format(month, "yyyy-MM")}
                custom={dir}
                initial={{ x: dir * 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -dir * 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 36 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, i: PanInfo) => (i.offset.x < -60 ? go(1) : i.offset.x > 60 ? go(-1) : null)}
                className="grid grid-cols-7 gap-0.5"
              >
                {days.map((d) => {
                  const evs = byDay.get(d) ?? [];
                  const inMonth = isSameMonth(parseISO(d), month);
                  const sel = d === selected;
                  const colors = [...new Set(evs.map((e) => e.color))].slice(0, 3);
                  return (
                    <button key={d} onClick={() => (feedback("tap"), setSelected(d))} className={cn("relative flex aspect-square flex-col items-center justify-center rounded-xl text-[14px] transition-colors", !inMonth && "opacity-35", sel ? "bg-accent text-white" : d === today ? "font-bold text-accent" : "")}>
                      {Number(d.slice(8))}
                      <span className="absolute bottom-1 flex gap-0.5">
                        {colors.map((c) => (
                          <span key={c} className="h-1 w-1 rounded-full" style={{ background: sel ? "white" : c }} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </Card>

          <div className="mb-2 mt-5 flex items-baseline justify-between px-1">
            <h2 className="text-[20px] font-semibold">{selected === today ? "Today" : format(parseISO(selected), "EEEE, d MMM")}</h2>
            {(data?.spent.get(selected) ?? 0) > 0 && <span className="text-[13px] text-muted">Spent {money(data!.spent.get(selected)!, s.currency)}</span>}
          </div>
          <div className="glass mb-3 flex items-center gap-2 rounded-[20px] py-1 pl-4 pr-1">
            <input className="h-11 flex-1 bg-transparent outline-none" placeholder={`Add reminder for ${format(parseISO(selected), "d MMM")}…`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <Btn className="h-9 w-9 p-0!" onClick={addTask} sound={null}>
              <Plus size={18} />
            </Btn>
          </div>
          {dayEvents.length === 0 ? <Empty emoji="🌤️" title="Nothing scheduled" hint="A free day. Enjoy it!" /> : <EventList events={dayEvents} />}
        </>
      ) : (
        <div className="mt-3">
          {data && data.events.length === 0 && <Empty emoji="🗓️" title="Nothing coming up" />}
          {[...byDay.entries()].map(([d, evs]) => (
            <div key={d}>
              <div className="mb-2 mt-4 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{d === today ? "Today" : format(parseISO(d), "EEE, d MMM")}</div>
              <EventList events={evs} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventList({ events }: { events: CalEvent[] }) {
  return (
    <div className="space-y-2">
      {events.map((e, i) => (
        <motion.div key={`${e.kind}-${e.title}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
          <Link href={e.href} className="glass flex items-center gap-3 rounded-[20px] p-3">
            <span className="h-9 w-1 rounded-full" style={{ background: e.color }} />
            <span className="text-xl">{e.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{e.title}</span>
              <span className="text-[12px] text-muted">{e.kind}</span>
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
