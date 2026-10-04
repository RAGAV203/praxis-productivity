"use client";

import { useState } from "react";
import { CrudPage } from "@/components/CrudPage";
import { Btn, Ring, Sheet } from "@/components/ui";
import { confetti } from "@/lib/confetti";
import type { SavingsGoal } from "@/lib/db";
import { update } from "@/lib/data";
import { monthlyNeeded } from "@/lib/finance";
import { fmtDate, money } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";

const saved = (g: SavingsGoal) => (g.contributions ?? []).reduce((a, c) => a + c.amount, 0);

export default function Savings() {
  const s = useSettings();
  const [adding, setAdding] = useState<SavingsGoal | null>(null);
  const [amt, setAmt] = useState("");
  const f = (n: number) => money(n, s.currency);

  const contribute = async () => {
    const n = Number(amt);
    if (!adding || !n) return;
    const before = saved(adding);
    await update("savings", adding.id, { contributions: [...(adding.contributions ?? []), { date: todayIso(), amount: n }] });
    if (before < adding.target && before + n >= adding.target) {
      confetti();
      feedback("levelup");
      toast(`Goal reached: ${adding.name}!`, { emoji: "🏆" });
    } else {
      feedback("success");
      toast(`Added ${f(n)}`, { emoji: "🐷" });
    }
    setAdding(null);
    setAmt("");
  };

  return (
    <>
      <CrudPage<SavingsGoal>
        table="savings"
        title="Savings Goals"
        noun="Goal"
        fields={[
          { name: "emoji", label: "Icon", type: "emoji" },
          { name: "name", label: "Goal", type: "text", required: true, placeholder: "Emergency fund, bike, trip…" },
          { name: "target", label: "Target amount", type: "number", required: true, half: true },
          { name: "deadline", label: "Target date", type: "date", half: true },
        ]}
        defaults={() => ({ emoji: "🎯", contributions: [] })}
        empty={{ emoji: "🐷", title: "No savings goals", hint: "Save towards something you love." }}
        render={(g) => {
          const sv = saved(g);
          const need = monthlyNeeded(g.target, sv, todayIso(), g.deadline);
          return (
            <div className="flex items-center gap-4">
              <Ring value={sv / g.target} size={64} stroke={7} color="var(--good)">
                <span className="text-2xl">{g.emoji ?? "🎯"}</span>
              </Ring>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{g.name}</div>
                <div className="text-[14px]">
                  <b>{f(sv)}</b> <span className="text-muted">of {f(g.target)}</span>
                </div>
                <div className="text-[12px] text-muted">{sv >= g.target ? "🎉 Achieved!" : need != null ? `${f(need)}/month until ${fmtDate(g.deadline!)}` : `${Math.round((sv / g.target) * 100)}% there`}</div>
              </div>
              <span onClick={(e) => e.stopPropagation()}>
                <Btn variant="soft" className="px-3 py-2" onClick={() => setAdding(g)}>
                  + Add
                </Btn>
              </span>
            </div>
          );
        }}
      />
      <Sheet open={!!adding} onClose={() => setAdding(null)} title={`Add to ${adding?.name ?? ""}`} footer={<Btn full onClick={contribute} sound={null}>Save</Btn>}>
        <input autoFocus className="field text-center text-3xl font-bold" type="number" inputMode="decimal" placeholder="0" value={amt} onChange={(e) => setAmt(e.target.value)} />
        {adding && (adding.contributions ?? []).length > 0 && (
          <div className="mt-4 space-y-1 text-[14px]">
            <div className="font-semibold">History</div>
            {[...adding.contributions].reverse().slice(0, 10).map((c, i) => (
              <div key={i} className="flex justify-between text-muted">
                <span>{fmtDate(c.date)}</span>
                <span>{f(c.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
