"use client";

import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Btn, Card, Empty, PageHeader, Segmented, SectionTitle } from "@/components/ui";
import { catMeta } from "@/lib/constants";
import { useRows } from "@/lib/data";
import { money } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import { toast } from "@/lib/store";

export default function Reports() {
  const s = useSettings();
  const rows = useRows("expenses");
  const [range, setRange] = useState<"month" | "year">("month");
  const f = (n: number) => money(n, s.currency);

  const data = useMemo(() => {
    if (!rows) return null;
    const now = new Date();
    const from = range === "month" ? format(startOfMonth(now), "yyyy-MM-dd") : `${now.getFullYear()}-01-01`;
    const inRange = rows.filter((r) => r.date >= from);
    const byCat = new Map<string, number>();
    for (const r of inRange) if (r.kind === "expense") byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount);
    const cats = [...byCat.entries()].map(([name, value]) => ({ ...catMeta(name), name, value })).sort((a, b) => b.value - a.value);
    const months = Array.from({ length: 6 }, (_, i) => format(addMonths(startOfMonth(now), i - 5), "yyyy-MM"));
    const trend = months.map((m) => ({
      m: format(parseISO(`${m}-01`), "MMM"),
      spent: rows.filter((r) => r.kind === "expense" && r.date.startsWith(m)).reduce((a, r) => a + r.amount, 0),
      income: rows.filter((r) => r.kind === "income" && r.date.startsWith(m)).reduce((a, r) => a + r.amount, 0),
    }));
    const total = cats.reduce((a, c) => a + c.value, 0);
    const income = inRange.filter((r) => r.kind === "income").reduce((a, r) => a + r.amount, 0);
    const byMode = new Map<string, number>();
    for (const r of inRange) if (r.kind === "expense") byMode.set(r.mode, (byMode.get(r.mode) ?? 0) + r.amount);
    return { cats, trend, total, income, byMode: [...byMode.entries()].sort((a, b) => b[1] - a[1]) };
  }, [rows, range]);

  const exportCsv = () => {
    if (!rows) return;
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = ["date,type,category,amount,mode,note,tags", ...rows.sort((a, b) => a.date.localeCompare(b.date)).map((r) => [r.date, r.kind, r.category, r.amount, r.mode, r.note, (r.tags ?? []).join("|")].map(esc).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `praxis-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV exported", { emoji: "📄" });
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        back
        actions={
          <Btn variant="glass" className="px-3.5 py-2" onClick={exportCsv}>
            <Download size={16} /> CSV
          </Btn>
        }
      />
      <Segmented id="rep" value={range} onChange={setRange} options={[{ value: "month", label: "This month" }, { value: "year", label: "This year" }]} />
      {data && data.total === 0 && data.income === 0 ? (
        <div className="mt-4">
          <Empty emoji="📊" title="Nothing to report yet" hint="Log a few transactions and your charts appear here." />
        </div>
      ) : (
        data && (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Card><div className="text-[12px] text-muted">Spent</div><div className="font-bold">{money(data.total, s.currency, true)}</div></Card>
              <Card><div className="text-[12px] text-muted">Income</div><div className="font-bold text-good">{money(data.income, s.currency, true)}</div></Card>
              <Card><div className="text-[12px] text-muted">Savings rate</div><div className="font-bold">{data.income ? Math.round(((data.income - data.total) / data.income) * 100) : 0}%</div></Card>
            </div>
            <SectionTitle>By category</SectionTitle>
            <Card>
              <div className="flex items-center gap-2">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data.cats} dataKey="value" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none" animationDuration={700}>
                        {data.cats.map((c) => (
                          <Cell key={c.name} fill={c.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 text-[14px]">
                  {data.cats.slice(0, 6).map((c) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="flex-1 truncate">{c.emoji} {c.name}</span>
                      <span className="font-semibold">{Math.round((c.value / data.total) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-1 border-t border-hairline pt-3 text-[14px]">
                {data.cats.map((c) => (
                  <div key={c.name} className="flex justify-between">
                    <span>{c.emoji} {c.name}</span>
                    <span className="font-medium">{f(c.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <SectionTitle>Last 6 months</SectionTitle>
            <Card>
              <div className="h-48">
                <ResponsiveContainer>
                  <BarChart data={data.trend} barGap={2}>
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => f(Number(v))} cursor={{ fill: "var(--hairline)" }} contentStyle={{ borderRadius: 12, border: "none", background: "var(--glass-strong)" }} />
                    <Bar dataKey="income" fill="var(--good)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="spent" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            {data.byMode.length > 0 && (
              <>
                <SectionTitle>By payment mode</SectionTitle>
                <Card className="space-y-1 text-[14px]">
                  {data.byMode.map(([m, v]) => (
                    <div key={m} className="flex justify-between">
                      <span>{m}</span>
                      <span className="font-medium">{f(v)}</span>
                    </div>
                  ))}
                </Card>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}
