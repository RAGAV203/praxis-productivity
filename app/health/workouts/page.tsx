"use client";

import { addDays, format, parseISO } from "date-fns";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import { CrudPage } from "@/components/CrudPage";
import { Card } from "@/components/ui";
import { WORKOUT_TYPES } from "@/lib/constants";
import type { Workout } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { iso, todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";

const EMOJI: Record<string, string> = { Walk: "🚶", Run: "🏃", Cycle: "🚴", Gym: "🏋️", Yoga: "🧘", Swim: "🏊", Sports: "⚽", HIIT: "🔥", Dance: "💃", Other: "💪" };

export default function Workouts() {
  const s = useSettings();
  const today = todayIso();
  return (
    <CrudPage<Workout>
      table="workouts"
      title="Workouts"
      noun="Workout"
      fields={[
        { name: "type", label: "Activity", type: "chips", options: WORKOUT_TYPES },
        { name: "minutes", label: "Minutes", type: "number", required: true, half: true },
        { name: "calories", label: "Calories", type: "number", half: true },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "notes", label: "Notes", type: "textarea", placeholder: "Sets, reps, distance…" },
      ]}
      defaults={() => ({ type: "Walk", date: today, minutes: 30 })}
      sort={(a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt}
      empty={{ emoji: "🏃", title: "No workouts yet", hint: `Close your Move ring with ${s.workoutGoal} active minutes a day.` }}
      header={(rows) => {
        const week = Array.from({ length: 7 }, (_, i) => {
          const d = iso(addDays(parseISO(today), i - 6));
          return { d: format(parseISO(d), "EEE"), min: rows.filter((r) => r.date === d).reduce((a, r) => a + r.minutes, 0) };
        });
        const total = week.reduce((a, w) => a + w.min, 0);
        return (
          <Card strong className="mb-3">
            <div className="flex justify-between">
              <div>
                <div className="text-[13px] font-semibold uppercase text-muted">This week</div>
                <div className="text-[28px] font-bold">{total} min</div>
              </div>
              <div className="text-right text-[13px] text-muted">
                Goal
                <br />
                <b className="text-fg">{s.workoutGoal * 7} min</b>
              </div>
            </div>
            <div className="-mx-2 h-28">
              <ResponsiveContainer>
                <BarChart data={week}>
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Bar dataKey="min" fill="#ff375f" radius={[8, 8, 8, 8]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        );
      }}
      render={(w) => (
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#ff375f]/15 text-2xl">{EMOJI[w.type] ?? "💪"}</span>
          <div className="flex-1">
            <div className="font-semibold">{w.type}</div>
            <div className="text-[13px] text-muted">
              {fmtDate(w.date, "EEE, d MMM")}
              {w.notes ? ` · ${w.notes}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{w.minutes} min</div>
            {w.calories ? <div className="text-[12px] text-muted">{w.calories} kcal</div> : null}
          </div>
        </div>
      )}
    />
  );
}
