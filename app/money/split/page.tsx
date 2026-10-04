"use client";

import { CrudPage } from "@/components/CrudPage";
import { Btn, Card } from "@/components/ui";
import type { SplitEntry } from "@/lib/db";
import { update } from "@/lib/data";
import { cn, fmtShort, money } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";
import { toast } from "@/lib/store";

export default function Split() {
  const s = useSettings();
  const f = (n: number) => money(Math.abs(n), s.currency);
  return (
    <CrudPage<SplitEntry>
      table="splits"
      title="Split"
      noun="Entry"
      fields={[
        { name: "person", label: "With", type: "person", required: true },
        { name: "dir", label: "Direction", type: "chips", options: [{ value: "owes", label: "They owe me" }, { value: "owe", label: "I owe them" }] },
        { name: "abs", label: "Amount", type: "number", required: true, half: true },
        { name: "date", label: "Date", type: "date", half: true },
        { name: "note", label: "For", type: "text", placeholder: "Dinner, cab, movie…" },
      ]}
      defaults={() => ({ dir: "owes", date: todayIso() })}
      toRow={(v, existing) => {
        const { dir, abs, ...rest } = v as { dir: string; abs: number } & Record<string, unknown>;
        return { ...rest, amount: dir === "owe" ? -Math.abs(abs) : Math.abs(abs), settled: existing?.settled ?? false };
      }}
      fromRow={(r) => ({ ...r, dir: r.amount < 0 ? "owe" : "owes", abs: Math.abs(r.amount) })}
      sort={(a, b) => Number(!!a.settled) - Number(!!b.settled) || b.date.localeCompare(a.date)}
      groupBy={(e) => e.person}
      empty={{ emoji: "🤝", title: "All square", hint: "Track who paid for what with friends and roommates." }}
      header={(rows) => {
        const open = rows.filter((r) => !r.settled);
        const people = [...new Set(open.map((r) => r.person))].map((p) => ({ p, bal: open.filter((r) => r.person === p).reduce((a, r) => a + r.amount, 0) })).filter((x) => Math.abs(x.bal) > 0.009);
        if (!people.length) return null;
        return (
          <Card strong className="mb-2 space-y-2">
            {people.map(({ p, bal }) => (
              <div key={p} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/15 font-bold text-accent">{p[0]?.toUpperCase()}</span>
                <span className="flex-1">
                  <b>{p}</b> <span className="text-muted">{bal > 0 ? "owes you" : "you owe"}</span>
                </span>
                <span className={cn("font-bold", bal > 0 ? "text-good" : "text-bad")}>{f(bal)}</span>
                <Btn
                  variant="soft"
                  className="px-3 py-1.5 text-[13px]"
                  sound="success"
                  onClick={async () => {
                    await Promise.all(open.filter((r) => r.person === p).map((r) => update("splits", r.id, { settled: true })));
                    toast(`Settled with ${p}`, { emoji: "🤝" });
                  }}
                >
                  Settle
                </Btn>
              </div>
            ))}
          </Card>
        );
      }}
      render={(e) => (
        <div className={cn("flex items-center justify-between", e.settled && "opacity-50")}>
          <div>
            <div className="font-semibold">{e.note || "Shared expense"}</div>
            <div className="text-[13px] text-muted">
              {fmtShort(e.date)} · {e.amount > 0 ? "they owe" : "you owe"}
              {e.settled && " · settled"}
            </div>
          </div>
          <div className={cn("font-semibold", e.amount > 0 ? "text-good" : "text-bad")}>{f(e.amount)}</div>
        </div>
      )}
    />
  );
}
