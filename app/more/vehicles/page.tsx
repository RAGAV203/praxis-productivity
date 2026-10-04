"use client";

import { useState } from "react";
import { CrudPage } from "@/components/CrudPage";
import { FormSheet } from "@/components/Form";
import { Btn } from "@/components/ui";
import type { Vehicle, VehicleLog } from "@/lib/db";
import { add, remove, useRows } from "@/lib/data";
import { fmtDate, fmtShort, money } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";
import { toast } from "@/lib/store";

/** km/l from consecutive full-tank fuel logs with odometer readings. */
function mileage(logs: VehicleLog[]): number | null {
  const fuel = logs.filter((l) => l.kind === "fuel" && l.odometer && l.litres).sort((a, b) => a.odometer! - b.odometer!);
  if (fuel.length < 2) return null;
  const km = fuel[fuel.length - 1].odometer! - fuel[0].odometer!;
  const litres = fuel.slice(1).reduce((a, l) => a + l.litres!, 0);
  return litres ? km / litres : null;
}

export default function Vehicles() {
  const s = useSettings();
  const logs = useRows("vehicleLogs");
  const [logFor, setLogFor] = useState<Vehicle | null>(null);
  const f = (n: number) => money(n, s.currency);

  return (
    <>
      <CrudPage<Vehicle>
        table="vehicles"
        title="Vehicles"
        noun="Vehicle"
        fields={[
          { name: "name", label: "Name", type: "text", required: true, placeholder: "Swift, Activa…" },
          { name: "regNo", label: "Registration no.", type: "text" },
          { name: "insuranceExpiry", label: "Insurance expires", type: "date", half: true },
          { name: "pucExpiry", label: "PUC expires", type: "date", half: true },
          { name: "serviceDue", label: "Next service", type: "date" },
        ]}
        defaults={() => ({})}
        empty={{ emoji: "🚗", title: "No vehicles", hint: "Track fuel, mileage, service history, insurance and PUC." }}
        render={(v) => {
          const mine = (logs ?? []).filter((l) => l.vehicleId === v.id).sort((a, b) => b.date.localeCompare(a.date));
          const spent = mine.reduce((a, l) => a + l.amount, 0);
          const kmpl = mileage(mine);
          return (
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚗</span>
                <div className="flex-1">
                  <div className="font-semibold">{v.name}</div>
                  <div className="text-[13px] text-muted">{v.regNo}</div>
                </div>
                <span onClick={(e) => e.stopPropagation()}>
                  <Btn variant="soft" className="px-3 py-1.5 text-[13px]" onClick={() => setLogFor(v)}>
                    + Log
                  </Btn>
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
                <div className="rounded-xl bg-hairline p-2">
                  <div className="text-[15px] font-bold">{kmpl ? kmpl.toFixed(1) : "—"}</div>km/l
                </div>
                <div className="rounded-xl bg-hairline p-2">
                  <div className="text-[15px] font-bold">{money(spent, s.currency, true)}</div>total spent
                </div>
                <div className="rounded-xl bg-hairline p-2">
                  <div className="text-[15px] font-bold">{mine.find((l) => l.odometer)?.odometer ?? "—"}</div>odometer
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-muted">
                {v.insuranceExpiry && <span>🛡️ Insurance {fmtDate(v.insuranceExpiry)}</span>}
                {v.pucExpiry && <span>🌫️ PUC {fmtDate(v.pucExpiry)}</span>}
                {v.serviceDue && <span>🔧 Service {fmtDate(v.serviceDue)}</span>}
              </div>
              {mine.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-hairline pt-2 text-[13px]" onClick={(e) => e.stopPropagation()}>
                  {mine.slice(0, 4).map((l) => (
                    <div key={l.id} className="flex items-center justify-between">
                      <span>
                        {l.kind === "fuel" ? "⛽" : l.kind === "service" ? "🔧" : "📌"} {fmtShort(l.date)}
                        {l.litres ? ` · ${l.litres} L` : ""}
                        {l.notes ? ` · ${l.notes}` : ""}
                      </span>
                      <span className="flex items-center gap-2">
                        {f(l.amount)}
                        <button
                          className="text-muted"
                          aria-label="Delete log"
                          onClick={async () => {
                            const undo = await remove("vehicleLogs", l.id);
                            toast("Log deleted", { undo });
                          }}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }}
      />
      <FormSheet
        open={!!logFor}
        onClose={() => setLogFor(null)}
        title={`Log for ${logFor?.name ?? ""}`}
        initial={{ kind: "fuel", date: todayIso() }}
        fields={[
          { name: "kind", label: "Type", type: "chips", options: [{ value: "fuel", label: "⛽ Fuel" }, { value: "service", label: "🔧 Service" }, { value: "other", label: "📌 Other" }] },
          { name: "amount", label: "Amount", type: "number", required: true, half: true },
          { name: "date", label: "Date", type: "date", required: true, half: true },
          { name: "odometer", label: "Odometer (km)", type: "number", half: true },
          { name: "litres", label: "Litres", type: "number", half: true, when: (v) => v.kind === "fuel" },
          { name: "notes", label: "Notes", type: "text" },
          { name: "addExpense", label: "Also add to expenses", type: "toggle" },
        ]}
        onSubmit={async (v) => {
          if (!logFor) return;
          const { addExpense, ...rest } = v as Record<string, unknown>;
          await add("vehicleLogs", { ...(rest as Omit<VehicleLog, "id" | "createdAt" | "updatedAt" | "vehicleId">), vehicleId: logFor.id });
          if (addExpense) await add("expenses", { kind: "expense", amount: Number(rest.amount), category: rest.kind === "fuel" ? "Fuel" : "Transport", date: String(rest.date), mode: "UPI", note: `${logFor.name} ${rest.kind}`, tags: ["vehicle"] });
          toast("Logged", { emoji: "🚗" });
        }}
      />
    </>
  );
}
