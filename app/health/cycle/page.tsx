"use client";

import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import { Card, Ring } from "@/components/ui";
import type { Cycle } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { iso, todayIso } from "@/lib/recurrence";

export default function CyclePage() {
  const today = todayIso();
  return (
    <CrudPage<Cycle>
      table="cycles"
      title="Cycle"
      noun="Period"
      fields={[
        { name: "start", label: "Started", type: "date", required: true, half: true },
        { name: "end", label: "Ended", type: "date", half: true },
        { name: "notes", label: "Notes / symptoms", type: "textarea" },
      ]}
      defaults={() => ({ start: today })}
      sort={(a, b) => b.start.localeCompare(a.start)}
      empty={{ emoji: "🌸", title: "No cycles logged", hint: "Log start dates to get predictions. Everything stays on your device." }}
      header={(rows) => {
        const sorted = [...rows].sort((a, b) => a.start.localeCompare(b.start));
        if (!sorted.length) return null;
        const gaps = sorted.slice(1).map((c, i) => differenceInCalendarDays(parseISO(c.start), parseISO(sorted[i].start))).filter((g) => g > 15 && g < 60);
        const avg = gaps.length ? Math.round(gaps.slice(-6).reduce((a, g) => a + g, 0) / Math.min(6, gaps.length)) : 28;
        const last = sorted[sorted.length - 1];
        const next = iso(addDays(parseISO(last.start), avg));
        const day = differenceInCalendarDays(parseISO(today), parseISO(last.start)) + 1;
        const toNext = differenceInCalendarDays(parseISO(next), parseISO(today));
        const fertileStart = iso(addDays(parseISO(next), -19));
        const fertileEnd = iso(addDays(parseISO(next), -13));
        return (
          <Card strong className="mb-3 flex items-center gap-4">
            <Ring value={Math.min(1, day / avg)} size={100} stroke={10} color="#ff375f">
              <div className="text-center">
                <div className="text-[11px] text-muted">Day</div>
                <div className="text-[28px] font-bold leading-none">{day}</div>
              </div>
            </Ring>
            <div className="text-[14px]">
              <div className="text-[18px] font-bold">{toNext >= 0 ? `Period in ${toNext} days` : `${-toNext} days late`}</div>
              <div className="text-muted">Expected {fmtDate(next)}</div>
              <div className="text-muted">Fertile window {fmtDate(fertileStart, "d MMM")}–{fmtDate(fertileEnd, "d MMM")}</div>
              <div className="text-muted">Avg cycle {avg} days</div>
            </div>
          </Card>
        );
      }}
      render={(c) => (
        <div className="flex justify-between">
          <span>
            🌸 {fmtDate(c.start)}
            {c.notes && <span className="block text-[13px] text-muted">{c.notes}</span>}
          </span>
          <span className="text-muted">{c.end ? `${differenceInCalendarDays(parseISO(c.end), parseISO(c.start)) + 1} days` : "ongoing"}</span>
        </div>
      )}
    />
  );
}
