"use client";

import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { PenLine, Search, Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCrud } from "@/components/CrudPage";
import { FileStrip } from "@/components/Files";
import { Card, Empty, IconBtn, PageHeader, SectionTitle, SwipeRow } from "@/components/ui";
import { JOURNAL_PROMPTS, MOOD_SCALE } from "@/lib/constants";
import type { JournalEntry } from "@/lib/db";
import { useRows } from "@/lib/data";
import { todayIso } from "@/lib/recurrence";
import { feedback } from "@/lib/sound";
import { dayStreak, longestDayStreak } from "@/lib/streaks";

export default function Journal() {
  const rows = useRows("journal");
  const [prompt, setPrompt] = useState(() => JOURNAL_PROMPTS[new Date().getDate() % JOURNAL_PROMPTS.length]);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const today = todayIso();

  const crud = useCrud<JournalEntry>({
    table: "journal",
    noun: "Entry",
    defaults: () => ({ date: today, prompt, gratitude: [] }),
    fields: [
      { name: "date", label: "Date", type: "date", required: true, half: true },
      { name: "mood", label: "Mood", type: "chips", options: MOOD_SCALE.map((m) => ({ value: String(m.v), label: m.emoji })), half: true },
      { name: "text", label: prompt, type: "textarea", required: true, placeholder: "Write freely…" },
      { name: "gratitude", label: "Grateful for", type: "list", placeholder: "Something good…" },
      { name: "files", label: "Photos", type: "files" },
    ],
    toRow: (v) => ({ ...v, mood: v.mood ? Number(v.mood) : undefined }),
    fromRow: (r) => ({ ...r, mood: r.mood ? String(r.mood) : undefined }),
  });

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new")) crud.create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => [...(rows ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [rows]);
  const shown = q ? sorted.filter((j) => `${j.text} ${(j.gratitude ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase())) : sorted;
  const dates = sorted.map((j) => j.date);
  const onThisDay = sorted.filter((j) => j.date.slice(5) === today.slice(5) && j.date < today);
  const thisYear = sorted.filter((j) => j.date.startsWith(today.slice(0, 4))).length;

  return (
    <div>
      <PageHeader
        title="Journal"
        back
        actions={
          <>
            <IconBtn label="Search" onClick={() => setSearching((s) => !s)}>
              <Search size={18} />
            </IconBtn>
            <IconBtn label="New entry" onClick={crud.create} className="bg-accent! text-white">
              <PenLine size={18} />
            </IconBtn>
          </>
        }
      />
      {searching && <input autoFocus className="field glass mb-3" placeholder="Search entries…" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="grid grid-cols-3 gap-2">
        <Card><div className="text-[22px] font-bold">🔥 {dayStreak(dates, today)}</div><div className="text-[12px] text-muted">day streak</div></Card>
        <Card><div className="text-[22px] font-bold">{longestDayStreak(dates)}</div><div className="text-[12px] text-muted">best streak</div></Card>
        <Card><div className="text-[22px] font-bold">{thisYear}</div><div className="text-[12px] text-muted">entries this year</div></Card>
      </div>

      <Card strong className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[13px] font-semibold uppercase text-muted">
          Prompt
          <button
            aria-label="New prompt"
            onClick={() => {
              feedback("tap");
              setPrompt(JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)]);
            }}
          >
            <Shuffle size={16} />
          </button>
        </div>
        <AnimatePresence mode="wait">
          <motion.button key={prompt} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} onClick={crud.create} className="text-left text-[19px] font-semibold leading-snug">
            {prompt}
          </motion.button>
        </AnimatePresence>
      </Card>

      {onThisDay.length > 0 && !q && (
        <>
          <SectionTitle>On this day</SectionTitle>
          {onThisDay.map((j) => (
            <Card key={j.id} className="mb-2" onClick={() => crud.edit(j)}>
              <div className="text-[13px] font-semibold text-accent">{j.date.slice(0, 4)}</div>
              <p className="line-clamp-3 italic">“{j.text}”</p>
            </Card>
          ))}
        </>
      )}

      <SectionTitle>Entries</SectionTitle>
      {rows && shown.length === 0 && <Empty emoji="📔" title={q ? "No matches" : "Your journal is empty"} hint="Write a few lines each day. Future you will love reading them." />}
      <AnimatePresence initial={false}>
        {shown.map((j) => (
          <SwipeRow key={j.id} onDelete={() => crud.del(j)}>
            <button className="block w-full p-4 text-left" onClick={() => crud.edit(j)}>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-muted">{format(parseISO(j.date), "EEEE, d MMMM yyyy")}</span>
                {j.mood && <span>{MOOD_SCALE[j.mood - 1].emoji}</span>}
              </div>
              {j.prompt && <div className="mt-1 text-[13px] text-accent">{j.prompt}</div>}
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-[15px]">{j.text}</p>
              {(j.gratitude ?? []).length > 0 && <div className="mt-1.5 text-[13px] text-muted">🙏 {j.gratitude!.join(" · ")}</div>}
              <FileStrip ids={j.files} />
            </button>
          </SwipeRow>
        ))}
      </AnimatePresence>
      {crud.sheet}
    </div>
  );
}
