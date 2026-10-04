"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { FileText } from "lucide-react";
import { useEffect, useMemo } from "react";
import { db } from "@/lib/db";

function useObjectUrl(blob?: Blob) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
}

/** Thumbnail of a stored file; tapping opens it in a new tab. */
export function FileThumb({ id, size = 80 }: { id: string; size?: number }) {
  const f = useLiveQuery(() => db.files.get(id), [id]);
  const url = useObjectUrl(f?.blob);
  if (!f) return <div className="rounded-2xl bg-hairline" style={{ width: size, height: size }} />;
  const isImg = f.type.startsWith("image/");
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-hairline" style={{ width: size, height: size }} title={f.name}>
      {isImg && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={f.name} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center p-1 text-center text-[10px] text-muted">
          <FileText size={22} />
          <span className="line-clamp-2">{f.name}</span>
        </div>
      )}
    </a>
  );
}

export function FileStrip({ ids, size = 56 }: { ids?: string[]; size?: number }) {
  if (!ids?.length) return null;
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
      {ids.map((id) => (
        <FileThumb key={id} id={id} size={size} />
      ))}
    </div>
  );
}
