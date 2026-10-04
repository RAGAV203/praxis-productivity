"use client";

import { addMonths, format, parseISO } from "date-fns";
import { AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useCrud } from "@/components/CrudPage";
import { FileStrip } from "@/components/Files";
import { QuickExpense } from "@/components/QuickExpense";
import { Chip, Empty, IconBtn, PageHeader, Stat, SwipeRow } from "@/components/ui";
import { EXPENSE_CATS, INCOME_CATS, PAY_MODES, catMeta } from "@/lib/constants";
import type { Expense } from "@/lib/db";
import { useRows } from "@/lib/data";
import { money } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";

export default function Expenses() {
  const s = useSettings();
  const rows = useRows("expenses");
  const trips = useRows("trips");
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [cat, setCat] = useState<string | null>(null);
  // opened from the home-screen shortcut (?new=1)
  const [quick, setQuick] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("new"));

  const crud = useCrud<Expense>({
    table: "expenses",
    noun: "Transaction",
    defaults: () => ({ kind: "expense", date: todayIso(), mode: "UPI", category: "Food" }),
    fields: [
      { name: "kind", label: "Type", type: "chips", options: [{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }] },
      { name: "amount", label: "Amount", type: "number", required: true, half: true },
      { name: "date", label: "Date", type: "date", required: true, half: true },
      { name: "category", label: "Category", type: "select", required: true, options: [...EXPENSE_CATS, ...INCOME_CATS].map((c) => c.name).filter((v, i, a) => a.indexOf(v) === i), half: true },
      { name: "mode", label: "Paid via", type: "select", options: PAY_MODES, half: true },
      { name: "note", label: "Note", type: "text" },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "files", label: "Receipt", type: "files" },
      ...(trips?.length ? [{ name: "tripId", label: "Trip", type: "select" as const, options: trips.map((t) => ({ value: t.id, label: `✈️ ${t.name}` })) }] : []),
    ],
  });

  const monthRows = useMemo(() => (rows ?? []).filter((r) => r.date.startsWith(month)), [rows, month]);
  const shown = monthRows.filter((r) => (filter === "all" || r.kind === filter) && (!cat || r.category === cat)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const spent = monthRows.filter((r) => r.kind === "expense").reduce((a, r) => a + r.amount, 0);
  const income = monthRows.filter((r) => r.kind === "income").reduce((a, r) => a + r.amount, 0);
  const cats = [...new Set(monthRows.map((r) => r.category))];

  const byDay = new Map<string, Expense[]>();
  for (const r of shown) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  const f = (n: number) => money(n, s.currency);

  return (
    <div>
      <PageHeader
        title="Transactions"
        back
        actions={
          <IconBtn label="Add transaction" onClick={() => setQuick(true)} className="bg-accent! text-white">
            <Plus size={20} />
          </IconBtn>
        }
      />
      <div className="mb-3 flex items-center justify-between">
        <IconBtn label="Previous month" onClick={() => setMonth(format(addMonths(parseISO(`${month}-01`), -1), "yyyy-MM"))}>
          <ChevronLeft size={18} />
        </IconBtn>
        <span className="text-[17px] font-semibold">{format(parseISO(`${month}-01`), "MMMM yyyy")}</span>
        <IconBtn label="Next month" onClick={() => setMonth(format(addMonths(parseISO(`${month}-01`), 1), "yyyy-MM"))}>
          <ChevronRight size={18} />
        </IconBtn>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Spent" value={money(spent, s.currency, true)} color="var(--bad)" />
        <Stat label="Income" value={money(income, s.currency, true)} color="var(--good)" />
        <Stat label="Saved" value={money(income - spent, s.currency, true)} />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {(["all", "expense", "income"] as const).map((k) => (
          <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
            {k === "all" ? "All" : k === "expense" ? "Expenses" : "Income"}
          </Chip>
        ))}
        {cats.map((c) => (
          <Chip key={c} active={cat === c} color={catMeta(c).color} onClick={() => setCat(cat === c ? null : c)}>
            {catMeta(c).emoji} {c}
          </Chip>
        ))}
      </div>
      <div className="mt-2">
        {rows && shown.length === 0 && <Empty emoji="🧾" title="No transactions" hint="Tap + to log spending in two taps." />}
        {[...byDay.entries()].map(([day, items]) => (
          <div key={day}>
            <div className="mb-2 mt-4 flex justify-between px-1 text-[13px] font-semibold text-muted">
              <span>{day === todayIso() ? "Today" : format(parseISO(day), "EEE, d MMM")}</span>
              <span>{f(items.filter((i) => i.kind === "expense").reduce((a, i) => a + i.amount, 0))}</span>
            </div>
            <AnimatePresence initial={false}>
              {items.map((r) => {
                const meta = catMeta(r.category);
                return (
                  <SwipeRow key={r.id} onDelete={() => crud.del(r)}>
                    <button className="flex w-full items-center gap-3 p-3.5 text-left" onClick={() => crud.edit(r)}>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-xl" style={{ background: `color-mix(in srgb, ${meta.color} 20%, transparent)` }}>
                        {meta.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{r.note || r.category}</span>
                        <span className="block text-[13px] text-muted">
                          {r.category} · {r.mode}
                        </span>
                        <FileStrip ids={r.files} size={36} />
                      </span>
                      <span className={r.kind === "income" ? "font-semibold text-good" : "font-semibold"}>
                        {r.kind === "income" ? "+" : "−"}
                        {f(r.amount)}
                      </span>
                    </button>
                  </SwipeRow>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <QuickExpense open={quick} onClose={() => setQuick(false)} />
      {crud.sheet}
    </div>
  );
}
