"use client";

import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Btn, Card, Chip, Empty, PageHeader, SectionTitle, SwipeRow } from "@/components/ui";
import { confetti } from "@/lib/confetti";
import { all, remove } from "@/lib/data";
import { endFast, FAST_STAGES, fastStage, startFast } from "@/lib/fasting";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";

const PLANS = [
  { h: 12, label: "12:12" },
  { h: 14, label: "14:10" },
  { h: 16, label: "16:8" },
  { h: 18, label: "18:6" },
  { h: 20, label: "20:4" },
  { h: 23, label: "OMAD" },
];

const hm = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

export default function Fasting() {
  const fasts = useLiveQuery(async () => (await all("fasts")).sort((a, b) => b.start - a.start), []);
  const current = fasts?.find((f) => !f.end);
  const [goal, setGoal] = useState(16);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!current) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [current]);

  const elapsed = current ? now - current.start : 0;
  const goalMs = (current?.goalHours ?? goal) * 3600_000;
  const pct = Math.min(1, elapsed / goalMs);
  const stage = fastStage(elapsed / 3600_000);
  const done = (fasts ?? []).filter((f) => f.end);
  const hit = done.filter((f) => f.end! - f.start >= f.goalHours * 3600_000).length;
  const size = 260;
  const r = 112;
  const c = 2 * Math.PI * r;

  return (
    <div>
      <PageHeader title="Fasting" back subtitle={current ? `Goal ${current.goalHours}h · ends ${format(current.start + goalMs, "EEE h:mm a")}` : "Intermittent fasting timer"} />
      <div className="relative mx-auto my-4 grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#30d158" strokeOpacity={0.15} strokeWidth={18} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={pct >= 1 ? "#ff9f0a" : "#30d158"} strokeWidth={18} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div key={stage.label} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl">
              {current ? stage.emoji : "🍽️"}
            </motion.div>
          </AnimatePresence>
          <div className="text-[40px] font-light tabular-nums">{current ? hm(elapsed) : `${goal}h`}</div>
          <div className="text-[13px] text-muted">{current ? stage.label : "ready to start"}</div>
        </div>
      </div>
      {current ? (
        <>
          <p className="mb-3 text-center text-[14px] text-muted">{stage.info}</p>
          <Btn
            full
            variant={pct >= 1 ? "primary" : "glass"}
            onClick={async () => {
              await endFast();
              if (pct >= 1) {
                confetti();
                feedback("levelup");
                toast(`Fast complete: ${hm(elapsed)}!`, { emoji: "🏆" });
              } else toast(`Fast ended at ${hm(elapsed)}`, { emoji: "🍽️" });
            }}
          >
            {pct >= 1 ? "Complete fast 🎉" : "End fast early"}
          </Btn>
        </>
      ) : (
        <>
          <div className="no-scrollbar mb-3 flex justify-center gap-2 overflow-x-auto">
            {PLANS.map((p) => (
              <Chip key={p.h} active={goal === p.h} onClick={() => setGoal(p.h)}>
                {p.label}
              </Chip>
            ))}
          </div>
          <Btn full onClick={async () => (await startFast(goal), toast(`${goal}h fast started`, { emoji: "🥗" }))}>
            Start fasting
          </Btn>
        </>
      )}

      <SectionTitle>Stages</SectionTitle>
      <Card className="space-y-2">
        {FAST_STAGES.map((st) => {
          const reached = current && elapsed / 3600_000 >= st.h;
          return (
            <div key={st.h} className={reached ? "flex items-center gap-3" : "flex items-center gap-3 opacity-50"}>
              <span className="text-xl">{st.emoji}</span>
              <span className="flex-1 text-[14px]">
                <b>{st.label}</b> <span className="text-muted">· {st.h}h+</span>
              </span>
              {reached && <span className="text-good">✓</span>}
            </div>
          );
        })}
        <p className="pt-1 text-[11px] text-muted">General wellness info, not medical advice. Talk to a doctor before fasting if you have a health condition.</p>
      </Card>

      <SectionTitle>History · {hit}/{done.length} goals hit</SectionTitle>
      {fasts && done.length === 0 && <Empty emoji="🥗" title="No fasts yet" hint="Pick a plan and start your first fast." />}
      <AnimatePresence initial={false}>
        {done.slice(0, 30).map((f) => {
          const ms = f.end! - f.start;
          const ok = ms >= f.goalHours * 3600_000;
          return (
            <SwipeRow
              key={f.id}
              onDelete={async () => {
                const undo = await remove("fasts", f.id);
                toast("Fast deleted", { undo });
              }}
            >
              <div className="flex items-center justify-between p-3.5">
                <span>
                  {ok ? "✅" : "⏹️"} {format(f.start, "EEE d MMM")}
                  <span className="block text-[12px] text-muted">
                    {format(f.start, "h:mm a")} → {format(f.end!, "h:mm a")} · goal {f.goalHours}h
                  </span>
                </span>
                <span className="font-semibold">{hm(ms)}</span>
              </div>
            </SwipeRow>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
