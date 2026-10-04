"use client";

import { AnimatePresence, motion } from "motion/react";
import { Pin, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useCrud } from "@/components/CrudPage";
import { Empty, IconBtn, PageHeader } from "@/components/ui";
import type { Note } from "@/lib/db";
import { update, useRows } from "@/lib/data";
import { ago } from "@/lib/format";
import { feedback } from "@/lib/sound";

/** Evaluates simple arithmetic lines ending in "=" (Math Notes-style). Only digits/operators allowed. */
function mathify(body: string) {
  return body
    .split("\n")
    .map((line) => {
      const m = line.match(/^(.*?)([\d\s+\-*/().%^]+)=\s*$/);
      if (!m || !/\d/.test(m[2])) return line;
      try {
        const expr = m[2].replace(/\^/g, "**").replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
        if (!/^[\d\s+\-*/().]+$/.test(expr.replace(/\*\*/g, "*"))) return line;
        const v = Function(`"use strict";return (${expr})`)() as number;
        return Number.isFinite(v) ? `${line.trimEnd()} ${Math.round(v * 1e6) / 1e6}` : line;
      } catch {
        return line;
      }
    })
    .join("\n");
}

export default function Notes() {
  const notes = useRows("notes");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const crud = useCrud<Note>({
    table: "notes",
    noun: "Note",
    defaults: () => ({ color: "#ffd60a", tags: [] }),
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "body", label: "Note", type: "textarea", hint: "Tip: end a line with = to calculate it, e.g. 1200/4 =" },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "color", label: "Colour", type: "color" },
      { name: "pinned", label: "Pin to top", type: "toggle" },
    ],
    toRow: (v) => ({ ...v, body: mathify(String(v.body ?? "")) }),
  });
  const list = [...(notes ?? [])]
    .filter((n) => !q || `${n.title} ${n.body} ${(n.tags ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt);

  return (
    <div>
      <PageHeader
        title="Notes"
        back
        actions={
          <>
            <IconBtn label="Search" onClick={() => setSearching((x) => !x)}>
              <Search size={18} />
            </IconBtn>
            <IconBtn label="New note" onClick={crud.create} className="bg-accent! text-white">
              <Plus size={20} />
            </IconBtn>
          </>
        }
      />
      {searching && <input autoFocus className="field glass mb-3" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />}
      {notes && list.length === 0 && <Empty emoji="📝" title={q ? "No matches" : "No notes"} hint="Jot ideas, lists, anything. Lines ending in = calculate themselves." />}
      <div className="columns-2 gap-3">
        <AnimatePresence initial={false}>
          {list.map((n) => (
            <motion.div key={n.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} whileTap={{ scale: 0.97 }} onClick={() => (feedback("tap"), crud.edit(n))} className="glass relative mb-3 cursor-pointer break-inside-avoid rounded-[22px] p-3.5" style={{ borderTop: `4px solid ${n.color ?? "#ffd60a"}` }}>
              <button
                aria-label={n.pinned ? "Unpin" : "Pin"}
                className="absolute right-3 top-3"
                onClick={(e) => {
                  e.stopPropagation();
                  feedback("toggle");
                  void update("notes", n.id, { pinned: !n.pinned });
                }}
              >
                <Pin size={14} className={n.pinned ? "fill-accent text-accent" : "text-faint"} />
              </button>
              <div className="pr-5 font-semibold">{n.title}</div>
              <p className="mt-1 line-clamp-[8] whitespace-pre-line text-[14px] text-muted">{n.body}</p>
              {(n.tags ?? []).length > 0 && <div className="mt-2 text-[12px] text-accent">#{n.tags!.join(" #")}</div>}
              <div className="mt-1 text-[11px] text-faint">{ago(n.updatedAt)}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {crud.sheet}
    </div>
  );
}
