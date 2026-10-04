"use client";

import { format, startOfMonth, subMonths } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Hub } from "@/components/Hub";
import { AnimatedNumber, Card, Stat } from "@/components/ui";
import { all } from "@/lib/data";
import { money } from "@/lib/format";
import { useSettings } from "@/lib/settings";

export default function MoneyHub() {
  const s = useSettings();
  const d = useLiveQuery(async () => {
    const [ex, assets] = await Promise.all([all("expenses"), all("assets")]);
    const m0 = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const m1 = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
    const sum = (k: string, from: string, to?: string) => ex.filter((e) => e.kind === k && e.date >= from && (!to || e.date < to)).reduce((a, e) => a + e.amount, 0);
    return {
      spent: sum("expense", m0),
      income: sum("income", m0),
      lastSpent: sum("expense", m1, m0),
      net: assets.reduce((a, x) => a + (x.side === "asset" ? x.value : -x.value), 0),
    };
  }, []);
  const f = (n: number) => money(n, s.currency);
  return (
    <Hub tab="money" title="Money" subtitle={format(new Date(), "MMMM yyyy")}>
      {d && (
        <>
          <Card strong>
            <div className="text-[13px] font-semibold uppercase tracking-wide text-muted">Spent this month</div>
            <div className="text-[40px] font-bold tracking-tight">
              <AnimatedNumber value={d.spent} format={f} />
            </div>
            {d.lastSpent > 0 && (
              <div className={d.spent > d.lastSpent ? "text-[14px] text-bad" : "text-[14px] text-good"}>
                {d.spent > d.lastSpent ? "▲" : "▼"} {Math.abs(Math.round(((d.spent - d.lastSpent) / d.lastSpent) * 100))}% vs last month
              </div>
            )}
          </Card>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Income" value={f(d.income)} color="var(--good)" />
            <Stat label="Net worth" value={money(d.net, s.currency, true)} />
          </div>
        </>
      )}
    </Hub>
  );
}
