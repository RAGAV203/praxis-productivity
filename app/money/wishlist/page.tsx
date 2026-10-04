"use client";

import { useState } from "react";
import { CrudPage } from "@/components/CrudPage";
import { FileStrip } from "@/components/Files";
import { Card } from "@/components/ui";
import type { WishItem } from "@/lib/db";
import { add, update } from "@/lib/data";
import { cn, money } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";
import { toast } from "@/lib/store";
import { confetti } from "@/lib/confetti";

const PRIO = { high: "🔥 Must have", med: "👍 Nice to have", low: "💭 Someday" };

export default function Wishlist() {
  const s = useSettings();
  const [now] = useState(() => Date.now());
  const buy = async (w: WishItem) => {
    if (w.bought) return update("wishlist", w.id, { bought: false });
    await update("wishlist", w.id, { bought: true });
    if (w.price) await add("expenses", { kind: "expense", amount: w.price, category: "Shopping", date: todayIso(), mode: "UPI", note: w.name, tags: ["wishlist"] });
    confetti({ count: 50 });
    toast(`Bought ${w.name}${w.price ? " · added to expenses" : ""}`, { emoji: "🛍️" });
  };
  return (
    <CrudPage<WishItem>
      table="wishlist"
      title="Wishlist"
      noun="Wish"
      fields={[
        { name: "name", label: "Item", type: "text", required: true, placeholder: "Noise-cancelling headphones" },
        { name: "price", label: "Price", type: "number", half: true },
        { name: "priority", label: "Priority", type: "select", options: Object.entries(PRIO).map(([value, label]) => ({ value, label })), half: true },
        { name: "link", label: "Link", type: "text", placeholder: "https://" },
        { name: "notes", label: "Notes", type: "textarea" },
        { name: "files", label: "Photos", type: "files" },
      ]}
      defaults={() => ({ priority: "med" })}
      sort={(a, b) => Number(!!a.bought) - Number(!!b.bought) || ["high", "med", "low"].indexOf(a.priority) - ["high", "med", "low"].indexOf(b.priority)}
      groupBy={(w) => (w.bought ? "Bought ✓" : PRIO[w.priority])}
      searchText={(w) => `${w.name} ${w.notes ?? ""}`}
      onComplete={buy}
      completeLabel="Bought"
      empty={{ emoji: "🎁", title: "Wishlist is empty", hint: "Park impulse buys here. If you still want it in 30 days, it's worth it." }}
      header={(rows) => {
        const open = rows.filter((r) => !r.bought);
        if (!open.length) return null;
        return (
          <Card strong className="mb-2 flex justify-between">
            <span className="text-muted">{open.length} wishes</span>
            <b>{money(open.reduce((a, r) => a + (r.price ?? 0), 0), s.currency)}</b>
          </Card>
        );
      }}
      render={(w) => {
        const days = Math.floor((now - w.createdAt) / 864e5);
        return (
          <div className={cn(w.bought && "opacity-50")}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div className="min-w-0 flex-1">
                <div className={cn("font-semibold", w.bought && "line-through")}>{w.name}</div>
                <div className="text-[12px] text-muted">
                  Wished {days === 0 ? "today" : `${days} days ago`}
                  {!w.bought && days >= 30 ? " · ✅ passed the 30-day test" : ""}
                </div>
              </div>
              {w.price ? <span className="font-semibold">{money(w.price, s.currency)}</span> : null}
            </div>
            {w.link && (
              <a href={w.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-1 block truncate text-[12px] text-accent">
                {w.link}
              </a>
            )}
            <FileStrip ids={w.files} size={44} />
          </div>
        );
      }}
    />
  );
}
