"use client";

import { format, parseISO } from "date-fns";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CrudPage } from "@/components/CrudPage";
import { Card, Ring } from "@/components/ui";
import type { Sleep } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { sleepMinutes, sleepScore } from "@/lib/sleep";

const scoreColor = (s: number) => (s >= 85 ? "#30d158" : s >= 70 ? "#64d2ff" : s >= 50 ? "#ff9f0a" : "#ff453a");
const scoreLabel = (s: number) => (s >= 85 ? "Excellent" : s >= 70 ? "Good" : s >= 50 ? "Fair" : "Low");
const hm = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

export default function SleepPage() {
  return (
    <CrudPage<Sleep>
      table="sleep"
      title="Sleep"
      noun="Night"
      fields={[
        { name: "date", label: "Woke up on", type: "date", required: true },
        { name: "bed", label: "Bedtime", type: "time", required: true, half: true },
        { name: "wake", label: "Wake time", type: "time", required: true, half: true },
        { name: "quality", label: "How rested do you feel?", type: "rating" },
        { name: "note", label: "Note", type: "text", placeholder: "Late coffee, woke up at 3am…" },
      ]}
      defaults={() => ({ date: todayIso(), bed: "23:00", wake: "07:00", quality: 4 })}
      sort={(a, b) => b.date.localeCompare(a.date)}
      empty={{ emoji: "🌙", title: "No sleep logged", hint: "Log bedtime and wake time to get a nightly sleep score." }}
      header={(rows) => {
        if (!rows.length) return null;
        const last = [...rows].sort((a, b) => b.date.localeCompare(a.date));
        const sc = sleepScore(last[0].bed, last[0].wake, last[0].quality);
        const week = last.slice(0, 7);
        const avg = week.reduce((a, r) => a + sleepMinutes(r.bed, r.wake), 0) / week.length;
        const chart = [...last.slice(0, 14)].reverse().map((r) => ({ d: format(parseISO(r.date), "d"), score: sleepScore(r.bed, r.wake, r.quality) }));
        return (
          <Card strong className="mb-3">
            <div className="flex items-center gap-4">
              <Ring value={sc / 100} size={96} stroke={10} color={scoreColor(sc)}>
                <div className="text-center">
                  <div className="text-[26px] font-bold leading-none">{sc}</div>
                  <div className="text-[10px] text-muted">score</div>
                </div>
              </Ring>
              <div>
                <div className="text-[20px] font-bold" style={{ color: scoreColor(sc) }}>{scoreLabel(sc)}</div>
                <div className="text-[14px] text-muted">Last night · {hm(sleepMinutes(last[0].bed, last[0].wake))}</div>
                <div className="text-[14px] text-muted">7-night avg · {hm(Math.round(avg))}</div>
              </div>
            </div>
            {chart.length > 2 && (
              <div className="-mx-2 mt-3 h-28">
                <ResponsiveContainer>
                  <LineChart data={chart}>
                    <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} hide />
                    <Line type="monotone" dataKey="score" stroke="#5e5ce6" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        );
      }}
      render={(r) => {
        const sc = sleepScore(r.bed, r.wake, r.quality);
        return (
          <div className="flex items-center gap-3">
            <Ring value={sc / 100} size={44} stroke={5} color={scoreColor(sc)}>
              <span className="text-[13px] font-bold">{sc}</span>
            </Ring>
            <div className="flex-1">
              <div className="font-semibold">{fmtDate(r.date, "EEE, d MMM")}</div>
              <div className="text-[13px] text-muted">
                {r.bed} → {r.wake} · {hm(sleepMinutes(r.bed, r.wake))}
              </div>
            </div>
            <span>{"★".repeat(r.quality)}</span>
          </div>
        );
      }}
    />
  );
}
