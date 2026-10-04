"use client";

import { format, startOfMonth } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { CrudPage } from "@/components/CrudPage";
import { Bar, Card } from "@/components/ui";
import { EXPENSE_CATS, catMeta } from "@/lib/constants";
import type { Budget } from "@/lib/db";
import { all } from "@/lib/data";
import { money } from "@/lib/format";
import { useSettings } from "@/lib/settings";

export default function Budgets() {
  const s = useSettings();
  const m0 = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const spentBy = useLiveQuery(async () => {
    const m = new Map<string, number>();
    for (const e of await all("expenses")) if (e.kind === "expense" && e.date >= m0) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return m;
  }, [m0]);
  const now = new Date();
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (
    <CrudPage<Budget>
      table="budgets"
      title="Budgets"
      noun="Budget"
      subtitle={format(now, "MMMM")}
      fields={[
        { name: "category", label: "Category", type: "select", required: true, options: EXPENSE_CATS.map((c) => c.name) },
        { name: "amount", label: "Monthly limit", type: "number", required: true },
      ]}
      defaults={() => ({ category: "Food" })}
      empty={{ emoji: "🎯", title: "No budgets yet", hint: "Set monthly limits per category and watch them fill up." }}
      header={(rows) => {
        const total = rows.reduce((a, b) => a + b.amount, 0);
        const spent = rows.reduce((a, b) => a + (spentBy?.get(b.category) ?? 0), 0);
        if (!rows.length) return null;
        return (
          <Card strong className="mb-3">
            <div className="flex justify-between text-[14px] text-muted">
              <span>Total budget</span>
              <span>
                Day {day} of {daysInMonth}
              </span>
            </div>
            <div className="text-[28px] font-bold">
              {money(spent, s.currency)} <span className="text-[15px] font-medium text-muted">of {money(total, s.currency)}</span>
            </div>
            <Bar value={total ? spent / total : 0} className="mt-2" color={spent > total ? "var(--bad)" : "var(--accent)"} />
            <div className="mt-1 text-[13px] text-muted">Safe to spend: {money(Math.max(0, (total - spent) / Math.max(1, daysInMonth - day + 1)), s.currency)}/day</div>
          </Card>
        );
      }}
      render={(b) => {
        const spent = spentBy?.get(b.category) ?? 0;
        const r = spent / b.amount;
        const meta = catMeta(b.category);
        const fast = r > day / daysInMonth + 0.1;
        return (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{meta.emoji}</span>
              <span className="flex-1 font-semibold">{b.category}</span>
              <span className="text-[14px]">
                <b>{money(spent, s.currency)}</b> <span className="text-muted">/ {money(b.amount, s.currency)}</span>
              </span>
            </div>
            <Bar value={r} className="mt-2.5" color={r > 1 ? "var(--bad)" : r > 0.8 ? "var(--warn)" : meta.color} />
            <div className="mt-1 text-[12px] text-muted">{r > 1 ? `Over by ${money(spent - b.amount, s.currency)}` : fast ? "Spending faster than the month ⚠️" : `${money(b.amount - spent, s.currency)} left`}</div>
          </div>
        );
      }}
    />
  );
}
