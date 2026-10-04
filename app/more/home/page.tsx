"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import { CheckCircle } from "@/components/Form";
import { doneMaintenance } from "@/lib/actions";
import type { Maintenance } from "@/lib/db";
import { cn, fmtShort, money } from "@/lib/format";
import { describeRule, todayIso } from "@/lib/recurrence";
import { dueLabel } from "@/lib/reminders";
import { useSettings } from "@/lib/settings";

export default function HomeCare() {
  const s = useSettings();
  const today = todayIso();
  return (
    <CrudPage<Maintenance>
      table="maintenance"
      title="Home Care"
      noun="Task"
      fields={[
        { name: "title", label: "Task", type: "text", required: true, placeholder: "AC service, RO filter, Pest control…" },
        { name: "nextDue", label: "Next due", type: "date", required: true, half: true },
        { name: "cost", label: "Usual cost", type: "number", half: true },
        { name: "rule", label: "Repeats", type: "recurrence" },
        { name: "provider", label: "Service provider", type: "text", half: true },
        { name: "phone", label: "Phone", type: "text", half: true },
      ]}
      defaults={() => ({ nextDue: today, rule: { freq: "monthly", interval: 6 } })}
      sort={(a, b) => a.nextDue.localeCompare(b.nextDue)}
      onComplete={doneMaintenance}
      completeLabel="Done"
      empty={{ emoji: "🏠", title: "No home tasks", hint: "Schedule recurring upkeep like AC service or water filter changes." }}
      render={(m) => {
        const n = differenceInCalendarDays(parseISO(m.nextDue), parseISO(today));
        return (
          <div className="flex items-center gap-3">
            <CheckCircle done={false} onClick={() => doneMaintenance(m)} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{m.title}</div>
              <div className="text-[13px] text-muted">
                {describeRule(m.rule)} · next {fmtShort(m.nextDue)}
                {m.lastDone ? ` · last ${fmtShort(m.lastDone)}` : ""}
              </div>
              {m.provider && (
                <div className="text-[12px] text-muted">
                  🧰 {m.provider}
                  {m.phone && (
                    <a className="ml-1 text-accent" href={`tel:${m.phone}`} onClick={(e) => e.stopPropagation()}>
                      {m.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              {m.cost ? <div className="text-[14px] font-semibold">{money(m.cost, s.currency)}</div> : null}
              <div className={cn("text-[12px] font-semibold", n < 0 ? "text-bad" : n <= 7 ? "text-warn" : "text-muted")}>{dueLabel(n)}</div>
            </div>
          </div>
        );
      }}
    />
  );
}
