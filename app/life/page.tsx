"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Hub } from "@/components/Hub";
import { Stat } from "@/components/ui";
import { all } from "@/lib/data";
import { todayIso } from "@/lib/recurrence";
import { dayStreak } from "@/lib/streaks";

export default function LifeHub() {
  const t = todayIso();
  const d = useLiveQuery(async () => {
    const [journal, tasks, goals, books] = await Promise.all([all("journal"), all("tasks"), all("goals"), all("books")]);
    const year = new Date().getFullYear();
    return {
      streak: dayStreak(journal.map((j) => j.date), t),
      open: tasks.filter((x) => !x.done).length,
      goals: goals.filter((g) => g.year === year),
      books: books.filter((b) => b.status === "done" && (b.finishedAt ?? "").startsWith(String(year))).length,
    };
  }, [t]);
  return (
    <Hub tab="life" title="Life" subtitle="Plan, reflect, remember">
      {d && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Journal" value={`🔥 ${d.streak}`} sub="day streak" />
          <Stat label="Open" value={d.open} sub="reminders" />
          <Stat label="Books" value={d.books} sub="read this year" />
        </div>
      )}
    </Hub>
  );
}
