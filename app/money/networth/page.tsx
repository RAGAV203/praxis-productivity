"use client";

import { format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CrudPage } from "@/components/CrudPage";
import { AnimatedNumber, Card } from "@/components/ui";
import { ASSET_TYPES, LIABILITY_TYPES } from "@/lib/constants";
import { db, type Asset } from "@/lib/db";
import { add, all, update } from "@/lib/data";
import { money } from "@/lib/format";
import { useSettings } from "@/lib/settings";

/** Keep one snapshot per month, refreshed whenever values change. */
async function syncSnapshot() {
  const assets = await all("assets");
  const month = format(new Date(), "yyyy-MM");
  const a = assets.filter((x) => x.side === "asset").reduce((s, x) => s + x.value, 0);
  const l = assets.filter((x) => x.side === "liability").reduce((s, x) => s + x.value, 0);
  const existing = (await db.snapshots.where("month").equals(month).toArray()).find((x) => !x.deletedAt);
  if (existing) {
    if (existing.assets !== a || existing.liabilities !== l) await update("snapshots", existing.id, { assets: a, liabilities: l });
  } else if (assets.length) await add("snapshots", { month, assets: a, liabilities: l });
}

export default function NetWorth() {
  const s = useSettings();
  const assets = useLiveQuery(() => all("assets"), []);
  const snaps = useLiveQuery(async () => (await all("snapshots")).sort((a, b) => a.month.localeCompare(b.month)), []);
  useEffect(() => {
    if (assets) void syncSnapshot();
  }, [assets]);
  const f = (n: number) => money(n, s.currency);
  const totalA = (assets ?? []).filter((x) => x.side === "asset").reduce((a, x) => a + x.value, 0);
  const totalL = (assets ?? []).filter((x) => x.side === "liability").reduce((a, x) => a + x.value, 0);
  const chart = (snaps ?? []).map((x) => ({ m: format(parseISO(`${x.month}-01`), "MMM yy"), net: x.assets - x.liabilities }));

  return (
    <CrudPage<Asset>
      table="assets"
      title="Net Worth"
      noun="Account"
      fields={[
        { name: "side", label: "Type", type: "chips", options: [{ value: "asset", label: "Asset" }, { value: "liability", label: "Liability" }] },
        { name: "name", label: "Name", type: "text", required: true, placeholder: "HDFC Savings, Nifty index fund…" },
        { name: "type", label: "Category", type: "select", options: [...ASSET_TYPES, ...LIABILITY_TYPES], half: true },
        { name: "value", label: "Current value", type: "number", required: true, half: true },
        { name: "note", label: "Note", type: "text" },
      ]}
      defaults={() => ({ side: "asset", type: "Bank" })}
      sort={(a, b) => b.value - a.value}
      groupBy={(x) => (x.side === "asset" ? `Assets · ${f(totalA)}` : `Liabilities · ${f(totalL)}`)}
      empty={{ emoji: "📈", title: "Track your net worth", hint: "Add bank balances, investments, gold and loans. Update monthly and watch it grow." }}
      header={() => (
        <Card strong className="mb-2">
          <div className="text-[13px] font-semibold uppercase text-muted">Net worth</div>
          <div className="text-[36px] font-bold tracking-tight">
            <AnimatedNumber value={totalA - totalL} format={f} />
          </div>
          {chart.length > 1 && (
            <div className="-mx-2 mt-2 h-36">
              <ResponsiveContainer>
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => f(Number(v))} contentStyle={{ borderRadius: 12, border: "none", background: "var(--glass-strong)" }} />
                  <Area type="monotone" dataKey="net" stroke="var(--accent)" strokeWidth={2.5} fill="url(#nw)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {chart.length <= 1 && <div className="text-[13px] text-muted">A monthly snapshot is saved automatically. Your trend chart appears from next month.</div>}
        </Card>
      )}
      render={(x) => (
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{x.name}</div>
            <div className="text-[13px] text-muted">{x.type}</div>
          </div>
          <div className={x.side === "liability" ? "font-semibold text-bad" : "font-semibold"}>
            {x.side === "liability" ? "−" : ""}
            {f(x.value)}
          </div>
        </div>
      )}
    />
  );
}
