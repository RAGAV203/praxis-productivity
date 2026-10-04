/** Tiny app-wide event bus — lets workflows react to things being logged. */
export interface AddedEvent {
  table: string;
  row: Record<string, unknown>;
}

type Listener = (e: AddedEvent) => void;
const listeners = new Set<Listener>();

export function onAdded(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let muted = 0;
/** Run bulk writes (demo data, imports) without firing event-triggered workflows. */
export async function withEventsMuted<T>(fn: () => Promise<T>): Promise<T> {
  muted++;
  try {
    return await fn();
  } finally {
    muted--;
  }
}

export function emitAdded(e: AddedEvent) {
  if (muted) return;
  for (const fn of listeners) {
    try {
      fn(e);
    } catch {}
  }
}
