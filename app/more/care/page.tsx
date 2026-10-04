"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import { CheckCircle } from "@/components/Form";
import { FileStrip } from "@/components/Files";
import type { CareItem } from "@/lib/db";
import { update } from "@/lib/data";
import { cn } from "@/lib/format";
import { describeRule, nextOccurrence, todayIso } from "@/lib/recurrence";
import { dueLabel } from "@/lib/reminders";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";

async function done(c: CareItem) {
  const today = todayIso();
  // schedule from today so a late watering doesn't pile up overdue tasks
  const next = nextOccurrence(today, c.rule) ?? today;
  await update("care", c.id, { lastDone: today, nextDue: next });
  feedback("complete");
  toast(`${c.emoji} ${c.name}: ${c.task} done`, { emoji: "🐾" });
}

export default function Care() {
  const today = todayIso();
  return (
    <CrudPage<CareItem>
      table="care"
      title="Pets & Plants"
      noun="Care task"
      subtitle="Never forget to feed, water or groom"
      fields={[
        { name: "kind", label: "Type", type: "chips", options: [{ value: "pet", label: "🐶 Pet" }, { value: "plant", label: "🪴 Plant" }] },
        { name: "name", label: "Name", type: "text", required: true, placeholder: "Bruno, Monstera…", half: true },
        { name: "emoji", label: "Icon", type: "select", options: ["🐶", "🐱", "🐠", "🐦", "🐰", "🐢", "🪴", "🌵", "🌿", "🌸", "🌻", "🍅"], half: true },
        { name: "task", label: "Task", type: "text", required: true, placeholder: "Water, Feed, Deworm, Vet visit…" },
        { name: "nextDue", label: "Next due", type: "date", required: true, half: true },
        { name: "rule", label: "Repeats", type: "recurrence" },
        { name: "notes", label: "Notes", type: "textarea", placeholder: "Food brand, vet phone, sunlight needs…" },
        { name: "files", label: "Photos", type: "files" },
      ]}
      defaults={() => ({ kind: "plant", emoji: "🪴", task: "Water", nextDue: today, rule: { freq: "daily", interval: 3 } })}
      sort={(a, b) => a.nextDue.localeCompare(b.nextDue)}
      searchText={(c) => `${c.name} ${c.task}`}
      groupBy={(c) => (c.kind === "pet" ? "Pets" : "Plants")}
      onComplete={done}
      completeLabel="Done"
      empty={{ emoji: "🐾", title: "Nothing to care for yet", hint: "Add watering, feeding, grooming or vet schedules. They show on Today and in the Calendar." }}
      render={(c) => {
        const n = differenceInCalendarDays(parseISO(c.nextDue), parseISO(today));
        return (
          <div>
            <div className="flex items-center gap-3">
              <CheckCircle done={false} onClick={() => done(c)} />
              <span className="text-3xl">{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {c.name} · {c.task}
                </div>
                <div className="text-[13px] text-muted">
                  {describeRule(c.rule)}
                  {c.lastDone ? ` · last ${c.lastDone}` : ""}
                </div>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold", n < 0 ? "bg-bad/15 text-bad" : n === 0 ? "bg-warn/15 text-warn" : "bg-hairline text-muted")}>{dueLabel(n)}</span>
            </div>
            <FileStrip ids={c.files} size={44} />
          </div>
        );
      }}
    />
  );
}
