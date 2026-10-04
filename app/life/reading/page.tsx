"use client";

import { useState } from "react";
import { CrudPage } from "@/components/CrudPage";
import { Bar, Btn, Card, Ring, Sheet } from "@/components/ui";
import { confetti } from "@/lib/confetti";
import type { Book } from "@/lib/db";
import { setKV, update, useKV } from "@/lib/data";
import { todayIso } from "@/lib/recurrence";
import { toast } from "@/lib/store";

const STATUS = { want: "Want to read", reading: "Reading", done: "Finished" };

export default function Reading() {
  const [progress, setProgress] = useState<Book | null>(null);
  const [page, setPage] = useState(0);
  const goal = useKV<number>("readingGoal", 12);
  const year = String(new Date().getFullYear());

  const saveProgress = async () => {
    if (!progress) return;
    const done = page >= progress.pages && progress.pages > 0;
    await update("books", progress.id, { pagesRead: page, status: done ? "done" : "reading", finishedAt: done ? todayIso() : progress.finishedAt });
    if (done && progress.status !== "done") {
      confetti();
      toast(`Finished “${progress.title}”!`, { emoji: "📚" });
    }
    setProgress(null);
  };

  return (
    <>
      <CrudPage<Book>
        table="books"
        title="Reading"
        noun="Book"
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "author", label: "Author", type: "text" },
          { name: "status", label: "Status", type: "chips", options: Object.entries(STATUS).map(([value, label]) => ({ value, label })) },
          { name: "pages", label: "Total pages", type: "number", half: true },
          { name: "pagesRead", label: "Pages read", type: "number", half: true },
          { name: "rating", label: "Rating", type: "rating", when: (v) => v.status === "done" },
          { name: "finishedAt", label: "Finished on", type: "date", when: (v) => v.status === "done" },
          { name: "quotes", label: "Favourite quotes", type: "list", placeholder: "Add a quote…" },
        ]}
        defaults={() => ({ status: "reading", pages: 300, pagesRead: 0, quotes: [] })}
        toRow={(v) => ({ ...v, finishedAt: v.status === "done" ? v.finishedAt || todayIso() : v.finishedAt })}
        sort={(a, b) => ["reading", "want", "done"].indexOf(a.status) - ["reading", "want", "done"].indexOf(b.status) || (b.finishedAt ?? "").localeCompare(a.finishedAt ?? "")}
        groupBy={(b) => STATUS[b.status]}
        searchText={(b) => `${b.title} ${b.author ?? ""} ${(b.quotes ?? []).join(" ")}`}
        empty={{ emoji: "📚", title: "Your shelf is empty", hint: "Track books, progress and favourite quotes." }}
        header={(rows) => {
          const doneThisYear = rows.filter((b) => b.status === "done" && (b.finishedAt ?? "").startsWith(year)).length;
          return (
            <Card strong className="mb-2 flex items-center gap-4">
              <Ring value={doneThisYear / Math.max(1, goal)} size={80} stroke={9} color="#ac8e68">
                <span className="text-[18px] font-bold">{doneThisYear}</span>
              </Ring>
              <div className="flex-1">
                <div className="font-semibold">{year} reading goal</div>
                <div className="text-[14px] text-muted">
                  {doneThisYear} of {goal} books
                </div>
                <div className="mt-1 flex items-center gap-2 text-[13px]">
                  Goal
                  <input className="field w-20 py-1!" type="number" defaultValue={goal} onBlur={(e) => setKV("readingGoal", Number(e.target.value) || 12)} aria-label="Yearly reading goal" />
                </div>
              </div>
            </Card>
          );
        }}
        render={(b) => (
          <div>
            <div className="flex items-start gap-3">
              <div className="grid h-14 w-10 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#ac8e68] to-[#7a5c3a] text-[18px] font-bold text-white shadow">{b.title[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{b.title}</div>
                <div className="text-[13px] text-muted">
                  {b.author}
                  {b.rating ? ` · ${"★".repeat(b.rating)}` : ""}
                </div>
                {b.status === "reading" && b.pages > 0 && (
                  <>
                    <Bar value={b.pagesRead / b.pages} className="mt-2" color="#ac8e68" />
                    <div className="mt-1 text-[12px] text-muted">
                      p. {b.pagesRead} / {b.pages} · {Math.round((b.pagesRead / b.pages) * 100)}%
                    </div>
                  </>
                )}
              </div>
              {b.status === "reading" && (
                <span onClick={(e) => e.stopPropagation()}>
                  <Btn variant="soft" className="px-3 py-1.5 text-[13px]" onClick={() => (setProgress(b), setPage(b.pagesRead))}>
                    Update
                  </Btn>
                </span>
              )}
            </div>
          </div>
        )}
      />
      <Sheet open={!!progress} onClose={() => setProgress(null)} title="Reading progress" footer={<Btn full onClick={saveProgress}>Save</Btn>}>
        {progress && (
          <div className="py-2 text-center">
            <div className="text-[44px] font-bold tabular-nums">{page}</div>
            <div className="text-muted">of {progress.pages} pages</div>
            <input type="range" min={0} max={progress.pages || 1} value={page} onChange={(e) => setPage(Number(e.target.value))} className="mt-4 w-full" style={{ accentColor: "#ac8e68" }} aria-label="Pages read" />
            <div className="mt-3 flex justify-center gap-2">
              {[10, 25, 50].map((n) => (
                <Btn key={n} variant="glass" className="px-3 py-1.5" onClick={() => setPage((p) => Math.min(progress.pages, p + n))}>
                  +{n}
                </Btn>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
