"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, uid, type Base, type TableName } from "./db";
import { emitAdded } from "./events";

type Row<T extends TableName> = (typeof db)[T] extends import("dexie").Table<infer R, string> ? R : never;
export type NewRow<T extends TableName> = Omit<Row<T>, keyof Base> & Partial<Pick<Base, "id">>;

export async function add<T extends TableName>(table: T, data: NewRow<T>): Promise<string> {
  const now = Date.now();
  const id = data.id ?? uid();
  const row = { ...data, id, createdAt: now, updatedAt: now, deletedAt: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db[table] as any).put(row);
  emitAdded({ table, row });
  return id;
}

export async function update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db[table] as any).update(id, { ...patch, updatedAt: Date.now() });
}

/** Soft delete; returns an undo function. */
export async function remove<T extends TableName>(table: T, id: string) {
  await update(table, id, { deletedAt: Date.now() } as unknown as Partial<Row<T>>);
  return () => update(table, id, { deletedAt: null } as unknown as Partial<Row<T>>);
}

export async function all<T extends TableName>(table: T): Promise<Row<T>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await (db[table] as any).toArray()).filter((r: Base) => !r.deletedAt);
}

/** Live, non-deleted rows of a table (re-renders on any change). */
export function useRows<T extends TableName>(table: T): Row<T>[] | undefined {
  return useLiveQuery(() => all(table), [table]);
}

export async function getKV<V>(key: string, fallback: V): Promise<V> {
  const r = await db.kv.get(key);
  return (r?.value as V) ?? fallback;
}
export const setKV = (key: string, value: unknown) => db.kv.put({ key, value });

export function useKV<V>(key: string, fallback: V): V {
  return useLiveQuery(() => getKV(key, fallback), [key]) ?? fallback;
}

export async function saveFile(file: File): Promise<string> {
  const id = uid();
  await db.files.put({ id, name: file.name, type: file.type, blob: file, createdAt: Date.now() });
  return id;
}
