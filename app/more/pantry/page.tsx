"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { CrudPage } from "@/components/CrudPage";
import { guessAisle } from "@/lib/aisles";
import type { PantryItem } from "@/lib/db";
import { add } from "@/lib/data";
import { cn, fmtShort } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { toast } from "@/lib/store";

export default function Pantry() {
  const today = todayIso();
  return (
    <CrudPage<PantryItem>
      table="pantry"
      title="Pantry"
      noun="Item"
      fields={[
        { name: "name", label: "Item", type: "text", required: true },
        { name: "qty", label: "Quantity", type: "text", half: true },
        { name: "expiry", label: "Best before", type: "date", half: true },
      ]}
      defaults={() => ({})}
      sort={(a, b) => (a.expiry ?? "9999").localeCompare(b.expiry ?? "9999")}
      searchText={(p) => p.name}
      onComplete={async (p) => {
        await add("grocery", { name: p.name, aisle: guessAisle(p.name), done: false });
        toast(`${p.name} added to grocery`, { emoji: "🛒" });
      }}
      completeLabel="Restock"
      empty={{ emoji: "🥫", title: "Pantry is empty", hint: "Track what's at home and what expires soon. Swipe right to restock." }}
      render={(p) => {
        const n = p.expiry ? differenceInCalendarDays(parseISO(p.expiry), parseISO(today)) : null;
        return (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.name}</div>
              {p.qty && <div className="text-[13px] text-muted">{p.qty}</div>}
            </div>
            {n != null && <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold", n < 0 ? "bg-bad/15 text-bad" : n <= 3 ? "bg-warn/15 text-warn" : "bg-hairline text-muted")}>{n < 0 ? "Expired" : n === 0 ? "Today" : `${fmtShort(p.expiry!)}`}</span>}
          </div>
        );
      }}
    />
  );
}
