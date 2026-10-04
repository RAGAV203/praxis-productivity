"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import type { Countdown } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";

export default function Countdowns() {
  const today = todayIso();
  return (
    <CrudPage<Countdown>
      table="countdowns"
      title="Countdowns"
      noun="Countdown"
      fields={[
        { name: "emoji", label: "Icon", type: "emoji" },
        { name: "title", label: "Event", type: "text", required: true, placeholder: "Goa trip, Diwali, Concert…" },
        { name: "date", label: "Date", type: "date", required: true },
      ]}
      defaults={() => ({ emoji: "🎉" })}
      sort={(a, b) => a.date.localeCompare(b.date)}
      empty={{ emoji: "⏳", title: "Nothing to count down to", hint: "Add something to look forward to. It shows on your Today screen." }}
      render={(c) => {
        const n = differenceInCalendarDays(parseISO(c.date), parseISO(today));
        return (
          <div className="flex items-center gap-4">
            <span className="text-4xl">{c.emoji}</span>
            <div className="flex-1">
              <div className="text-[17px] font-semibold">{c.title}</div>
              <div className="text-[13px] text-muted">{fmtDate(c.date, "EEEE, d MMMM yyyy")}</div>
            </div>
            <div className="text-right">
              <div className="text-[30px] font-bold leading-none tabular-nums">{Math.abs(n)}</div>
              <div className="text-[11px] text-muted">{n > 0 ? "days to go" : n === 0 ? "today! 🎉" : "days ago"}</div>
            </div>
          </div>
        );
      }}
    />
  );
}
