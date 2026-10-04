"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CrudPage } from "@/components/CrudPage";
import { CheckCircle } from "@/components/Form";
import { Card } from "@/components/ui";
import type { Medicine } from "@/lib/db";
import { add, all, remove, update } from "@/lib/data";
import { cn } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { toast } from "@/lib/store";

export default function Medicines() {
  const today = todayIso();
  const logs = useLiveQuery(async () => (await all("medLogs")).filter((l) => l.date === today), [today]);
  const taken = (m: Medicine, t: string) => logs?.find((l) => l.medId === m.id && l.time === t);

  const toggle = async (m: Medicine, t: string) => {
    const l = taken(m, t);
    if (l) {
      await remove("medLogs", l.id);
      if (m.stock != null) await update("medicines", m.id, { stock: m.stock + (m.perDose ?? 1) });
    } else {
      await add("medLogs", { medId: m.id, date: today, time: t });
      if (m.stock != null) {
        const stock = Math.max(0, m.stock - (m.perDose ?? 1));
        await update("medicines", m.id, { stock });
        if (stock <= (m.perDose ?? 1) * m.times.length * 5) toast(`${m.name}: ${stock} left. Time to refill`, { emoji: "💊" });
      }
    }
  };

  return (
    <CrudPage<Medicine>
      table="medicines"
      title="Medications"
      noun="Medication"
      fields={[
        { name: "name", label: "Name", type: "text", required: true, placeholder: "Vitamin D3" },
        { name: "dose", label: "Dose", type: "text", placeholder: "1 tablet, 5 ml…", half: true },
        { name: "person", label: "For", type: "person", half: true },
        { name: "times", label: "Times each day", type: "times" },
        { name: "stock", label: "Pills in stock", type: "number", half: true },
        { name: "perDose", label: "Pills per dose", type: "number", half: true },
        { name: "endDate", label: "Course ends", type: "date" },
        { name: "active", label: "Active", type: "toggle" },
      ]}
      defaults={() => ({ times: ["09:00"], active: true, perDose: 1 })}
      sort={(a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)}
      empty={{ emoji: "💊", title: "No medications", hint: "Add a schedule, check off doses, and get refill alerts." }}
      header={(rows) => {
        const active = rows.filter((m) => m.active && (!m.endDate || m.endDate >= today));
        const doses = active.flatMap((m) => m.times.map((t) => ({ m, t }))).sort((a, b) => a.t.localeCompare(b.t));
        if (!doses.length) return null;
        const done = doses.filter((d) => taken(d.m, d.t)).length;
        return (
          <Card strong className="mb-3">
            <div className="mb-2 flex justify-between text-[13px] font-semibold uppercase text-muted">
              <span>Today</span>
              <span>
                {done}/{doses.length} taken
              </span>
            </div>
            {doses.map(({ m, t }) => {
              const on = !!taken(m, t);
              return (
                <div key={`${m.id}-${t}`} className="flex items-center gap-3 border-b border-hairline py-2 last:border-0">
                  <CheckCircle done={on} onClick={() => toggle(m, t)} color="#ff375f" />
                  <div className={cn("flex-1", on && "text-muted line-through")}>
                    <b>{m.name}</b> {m.dose && <span className="text-muted">· {m.dose}</span>}
                    {m.person && <span className="text-[12px] text-muted"> · {m.person}</span>}
                  </div>
                  <span className="text-[14px] tabular-nums text-muted">{t}</span>
                </div>
              );
            })}
          </Card>
        );
      }}
      render={(m) => {
        const daysLeft = m.stock != null && m.perDose ? Math.floor(m.stock / (m.perDose * Math.max(1, m.times.length))) : null;
        return (
          <div className={cn("flex items-center gap-3", !m.active && "opacity-50")}>
            <span className="text-2xl">💊</span>
            <div className="flex-1">
              <div className="font-semibold">{m.name}</div>
              <div className="text-[13px] text-muted">
                {m.times.join(", ")}
                {m.person ? ` · ${m.person}` : ""}
              </div>
            </div>
            {daysLeft != null && <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold", daysLeft <= 5 ? "bg-bad/15 text-bad" : "bg-hairline text-muted")}>{daysLeft}d left</span>}
          </div>
        );
      }}
    />
  );
}
