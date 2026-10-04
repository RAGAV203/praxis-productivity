"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, Star } from "lucide-react";
import { useState } from "react";
import { useCrud } from "@/components/CrudPage";
import { CheckCircle } from "@/components/Form";
import { Btn, Empty, PageHeader, SwipeRow } from "@/components/ui";
import { AISLES, guessAisle } from "@/lib/aisles";
import type { GroceryItem } from "@/lib/db";
import { add, update, useRows } from "@/lib/data";
import { cn } from "@/lib/format";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";

export default function Grocery() {
  const items = useRows("grocery");
  const [draft, setDraft] = useState("");
  const crud = useCrud<GroceryItem>({
    table: "grocery",
    noun: "Item",
    defaults: () => ({ aisle: "Other", done: false }),
    fields: [
      { name: "name", label: "Item", type: "text", required: true },
      { name: "qty", label: "Quantity", type: "text", half: true, placeholder: "2 kg, 1 pack" },
      { name: "aisle", label: "Aisle", type: "select", options: [...AISLES], half: true },
      { name: "staple", label: "Staple (re-add with one tap)", type: "toggle" },
    ],
  });

  const addItems = async () => {
    const names = draft.split(/,|\n/).map((x) => x.trim()).filter(Boolean);
    if (!names.length) return;
    for (const raw of names) {
      const m = raw.match(/^(.*?)\s+(\d+\s*\w*)$/);
      const name = m ? m[1] : raw;
      await add("grocery", { name, qty: m?.[2], aisle: guessAisle(name), done: false });
    }
    feedback("success");
    setDraft("");
  };

  const all = items ?? [];
  const toBuy = all.filter((i) => !i.done);
  const inCart = all.filter((i) => i.done);
  const staples = all.filter((i) => i.staple && i.done);
  const aisles = AISLES.filter((a) => toBuy.some((i) => i.aisle === a));

  return (
    <div>
      <PageHeader title="Grocery" back subtitle={toBuy.length ? `${toBuy.length} to buy` : "List is clear"} />
      <div className="glass flex items-center gap-2 rounded-[22px] py-1 pl-4 pr-1">
        <input className="h-12 flex-1 bg-transparent text-[16px] outline-none" placeholder="milk 2, bread, tomatoes…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItems()} aria-label="Add items" />
        <motion.button whileTap={{ scale: 0.85 }} onClick={addItems} aria-label="Add" className="grid h-10 w-10 place-items-center rounded-full bg-accent text-white">
          <Plus size={20} />
        </motion.button>
      </div>
      <p className="mt-1.5 px-2 text-[12px] text-muted">Items auto-sort into aisles ✨. Separate with commas.</p>
      {staples.length > 0 && (
        <Btn
          variant="soft"
          className="mt-3 px-4 py-2 text-[14px]"
          onClick={async () => {
            await Promise.all(staples.map((i) => update("grocery", i.id, { done: false })));
            toast(`${staples.length} staples added`, { emoji: "⭐" });
          }}
        >
          <Star size={15} /> Re-add {staples.length} staples
        </Btn>
      )}
      {items && all.length === 0 && (
        <div className="mt-4">
          <Empty emoji="🛒" title="Nothing on the list" hint="Add items above. They'll group by aisle so shopping is quicker." />
        </div>
      )}
      {aisles.map((a) => (
        <div key={a}>
          <div className="mb-2 mt-5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{a}</div>
          <AnimatePresence initial={false}>
            {toBuy
              .filter((i) => i.aisle === a)
              .map((i) => (
                <Row key={i.id} item={i} onEdit={() => crud.edit(i)} onDelete={() => crud.del(i)} />
              ))}
          </AnimatePresence>
        </div>
      ))}
      {inCart.length > 0 && (
        <div>
          <div className="mb-2 mt-6 flex items-center justify-between px-1">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">In cart · {inCart.length}</span>
            <button
              className="text-[14px] font-semibold text-accent"
              onClick={async () => {
                const gone = inCart.filter((i) => !i.staple);
                await Promise.all(gone.map((i) => update("grocery", i.id, { deletedAt: Date.now() })));
                feedback("delete");
                toast("Cleared checked items", { emoji: "🧹", undo: () => Promise.all(gone.map((i) => update("grocery", i.id, { deletedAt: null }))) });
              }}
            >
              Clear
            </button>
          </div>
          <AnimatePresence initial={false}>
            {inCart.map((i) => (
              <Row key={i.id} item={i} onEdit={() => crud.edit(i)} onDelete={() => crud.del(i)} />
            ))}
          </AnimatePresence>
        </div>
      )}
      {crud.sheet}
    </div>
  );
}

function Row({ item, onEdit, onDelete }: { item: GroceryItem; onEdit: () => void; onDelete: () => void }) {
  return (
    <SwipeRow onDelete={onDelete} onComplete={() => update("grocery", item.id, { done: !item.done })} completeLabel={item.done ? "Undo" : "Got it"}>
      <div className="flex items-center gap-3 px-4 py-3">
        <CheckCircle done={item.done} onClick={() => update("grocery", item.id, { done: !item.done })} />
        <button className={cn("flex-1 text-left", item.done && "text-muted line-through")} onClick={onEdit}>
          {item.name}
          {item.staple && <span className="ml-1 text-[12px]">⭐</span>}
        </button>
        {item.qty && <span className="text-[13px] text-muted">{item.qty}</span>}
      </div>
    </SwipeRow>
  );
}
