"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { useState } from "react";
import { CrudPage } from "@/components/CrudPage";
import { Sheet } from "@/components/ui";
import { confetti } from "@/lib/confetti";
import type { Capsule } from "@/lib/db";
import { update } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { todayIso } from "@/lib/recurrence";
import { feedback } from "@/lib/sound";

export default function TimeCapsule() {
  const [reading, setReading] = useState<Capsule | null>(null);
  const today = todayIso();
  return (
    <>
      <CrudPage<Capsule>
        table="capsules"
        title="Time Capsule"
        noun="Letter"
        subtitle="Write to your future self"
        fields={[
          { name: "title", label: "Title", type: "text", required: true, placeholder: "Dear me, one year from now…" },
          { name: "unlockAt", label: "Opens on", type: "date", required: true, hint: "Sealed letters stay hidden until this date" },
          { name: "body", label: "Letter", type: "textarea", required: true, when: (v) => !v.id || String(v.unlockAt) <= today, placeholder: "What are you hoping for? What are you worried about?" },
        ]}
        defaults={() => ({ unlockAt: `${new Date().getFullYear() + 1}${today.slice(4)}` })}
        sort={(a, b) => a.unlockAt.localeCompare(b.unlockAt)}
        empty={{ emoji: "💌", title: "No letters yet", hint: "Seal a letter today and open it months or years later." }}
        render={(c) => {
          const locked = c.unlockAt > today;
          const n = differenceInCalendarDays(parseISO(c.unlockAt), parseISO(today));
          return (
            <div className="flex items-center gap-3">
              <motion.span animate={locked ? {} : { rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 2, repeatDelay: 2 }} className="text-3xl">
                {locked ? "✉️" : "💌"}
              </motion.span>
              <div className="flex-1">
                <div className="font-semibold">{c.title}</div>
                <div className="text-[13px] text-muted">{locked ? `Opens ${fmtDate(c.unlockAt)} · ${n} days` : c.opened ? "Opened" : "Ready to open!"}</div>
              </div>
              {locked ? (
                <Lock size={18} className="text-muted" />
              ) : (
                <button
                  className="rounded-full bg-accent px-3 py-1.5 text-[13px] font-semibold text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!c.opened) {
                      confetti();
                      feedback("levelup");
                      void update("capsules", c.id, { opened: true });
                    }
                    setReading(c);
                  }}
                >
                  {c.opened ? "Read" : "Open"}
                </button>
              )}
            </div>
          );
        }}
      />
      <Sheet open={!!reading} onClose={() => setReading(null)} title={reading?.title}>
        {reading && (
          <motion.div initial={{ rotateX: 70, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 14 }} className="rounded-2xl bg-[#fff8e7] p-5 font-serif text-[17px] leading-relaxed text-[#3a2e1f] shadow-inner dark:bg-[#2a2418] dark:text-[#f3e6c8]">
            <div className="mb-2 text-[13px] opacity-60">Written {fmtDate(new Date(reading.createdAt).toISOString().slice(0, 10))}</div>
            <p className="whitespace-pre-line">{reading.body}</p>
          </motion.div>
        )}
      </Sheet>
    </>
  );
}
