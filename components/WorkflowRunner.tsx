"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, OctagonX, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { all, update } from "@/lib/data";
import { onAdded } from "@/lib/events";
import { todayIso } from "@/lib/recurrence";
import { answerPrompt, closeRunner, runStore, runWorkflow, setNavigator, workflowRunning, type StepStatus } from "@/lib/runner";
import { useStore } from "@/lib/store";
import { eventMatches, stepDef, timeTriggerDue } from "@/lib/workflows";
import { Btn, Sheet } from "./ui";

/** Live progress sheet for a running workflow, including Ask/Choose/Confirm prompts. */
export function WorkflowRunner() {
  const st = useStore(runStore);
  const router = useRouter();
  useEffect(() => setNavigator((href) => router.push(href)), [router]);

  const open = st.visible && !!st.wf;
  return (
    <Sheet open={open} onClose={closeRunner} title={st.wf ? `${st.wf.emoji} ${st.wf.name}` : ""} footer={st.finished && !st.prompt ? <Btn full onClick={closeRunner}>Done</Btn> : undefined}>
      {st.wf && (
        <div className="pb-2">
          <ol className="space-y-1.5">
            {st.wf.steps.map((s, i) => {
              const def = stepDef(s.type);
              const status: StepStatus = st.statuses[i] ?? "pending";
              return (
                <motion.li key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: status === "pending" ? 0.45 : 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 rounded-2xl bg-hairline/50 px-3 py-2">
                  <span className="text-lg">{def?.emoji ?? "•"}</span>
                  <span className="flex-1 truncate text-[14px]">{def?.summary(s.params) ?? s.type}</span>
                  <StatusIcon status={status} />
                </motion.li>
              );
            })}
          </ol>
          <AnimatePresence mode="wait">
            {st.prompt && <PromptBox key={st.prompt.text + st.prompt.kind} />}
          </AnimatePresence>
          {st.finished && !st.prompt && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 rounded-2xl bg-accent/10 p-3 text-center text-[15px] font-medium">
              {st.statuses.includes("error") ? "⚠️ " : st.statuses.includes("stopped") ? "🛑 " : "✅ "}
              {st.outcome}
            </motion.div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "running") return <Loader2 size={18} className="animate-spin text-accent" />;
  if (status === "done")
    return (
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-5 w-5 place-items-center rounded-full bg-good text-white">
        <Check size={13} strokeWidth={3} />
      </motion.span>
    );
  if (status === "error") return <TriangleAlert size={18} className="text-bad" />;
  if (status === "stopped") return <OctagonX size={18} className="text-warn" />;
  return <span className="h-5 w-5 rounded-full border-2 border-faint/50" />;
}

function PromptBox() {
  const { prompt } = useStore(runStore);
  const [val, setVal] = useState("");
  if (!prompt) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-4 rounded-[22px] bg-[var(--glass-strong)] p-4 shadow-md">
      <div className="mb-3 text-[17px] font-semibold">{prompt.text}</div>
      {prompt.kind === "ask" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            answerPrompt(val);
          }}
          className="flex gap-2"
        >
          <input autoFocus className="field" inputMode={prompt.inputKind === "number" ? "decimal" : "text"} type={prompt.inputKind === "number" ? "number" : "text"} value={val} onChange={(e) => setVal(e.target.value)} aria-label={prompt.text} />
          <Btn type="submit">OK</Btn>
        </form>
      )}
      {prompt.kind === "choose" && (
        <div className="grid grid-cols-2 gap-2">
          {(prompt.options ?? []).map((o) => (
            <motion.button key={o} whileTap={{ scale: 0.94 }} onClick={() => answerPrompt(o)} className="rounded-2xl bg-hairline px-3 py-3 text-[15px] font-medium">
              {o}
            </motion.button>
          ))}
        </div>
      )}
      {prompt.kind === "confirm" && (
        <div className="flex gap-2">
          <Btn variant="glass" full onClick={() => answerPrompt("no")}>
            No
          </Btn>
          <Btn full onClick={() => answerPrompt("yes")}>
            Yes
          </Btn>
        </div>
      )}
      {prompt.kind === "show" && (
        <Btn full onClick={() => answerPrompt("ok")}>
          OK
        </Btn>
      )}
      {prompt.kind !== "show" && prompt.kind !== "confirm" && (
        <button className="mt-3 w-full text-[14px] text-muted" onClick={() => answerPrompt(null)}>
          Cancel workflow
        </button>
      )}
    </motion.div>
  );
}

/** Fires time, app-open and event triggers while Praxis is open. */
export function WorkflowScheduler() {
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      if (!alive || workflowRunning) return;
      const today = todayIso();
      const now = new Date();
      for (const wf of await all("workflows")) {
        if (!wf.enabled || !wf.steps.length) continue;
        if (timeTriggerDue(wf.trigger, now, wf.lastAutoDate, today)) {
          await update("workflows", wf.id, { lastAutoDate: today }); // mark first, so a reload can't double-fire
          await runWorkflow({ ...wf, lastAutoDate: today }, { source: "time" });
          return; // one at a time
        }
      }
    };

    // "When Praxis opens" — once per browser session
    (async () => {
      let opened: string[] = [];
      try {
        opened = JSON.parse(sessionStorage.getItem("praxis-opened") ?? "[]");
      } catch {}
      for (const wf of await all("workflows")) {
        if (wf.enabled && wf.trigger.type === "open" && wf.steps.length && !opened.includes(wf.id)) {
          opened.push(wf.id);
          try {
            sessionStorage.setItem("praxis-opened", JSON.stringify(opened));
          } catch {}
          await runWorkflow(wf, { source: "open" });
        }
      }
      void tick();
    })();

    const id = setInterval(tick, 20_000);
    const off = onAdded(async ({ table, row }) => {
      if (workflowRunning) return; // workflows don't trigger other workflows
      for (const wf of await all("workflows")) {
        if (wf.enabled && wf.steps.length && eventMatches(wf.trigger, table, row)) {
          await runWorkflow(wf, { source: "event", eventRow: row });
          break;
        }
      }
    });
    return () => {
      alive = false;
      clearInterval(id);
      off();
    };
  }, []);
  return null;
}
