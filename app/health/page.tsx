"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Hub } from "@/components/Hub";
import { Card, Ring } from "@/components/ui";
import { all } from "@/lib/data";
import { todayIso } from "@/lib/recurrence";
import { useSettings } from "@/lib/settings";
import { sleepScore } from "@/lib/sleep";

export default function HealthHub() {
  const s = useSettings();
  const t = todayIso();
  const d = useLiveQuery(async () => {
    const [water, workouts, habits, logs, sleep, metrics] = await Promise.all([all("water"), all("workouts"), all("habits"), all("habitLogs"), all("sleep"), all("metrics")]);
    const active = habits.filter((h) => !h.archived);
    const last = sleep.sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      water: water.filter((w) => w.date === t).reduce((a, w) => a + w.ml, 0),
      move: workouts.filter((w) => w.date === t).reduce((a, w) => a + w.minutes, 0),
      steps: metrics.find((m) => m.type === "steps" && m.date === t)?.value ?? 0,
      habits: active.length ? logs.filter((l) => l.date === t && active.some((h) => h.id === l.habitId)).length / active.length : 0,
      sleep: last ? sleepScore(last.bed, last.wake, last.quality) : null,
    };
  }, [t]);
  return (
    <Hub tab="health" title="Health" subtitle="Small steps, every day">
      {d && (
        <Card strong>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Mini label="Steps" value={d.steps / s.stepGoal} color="#ff375f" text={d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : String(d.steps)} />
            <Mini label="Water" value={d.water / s.waterGoal} color="#64d2ff" text={`${(d.water / 1000).toFixed(1)}L`} />
            <Mini label="Habits" value={d.habits} color="#30d158" text={`${Math.round(d.habits * 100)}%`} />
            <Mini label="Sleep" value={(d.sleep ?? 0) / 100} color="#5e5ce6" text={d.sleep != null ? String(d.sleep) : "—"} />
          </div>
        </Card>
      )}
    </Hub>
  );
}

function Mini({ label, value, color, text }: { label: string; value: number; color: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Ring value={value} size={62} stroke={7} color={color}>
        <span className="text-[13px] font-bold">{text}</span>
      </Ring>
      <span className="text-[12px] font-medium text-muted">{label}</span>
    </div>
  );
}
