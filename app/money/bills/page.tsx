"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import { CheckCircle } from "@/components/Form";
import { Card } from "@/components/ui";
import { payBill } from "@/lib/actions";
import { EXPENSE_CATS } from "@/lib/constants";
import type { Bill } from "@/lib/db";
import { yearlyCost } from "@/lib/finance";
import { cn, fmtShort, money } from "@/lib/format";
import { describeRule, todayIso } from "@/lib/recurrence";
import { dueLabel } from "@/lib/reminders";
import { useSettings } from "@/lib/settings";

export default function Bills() {
  const s = useSettings();
  const today = todayIso();
  return (
    <CrudPage<Bill>
      table="bills"
      title="Bills & Subs"
      noun="Bill"
      fields={[
        { name: "name", label: "Name", type: "text", required: true, placeholder: "Netflix, Rent, Electricity…" },
        { name: "kind", label: "Type", type: "chips", options: [{ value: "bill", label: "Bill" }, { value: "subscription", label: "Subscription" }] },
        { name: "amount", label: "Amount", type: "number", required: true, half: true },
        { name: "nextDue", label: "Next due", type: "date", required: true, half: true },
        { name: "rule", label: "Repeats", type: "recurrence" },
        { name: "category", label: "Category", type: "select", options: EXPENSE_CATS.map((c) => c.name) },
        { name: "autopay", label: "Autopay enabled", type: "toggle" },
        { name: "note", label: "Note", type: "text" },
      ]}
      defaults={() => ({ kind: "bill", nextDue: today, rule: { freq: "monthly", interval: 1 }, category: "Bills" })}
      sort={(a, b) => a.nextDue.localeCompare(b.nextDue)}
      searchText={(b) => b.name}
      onComplete={payBill}
      completeLabel="Paid"
      empty={{ emoji: "🧾", title: "No bills tracked", hint: "Add rent, EMIs and subscriptions so you never miss a due date." }}
      header={(rows) => {
        if (!rows.length) return null;
        const yearly = rows.filter((r) => r.kind === "subscription").reduce((a, r) => a + yearlyCost(r.amount, r.rule.freq, r.rule.interval), 0);
        const monthly = rows.reduce((a, r) => a + yearlyCost(r.amount, r.rule.freq, r.rule.interval) / 12, 0);
        return (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Card>
              <div className="text-[12px] font-semibold uppercase text-muted">Monthly outflow</div>
              <div className="text-[22px] font-bold">{money(monthly, s.currency)}</div>
            </Card>
            <Card>
              <div className="text-[12px] font-semibold uppercase text-muted">Subscriptions / yr</div>
              <div className="text-[22px] font-bold">{money(yearly, s.currency)}</div>
            </Card>
          </div>
        );
      }}
      render={(b) => {
        const days = differenceInCalendarDays(parseISO(b.nextDue), parseISO(today));
        return (
          <div className="flex items-center gap-3">
            <CheckCircle done={false} onClick={() => payBill(b)} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{b.name}</div>
              <div className="text-[13px] text-muted">
                {describeRule(b.rule)} · {fmtShort(b.nextDue)}
                {b.autopay && " · Autopay"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{money(b.amount, s.currency)}</div>
              <div className={cn("text-[12px] font-semibold", days < 0 ? "text-bad" : days <= 3 ? "text-warn" : "text-muted")}>{dueLabel(days)}</div>
            </div>
          </div>
        );
      }}
    />
  );
}
