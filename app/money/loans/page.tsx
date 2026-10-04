"use client";

import { useState } from "react";
import { CrudPage } from "@/components/CrudPage";
import { Bar, Sheet } from "@/components/ui";
import type { Loan } from "@/lib/db";
import { amortization, loanStatus } from "@/lib/finance";
import { money } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";

export default function Loans() {
  const s = useSettings();
  const [sched, setSched] = useState<Loan | null>(null);
  const f = (n: number) => money(n, s.currency);
  const st = sched ? loanStatus(sched.principal, sched.rate, sched.tenureMonths, sched.startDate, todayIso()) : null;
  return (
    <>
      <CrudPage<Loan>
        table="loans"
        title="Loans & EMI"
        noun="Loan"
        fields={[
          { name: "name", label: "Loan name", type: "text", required: true, placeholder: "Home loan" },
          { name: "lender", label: "Lender", type: "text", placeholder: "SBI, HDFC…" },
          { name: "principal", label: "Principal", type: "number", required: true, half: true },
          { name: "rate", label: "Interest % p.a.", type: "number", required: true, half: true },
          { name: "tenureMonths", label: "Tenure (months)", type: "number", required: true, half: true },
          { name: "startDate", label: "First EMI date", type: "date", required: true, half: true },
        ]}
        defaults={() => ({ startDate: todayIso(), tenureMonths: 60, rate: 9 })}
        empty={{ emoji: "🏦", title: "No loans", hint: "Track EMIs, remaining balance and your payoff date." }}
        render={(l) => {
          const x = loanStatus(l.principal, l.rate, l.tenureMonths, l.startDate, todayIso());
          return (
            <div>
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-[13px] text-muted">
                    {l.lender ? `${l.lender} · ` : ""}
                    {l.rate}% · EMI {f(x.emi)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{f(x.balance)}</div>
                  <div className="text-[12px] text-muted">remaining</div>
                </div>
              </div>
              <Bar value={1 - x.balance / l.principal} className="mt-2.5" color="var(--good)" />
              <div className="mt-1.5 flex justify-between text-[12px] text-muted">
                <span>
                  {x.paidCount}/{l.tenureMonths} EMIs · payoff {x.payoff}
                </span>
                <button className="font-semibold text-accent" onClick={(e) => (e.stopPropagation(), setSched(l))}>
                  Schedule
                </button>
              </div>
            </div>
          );
        }}
      />
      <Sheet open={!!sched} onClose={() => setSched(null)} title={`${sched?.name ?? ""} schedule`}>
        {sched && st && (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 text-[14px]">
              <div className="rounded-2xl bg-hairline p-3">
                Total interest
                <br />
                <b>{f(st.totalInterest)}</b>
              </div>
              <div className="rounded-2xl bg-hairline p-3">
                Interest paid so far
                <br />
                <b>{f(st.interestPaid)}</b>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] tabular-nums">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1 text-left">#</th>
                    <th className="text-left">Month</th>
                    <th className="text-right">Principal</th>
                    <th className="text-right">Interest</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {amortization(sched.principal, sched.rate, sched.tenureMonths, sched.startDate).map((r) => (
                    <tr key={r.n} className={r.n <= st.paidCount ? "text-muted" : ""}>
                      <td className="py-1">{r.n}</td>
                      <td>{r.month}</td>
                      <td className="text-right">{f(r.principal)}</td>
                      <td className="text-right">{f(r.interest)}</td>
                      <td className="text-right">{f(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
