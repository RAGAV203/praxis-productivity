"use client";

import { AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCrud } from "@/components/CrudPage";
import { CheckCircle } from "@/components/Form";
import { Empty, IconBtn, PageHeader, SwipeRow } from "@/components/ui";
import { completeTask } from "@/lib/actions";
import { confetti } from "@/lib/confetti";
import type { Task } from "@/lib/db";
import { add, useRows } from "@/lib/data";
import { cn, fmtShort } from "@/lib/format";
import { describeRule, todayIso } from "@/lib/recurrence";
import { feedback } from "@/lib/sound";

type Smart = "today" | "scheduled" | "all" | "done";
const SMART: { id: Smart; label: string; emoji: string; color: string }[] = [
  { id: "today", label: "Today", emoji: "📅", color: "#0a84ff" },
  { id: "scheduled", label: "Scheduled", emoji: "🗓️", color: "#ff375f" },
  { id: "all", label: "All", emoji: "📥", color: "#8e8e93" },
  { id: "done", label: "Completed", emoji: "✅", color: "#30d158" },
];
const PRIO = { high: "!!!", med: "!!", low: "!" };

export default function Tasks() {
  const rows = useRows("tasks");
  const [smart, setSmart] = useState<Smart>("today");
  const [draft, setDraft] = useState("");
  const today = todayIso();

  const crud = useCrud<Task>({
    table: "tasks",
    noun: "Reminder",
    defaults: () => ({ priority: "med", done: false, due: today, rule: { freq: "none", interval: 1 } }),
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "due", label: "Due date", type: "date", half: true },
      { name: "priority", label: "Priority", type: "select", options: [{ value: "low", label: "Low" }, { value: "med", label: "Medium" }, { value: "high", label: "High" }], half: true },
      { name: "rule", label: "Repeat", type: "recurrence" },
      { name: "list", label: "List", type: "text", placeholder: "Home, Errands, Family…" },
      { name: "done", label: "Completed", type: "toggle" },
    ],
  });

  const all = rows ?? [];
  const counts: Record<Smart, number> = {
    today: all.filter((t) => !t.done && t.due && t.due <= today).length,
    scheduled: all.filter((t) => !t.done && t.due).length,
    all: all.filter((t) => !t.done).length,
    done: all.filter((t) => t.done).length,
  };
  const list = all
    .filter((t) => (smart === "done" ? t.done : !t.done && (smart === "today" ? t.due && t.due <= today : smart === "scheduled" ? !!t.due : true)))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || ["high", "med", "low"].indexOf(a.priority) - ["high", "med", "low"].indexOf(b.priority));

  const quickAdd = async () => {
    if (!draft.trim()) return;
    await add("tasks", { title: draft.trim(), done: false, priority: "med", due: smart === "all" ? undefined : today });
    feedback("success");
    setDraft("");
  };

  const complete = async (t: Task) => {
    await completeTask(t);
    if (!t.done && counts.today === 1 && smart === "today") confetti({ count: 60 });
  };

  return (
    <div>
      <PageHeader
        title="Reminders"
        back
        actions={
          <IconBtn label="New reminder" onClick={crud.create} className="bg-accent! text-white">
            <Plus size={20} />
          </IconBtn>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        {SMART.map((x) => (
          <button key={x.id} onClick={() => (feedback("tap"), setSmart(x.id))} className={cn("glass rounded-[22px] p-3.5 text-left transition-all", smart === x.id && "ring-2 ring-accent")}>
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-full text-lg" style={{ background: x.color }}>
                {x.emoji}
              </span>
              <span className="text-[26px] font-bold">{counts[x.id]}</span>
            </div>
            <div className="mt-1 font-semibold text-muted">{x.label}</div>
          </button>
        ))}
      </div>
      {smart !== "done" && (
        <div className="glass mt-4 flex items-center gap-3 rounded-[22px] px-4 py-1">
          <span className="h-6 w-6 rounded-full border-2 border-dashed border-faint" />
          <input className="h-12 flex-1 bg-transparent text-[16px] outline-none" placeholder="New reminder…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && quickAdd()} />
        </div>
      )}
      <div className="mt-3">
        {rows && list.length === 0 && <Empty emoji={smart === "done" ? "🗂️" : "🎈"} title={smart === "done" ? "Nothing completed yet" : "All done!"} hint={smart === "today" ? "Nothing due today. Enjoy it." : undefined} />}
        <AnimatePresence initial={false}>
          {list.map((t) => {
            const overdue = !t.done && t.due && t.due < today;
            return (
              <SwipeRow key={t.id} onDelete={() => crud.del(t)} onComplete={() => complete(t)} completeLabel={t.done ? "Undo" : "Done"}>
                <div className="flex items-center gap-3 p-3.5">
                  <CheckCircle done={t.done} onClick={() => complete(t)} color="var(--accent)" />
                  <button className="min-w-0 flex-1 text-left" onClick={() => crud.edit(t)}>
                    <div className={cn("truncate font-medium", t.done && "text-muted line-through")}>
                      <span className="mr-1 font-bold text-warn">{t.priority !== "med" && !t.done ? PRIO[t.priority] : ""}</span>
                      {t.title}
                    </div>
                    <div className={cn("text-[13px]", overdue ? "text-bad" : "text-muted")}>
                      {t.due ? (t.due === today ? "Today" : fmtShort(t.due)) : "No date"}
                      {t.rule && t.rule.freq !== "none" ? ` · 🔁 ${describeRule(t.rule)}` : ""}
                      {t.list ? ` · ${t.list}` : ""}
                    </div>
                  </button>
                </div>
              </SwipeRow>
            );
          })}
        </AnimatePresence>
      </div>
      {crud.sheet}
    </div>
  );
}
