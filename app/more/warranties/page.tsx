"use client";

import { differenceInCalendarDays, differenceInCalendarMonths, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import { FileStrip } from "@/components/Files";
import { Bar } from "@/components/ui";
import type { Warranty } from "@/lib/db";
import { cn, fmtDate, money } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";

export default function Warranties() {
  const s = useSettings();
  const today = todayIso();
  return (
    <CrudPage<Warranty>
      table="warranties"
      title="Warranties"
      noun="Purchase"
      fields={[
        { name: "product", label: "Product", type: "text", required: true, placeholder: "Washing machine" },
        { name: "brand", label: "Brand / model", type: "text", half: true },
        { name: "price", label: "Price", type: "number", half: true },
        { name: "purchaseDate", label: "Bought on", type: "date", required: true, half: true },
        { name: "warrantyEnd", label: "Warranty until", type: "date", required: true, half: true },
        { name: "store", label: "Store", type: "text", half: true },
        { name: "service", label: "Service contact", type: "text", half: true },
        { name: "files", label: "Invoice / warranty card", type: "files" },
      ]}
      defaults={() => ({ purchaseDate: today })}
      sort={(a, b) => a.warrantyEnd.localeCompare(b.warrantyEnd)}
      searchText={(w) => `${w.product} ${w.brand ?? ""} ${w.store ?? ""}`}
      empty={{ emoji: "🛡️", title: "No purchases saved", hint: "Save invoices so warranty claims are easy." }}
      render={(w) => {
        const total = Math.max(1, differenceInCalendarDays(parseISO(w.warrantyEnd), parseISO(w.purchaseDate)));
        const left = differenceInCalendarDays(parseISO(w.warrantyEnd), parseISO(today));
        return (
          <div>
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{w.product}</div>
                <div className="text-[13px] text-muted">
                  {[w.brand, w.price ? money(w.price, s.currency) : null, fmtDate(w.purchaseDate)].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className={cn("self-start rounded-full px-2 py-0.5 text-[12px] font-semibold", left < 0 ? "bg-hairline text-muted" : left <= 30 ? "bg-warn/15 text-warn" : "bg-good/15 text-good")}>
                {left < 0 ? "Expired" : left < 60 ? `${left}d left` : `${differenceInCalendarMonths(parseISO(w.warrantyEnd), parseISO(today))} mo left`}
              </span>
            </div>
            <Bar value={Math.max(0, left) / total} className="mt-2" color={left <= 30 ? "var(--warn)" : "var(--good)"} />
            <FileStrip ids={w.files} />
          </div>
        );
      }}
    />
  );
}
