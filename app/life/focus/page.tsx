"use client";

import { addDays, format, parseISO } from "date-fns";
import { motion } from "motion/react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { mmss } from "@/components/Shell";
import { Btn, Card, Chip, PageHeader, SectionTitle } from "@/components/ui";
import { useRows } from "@/lib/data";
import { iso, todayIso } from "@/lib/recurrence";
import { saveSettings, useSettings } from "@/lib/settings";
import { feedback } from "@/lib/sound";
import { focusActions, focusRemaining, focusStore, useStore } from "@/lib/store";

const LABELS = ["Focus", "Study", "Read", "Clean", "Create", "Practice"];

export default function Focus() {
  const s = useSettings();
  const f = useStore(focusStore);
  const sessions = useRows("focus");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!f.running) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [f.running]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default" && s.notifications) void Notification.requestPermission();
  }, [s.notifications]);

  const remaining = focusRemaining(f, now);
  const progress = 1 - remaining / f.total;
  const size = 280;
  const r = 124;
  const c = 2 * Math.PI * r;
  const today = todayIso();
  const todayMin = (sessions ?? []).filter((x) => x.date === today).reduce((a, x) => a + x.minutes, 0);
  const week = Array.from({ length: 7 }, (_, i) => iso(addDays(parseISO(today), i - 6)));
  const max = Math.max(1, ...week.map((d) => (sessions ?? []).filter((x) => x.date === d).reduce((a, x) => a + x.minutes, 0)));
  const color = f.phase === "break" ? "#30d158" : "#ff375f";
  const idle = !f.running && f.remaining === f.total;

  return (
    <div>
      <PageHeader title="Focus" back subtitle={`${todayMin} min focused today`} />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {LABELS.map((l) => (
          <Chip key={l} active={f.label === l} onClick={() => focusStore.set((x) => ({ ...x, label: l }))}>
            {l}
          </Chip>
        ))}
      </div>
      <div className="relative mx-auto my-8 grid place-items-center" style={{ width: size, height: size }}>
        <motion.div className="absolute inset-6 rounded-full blur-3xl" animate={{ opacity: f.running ? [0.25, 0.5, 0.25] : 0.15, scale: f.running ? [0.95, 1.05, 0.95] : 1 }} transition={{ repeat: Infinity, duration: 4 }} style={{ background: color }} />
        <svg width={size} height={size} className="absolute -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.15} strokeWidth={16} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} style={{ transition: "stroke-dashoffset 0.25s linear" }} />
        </svg>
        <div className="relative text-center">
          <div className="text-[15px] font-semibold uppercase tracking-wide text-muted">{f.phase === "break" ? "Break" : f.label}</div>
          <div className="text-[64px] font-light tabular-nums tracking-tight">{mmss(remaining)}</div>
        </div>
      </div>
      {idle && (
        <div className="mb-4 flex justify-center gap-2">
          {[15, 25, 45, 60].map((m) => (
            <Chip key={m} active={s.focusMinutes === m} onClick={() => (saveSettings({ focusMinutes: m }), focusActions.reset(m))}>
              {m} min
            </Chip>
          ))}
        </div>
      )}
      <div className="flex items-center justify-center gap-5">
        <motion.button whileTap={{ scale: 0.88 }} aria-label="Reset" onClick={() => (feedback("tap"), focusActions.reset(s.focusMinutes))} className="glass grid h-16 w-16 place-items-center rounded-full">
          <RotateCcw size={22} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          aria-label={f.running ? "Pause" : "Start"}
          onClick={() => {
            feedback(f.running ? "tap" : "success");
            if (f.running) focusActions.pause();
            else if (idle) focusActions.start(s.focusMinutes, f.label);
            else focusActions.start();
          }}
          className="grid h-24 w-24 place-items-center rounded-full text-white shadow-xl"
          style={{ background: color, boxShadow: `0 12px 30px color-mix(in srgb, ${color} 45%, transparent)` }}
        >
          {f.running ? <Pause size={36} fill="white" /> : <Play size={36} fill="white" className="ml-1" />}
        </motion.button>
        <Btn variant="glass" className="h-16 w-16 rounded-full! p-0" onClick={() => focusActions.start(5, "Break", "break")}>
          ☕
        </Btn>
      </div>
      <SectionTitle>This week</SectionTitle>
      <Card>
        <div className="flex h-28 items-end justify-between gap-2">
          {week.map((d) => {
            const m = (sessions ?? []).filter((x) => x.date === d).reduce((a, x) => a + x.minutes, 0);
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-1">
                <motion.div initial={{ height: 0 }} animate={{ height: `${(m / max) * 80}px` }} className="w-full rounded-lg" style={{ background: d === today ? "#ff375f" : "color-mix(in srgb, #ff375f 40%, transparent)", minHeight: 4 }} />
                <span className="text-[11px] text-muted">{format(parseISO(d), "EEEEE")}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
