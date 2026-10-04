"use client";

import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { Mic, Pause, Play, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCrud } from "@/components/CrudPage";
import { Empty, PageHeader, SwipeRow } from "@/components/ui";
import { db, uid, type Memo } from "@/lib/db";
import { add, useRows } from "@/lib/data";
import { feedback } from "@/lib/sound";
import { toast } from "@/lib/store";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function VoiceMemos() {
  const memos = useRows("memos");
  const crud = useCrud<Memo>({ table: "memos", noun: "Memo", defaults: () => ({}), fields: [{ name: "title", label: "Title", type: "text", required: true }, { name: "tags", label: "Tags", type: "tags" }] });
  const list = [...(memos ?? [])].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div>
      <PageHeader title="Voice Memos" back subtitle="Record thoughts, ideas, reminders" />
      <Recorder />
      <div className="mt-4">
        {memos && list.length === 0 && <Empty emoji="🎙️" title="No recordings" hint="Tap the red button and start talking. Recordings stay on this device." />}
        <AnimatePresence initial={false}>
          {list.map((m) => (
            <SwipeRow key={m.id} onDelete={() => crud.del(m)}>
              <MemoRow memo={m} onEdit={() => crud.edit(m)} />
            </SwipeRow>
          ))}
        </AnimatePresence>
      </div>
      {crud.sheet}
    </div>
  );
}

function Recorder() {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(32).fill(0.05));
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return toast("Recording isn't supported in this browser", { emoji: "🎙️" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return toast("Microphone permission denied", { emoji: "🚫" });
    }
    const r = new MediaRecorder(stream);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(raf.current);
      const seconds = (Date.now() - started.current) / 1000;
      const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
      if (seconds < 0.8 || !blob.size) return;
      const fileId = uid();
      await db.files.put({ id: fileId, name: `memo-${Date.now()}`, type: blob.type, blob, createdAt: Date.now() });
      await add("memos", { title: `Memo ${format(new Date(), "d MMM, h:mm a")}`, fileId, seconds, tags: [] });
      feedback("success");
      toast("Memo saved", { emoji: "🎙️" });
    };
    // live level meter
    const ctx = new AudioContext();
    const an = ctx.createAnalyser();
    an.fftSize = 64;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    const loop = () => {
      an.getByteFrequencyData(buf);
      setLevels(Array.from(buf).map((v) => Math.max(0.05, v / 255)));
      setSecs((Date.now() - started.current) / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    started.current = Date.now();
    r.start(500);
    loop();
    setRec(r);
    feedback("open");
  };
  const stop = () => {
    rec?.stop();
    setRec(null);
    setSecs(0);
    setLevels(Array(32).fill(0.05));
  };

  return (
    <div className="glass flex flex-col items-center rounded-[28px] p-5">
      <div className="flex h-16 items-center gap-[3px]">
        {levels.map((l, i) => (
          <motion.span key={i} animate={{ height: `${Math.max(6, l * 64)}px` }} transition={{ duration: 0.08 }} className="w-[5px] rounded-full" style={{ background: rec ? "#ff453a" : "var(--faint)" }} />
        ))}
      </div>
      <div className="my-2 text-[28px] font-light tabular-nums">{mmss(secs)}</div>
      <motion.button whileTap={{ scale: 0.9 }} onClick={rec ? stop : start} aria-label={rec ? "Stop recording" : "Start recording"} className="grid h-20 w-20 place-items-center rounded-full border-4 border-[var(--glass-border)] bg-[#ff453a] text-white shadow-lg shadow-[#ff453a]/40">
        <motion.span animate={{ borderRadius: rec ? 6 : 40, scale: rec ? 0.7 : 1 }}>{rec ? <Square size={26} fill="white" /> : <Mic size={30} />}</motion.span>
      </motion.button>
    </div>
  );
}

function MemoRow({ memo, onEdit }: { memo: Memo; onEdit: () => void }) {
  const file = useLiveQuery(() => db.files.get(memo.fileId), [memo.fileId]);
  const url = useMemo(() => (file?.blob ? URL.createObjectURL(file.blob) : undefined), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  return (
    <div className="flex items-center gap-3 p-3.5">
      <button
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => {
          const a = audio.current;
          if (!a) return;
          if (a.paused) void a.play();
          else a.pause();
        }}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white"
      >
        {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
        <div className="truncate font-semibold">{memo.title}</div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-hairline">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${(pos / Math.max(1, memo.seconds)) * 100}%` }} />
        </div>
        <div className="mt-1 text-[12px] text-muted">
          {format(memo.createdAt, "d MMM yyyy, h:mm a")} · {mmss(memo.seconds)}
          {(memo.tags ?? []).length ? ` · #${memo.tags!.join(" #")}` : ""}
        </div>
      </button>
      <audio ref={audio} src={url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => (setPlaying(false), setPos(0))} onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} />
    </div>
  );
}
