"use client";

import { addDays, format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis } from "recharts";
import { Btn, Card, PageHeader, SectionTitle, SwipeRow, AnimatedNumber } from "@/components/ui";
import { WaterGlass } from "@/components/WaterGlass";
import { addWater } from "@/lib/actions";
import { remove, useRows } from "@/lib/data";
import { iso, todayIso } from "@/lib/recurrence";
import { saveSettings, useSettings } from "@/lib/settings";
import { toast } from "@/lib/store";

const SIZES = [
  { ml: 100, label: "Sip", emoji: "🥄" },
  { ml: 250, label: "Glass", emoji: "🥛" },
  { ml: 500, label: "Bottle", emoji: "🍶" },
  { ml: 750, label: "Large", emoji: "🧴" },
];

export default function Water() {
  const s = useSettings();
  const rows = useRows("water");
  const today = todayIso();
  const todayRows = (rows ?? []).filter((r) => r.date === today).sort((a, b) => b.at - a.at);
  const total = todayRows.reduce((a, r) => a + r.ml, 0);
  const pct = total / s.waterGoal;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = iso(addDays(parseISO(today), i - 6));
    return { d: format(parseISO(d), "EEE"), ml: (rows ?? []).filter((r) => r.date === d).reduce((a, r) => a + r.ml, 0) };
  });

  return (
    <div>
      <PageHeader title="Water" back subtitle={`Goal ${s.waterGoal} ml`} />
      <Card strong className="flex flex-col items-center py-6">
        <WaterGlass value={pct} size={170} />
        <div className="mt-4 text-[40px] font-bold tracking-tight">
          <AnimatedNumber value={total} /> <span className="text-[18px] font-medium text-muted">ml</span>
        </div>
        <div className="text-[15px] text-muted">{pct >= 1 ? "Goal reached! 🎉" : `${s.waterGoal - total} ml to go`}</div>
        <div className="mt-5 grid w-full grid-cols-4 gap-2">
          {SIZES.map((x) => (
            <motion.button key={x.ml} whileTap={{ scale: 0.88 }} onClick={() => addWater(x.ml)} className="flex flex-col items-center rounded-2xl bg-[#64d2ff]/15 py-3">
              <span className="text-2xl">{x.emoji}</span>
              <span className="text-[13px] font-semibold">{x.ml} ml</span>
              <span className="text-[11px] text-muted">{x.label}</span>
            </motion.button>
          ))}
        </div>
      </Card>
      <SectionTitle>This week</SectionTitle>
      <Card>
        <div className="h-40">
          <ResponsiveContainer>
            <BarChart data={week}>
              <XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <ReferenceLine y={s.waterGoal} stroke="var(--faint)" strokeDasharray="4 4" />
              <Bar dataKey="ml" fill="#64d2ff" radius={[8, 8, 8, 8]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <SectionTitle>Daily goal</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {[1500, 2000, 2500, 3000, 3500].map((g) => (
          <Btn key={g} variant={s.waterGoal === g ? "primary" : "glass"} className="px-4 py-2" onClick={() => saveSettings({ waterGoal: g })}>
            {g / 1000} L
          </Btn>
        ))}
      </div>
      {todayRows.length > 0 && (
        <>
          <SectionTitle>Today&apos;s log</SectionTitle>
          <AnimatePresence initial={false}>
            {todayRows.map((r) => (
              <SwipeRow
                key={r.id}
                onDelete={async () => {
                  const undo = await remove("water", r.id);
                  toast("Entry removed", { emoji: "💧", undo });
                }}
              >
                <div className="flex justify-between p-3.5">
                  <span>💧 {r.ml} ml</span>
                  <span className="text-muted">{format(r.at, "h:mm a")}</span>
                </div>
              </SwipeRow>
            ))}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
