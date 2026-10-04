"use client";

import { CrudPage } from "@/components/CrudPage";
import { CheckCircle } from "@/components/Form";
import { Bar } from "@/components/ui";
import { confetti } from "@/lib/confetti";
import { LIFE_AREAS } from "@/lib/constants";
import type { Goal } from "@/lib/db";
import { update } from "@/lib/data";
import { cn } from "@/lib/format";
import { toast } from "@/lib/store";

const AREA_EMOJI: Record<string, string> = { Health: "💪", Money: "💰", Family: "👨‍👩‍👧", Career: "🚀", Learning: "📚", Fun: "🎉", Mind: "🧠", Home: "🏠" };

export default function Goals() {
  const year = new Date().getFullYear();
  const toggleMilestone = async (g: Goal, i: number) => {
    const milestones = g.milestones.map((m, j) => (j === i ? { ...m, done: !m.done } : m));
    const allDone = milestones.length > 0 && milestones.every((m) => m.done);
    await update("goals", g.id, { milestones, done: allDone });
    if (allDone && !g.done) {
      confetti();
      toast(`Goal achieved: ${g.title}!`, { emoji: "🏔️" });
    }
  };
  return (
    <CrudPage<Goal>
      table="goals"
      title="Goals"
      noun="Goal"
      subtitle={`${year} · break big dreams into steps`}
      fields={[
        { name: "title", label: "Goal", type: "text", required: true, placeholder: "Run a half marathon" },
        { name: "area", label: "Life area", type: "chips", options: LIFE_AREAS },
        { name: "year", label: "Year", type: "number", half: true },
        { name: "milestones", label: "Milestones", type: "checklist", placeholder: "Add a step…" },
        { name: "notes", label: "Why it matters", type: "textarea" },
      ]}
      defaults={() => ({ year, area: "Health", milestones: [] })}
      sort={(a, b) => Number(!!a.done) - Number(!!b.done) || b.year - a.year}
      groupBy={(g) => String(g.year)}
      empty={{ emoji: "🏔️", title: "Set a goal", hint: "What do you want this year to be about?" }}
      render={(g) => {
        const done = g.milestones.filter((m) => m.done).length;
        const pct = g.milestones.length ? done / g.milestones.length : g.done ? 1 : 0;
        return (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{AREA_EMOJI[g.area] ?? "🎯"}</span>
              <div className="flex-1">
                <div className={cn("font-semibold", g.done && "text-muted line-through")}>{g.title}</div>
                <div className="text-[13px] text-muted">
                  {g.area} · {done}/{g.milestones.length} milestones
                </div>
              </div>
              <span className="text-[15px] font-bold">{Math.round(pct * 100)}%</span>
            </div>
            <Bar value={pct} className="mt-2" color="var(--good)" />
            {g.milestones.length > 0 && (
              <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                {g.milestones.slice(0, 5).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-[14px]">
                    <CheckCircle done={m.done} onClick={() => toggleMilestone(g, i)} size={20} />
                    <span className={cn(m.done && "text-muted line-through")}>{m.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
