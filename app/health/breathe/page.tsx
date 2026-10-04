"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Btn, PageHeader, Segmented } from "@/components/ui";
import { confetti } from "@/lib/confetti";
import { add } from "@/lib/data";
import { todayIso } from "@/lib/recurrence";
import { haptic, play } from "@/lib/sound";
import { toast } from "@/lib/store";

type Pattern = "box" | "478" | "calm";
const PATTERNS: Record<Pattern, { name: string; steps: { label: string; secs: number; scale: number }[] }> = {
  box: { name: "Box", steps: [{ label: "Breathe in", secs: 4, scale: 1 }, { label: "Hold", secs: 4, scale: 1 }, { label: "Breathe out", secs: 4, scale: 0.45 }, { label: "Hold", secs: 4, scale: 0.45 }] },
  "478": { name: "4-7-8", steps: [{ label: "Breathe in", secs: 4, scale: 1 }, { label: "Hold", secs: 7, scale: 1 }, { label: "Breathe out", secs: 8, scale: 0.45 }] },
  calm: { name: "Calm", steps: [{ label: "Breathe in", secs: 5, scale: 1 }, { label: "Breathe out", secs: 5, scale: 0.45 }] },
};

export default function Breathe() {
  const [pattern, setPattern] = useState<Pattern>("box");
  const [minutes, setMinutes] = useState(1);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState(0);
  const endsAt = useRef(0);
  const p = PATTERNS[pattern];

  useEffect(() => {
    if (!running) return;
    const cur = p.steps[step % p.steps.length];
    if (cur.label === "Breathe in") play("breathIn");
    if (cur.label === "Breathe out") play("breathOut");
    haptic(20);
    const id = setTimeout(() => {
      if (Date.now() >= endsAt.current && (step + 1) % p.steps.length === 0) {
        setRunning(false);
        void add("workouts", { date: todayIso(), type: "Yoga", minutes, notes: `Mindful breathing (${p.name})` });
        play("complete");
        confetti({ count: 50 });
        toast(`${minutes} mindful minute${minutes > 1 ? "s" : ""} done`, { emoji: "🫁" });
        return;
      }
      setStep((x) => x + 1);
    }, cur.secs * 1000);
    return () => clearTimeout(id);
  }, [running, step, p, minutes]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, [running]);

  const cur = p.steps[step % p.steps.length];
  return (
    <div>
      <PageHeader title="Breathe" back subtitle="A mindful minute" />
      {!running && (
        <div className="space-y-3">
          <Segmented id="pat" value={pattern} onChange={setPattern} options={(Object.keys(PATTERNS) as Pattern[]).map((k) => ({ value: k, label: PATTERNS[k].name }))} />
          <Segmented id="min" value={String(minutes)} onChange={(v) => setMinutes(Number(v))} options={["1", "3", "5", "10"].map((m) => ({ value: m, label: `${m} min` }))} />
        </div>
      )}
      <div className="relative my-10 grid h-[300px] place-items-center">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="absolute h-40 w-40 rounded-full mix-blend-multiply dark:mix-blend-screen"
            style={{ background: i % 2 ? "rgba(100,210,255,0.45)" : "rgba(48,209,88,0.4)" }}
            animate={{ scale: running ? cur.scale * 1.5 : 0.6, x: running ? Math.cos((i / 6) * Math.PI * 2) * 50 * cur.scale : 0, y: running ? Math.sin((i / 6) * Math.PI * 2) * 50 * cur.scale : 0, rotate: running ? step * 30 : 0 }}
            transition={{ duration: running ? cur.secs : 1, ease: "easeInOut" }}
          />
        ))}
        <AnimatePresence mode="wait">
          <motion.div key={running ? `${step}` : "idle"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="relative text-center">
            <div className="text-[24px] font-semibold">{running ? cur.label : "Ready"}</div>
            {running && <div className="text-[14px] text-muted">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>}
          </motion.div>
        </AnimatePresence>
      </div>
      <Btn
        full
        variant={running ? "glass" : "primary"}
        onClick={() => {
          if (running) setRunning(false);
          else {
            endsAt.current = Date.now() + minutes * 60_000;
            setLeft(minutes * 60);
            setStep(0);
            setRunning(true);
          }
        }}
      >
        {running ? "Stop" : "Begin"}
      </Btn>
    </div>
  );
}
