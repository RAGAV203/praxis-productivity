"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check as CheckIcon, Paperclip, Plus, Star, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Check } from "@/lib/db";
import { saveFile, useRows } from "@/lib/data";
import { cn } from "@/lib/format";
import type { Freq, RecurrenceRule } from "@/lib/recurrence";
import { feedback } from "@/lib/sound";
import { Btn, Sheet, Toggle } from "./ui";
import { FileThumb } from "./Files";

export type FieldType = "text" | "textarea" | "number" | "date" | "time" | "select" | "chips" | "toggle" | "tags" | "list" | "checklist" | "recurrence" | "files" | "color" | "emoji" | "rating" | "person" | "times";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: (string | { value: string; label: string })[];
  hint?: string;
  half?: boolean;
  step?: number;
  /** show only when predicate passes */
  when?: (v: Record<string, unknown>) => boolean;
}

export type FormValues = Record<string, unknown>;

const opt = (o: string | { value: string; label: string }) => (typeof o === "string" ? { value: o, label: o } : o);

export const COLORS = ["#0a84ff", "#5e5ce6", "#bf5af2", "#ff375f", "#ff9f0a", "#ffd60a", "#30d158", "#64d2ff", "#8e8e93", "#1c1c1e"];
const EMOJIS = ["✨", "💧", "🏃", "📚", "🧘", "🥗", "💤", "💪", "🎯", "🧠", "🎸", "✍️", "🌿", "☀️", "🚭", "💊", "🙏", "🧹", "💰", "❤️", "🎨", "🐶", "🌱", "🚴", "🏊", "🎉", "✈️", "🏠", "🎂", "📅"];

export function Field({ def, value, onChange }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const people = useRows("people");
  const label = (
    <label className="mb-1.5 block px-1 text-[13px] font-medium text-muted">
      {def.label}
      {def.required && <span className="text-bad"> *</span>}
    </label>
  );
  let input: ReactNode;
  switch (def.type) {
    case "text":
      input = <input className="field" value={(value as string) ?? ""} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} required={def.required} />;
      break;
    case "textarea":
      input = <textarea className="field min-h-28 resize-y" value={(value as string) ?? ""} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} required={def.required} />;
      break;
    case "number":
      input = <input className="field" type="number" inputMode="decimal" step={def.step ?? "any"} value={value === undefined || value === null ? "" : String(value)} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} required={def.required} />;
      break;
    case "date":
    case "time":
      input = <input className="field" type={def.type} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} required={def.required} />;
      break;
    case "select":
      input = (
        <select className="field appearance-none" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} required={def.required}>
          {!def.required && <option value="">—</option>}
          {def.options?.map(opt).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "chips":
      input = (
        <div className="flex flex-wrap gap-2">
          {def.options?.map(opt).map((o) => (
            <button type="button" key={o.value} onClick={() => (feedback("tap"), onChange(o.value))} className={cn("rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors", value === o.value ? "bg-accent text-white" : "bg-hairline")}>
              {o.label}
            </button>
          ))}
        </div>
      );
      break;
    case "person":
      input = (
        <>
          <input className="field" list={`people-${def.name}`} value={(value as string) ?? ""} placeholder="Me" onChange={(e) => onChange(e.target.value)} />
          <datalist id={`people-${def.name}`}>
            {people?.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </>
      );
      break;
    case "toggle":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-hairline px-4 py-3">
          <span className="text-[15px]">{def.label}</span>
          <Toggle checked={!!value} onChange={onChange} label={def.label} />
        </div>
      );
    case "tags":
      input = <input className="field" value={((value as string[]) ?? []).join(", ")} placeholder={def.placeholder ?? "comma, separated"} onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trimStart()).filter((s, i, a) => s || i === a.length - 1))} />;
      break;
    case "list":
      input = <ListInput value={(value as string[]) ?? []} onChange={onChange} placeholder={def.placeholder} />;
      break;
    case "times":
      input = <ListInput value={(value as string[]) ?? []} onChange={onChange} type="time" />;
      break;
    case "checklist":
      input = <ChecklistInput value={(value as Check[]) ?? []} onChange={onChange} placeholder={def.placeholder} />;
      break;
    case "recurrence":
      input = <RecurrenceInput value={(value as RecurrenceRule) ?? { freq: "none", interval: 1 }} onChange={onChange} />;
      break;
    case "files":
      input = <FilesInput value={(value as string[]) ?? []} onChange={onChange} />;
      break;
    case "color":
      input = (
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map((c) => (
            <button type="button" key={c} aria-label={c} onClick={() => (feedback("tap"), onChange(c))} className="grid h-9 w-9 place-items-center rounded-full ring-offset-2 ring-offset-transparent transition-transform active:scale-90" style={{ background: c, boxShadow: value === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : undefined }}>
              {value === c && <CheckIcon size={16} color="white" />}
            </button>
          ))}
        </div>
      );
      break;
    case "emoji":
      input = (
        <div className="grid grid-cols-10 gap-1.5">
          {EMOJIS.map((e) => (
            <button type="button" key={e} onClick={() => (feedback("tap"), onChange(e))} className={cn("grid aspect-square place-items-center rounded-xl text-xl transition", value === e ? "bg-accent/20 ring-2 ring-accent" : "bg-hairline")}>
              {e}
            </button>
          ))}
        </div>
      );
      break;
    case "rating":
      input = (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button whileTap={{ scale: 0.8 }} type="button" key={n} aria-label={`${n} stars`} onClick={() => (feedback("tap"), onChange(n))}>
              <Star size={30} className={cn("transition-colors", (value as number) >= n ? "fill-warn text-warn" : "text-faint")} />
            </motion.button>
          ))}
        </div>
      );
      break;
  }
  return (
    <div className={def.half ? "col-span-1" : "col-span-2"}>
      {label}
      {input}
      {def.hint && <div className="mt-1 px-1 text-[12px] text-muted">{def.hint}</div>}
    </div>
  );
}

function ListInput({ value, onChange, placeholder, type = "text" }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; type?: string }) {
  const [draft, setDraft] = useState("");
  const addIt = () => {
    if (!draft.trim()) return;
    feedback("tap");
    onChange([...value, draft.trim()]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {value.map((v, i) => (
          <motion.div key={`${v}-${i}`} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 rounded-xl bg-hairline px-3 py-2 text-[15px]">
            <span className="flex-1">{v}</span>
            <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <X size={16} className="text-muted" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="flex gap-2">
        <input className="field" type={type} value={draft} placeholder={placeholder ?? "Add item"} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIt())} />
        <button type="button" onClick={addIt} aria-label="Add" className="grid w-12 shrink-0 place-items-center rounded-[14px] bg-accent text-white">
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export function ChecklistInput({ value, onChange, placeholder }: { value: Check[]; onChange: (v: Check[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const addIt = () => {
    if (!draft.trim()) return;
    feedback("tap");
    onChange([...value, { text: draft.trim(), done: false }]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {value.map((c, i) => (
          <motion.div key={`${c.text}-${i}`} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 rounded-xl bg-hairline px-3 py-2.5 text-[15px]">
            <CheckCircle done={c.done} onClick={() => onChange(value.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />
            <span className={cn("flex-1", c.done && "text-muted line-through")}>{c.text}</span>
            <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 size={15} className="text-muted" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="flex gap-2">
        <input className="field" value={draft} placeholder={placeholder ?? "Add item"} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIt())} />
        <button type="button" onClick={addIt} aria-label="Add" className="grid w-12 shrink-0 place-items-center rounded-[14px] bg-accent text-white">
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export function CheckCircle({ done, onClick, color = "var(--good)", size = 24 }: { done: boolean; onClick: () => void; color?: string; size?: number }) {
  return (
    <motion.button
      type="button"
      aria-label={done ? "Mark not done" : "Mark done"}
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.stopPropagation();
        feedback(done ? "tap" : "complete");
        onClick();
      }}
      className="grid shrink-0 place-items-center rounded-full border-2 transition-colors"
      style={{ width: size, height: size, borderColor: done ? color : "var(--faint)", background: done ? color : "transparent" }}
    >
      <AnimatePresence>
        {done && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
            <CheckIcon size={size * 0.6} color="white" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function RecurrenceInput({ value, onChange }: { value: RecurrenceRule; onChange: (v: RecurrenceRule) => void }) {
  const freqs: { v: Freq; l: string }[] = [
    { v: "none", l: "Once" },
    { v: "daily", l: "Daily" },
    { v: "weekly", l: "Weekly" },
    { v: "monthly", l: "Monthly" },
    { v: "yearly", l: "Yearly" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {freqs.map((f) => (
          <button type="button" key={f.v} onClick={() => (feedback("tap"), onChange({ ...value, freq: f.v }))} className={cn("rounded-full px-3.5 py-2 text-[14px] font-medium", value.freq === f.v ? "bg-accent text-white" : "bg-hairline")}>
            {f.l}
          </button>
        ))}
      </div>
      {value.freq !== "none" && (
        <div className="flex items-center gap-2 text-[15px]">
          Every
          <input className="field w-20" type="number" min={1} value={value.interval} onChange={(e) => onChange({ ...value, interval: Math.max(1, Number(e.target.value) || 1) })} />
          {{ daily: "day(s)", weekly: "week(s)", monthly: "month(s)", yearly: "year(s)", none: "" }[value.freq]}
        </div>
      )}
    </div>
  );
}

function FilesInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {value.map((id) => (
        <div key={id} className="relative">
          <FileThumb id={id} />
          <button type="button" aria-label="Remove file" onClick={() => onChange(value.filter((x) => x !== id))} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-bad text-white">
            <X size={13} />
          </button>
        </div>
      ))}
      <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-faint/60 text-muted">
        <Paperclip size={20} />
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            const ids = await Promise.all(files.map(saveFile));
            onChange([...value, ...ids]);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

/* ---------------- Form sheet ---------------- */
export function FormSheet({ open, onClose, title, fields, initial, onSubmit, onDelete, submitLabel = "Save" }: { open: boolean; onClose: () => void; title: string; fields: FieldDef[]; initial: FormValues; onSubmit: (v: FormValues) => void | Promise<void>; onDelete?: () => void; submitLabel?: string }) {
  const [values, setValues] = useState<FormValues>(initial);
  const [error, setError] = useState("");
  // reset the form each time the sheet opens (state adjustment during render)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(initial);
      setError("");
    }
  }

  const visible = fields.filter((f) => !f.when || f.when(values));
  const submit = async () => {
    const missing = visible.find((f) => f.required && (values[f.name] === undefined || values[f.name] === "" || values[f.name] === null));
    if (missing) {
      feedback("delete");
      setError(`${missing.label} is required`);
      return;
    }
    const clean = { ...values };
    for (const f of fields) if (f.type === "tags" && Array.isArray(clean[f.name])) clean[f.name] = (clean[f.name] as string[]).map((s) => s.trim()).filter(Boolean);
    await onSubmit(clean);
    feedback("success");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Btn variant="danger" sound="delete" onClick={() => (onDelete(), onClose())}>
              <Trash2 size={17} />
            </Btn>
          )}
          <Btn full onClick={submit} sound={null}>
            {submitLabel}
          </Btn>
        </div>
      }
    >
      <form
        className="grid grid-cols-2 gap-x-3 gap-y-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {visible.map((f) => (
          <Field key={f.name} def={f} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
        ))}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="col-span-2 rounded-xl bg-bad/12 px-3 py-2 text-[14px] text-bad">
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
