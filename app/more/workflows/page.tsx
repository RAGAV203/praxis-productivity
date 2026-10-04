"use client";

import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { ChevronDown, Copy, GripVertical, MoreHorizontal, Play, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Field, type FieldDef } from "@/components/Form";
import { Btn, Card, Chip, Empty, IconBtn, PageHeader, Segmented, Sheet, Toggle } from "@/components/ui";
import type { Workflow, WorkflowStep, WorkflowTrigger } from "@/lib/db";
import { add, remove, update, useRows } from "@/lib/data";
import { ago, cn } from "@/lib/format";
import { runWorkflow } from "@/lib/runner";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";
import { DAY_LABELS, EVENT_TABLES, STEP_CATEGORIES, STEPS, TEMPLATES, describeTrigger, fromTemplate, stepDef } from "@/lib/workflows";
import { COLORS } from "@/components/Form";

const TRIGGER_ICON: Record<WorkflowTrigger["type"], string> = { manual: "👆", time: "⏰", open: "📲", event: "⚡" };
const newId = () => Math.random().toString(36).slice(2, 10);
const EMOJIS = ["⚡", "☀️", "🌙", "💧", "💸", "🛒", "🎧", "👣", "🥗", "🚨", "🧹", "🏆", "💰", "📤", "🧘", "📚", "🚗", "🏠", "🐶", "❤️", "🎯", "✨", "🔔", "📝"];

type Draft = Omit<Workflow, "id" | "createdAt" | "updatedAt"> & { id?: string };
const blank = (): Draft => ({ name: "New Workflow", emoji: "⚡", color: "#5e5ce6", trigger: { type: "manual" }, steps: [], enabled: true, pinned: true, runs: 0 });

export default function Workflows() {
  const flows = useRows("workflows");
  const runs = useRows("workflowRuns");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tab, setTab] = useState<"mine" | "gallery" | "history">("mine");

  const mine = [...(flows ?? [])].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || a.name.localeCompare(b.name));
  const addTemplate = async (key: string) => {
    const t = TEMPLATES.find((x) => x.key === key)!;
    await add("workflows", fromTemplate(t));
    feedback("success");
    toast(`${t.emoji} ${t.name} added`, { emoji: "⚡" });
    setTab("mine");
  };

  return (
    <div>
      <PageHeader
        title="Workflows"
        back
        subtitle="Automate the little things"
        actions={
          <IconBtn label="New workflow" onClick={() => setDraft(blank())} className="bg-accent! text-white">
            <Plus size={20} />
          </IconBtn>
        }
      />
      <Segmented
        id="wf-tab"
        value={tab}
        onChange={setTab}
        options={[
          { value: "mine", label: `My (${mine.length})` },
          { value: "gallery", label: "Gallery" },
          { value: "history", label: "History" },
        ]}
      />

      {tab === "mine" && (
        <div className="mt-4">
          {flows && mine.length === 0 && (
            <Empty emoji="⚡" title="No workflows yet" hint="Start from the Gallery or build your own: chain actions like logging water, asking questions, speaking and notifying." action={<Btn onClick={() => setTab("gallery")}>Browse gallery</Btn>} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence initial={false}>
              {mine.map((w, i) => (
                <WorkflowTile key={w.id} w={w} i={i} onEdit={() => setDraft({ ...w, trigger: { ...w.trigger }, steps: w.steps.map((s) => ({ ...s, params: { ...s.params } })) })} />
              ))}
            </AnimatePresence>
          </div>
          {mine.length > 0 && <p className="mt-4 text-center text-[12px] text-muted">Tap to run · ⋯ to edit · pinned workflows appear on Today</p>}
        </div>
      )}

      {tab === "gallery" && (
        <div className="mt-4 space-y-3">
          {TEMPLATES.map((t, i) => {
            const have = (flows ?? []).some((f) => f.template === t.key);
            return (
              <motion.div key={t.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] text-2xl text-white" style={{ background: `linear-gradient(145deg, ${t.color}, color-mix(in srgb, ${t.color} 60%, black))` }}>
                    {t.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-[13px] text-muted">{t.description}</div>
                    <div className="mt-0.5 text-[12px] text-accent">
                      {TRIGGER_ICON[t.trigger.type]} {describeTrigger(t.trigger)} · {t.steps.length} steps
                    </div>
                  </div>
                  <Btn variant={have ? "glass" : "soft"} className="px-3 py-1.5 text-[13px]" onClick={() => addTemplate(t.key)}>
                    {have ? "Add again" : "Add"}
                  </Btn>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {tab === "history" && (
        <div className="mt-4">
          {runs && runs.length === 0 && <Empty emoji="🕘" title="No runs yet" hint="Every time a workflow runs, you'll see what it did here." />}
          {[...(runs ?? [])]
            .sort((a, b) => b.at - a.at)
            .slice(0, 40)
            .map((r) => (
              <details key={r.id} className="glass mb-2 rounded-[20px] px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <span>{r.ok ? "✅" : "⚠️"}</span>
                  <span className="flex-1 font-medium">{r.name}</span>
                  <span className="text-[12px] text-muted">
                    {r.source} · {ago(r.at)}
                  </span>
                </summary>
                <ol className="mt-2 list-decimal space-y-0.5 pl-6 text-[13px] text-muted">
                  {r.log.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ol>
              </details>
            ))}
        </div>
      )}

      <Editor draft={draft} setDraft={setDraft} />
    </div>
  );
}

function WorkflowTile({ w, i, onEdit }: { w: Workflow; i: number; onEdit: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: w.enabled ? 1 : 0.5, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.02 }} whileTap={{ scale: 0.95 }} className="relative h-[120px] overflow-hidden rounded-[24px] text-white shadow-lg" style={{ background: `linear-gradient(145deg, ${w.color}, color-mix(in srgb, ${w.color} 55%, black))` }}>
      <button className="absolute inset-0 flex flex-col justify-between p-3.5 text-left" onClick={() => (feedback("tap"), runWorkflow(w, { source: "manual" }))} aria-label={`Run ${w.name}`}>
        <span className="text-[28px] leading-none">{w.emoji}</span>
        <span>
          <span className="block text-[15px] font-semibold leading-tight">{w.name}</span>
          <span className="block truncate text-[11px] opacity-80">
            {TRIGGER_ICON[w.trigger.type]} {w.trigger.type === "manual" ? `${w.steps.length} actions` : describeTrigger(w.trigger)}
          </span>
        </span>
      </button>
      <button aria-label={`Edit ${w.name}`} onClick={(e) => (e.stopPropagation(), feedback("tap"), onEdit())} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/20 backdrop-blur">
        <MoreHorizontal size={16} />
      </button>
    </motion.div>
  );
}

/* ---------------- Builder ---------------- */
function Editor({ draft, setDraft }: { draft: Draft | null; setDraft: (d: Draft | null) => void }) {
  const habits = useRows("habits") ?? [];
  const [picker, setPicker] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  if (!draft) return <Sheet open={false} onClose={() => {}}>{null}</Sheet>;

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const setTrigger = (patch: Partial<WorkflowTrigger>) => set({ trigger: { ...draft.trigger, ...patch } });
  const setStep = (id: string, params: Record<string, unknown>) => set({ steps: draft.steps.map((s) => (s.id === id ? { ...s, params } : s)) });

  const save = async () => {
    if (!draft.name.trim()) return toast("Give it a name", { emoji: "✏️" });
    const { id, ...rest } = draft;
    if (id) await update("workflows", id, rest);
    else await add("workflows", rest);
    feedback("success");
    toast("Workflow saved", { emoji: "⚡" });
    setDraft(null);
  };

  const evTable = EVENT_TABLES.find((e) => e.value === draft.trigger.table);

  return (
    <>
      <Sheet
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft.id ? "Edit workflow" : "New workflow"}
        footer={
          <div className="flex gap-2">
            {draft.id && (
              <Btn
                variant="danger"
                sound="delete"
                onClick={async () => {
                  const undo = await remove("workflows", draft.id!);
                  toast("Workflow deleted", { undo });
                  setDraft(null);
                }}
              >
                <Trash2 size={17} />
              </Btn>
            )}
            <Btn
              variant="glass"
              onClick={() => {
                if (!draft.steps.length) return toast("Add an action first", { emoji: "➕" });
                void runWorkflow({ ...draft, id: draft.id ?? "draft", createdAt: 0, updatedAt: 0 } as Workflow, { source: "test" });
              }}
            >
              <Play size={16} /> Test
            </Btn>
            <Btn full onClick={save} sound={null}>
              Save
            </Btn>
          </div>
        }
      >
        <div className="space-y-4 pb-2">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <motion.div key={draft.emoji + draft.color} initial={{ scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] text-3xl shadow-lg" style={{ background: `linear-gradient(145deg, ${draft.color}, color-mix(in srgb, ${draft.color} 55%, black))` }}>
              {draft.emoji}
            </motion.div>
            <input className="field text-[18px] font-semibold" value={draft.name} onChange={(e) => set({ name: e.target.value })} aria-label="Workflow name" />
          </div>
          <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => set({ emoji: e })} className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl", draft.emoji === e ? "bg-accent/20 ring-2 ring-accent" : "bg-hairline")}>
                {e}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} aria-label={c} onClick={() => set({ color: c })} className="h-8 w-8 rounded-full" style={{ background: c, boxShadow: draft.color === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : undefined }} />
            ))}
          </div>
          <input className="field" placeholder="Description (optional)" value={draft.description ?? ""} onChange={(e) => set({ description: e.target.value })} />

          {/* Trigger */}
          <div className="rounded-[22px] bg-hairline/60 p-3">
            <div className="mb-2 text-[13px] font-semibold uppercase text-muted">When</div>
            <div className="grid grid-cols-4 gap-1.5">
              {(["manual", "time", "open", "event"] as const).map((t) => (
                <button key={t} onClick={() => (feedback("tap"), setTrigger({ type: t, ...(t === "time" && !draft.trigger.time ? { time: "08:00", days: [0, 1, 2, 3, 4, 5, 6] } : {}), ...(t === "event" && !draft.trigger.table ? { table: "expenses" } : {}) }))} className={cn("flex flex-col items-center rounded-2xl py-2 text-[12px] font-semibold", draft.trigger.type === t ? "bg-accent text-white" : "bg-[var(--glass)]")}>
                  <span className="text-lg">{TRIGGER_ICON[t]}</span>
                  {{ manual: "Manual", time: "Time", open: "App open", event: "Event" }[t]}
                </button>
              ))}
            </div>
            {draft.trigger.type === "time" && (
              <div className="mt-3 space-y-2">
                <input className="field" type="time" value={draft.trigger.time ?? "08:00"} onChange={(e) => setTrigger({ time: e.target.value })} aria-label="Time" />
                <div className="flex justify-between gap-1">
                  {DAY_LABELS.map((d, i) => {
                    const on = (draft.trigger.days ?? []).includes(i);
                    return (
                      <button key={d} onClick={() => setTrigger({ days: on ? (draft.trigger.days ?? []).filter((x) => x !== i) : [...(draft.trigger.days ?? []), i].sort() })} className={cn("h-9 flex-1 rounded-full text-[12px] font-semibold", on ? "bg-accent text-white" : "bg-[var(--glass)]")}>
                        {d[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {draft.trigger.type === "event" && (
              <div className="mt-3 space-y-2">
                <select className="field" value={draft.trigger.table} onChange={(e) => setTrigger({ table: e.target.value, field: undefined, op: undefined, value: undefined })} aria-label="Event">
                  {EVENT_TABLES.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label} is logged
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <select className="field px-2!" value={draft.trigger.field ?? ""} onChange={(e) => setTrigger({ field: e.target.value || undefined, op: e.target.value ? (draft.trigger.op ?? ">") : undefined })} aria-label="Field">
                    <option value="">Any</option>
                    {evTable?.fields.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  {draft.trigger.field && (
                    <>
                      <select className="field px-2!" value={draft.trigger.op ?? ">"} onChange={(e) => setTrigger({ op: e.target.value })} aria-label="Operator">
                        {[">", "<", "=", "!=", "contains"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                      <input className="field px-2!" value={draft.trigger.value ?? ""} onChange={(e) => setTrigger({ value: e.target.value })} placeholder="value" aria-label="Value" />
                    </>
                  )}
                </div>
                <p className="px-1 text-[12px] text-muted">The new record&apos;s fields are available as variables, e.g. {"{{amount}}"}.</p>
              </div>
            )}
            <p className="mt-2 px-1 text-[12px] text-muted">{describeTrigger(draft.trigger)}</p>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-hairline/60 px-4 py-2.5">
            <span>Enabled</span>
            <Toggle checked={draft.enabled} onChange={(v) => set({ enabled: v })} />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-hairline/60 px-4 py-2.5">
            <span>Show on Today</span>
            <Toggle checked={!!draft.pinned} onChange={(v) => set({ pinned: v })} />
          </div>

          {/* Steps */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[13px] font-semibold uppercase text-muted">Do · {draft.steps.length} actions</span>
              <span className="text-[11px] text-muted">drag ⋮⋮ to reorder</span>
            </div>
            <Reorder.Group axis="y" values={draft.steps} onReorder={(steps) => set({ steps })} className="space-y-2">
              {draft.steps.map((s, i) => (
                <StepCard
                  key={s.id}
                  step={s}
                  index={i}
                  expanded={open === s.id}
                  onToggle={() => setOpen(open === s.id ? null : s.id)}
                  onChange={(p) => setStep(s.id, p)}
                  onDelete={() => set({ steps: draft.steps.filter((x) => x.id !== s.id) })}
                  onDuplicate={() => {
                    const copy = { ...s, id: newId(), params: { ...s.params } };
                    const steps = [...draft.steps];
                    steps.splice(i + 1, 0, copy);
                    set({ steps });
                  }}
                  habits={habits}
                />
              ))}
            </Reorder.Group>
            <Btn variant="soft" full className="mt-2" onClick={() => setPicker(true)}>
              <Plus size={17} /> Add action
            </Btn>
          </div>
          <details className="rounded-2xl bg-hairline/60 px-4 py-3 text-[13px]">
            <summary className="cursor-pointer font-semibold">Variables you can use</summary>
            <p className="mt-2 text-muted">Type these in any text: {"{{name}} {{date}} {{time}} {{day}} {{water}} {{waterGoal}} {{waterLeft}} {{steps}} {{stepGoal}} {{spentToday}} {{spentMonth}} {{tasksDue}} {{habitsDone}} {{habitsLeft}} {{summary}}"}, plus anything saved by Ask/Choose steps (e.g. {"{{answer}}"}).</p>
          </details>
        </div>
      </Sheet>
      <ActionPicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(type) => {
          const def = stepDef(type)!;
          const step: WorkflowStep = { id: newId(), type, params: def.defaults() };
          set({ steps: [...draft.steps, step] });
          setOpen(step.id);
          setPicker(false);
        }}
      />
    </>
  );
}

function StepCard({ step, index, expanded, onToggle, onChange, onDelete, onDuplicate, habits }: { step: WorkflowStep; index: number; expanded: boolean; onToggle: () => void; onChange: (p: Record<string, unknown>) => void; onDelete: () => void; onDuplicate: () => void; habits: import("@/lib/db").Habit[] }) {
  const def = stepDef(step.type);
  const controls = useDragControls();
  if (!def) return null;
  const fields: FieldDef[] = def.fields({ habits });
  return (
    <Reorder.Item value={step} dragListener={false} dragControls={controls} className="overflow-hidden rounded-[20px] bg-[var(--glass-strong)] shadow-sm">
      <div className="flex items-center gap-2 p-2.5">
        <span onPointerDown={(e) => controls.start(e)} className="cursor-grab touch-none px-1 text-muted" aria-label="Drag to reorder">
          <GripVertical size={18} />
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `color-mix(in srgb, ${def.color} 22%, transparent)` }}>
          {def.emoji}
        </span>
        <button className="min-w-0 flex-1 text-left" onClick={onToggle}>
          <div className="text-[12px] font-semibold text-muted">
            {index + 1}. {def.label}
          </div>
          <div className="truncate text-[14px] font-medium">{def.summary(step.params)}</div>
        </button>
        <motion.button animate={{ rotate: expanded ? 180 : 0 }} onClick={onToggle} aria-label="Expand" className="p-1 text-muted">
          <ChevronDown size={18} />
        </motion.button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-2 gap-3 border-t border-hairline p-3">
              {fields.length === 0 && <p className="col-span-2 text-[13px] text-muted">No settings needed.</p>}
              {fields
                .filter((f) => !f.when || f.when(step.params))
                .map((f) => (
                  <Field key={f.name} def={f} value={step.params[f.name]} onChange={(v) => onChange({ ...step.params, [f.name]: v })} />
                ))}
              <div className="col-span-2 flex justify-end gap-2">
                <button onClick={onDuplicate} className="flex items-center gap-1 rounded-full bg-hairline px-3 py-1.5 text-[13px]">
                  <Copy size={13} /> Duplicate
                </button>
                <button onClick={() => (feedback("delete"), onDelete())} className="flex items-center gap-1 rounded-full bg-bad/12 px-3 py-1.5 text-[13px] text-bad">
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function ActionPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (type: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const list = STEPS.filter((s) => (!cat || s.category === cat) && (!q || `${s.label} ${s.category}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <Sheet open={open} onClose={onClose} title="Add action">
      <div className="glass mb-3 flex items-center gap-2 rounded-full px-4">
        <Search size={16} className="text-muted" />
        <input className="h-11 flex-1 bg-transparent outline-none" placeholder="Search actions" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
        <Chip active={!cat} onClick={() => setCat(null)}>
          All
        </Chip>
        {STEP_CATEGORIES.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 pb-2">
        {list.map((s, i) => (
          <motion.button key={s.type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.012 }} whileTap={{ scale: 0.95 }} onClick={() => (feedback("tap"), onPick(s.type))} className="flex items-center gap-2 rounded-2xl bg-hairline/70 p-2.5 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `color-mix(in srgb, ${s.color} 25%, transparent)` }}>
              {s.emoji}
            </span>
            <span className="text-[14px] font-medium leading-tight">{s.label}</span>
          </motion.button>
        ))}
      </div>
    </Sheet>
  );
}

