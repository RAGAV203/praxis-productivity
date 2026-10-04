"use client";

import { motion } from "motion/react";
import { Delete } from "lucide-react";
import { useState } from "react";
import { add } from "@/lib/data";
import { EXPENSE_CATS, INCOME_CATS, PAY_MODES } from "@/lib/constants";
import { money } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";
import { cn } from "@/lib/format";
import { Btn, Segmented, Sheet } from "./ui";

/** Calculator-style quick entry: big amount, keypad, category chips. */
export function QuickExpense({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amt, setAmt] = useState("0");
  const [cat, setCat] = useState("Food");
  const [mode, setMode] = useState("UPI");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIso());

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAmt("0");
      setNote("");
      setDate(todayIso());
    }
  }

  const cats = kind === "expense" ? EXPENSE_CATS : INCOME_CATS;
  const press = (k: string) => {
    feedback("tap");
    setAmt((a) => {
      if (k === "del") return a.length > 1 ? a.slice(0, -1) : "0";
      if (k === ".") return a.includes(".") ? a : a + ".";
      if (a.includes(".") && a.split(".")[1].length >= 2) return a;
      if (a.replace(".", "").length >= 9) return a;
      return a === "0" ? k : a + k;
    });
  };
  const save = async () => {
    const amount = Number(amt);
    if (!amount) {
      feedback("delete");
      return;
    }
    await add("expenses", { kind, amount, category: cat, date, mode, note: note || undefined, tags: [] });
    feedback("success");
    toast(`${kind === "expense" ? "Spent" : "Received"} ${money(amount, s.currency)}`, { emoji: kind === "expense" ? "💸" : "💰" });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add transaction" footer={<Btn full onClick={save} sound={null}>Save</Btn>}>
      <Segmented
        id="qe-kind"
        value={kind}
        onChange={(v) => {
          setKind(v);
          setCat(v === "expense" ? "Food" : "Salary");
        }}
        options={[
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
        ]}
      />
      <motion.div key={amt} initial={{ scale: 0.96 }} animate={{ scale: 1 }} className={cn("my-4 text-center text-[52px] font-bold tracking-tight tabular-nums", kind === "income" ? "text-good" : "")}>
        {money(0, s.currency).replace(/[\d.,\s]/g, "")}
        {amt}
      </motion.div>
      <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
        {cats.map((c) => (
          <button key={c.name} onClick={() => (feedback("tap"), setCat(c.name))} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-medium transition-all", cat === c.name ? "text-white shadow-md" : "bg-hairline")} style={cat === c.name ? { background: c.color } : undefined}>
            <span>{c.emoji}</span>
            {c.name}
          </button>
        ))}
      </div>
      <div className="mb-3 flex gap-2">
        <select className="field flex-1" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Payment mode">
          {PAY_MODES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input className="field flex-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      </div>
      <input className="field mb-3" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => (
          <motion.button key={k} whileTap={{ scale: 0.9, backgroundColor: "var(--hairline)" }} onClick={() => press(k)} className="grid h-14 place-items-center rounded-2xl bg-hairline/60 text-[24px] font-medium">
            {k === "del" ? <Delete size={22} /> : k}
          </motion.button>
        ))}
      </div>
    </Sheet>
  );
}
