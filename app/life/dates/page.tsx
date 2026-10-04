"use client";

import { differenceInCalendarDays, differenceInYears, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import type { ImportantDate } from "@/lib/db";
import { cn, fmtDate } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { dueLabel, nextAnnual } from "@/lib/reminders";

const EMOJI = { birthday: "🎂", anniversary: "💞", other: "📅" };

export default function Dates() {
  const today = todayIso();
  const days = (d: ImportantDate) => differenceInCalendarDays(parseISO(nextAnnual(d.date, today)), parseISO(today));
  return (
    <CrudPage<ImportantDate>
      table="dates"
      title="Important Dates"
      noun="Date"
      fields={[
        { name: "kind", label: "Type", type: "chips", options: [{ value: "birthday", label: "🎂 Birthday" }, { value: "anniversary", label: "💞 Anniversary" }, { value: "other", label: "📅 Other" }] },
        { name: "title", label: "Title", type: "text", required: true, placeholder: "Mom's birthday" },
        { name: "person", label: "Person", type: "person", half: true },
        { name: "date", label: "Date", type: "date", required: true, half: true, hint: "Use the original year to show age" },
        { name: "giftIdeas", label: "Gift ideas", type: "list", placeholder: "Add an idea…" },
      ]}
      defaults={() => ({ kind: "birthday" })}
      sort={(a, b) => days(a) - days(b)}
      searchText={(d) => `${d.title} ${d.person ?? ""}`}
      empty={{ emoji: "🎂", title: "No dates saved", hint: "Never forget a birthday or anniversary again." }}
      render={(d) => {
        const n = days(d);
        const next = nextAnnual(d.date, today);
        const years = differenceInYears(parseISO(next), parseISO(d.date));
        return (
          <div className="flex items-center gap-3">
            <span className="text-3xl">{EMOJI[d.kind]}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{d.title}</div>
              <div className="text-[13px] text-muted">
                {fmtDate(next, "EEE, d MMM")}
                {years > 0 && ` · turns ${years}`}
                {(d.giftIdeas ?? []).length > 0 && ` · 🎁 ${d.giftIdeas!.length}`}
              </div>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold", n <= 7 ? "bg-accent text-white" : "bg-hairline text-muted")}>{dueLabel(n)}</span>
          </div>
        );
      }}
    />
  );
}
