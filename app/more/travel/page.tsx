"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { CrudPage } from "@/components/CrudPage";
import { Bar } from "@/components/ui";
import type { Trip } from "@/lib/db";
import { all } from "@/lib/data";
import { fmtDate, money } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";

const PACKING_TEMPLATE = ["Phone charger", "Power bank", "ID / passport", "Medicines", "Toothbrush & paste", "Clothes", "Sunscreen", "Sunglasses", "Headphones", "Cash & cards", "Water bottle", "Umbrella"];

export default function Travel() {
  const s = useSettings();
  const today = todayIso();
  const spentBy = useLiveQuery(async () => {
    const m = new Map<string, number>();
    for (const e of await all("expenses")) if (e.tripId) m.set(e.tripId, (m.get(e.tripId) ?? 0) + e.amount);
    return m;
  }, []);
  return (
    <CrudPage<Trip>
      table="trips"
      title="Trips"
      noun="Trip"
      fields={[
        { name: "name", label: "Trip", type: "text", required: true, placeholder: "Goa getaway" },
        { name: "destination", label: "Destination", type: "text" },
        { name: "start", label: "From", type: "date", required: true, half: true },
        { name: "end", label: "To", type: "date", half: true },
        { name: "budget", label: "Budget", type: "number" },
        { name: "itinerary", label: "Itinerary", type: "list", placeholder: "Day 1: Beach & sunset…" },
        { name: "packing", label: "Packing list", type: "checklist", placeholder: "Add item…" },
      ]}
      defaults={() => ({ start: today, itinerary: [], packing: PACKING_TEMPLATE.map((text) => ({ text, done: false })) })}
      sort={(a, b) => (a.start >= today ? 0 : 1) - (b.start >= today ? 0 : 1) || a.start.localeCompare(b.start)}
      groupBy={(t) => ((t.end ?? t.start) < today ? "Past trips" : "Upcoming")}
      empty={{ emoji: "✈️", title: "No trips planned", hint: "Plan itineraries, packing lists and budgets. Packing comes pre-filled." }}
      render={(t) => {
        const packed = t.packing.filter((p) => p.done).length;
        const n = differenceInCalendarDays(parseISO(t.start), parseISO(today));
        const spent = spentBy?.get(t.id) ?? 0;
        return (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">✈️</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{t.name}</div>
                <div className="text-[13px] text-muted">
                  {t.destination ? `${t.destination} · ` : ""}
                  {fmtDate(t.start, "d MMM")}
                  {t.end ? ` – ${fmtDate(t.end, "d MMM")}` : ""}
                </div>
              </div>
              {n > 0 && (
                <div className="text-right">
                  <div className="text-[22px] font-bold leading-none">{n}</div>
                  <div className="text-[11px] text-muted">days</div>
                </div>
              )}
            </div>
            {t.packing.length > 0 && (
              <>
                <Bar value={packed / t.packing.length} className="mt-2.5" color="#64d2ff" />
                <div className="mt-1 text-[12px] text-muted">
                  🧳 {packed}/{t.packing.length} packed · {t.itinerary.length} plans
                  {t.budget ? ` · ${money(spent, s.currency)} of ${money(t.budget, s.currency)}` : ""}
                </div>
              </>
            )}
          </div>
        );
      }}
    />
  );
}
