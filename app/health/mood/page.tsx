"use client";

import { addDays, format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Btn, Card, Empty, IconBtn, PageHeader, SectionTitle, Sheet, SwipeRow } from "@/components/ui";
import { ASSOCIATIONS, FEELINGS, MOOD_SCALE } from "@/lib/constants";
import { add, remove, useRows } from "@/lib/data";
import { cn } from "@/lib/format";
import { iso, todayIso } from "@/lib/recurrence";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";

export default function Mood() {
  const moods = useRows("moods");
  // opened directly from Quick Add (?log=1)
  const [open, setOpen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("log"));
  const today = todayIso();
  const sorted = [...(moods ?? [])].sort((a, b) => b.at - a.at);
  const days = Array.from({ length: 28 }, (_, i) => iso(addDays(parseISO(today), i - 27)));
  const byDay = new Map<string, number[]>();
  for (const m of moods ?? []) byDay.set(m.date, [...(byDay.get(m.date) ?? []), m.value]);
  const assocMap = new Map<string, number[]>();
  for (const x of moods ?? []) for (const a of x.associations) assocMap.set(a, [...(assocMap.get(a) ?? []), x.value]);
  const assocStats = [...assocMap.entries()].map(([a, vs]) => ({ a, avg: vs.reduce((s, v) => s + v, 0) / vs.length, n: vs.length })).filter((x) => x.n >= 2).sort((x, y) => y.avg - x.avg);

  return (
    <div>
      <PageHeader
        title="State of Mind"
        back
        subtitle="Notice how you feel"
        actions={
          <IconBtn label="Log mood" onClick={() => setOpen(true)} className="bg-accent! text-white">
            <Plus size={20} />
          </IconBtn>
        }
      />
      <Card>
        <div className="mb-2 text-[13px] font-semibold uppercase text-muted">Last 4 weeks</div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const vs = byDay.get(d);
            const avg = vs ? Math.round(vs.reduce((a, v) => a + v, 0) / vs.length) : 0;
            return (
              <div key={d} title={d} className="grid aspect-square place-items-center rounded-xl text-[18px]" style={{ background: avg ? `color-mix(in srgb, ${MOOD_SCALE[avg - 1].color} 30%, transparent)` : "var(--hairline)" }}>
                {avg ? MOOD_SCALE[avg - 1].emoji : <span className="text-[10px] text-faint">{d.slice(8)}</span>}
              </div>
            );
          })}
        </div>
      </Card>
      {assocStats.length > 0 && (
        <>
          <SectionTitle>What lifts you</SectionTitle>
          <Card className="space-y-2">
            {assocStats.slice(0, 6).map((x) => (
              <div key={x.a} className="flex items-center gap-2 text-[14px]">
                <span className="w-24 truncate">{x.a}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-hairline">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(x.avg / 5) * 100}%` }} className="h-full rounded-full" style={{ background: MOOD_SCALE[Math.round(x.avg) - 1].color }} />
                </div>
                <span>{MOOD_SCALE[Math.round(x.avg) - 1].emoji}</span>
              </div>
            ))}
          </Card>
        </>
      )}
      <SectionTitle>Entries</SectionTitle>
      {moods && sorted.length === 0 && <Empty emoji="🌈" title="No moods logged" hint="Logging feelings builds emotional awareness and helps you spot patterns." />}
      <AnimatePresence initial={false}>
        {sorted.slice(0, 50).map((m) => {
          const sc = MOOD_SCALE[m.value - 1];
          return (
            <SwipeRow
              key={m.id}
              onDelete={async () => {
                const undo = await remove("moods", m.id);
                toast("Mood deleted", { undo });
              }}
            >
              <div className="flex gap-3 p-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl" style={{ background: `color-mix(in srgb, ${sc.color} 25%, transparent)` }}>
                  {sc.emoji}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold">{sc.label}</div>
                  <div className="text-[13px] text-muted">{format(m.at, "EEE d MMM, h:mm a")}</div>
                  {m.feelings.length > 0 && <div className="text-[14px]">{m.feelings.join(", ")}</div>}
                  {m.associations.length > 0 && <div className="text-[12px] text-muted">{m.associations.join(" · ")}</div>}
                  {m.note && <div className="mt-1 text-[14px] italic">“{m.note}”</div>}
                </div>
              </div>
            </SwipeRow>
          );
        })}
      </AnimatePresence>
      <MoodLogger open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function MoodLogger({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [value, setValue] = useState(3);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [assoc, setAssoc] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep(0);
      setValue(3);
      setFeelings([]);
      setAssoc([]);
      setNote("");
    }
  }
  const sc = MOOD_SCALE[value - 1];
  const toggle = (arr: string[], set: (v: string[]) => void, x: string) => {
    feedback("tap");
    set(arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
  };
  const save = async () => {
    await add("moods", { date: todayIso(), at: Date.now(), value, feelings, associations: assoc, note: note || undefined });
    feedback("success");
    toast(`Logged: ${sc.label}`, { emoji: sc.emoji });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="How do you feel right now?"
      footer={
        <div className="flex gap-2">
          {step > 0 && <Btn variant="glass" onClick={() => setStep(step - 1)}>Back</Btn>}
          <Btn full onClick={() => (step < 2 ? setStep(step + 1) : save())} sound={step < 2 ? "tap" : null}>
            {step < 2 ? "Next" : "Done"}
          </Btn>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          {step === 0 && (
            <div className="flex flex-col items-center py-4">
              <motion.div key={value} initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 12 }} className="grid h-36 w-36 place-items-center rounded-full text-[72px]" style={{ background: `radial-gradient(circle, color-mix(in srgb, ${sc.color} 55%, transparent), transparent 70%)` }}>
                {sc.emoji}
              </motion.div>
              <div className="mt-2 text-[22px] font-bold">{sc.label}</div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={value}
                onChange={(e) => {
                  feedback("tap");
                  setValue(Number(e.target.value));
                }}
                className="mt-6 w-full"
                style={{ accentColor: sc.color }}
                aria-label="Mood"
              />
              <div className="mt-1 flex w-full justify-between text-[12px] text-muted">
                <span>Very Unpleasant</span>
                <span>Very Pleasant</span>
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <p className="mb-3 text-muted">What best describes this feeling?</p>
              <div className="flex flex-wrap gap-2">
                {FEELINGS[value].map((f) => (
                  <button key={f} onClick={() => toggle(feelings, setFeelings, f)} className={cn("rounded-full px-3.5 py-2 text-[14px] font-medium", feelings.includes(f) ? "text-white" : "bg-hairline")} style={feelings.includes(f) ? { background: sc.color } : undefined}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <p className="mb-3 text-muted">What&apos;s having the biggest impact?</p>
              <div className="flex flex-wrap gap-2">
                {ASSOCIATIONS.map((f) => (
                  <button key={f} onClick={() => toggle(assoc, setAssoc, f)} className={cn("rounded-full px-3.5 py-2 text-[14px] font-medium", assoc.includes(f) ? "bg-accent text-white" : "bg-hairline")}>
                    {f}
                  </button>
                ))}
              </div>
              <textarea className="field mt-4 min-h-20" placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}
