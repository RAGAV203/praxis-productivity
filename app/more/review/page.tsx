"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { useState } from "react";
import { AnimatedNumber, Chip, PageHeader } from "@/components/ui";
import { catMeta, MOOD_SCALE } from "@/lib/constants";
import { all } from "@/lib/data";
import { money } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import { sleepScore } from "@/lib/sleep";
import { longestDayStreak } from "@/lib/streaks";

function useYear(year: number) {
  return useLiveQuery(async () => {
    const y = String(year);
    const inY = <T extends { date: string }>(xs: T[]) => xs.filter((x) => x.date.startsWith(y));
    const [ex, logs, habits, water, workouts, books, journal, moods, focus, sleep, goals] = await Promise.all([all("expenses"), all("habitLogs"), all("habits"), all("water"), all("workouts"), all("books"), all("journal"), all("moods"), all("focus"), all("sleep"), all("goals")]);
    const e = inY(ex);
    const spent = e.filter((x) => x.kind === "expense").reduce((a, x) => a + x.amount, 0);
    const income = e.filter((x) => x.kind === "income").reduce((a, x) => a + x.amount, 0);
    const byCat = new Map<string, number>();
    for (const x of e) if (x.kind === "expense") byCat.set(x.category, (byCat.get(x.category) ?? 0) + x.amount);
    const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    const yLogs = inY(logs);
    const habitCounts = new Map<string, string[]>();
    for (const l of yLogs) habitCounts.set(l.habitId, [...(habitCounts.get(l.habitId) ?? []), l.date]);
    const best = [...habitCounts.entries()].map(([id, ds]) => ({ h: habits.find((h) => h.id === id), streak: longestDayStreak(ds), n: ds.length })).sort((a, b) => b.n - a.n)[0];
    const ym = inY(moods);
    const feelings = new Map<string, number>();
    for (const m of ym) for (const f of m.feelings) feelings.set(f, (feelings.get(f) ?? 0) + 1);
    const ys = inY(sleep);
    return {
      spent,
      income,
      topCat,
      checkins: yLogs.length,
      best,
      water: inY(water).reduce((a, w) => a + w.ml, 0),
      moveMin: inY(workouts).reduce((a, w) => a + w.minutes, 0),
      workouts: inY(workouts).length,
      books: books.filter((b) => b.status === "done" && (b.finishedAt ?? "").startsWith(y)),
      journal: inY(journal).length,
      mood: ym.length ? ym.reduce((a, m) => a + m.value, 0) / ym.length : 0,
      topFeeling: [...feelings.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
      focusMin: inY(focus).reduce((a, f) => a + f.minutes, 0),
      sleep: ys.length ? ys.reduce((a, s) => a + sleepScore(s.bed, s.wake, s.quality), 0) / ys.length : 0,
      goalsDone: goals.filter((g) => g.year === year && g.done).length,
      goalsTotal: goals.filter((g) => g.year === year).length,
    };
  }, [year]);
}

const GRADIENTS = ["from-[#5e5ce6] to-[#bf5af2]", "from-[#ff375f] to-[#ff9f0a]", "from-[#30d158] to-[#64d2ff]", "from-[#0a84ff] to-[#5e5ce6]", "from-[#ff9f0a] to-[#ffd60a]", "from-[#bf5af2] to-[#ff375f]", "from-[#64d2ff] to-[#30d158]", "from-[#1c1c1e] to-[#5e5ce6]"];

export default function YearInReview() {
  const s = useSettings();
  const now = new Date().getFullYear();
  const [year, setYear] = useState(now);
  const d = useYear(year);
  const f = (n: number) => money(n, s.currency);

  const slides = d
    ? [
        { emoji: "🏆", title: `${year}, wrapped`, big: s.name ? `${s.name}'s year` : "Your year", sub: "Swipe through your highlights →" },
        { emoji: "💸", title: "You spent", big: <AnimatedNumber value={d.spent} format={f} />, sub: d.topCat ? `Mostly on ${catMeta(d.topCat[0]).emoji} ${d.topCat[0]} (${f(d.topCat[1])})` : "Log expenses to see more" },
        { emoji: "💰", title: "You saved", big: <AnimatedNumber value={Math.max(0, d.income - d.spent)} format={f} />, sub: d.income ? `A ${Math.round(((d.income - d.spent) / d.income) * 100)}% savings rate` : "Add income to see your savings rate" },
        { emoji: "✅", title: "Habit check-ins", big: <AnimatedNumber value={d.checkins} />, sub: d.best?.h ? `${d.best.h.emoji} ${d.best.h.name} was your MVP, best run ${d.best.streak} days` : "Start a habit and build streaks" },
        { emoji: "🏃", title: "You moved", big: <><AnimatedNumber value={Math.round(d.moveMin / 60)} /> hrs</>, sub: `${d.workouts} workouts · ${(d.water / 1000).toFixed(0)} L of water` },
        { emoji: "📚", title: "Books finished", big: <AnimatedNumber value={d.books.length} />, sub: d.books.slice(0, 3).map((b) => b.title).join(" · ") || "Your shelf awaits" },
        { emoji: "📔", title: "Journal entries", big: <AnimatedNumber value={d.journal} />, sub: d.mood ? `Average mood ${MOOD_SCALE[Math.round(d.mood) - 1].emoji}${d.topFeeling ? ` · You felt “${d.topFeeling}” most` : ""}` : "Write a little every day" },
        { emoji: "⏱️", title: "Deep focus", big: <><AnimatedNumber value={Math.round(d.focusMin / 60)} /> hrs</>, sub: d.sleep ? `Avg sleep score ${Math.round(d.sleep)}` : "Focus sessions add up" },
        { emoji: "🏔️", title: "Goals achieved", big: `${d.goalsDone}/${d.goalsTotal}`, sub: "Here's to an even better next year ✨" },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Year in Review" back />
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {[now, now - 1, now - 2].map((y) => (
          <Chip key={y} active={y === year} onClick={() => setYear(y)}>
            {y}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4">
        {slides.map((sl, i) => (
          <motion.div key={`${year}-${i}`} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ amount: 0.6 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className={`relative flex h-[440px] w-[82%] max-w-sm shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[32px] bg-gradient-to-br p-6 text-white shadow-2xl ${GRADIENTS[i % GRADIENTS.length]}`}>
            <motion.div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 6 }} />
            <motion.div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-black/10" animate={{ scale: [1.1, 1, 1.1] }} transition={{ repeat: Infinity, duration: 7 }} />
            <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} className="relative text-6xl">
              {sl.emoji}
            </motion.div>
            <div className="relative">
              <div className="text-[17px] font-semibold opacity-85">{sl.title}</div>
              <div className="mt-1 text-[44px] font-black leading-none tracking-tight">{sl.big}</div>
              <div className="mt-3 text-[15px] opacity-90">{sl.sub}</div>
            </div>
            <div className="relative text-[12px] font-semibold opacity-70">
              Praxis · {i + 1}/{slides.length}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
