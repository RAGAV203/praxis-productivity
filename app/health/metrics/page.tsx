"use client";

import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CrudPage } from "@/components/CrudPage";
import { Card, Segmented } from "@/components/ui";
import type { Metric } from "@/lib/db";
import { useKV, setKV } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";

type MType = Metric["type"];
const META: Record<MType, { label: string; unit: string; emoji: string; color: string }> = {
  weight: { label: "Weight", unit: "kg", emoji: "⚖️", color: "#0a84ff" },
  bp: { label: "Blood pressure", unit: "mmHg", emoji: "❤️", color: "#ff375f" },
  sugar: { label: "Blood sugar", unit: "mg/dL", emoji: "🩸", color: "#ff9f0a" },
  sleep: { label: "Sleep", unit: "h", emoji: "🌙", color: "#5e5ce6" },
  steps: { label: "Steps", unit: "", emoji: "👣", color: "#30d158" },
};

export default function Metrics() {
  const [type, setType] = useState<MType>("weight");
  const height = useKV<number>("heightCm", 0);
  return (
    <CrudPage<Metric>
      key={type}
      table="metrics"
      title="Body Metrics"
      noun="Reading"
      fields={[
        { name: "type", label: "Metric", type: "chips", options: (Object.keys(META) as MType[]).map((k) => ({ value: k, label: `${META[k].emoji} ${META[k].label}` })) },
        { name: "value", label: "Value", type: "number", required: true, half: true, hint: "Systolic for BP" },
        { name: "value2", label: "Diastolic (BP)", type: "number", half: true, when: (v) => v.type === "bp" },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "note", label: "Note", type: "text" },
      ]}
      defaults={() => ({ type, date: todayIso() })}
      filter={(m) => m.type === type}
      sort={(a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt}
      empty={{ emoji: META[type].emoji, title: `No ${META[type].label.toLowerCase()} readings`, hint: "Track numbers over the years and spot trends early." }}
      header={(rows) => {
        const mine = rows.filter((r) => r.type === type).sort((a, b) => a.date.localeCompare(b.date));
        const last = mine[mine.length - 1];
        const first = mine[0];
        const bmi = type === "weight" && last && height ? last.value / Math.pow(height / 100, 2) : null;
        return (
          <>
            <div className="no-scrollbar -mx-4 mb-3 overflow-x-auto px-4">
              <Segmented id="metric" value={type} onChange={setType} options={(Object.keys(META) as MType[]).map((k) => ({ value: k, label: META[k].emoji }))} />
            </div>
            {last && (
              <Card strong className="mb-3">
                <div className="text-[13px] font-semibold uppercase text-muted">{META[type].label}</div>
                <div className="text-[32px] font-bold">
                  {last.value}
                  {type === "bp" && last.value2 ? `/${last.value2}` : ""} <span className="text-[15px] text-muted">{META[type].unit}</span>
                </div>
                {mine.length > 1 && (
                  <div className="text-[13px] text-muted">
                    {last.value - first.value >= 0 ? "▲" : "▼"} {Math.abs(last.value - first.value).toFixed(1)} since {fmtDate(first.date)}
                  </div>
                )}
                {type === "weight" && (
                  <div className="mt-1 flex items-center gap-2 text-[13px]">
                    {bmi ? <span>BMI <b>{bmi.toFixed(1)}</b> {bmi < 18.5 ? "· underweight" : bmi < 25 ? "· healthy" : bmi < 30 ? "· overweight" : "· obese"}</span> : null}
                    <input className="field w-28 py-1.5! text-[13px]!" type="number" placeholder="Height cm" defaultValue={height || ""} onBlur={(e) => setKV("heightCm", Number(e.target.value) || 0)} aria-label="Height in cm" />
                  </div>
                )}
                {mine.length > 1 && (
                  <div className="-mx-2 mt-3 h-36">
                    <ResponsiveContainer>
                      <LineChart data={mine.map((m) => ({ d: format(parseISO(m.date), "d MMM"), v: m.value, v2: m.value2 }))}>
                        <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                        <YAxis domain={["auto", "auto"]} hide />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "none", background: "var(--glass-strong)" }} />
                        <Line type="monotone" dataKey="v" stroke={META[type].color} strokeWidth={2.5} dot={{ r: 3 }} />
                        {type === "bp" && <Line type="monotone" dataKey="v2" stroke="#ff9f0a" strokeWidth={2} dot={{ r: 2 }} />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            )}
          </>
        );
      }}
      render={(m) => (
          <div className="flex justify-between">
            <span>
              {META[m.type].emoji} {fmtDate(m.date, "EEE, d MMM yyyy")}
              {m.note && <span className="block text-[13px] text-muted">{m.note}</span>}
            </span>
            <span className="font-semibold">
              {m.value}
              {m.type === "bp" && m.value2 ? `/${m.value2}` : ""} {META[m.type].unit}
            </span>
          </div>
      )}
    />
  );
}
