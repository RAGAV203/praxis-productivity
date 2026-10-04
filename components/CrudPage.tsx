"use client";

import { AnimatePresence } from "motion/react";
import { Plus, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { Base, TableName } from "@/lib/db";
import { add, remove, update, useRows } from "@/lib/data";
import { toast } from "@/lib/store";
import { FormSheet, type FieldDef, type FormValues } from "./Form";
import { Empty, IconBtn, PageHeader, SwipeRow } from "./ui";

export interface CrudConfig<R extends Base> {
  table: TableName;
  title: string;
  subtitle?: ReactNode | ((rows: R[]) => ReactNode);
  noun: string;
  fields: FieldDef[];
  defaults: () => FormValues;
  render: (row: R) => ReactNode;
  sort?: (a: R, b: R) => number;
  filter?: (row: R) => boolean;
  searchText?: (row: R) => string;
  empty: { emoji: string; title: string; hint?: string };
  header?: (rows: R[]) => ReactNode;
  groupBy?: (row: R) => string;
  onComplete?: (row: R) => void | Promise<void>;
  completeLabel?: string;
  /** transform form values before saving (e.g. compute fields) */
  toRow?: (v: FormValues, existing?: R) => FormValues;
  /** transform a stored row into form values when editing */
  fromRow?: (row: R) => FormValues;
  back?: boolean;
  actions?: ReactNode;
}

export function useCrud<R extends Base>(cfg: Pick<CrudConfig<R>, "table" | "noun" | "fields" | "defaults" | "toRow" | "fromRow">) {
  const [editing, setEditing] = useState<R | null>(null);
  const [creating, setCreating] = useState(false);
  const open = creating || !!editing;
  const close = () => {
    setEditing(null);
    setCreating(false);
  };
  const del = async (row: R) => {
    const undo = await remove(cfg.table, row.id);
    toast(`${cfg.noun} deleted`, { emoji: "🗑️", undo });
  };
  const sheet = (
    <FormSheet
      open={open}
      onClose={close}
      title={editing ? `Edit ${cfg.noun.toLowerCase()}` : `New ${cfg.noun.toLowerCase()}`}
      fields={cfg.fields}
      initial={editing ? (cfg.fromRow ? cfg.fromRow(editing) : (editing as unknown as FormValues)) : cfg.defaults()}
      onDelete={editing ? () => del(editing) : undefined}
      onSubmit={async (v) => {
        const data = cfg.toRow ? cfg.toRow(v, editing ?? undefined) : v;
        const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...rest } = data as FormValues & Partial<Base>;
        void _id; void _c; void _u; void _d;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (editing) await update(cfg.table, editing.id, rest as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else await add(cfg.table, rest as any);
        toast(editing ? "Saved" : `${cfg.noun} added`, { emoji: "✅" });
      }}
    />
  );
  return { sheet, edit: setEditing, create: () => setCreating(true), del };
}

export function CrudPage<R extends Base>(cfg: CrudConfig<R>) {
  const rows = useRows(cfg.table) as R[] | undefined;
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const crud = useCrud<R>(cfg);

  const list = useMemo(() => {
    let r = [...(rows ?? [])];
    if (cfg.filter) r = r.filter(cfg.filter);
    if (q && cfg.searchText) r = r.filter((x) => cfg.searchText!(x).toLowerCase().includes(q.toLowerCase()));
    if (cfg.sort) r.sort(cfg.sort);
    return r;
  }, [rows, q, cfg]);

  const groups = useMemo(() => {
    if (!cfg.groupBy) return [["", list]] as [string, R[]][];
    const m = new Map<string, R[]>();
    for (const r of list) {
      const g = cfg.groupBy(r);
      m.set(g, [...(m.get(g) ?? []), r]);
    }
    return [...m.entries()];
  }, [list, cfg]);

  const subtitle = typeof cfg.subtitle === "function" ? cfg.subtitle(rows ?? []) : cfg.subtitle;

  return (
    <div>
      <PageHeader
        title={cfg.title}
        subtitle={subtitle}
        back={cfg.back ?? true}
        actions={
          <>
            {cfg.actions}
            {cfg.searchText && (
              <IconBtn label="Search" onClick={() => setSearching((s) => !s)}>
                <Search size={18} />
              </IconBtn>
            )}
            <IconBtn label={`Add ${cfg.noun}`} onClick={crud.create} className="bg-accent! text-white">
              <Plus size={20} />
            </IconBtn>
          </>
        }
      />
      {searching && <input autoFocus className="field glass mb-3" placeholder={`Search ${cfg.title.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />}
      {cfg.header?.(rows ?? [])}
      {rows && list.length === 0 && <Empty {...cfg.empty} title={q ? "No matches" : cfg.empty.title} action={!q ? <button className="font-semibold text-accent" onClick={crud.create}>Add {cfg.noun.toLowerCase()}</button> : undefined} />}
      {groups.map(([g, items]) => (
        <div key={g}>
          {g && <div className="mb-2 mt-5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{g}</div>}
          <AnimatePresence initial={false}>
            {items.map((r) => (
              <SwipeRow key={r.id} onDelete={() => crud.del(r)} onComplete={cfg.onComplete ? () => cfg.onComplete!(r) : undefined} completeLabel={cfg.completeLabel}>
                <div role="button" tabIndex={0} className="cursor-pointer p-4" onClick={() => crud.edit(r)} onKeyDown={(e) => e.key === "Enter" && crud.edit(r)}>
                  {cfg.render(r)}
                </div>
              </SwipeRow>
            ))}
          </AnimatePresence>
        </div>
      ))}
      {crud.sheet}
    </div>
  );
}
