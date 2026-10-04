"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCrud } from "@/components/CrudPage";
import { FileThumb } from "@/components/Files";
import { Btn, Empty, IconBtn, PageHeader, Sheet } from "@/components/ui";
import { WALLET_KINDS } from "@/lib/constants";
import type { WalletCard } from "@/lib/db";
import { useRows } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";

export default function Wallet() {
  const cards = useRows("wallet");
  const [open, setOpen] = useState<WalletCard | null>(null);
  const crud = useCrud<WalletCard>({
    table: "wallet",
    noun: "Card",
    defaults: () => ({ kind: "Loyalty", color: "#0a84ff" }),
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Gym membership, Library card…" },
      { name: "kind", label: "Type", type: "chips", options: WALLET_KINDS },
      { name: "number", label: "Card / member number", type: "text" },
      { name: "expiry", label: "Expires", type: "date" },
      { name: "color", label: "Card colour", type: "color" },
      { name: "files", label: "Barcode / QR / photo", type: "files", hint: "Snap the barcode to show it at checkout." },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  });
  const list = [...(cards ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div>
      <PageHeader
        title="Wallet"
        back
        subtitle="Cards, passes & memberships"
        actions={
          <IconBtn label="Add card" onClick={crud.create} className="bg-accent! text-white">
            <Plus size={20} />
          </IconBtn>
        }
      />
      {cards && list.length === 0 && <Empty emoji="💳" title="Wallet is empty" hint="Add loyalty cards, memberships and IDs. Don't store bank card PINs or CVVs." />}
      <div className="relative pb-24">
        {list.map((c, i) => (
          <motion.button
            key={c.id}
            layoutId={`card-${c.id}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28, delay: i * 0.05 }}
            whileHover={{ y: -8 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => (feedback("open"), setOpen(c))}
            className="relative block w-full overflow-hidden rounded-[22px] p-5 text-left text-white shadow-xl"
            style={{ marginTop: i === 0 ? 0 : -110, zIndex: i, height: 190, background: `linear-gradient(135deg, ${c.color}, color-mix(in srgb, ${c.color} 55%, black))` }}
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 -left-6 h-40 w-40 rounded-full bg-white/5" />
            <div className="relative flex justify-between">
              <span className="text-[19px] font-bold">{c.name}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[12px] font-semibold">{c.kind}</span>
            </div>
            {c.number && <div className="relative mt-14 font-mono text-[18px] tracking-[0.15em]">{/^\d+$/.test(c.number) ? c.number.replace(/(.{4})/g, "$1 ").trim() : c.number}</div>}
            {c.expiry && <div className="relative text-[12px] opacity-80">Valid thru {fmtDate(c.expiry, "MM/yy")}</div>}
          </motion.button>
        ))}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name}>
        {open && (
          <div className="space-y-4 pb-2">
            <div className="rounded-[22px] p-5 text-white" style={{ background: `linear-gradient(135deg, ${open.color}, color-mix(in srgb, ${open.color} 55%, black))` }}>
              <div className="text-[13px] opacity-80">{open.kind}</div>
              <div className="text-[22px] font-bold">{open.name}</div>
              {open.number && <div className="mt-6 font-mono text-[20px] tracking-[0.15em]">{open.number}</div>}
            </div>
            {(open.files ?? []).length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 rounded-2xl bg-white p-4">
                {open.files!.map((id) => (
                  <FileThumb key={id} id={id} size={220} />
                ))}
              </div>
            )}
            {open.notes && <p className="text-[15px]">{open.notes}</p>}
            <div className="flex gap-2">
              {open.number && (
                <Btn
                  variant="soft"
                  full
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(open.number!);
                      toast("Number copied", { emoji: "📋" });
                    } catch {
                      toast("Couldn't copy", { emoji: "⚠️" });
                    }
                  }}
                >
                  Copy number
                </Btn>
              )}
              <Btn variant="glass" full onClick={() => (crud.edit(open), setOpen(null))}>
                Edit
              </Btn>
            </div>
          </div>
        )}
      </Sheet>
      {crud.sheet}
    </div>
  );
}
