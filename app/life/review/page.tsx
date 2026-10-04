"use client";

import { useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { Btn, Card, PageHeader, SectionTitle } from "@/components/ui";
import { LIFE_AREAS } from "@/lib/constants";
import { add, update, useRows } from "@/lib/data";
import { confetti } from "@/lib/confetti";
import { toast } from "@/lib/store";

const quarterOf = (d = new Date()) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;

export default function LifeReview() {
  const reviews = useRows("reviews");
  const period = quarterOf();
  const current = reviews?.find((r) => r.period === period);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [wins, setWins] = useState("");
  const [lessons, setLessons] = useState("");

  // load the stored review into the form once data arrives
  const loadedKey = reviews ? (current?.id ?? "new") : null;
  const [seenKey, setSeenKey] = useState<string | null>(null);
  if (loadedKey !== seenKey) {
    setSeenKey(loadedKey);
    setScores(current?.scores ?? Object.fromEntries(LIFE_AREAS.map((a) => [a, 5])));
    setWins(current?.wins ?? "");
    setLessons(current?.lessons ?? "");
  }

  const past = useMemo(() => (reviews ?? []).filter((r) => r.period !== period).sort((a, b) => b.period.localeCompare(a.period)), [reviews, period]);
  const prev = past[0];
  const chart = LIFE_AREAS.map((a) => ({ area: a, now: scores[a] ?? 5, prev: prev?.scores[a] ?? 0 }));

  const save = async () => {
    if (current) await update("reviews", current.id, { scores, wins, lessons });
    else await add("reviews", { period, scores, wins, lessons });
    confetti({ count: 50 });
    toast(`${period} review saved`, { emoji: "🧭" });
  };

  return (
    <div>
      <PageHeader title="Life Review" back subtitle={`${period.replace("-", " · ")}: how balanced is your life?`} />
      <Card strong>
        <div className="h-64">
          <ResponsiveContainer>
            <RadarChart data={chart} outerRadius="75%">
              <PolarGrid stroke="var(--hairline)" />
              <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              {prev && <Radar dataKey="prev" stroke="var(--faint)" fill="var(--faint)" fillOpacity={0.15} />}
              <Radar dataKey="now" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {prev && <div className="text-center text-[12px] text-muted">Grey = {prev.period}</div>}
      </Card>
      <SectionTitle>Rate each area (1–10)</SectionTitle>
      <Card className="space-y-3">
        {LIFE_AREAS.map((a) => (
          <label key={a} className="block">
            <div className="flex justify-between text-[14px]">
              <span className="font-medium">{a}</span>
              <span className="font-bold text-accent">{scores[a] ?? 5}</span>
            </div>
            <input type="range" min={1} max={10} value={scores[a] ?? 5} onChange={(e) => setScores((s) => ({ ...s, [a]: Number(e.target.value) }))} className="w-full" style={{ accentColor: "var(--accent)" }} />
          </label>
        ))}
      </Card>
      <SectionTitle>Reflect</SectionTitle>
      <div className="space-y-3">
        <textarea className="field glass min-h-24" placeholder="Biggest wins this quarter…" value={wins} onChange={(e) => setWins(e.target.value)} />
        <textarea className="field glass min-h-24" placeholder="What I learned / will change…" value={lessons} onChange={(e) => setLessons(e.target.value)} />
        <Btn full onClick={save} sound="levelup">
          Save review
        </Btn>
      </div>
      {past.length > 0 && (
        <>
          <SectionTitle>Past reviews</SectionTitle>
          {past.map((r) => {
            const avg = Object.values(r.scores).reduce((a, v) => a + v, 0) / Math.max(1, Object.values(r.scores).length);
            return (
              <Card key={r.id} className="mb-2">
                <div className="flex justify-between font-semibold">
                  <span>{r.period}</span>
                  <span>avg {avg.toFixed(1)}</span>
                </div>
                {r.wins && <p className="mt-1 text-[14px] text-muted">🏆 {r.wins}</p>}
                {r.lessons && <p className="text-[14px] text-muted">💡 {r.lessons}</p>}
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
