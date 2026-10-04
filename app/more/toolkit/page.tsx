"use client";

import { AnimatePresence, motion } from "motion/react";
import { Copy, Minus, Pause, Play, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { mmss } from "@/components/Shell";
import { Bar, Btn, Card, Chip, Empty, PageHeader, Toggle } from "@/components/ui";
import { setKV, useKV } from "@/lib/data";
import { cn } from "@/lib/format";
import { feedback, play } from "@/lib/sound";
import { toast, useStore } from "@/lib/store";
import { generatePassword, passwordStrength, textStats, timerActions, timerLeft, timersStore } from "@/lib/timers";

type Tool = "timers" | "stopwatch" | "counter" | "decide" | "password" | "qr" | "text";
const TOOLS: { id: Tool; label: string; emoji: string }[] = [
  { id: "timers", label: "Timers", emoji: "⏲️" },
  { id: "stopwatch", label: "Stopwatch", emoji: "⏱️" },
  { id: "counter", label: "Counter", emoji: "🔢" },
  { id: "decide", label: "Decide", emoji: "🎲" },
  { id: "password", label: "Password", emoji: "🔑" },
  { id: "qr", label: "QR code", emoji: "▦" },
  { id: "text", label: "Text", emoji: "🔤" },
];

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied", { emoji: "📋", ms: 1400 });
  } catch {
    toast("Couldn't copy", { emoji: "⚠️" });
  }
};

export default function Toolkit() {
  const [tool, setTool] = useState<Tool>("timers");
  return (
    <div>
      <PageHeader title="Toolkit" back subtitle="Handy everyday utilities" />
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {TOOLS.map((t) => (
          <Chip key={t.id} active={tool === t.id} onClick={() => setTool(t.id)}>
            {t.emoji} {t.label}
          </Chip>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tool} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
          {tool === "timers" && <Timers />}
          {tool === "stopwatch" && <Stopwatch />}
          {tool === "counter" && <Counters />}
          {tool === "decide" && <Decide />}
          {tool === "password" && <Password />}
          {tool === "qr" && <QrMaker />}
          {tool === "text" && <TextTools />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- Timers ---------- */
function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

function Timers() {
  const timers = useStore(timersStore, []);
  const now = useNow(timers.some((t) => t.endsAt));
  const [label, setLabel] = useState("");
  const [custom, setCustom] = useState("");
  const addT = (m: number) => {
    if (!m || m <= 0) return;
    feedback("success");
    timerActions.add(m, label.trim() || (m >= 1 ? `${m} min` : `${Math.round(m * 60)} s`));
    setLabel("");
    setCustom("");
  };
  return (
    <div className="space-y-3">
      <Card>
        <input className="field mb-3" placeholder="Label (optional): Pasta, Laundry…" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="grid grid-cols-4 gap-2">
          {[1, 3, 5, 10, 15, 20, 30, 60].map((m) => (
            <Btn key={m} variant="glass" className="px-0 py-2.5" onClick={() => addT(m)}>
              {m < 60 ? `${m}m` : "1h"}
            </Btn>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className="field" type="number" inputMode="decimal" placeholder="Custom minutes" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <Btn onClick={() => addT(Number(custom))}>Start</Btn>
        </div>
      </Card>
      {timers.length === 0 && <Empty emoji="⏲️" title="No timers" hint="Run several at once (cooking, laundry, parking). They keep going across pages." />}
      <AnimatePresence initial={false}>
        {timers.map((t) => {
          const left = timerLeft(t, now);
          const done = t.fired || (left === 0 && !!t.endsAt);
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 60 }}>
              <Card className={cn(done && "ring-2 ring-warn")}>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-muted">{t.label}</div>
                    <motion.div animate={done ? { scale: [1, 1.06, 1] } : {}} transition={{ repeat: Infinity, duration: 0.8 }} className={cn("text-[38px] font-light tabular-nums", done && "text-warn")}>
                      {done ? "Done!" : mmss(left)}
                    </motion.div>
                  </div>
                  <button aria-label="Reset" onClick={() => timerActions.reset(t.id)} className="glass grid h-11 w-11 place-items-center rounded-full">
                    <RotateCcw size={18} />
                  </button>
                  <button aria-label={t.endsAt ? "Pause" : "Resume"} onClick={() => (feedback("tap"), timerActions.toggle(t.id))} className="grid h-12 w-12 place-items-center rounded-full bg-accent text-white">
                    {t.endsAt ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button aria-label="Remove" onClick={() => (feedback("delete"), timerActions.remove(t.id))} className="grid h-11 w-11 place-items-center rounded-full bg-bad/12 text-bad">
                    <Trash2 size={17} />
                  </button>
                </div>
                <Bar value={1 - left / t.total} className="mt-2" color={done ? "var(--warn)" : "var(--accent)"} />
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Stopwatch ---------- */
function Stopwatch() {
  const [startAt, setStartAt] = useState<number | null>(null);
  const [acc, setAcc] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const now = useNow(!!startAt, 47);
  const elapsed = acc + (startAt ? now - startAt : 0);
  const fmt = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 10)).padStart(2, "0")}`;
  const lapTimes = laps.map((l, i) => l - (laps[i - 1] ?? 0));
  const best = lapTimes.length > 1 ? Math.min(...lapTimes) : -1;
  const worst = lapTimes.length > 1 ? Math.max(...lapTimes) : -1;
  return (
    <div>
      <div className="py-8 text-center text-[64px] font-extralight tabular-nums tracking-tight">{fmt(elapsed)}</div>
      <div className="flex justify-between px-6">
        <button onClick={() => (feedback("tap"), startAt ? setLaps((l) => [...l, elapsed]) : (setAcc(0), setLaps([])))} className="glass grid h-20 w-20 place-items-center rounded-full text-[16px] font-medium">
          {startAt ? "Lap" : "Reset"}
        </button>
        <button onClick={() => (feedback("tap"), startAt ? (setAcc(elapsed), setStartAt(null)) : setStartAt(Date.now()))} className={cn("grid h-20 w-20 place-items-center rounded-full text-[16px] font-semibold", startAt ? "bg-bad/20 text-bad" : "bg-good/20 text-good")}>
          {startAt ? "Stop" : "Start"}
        </button>
      </div>
      <div className="mt-6 space-y-1">
        {[...lapTimes].reverse().map((t, i) => {
          const n = lapTimes.length - i;
          return (
            <div key={n} className={cn("flex justify-between border-b border-hairline px-2 py-2 tabular-nums", t === best && "text-good", t === worst && "text-bad")}>
              <span>Lap {n}</span>
              <span>{fmt(t)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Counters ---------- */
interface Counter {
  id: string;
  name: string;
  count: number;
  color: string;
}
function Counters() {
  const counters = useKV<Counter[]>("counters", []);
  const [name, setName] = useState("");
  const save = (c: Counter[]) => setKV("counters", c);
  const colors = ["#0a84ff", "#30d158", "#ff9f0a", "#ff375f", "#bf5af2", "#64d2ff"];
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="field glass" placeholder="Count what? Pushups, cups of tea…" value={name} onChange={(e) => setName(e.target.value)} />
        <Btn
          onClick={() => {
            if (!name.trim()) return;
            save([...counters, { id: Math.random().toString(36).slice(2), name: name.trim(), count: 0, color: colors[counters.length % colors.length] }]);
            setName("");
          }}
        >
          Add
        </Btn>
      </div>
      {counters.length === 0 && <Empty emoji="🔢" title="No counters" hint="Tally anything: reps, guests, cups, laps." />}
      {counters.map((c) => (
        <Card key={c.id}>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">{c.name}</span>
            <span className="flex gap-3 text-muted">
              <button aria-label="Reset" onClick={() => save(counters.map((x) => (x.id === c.id ? { ...x, count: 0 } : x)))}>
                <RotateCcw size={16} />
              </button>
              <button aria-label="Delete" onClick={() => save(counters.filter((x) => x.id !== c.id))}>
                <Trash2 size={16} />
              </button>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.85 }} aria-label="Minus" onClick={() => (feedback("tap"), save(counters.map((x) => (x.id === c.id ? { ...x, count: Math.max(0, x.count - 1) } : x))))} className="glass grid h-14 w-14 place-items-center rounded-full">
              <Minus />
            </motion.button>
            <motion.div key={c.count} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="flex-1 text-center text-[48px] font-bold tabular-nums" style={{ color: c.color }}>
              {c.count}
            </motion.div>
            <motion.button whileTap={{ scale: 0.85 }} aria-label="Plus" onClick={() => (feedback("toggle"), save(counters.map((x) => (x.id === c.id ? { ...x, count: x.count + 1 } : x))))} className="grid h-16 w-16 place-items-center rounded-full text-white shadow-lg" style={{ background: c.color }}>
              <Plus size={28} />
            </motion.button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------- Decide ---------- */
function Decide() {
  const [coin, setCoin] = useState<{ side: "Heads" | "Tails"; spin: number }>({ side: "Heads", spin: 0 });
  const [dice, setDice] = useState<number[]>([6, 6]);
  const [rolling, setRolling] = useState(0);
  const [options, setOptions] = useState("Pizza, Biryani, Dosa, Salad");
  const [pick, setPick] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [hi, setHi] = useState(-1);
  const list = options.split(",").map((x) => x.trim()).filter(Boolean);
  const rnd = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

  const spin = () => {
    if (list.length < 2 || spinning) return;
    setSpinning(true);
    setPick(null);
    const target = rnd(list.length);
    const total = list.length * 3 + target;
    let i = 0;
    const step = () => {
      setHi(i % list.length);
      feedback("tap");
      if (i >= total) {
        setSpinning(false);
        setPick(list[target]);
        play("levelup");
        return;
      }
      i++;
      setTimeout(step, 40 + (i / total) ** 3 * 260);
    };
    step();
  };

  return (
    <div className="space-y-3">
      <Card className="flex items-center gap-4">
        <motion.div key={coin.spin} initial={{ rotateY: 0 }} animate={{ rotateY: 1800 + (coin.side === "Tails" ? 180 : 0) }} transition={{ duration: 1, ease: "easeOut" }} className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-[#ffd60a] to-[#ff9f0a] text-[13px] font-black text-[#5a3b00] shadow-lg" style={{ transformStyle: "preserve-3d" }}>
          <span style={{ backfaceVisibility: "hidden" }}>₹</span>
        </motion.div>
        <div className="flex-1">
          <div className="text-[13px] text-muted">Coin flip</div>
          <div className="text-[24px] font-bold">{coin.spin ? coin.side : "—"}</div>
        </div>
        <Btn onClick={() => (play("toggle"), setCoin((c) => ({ side: rnd(2) ? "Heads" : "Tails", spin: c.spin + 1 })))}>Flip</Btn>
      </Card>
      <Card className="flex items-center gap-4">
        <div className="flex gap-2">
          {dice.map((d, i) => (
            <motion.div key={`${rolling}-${i}`} initial={{ rotate: -200, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: i * 0.05 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[34px] text-[#1c1c1e] shadow-md">
              {"⚀⚁⚂⚃⚄⚅"[d - 1]}
            </motion.div>
          ))}
        </div>
        <div className="flex-1 text-[22px] font-bold">{dice.reduce((a, b) => a + b, 0)}</div>
        <div className="flex flex-col gap-1">
          <Btn onClick={() => (play("tap"), setRolling((r) => r + 1), setDice(dice.map(() => rnd(6) + 1)))}>Roll</Btn>
          <button className="text-[12px] text-accent" onClick={() => setDice(dice.length === 1 ? [1, 1] : [1])}>
            {dice.length === 1 ? "2 dice" : "1 die"}
          </button>
        </div>
      </Card>
      <Card>
        <div className="mb-2 text-[13px] text-muted">Can&apos;t decide? List options (comma separated)</div>
        <input className="field mb-3" value={options} onChange={(e) => setOptions(e.target.value)} />
        <div className="mb-3 flex flex-wrap gap-2">
          {list.map((o, i) => (
            <motion.span key={o + i} animate={{ scale: hi === i ? 1.12 : 1 }} className={cn("rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors", hi === i ? "bg-accent text-white" : "bg-hairline")}>
              {o}
            </motion.span>
          ))}
        </div>
        <Btn full onClick={spin} disabled={spinning || list.length < 2}>
          <RefreshCw size={16} /> {spinning ? "Spinning…" : "Pick for me"}
        </Btn>
        <AnimatePresence>
          {pick && (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-center text-[26px] font-bold">
              🎉 {pick}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

/* ---------- Password ---------- */
function Password() {
  const [len, setLen] = useState(16);
  const [opts, setOpts] = useState({ upper: true, digits: true, symbols: true });
  const [pw, setPw] = useState("");
  const regen = (l = len, o = opts) => setPw(generatePassword(l, o));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    regen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = passwordStrength(pw);
  return (
    <Card className="space-y-3">
      <motion.div key={pw} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="break-all rounded-2xl bg-hairline p-4 text-center font-mono text-[20px]">
        {pw}
      </motion.div>
      <div className="flex items-center gap-2">
        <Bar value={(st.score + 1) / 5} className="flex-1" color={["#ff453a", "#ff9f0a", "#ffd60a", "#30d158", "#30d158"][st.score]} />
        <span className="text-[13px] font-semibold">{st.label}</span>
      </div>
      <label className="block">
        <span className="text-[14px]">Length: {len}</span>
        <input type="range" min={6} max={40} value={len} onChange={(e) => (setLen(Number(e.target.value)), regen(Number(e.target.value)))} className="w-full" style={{ accentColor: "var(--accent)" }} />
      </label>
      {(["upper", "digits", "symbols"] as const).map((k) => (
        <div key={k} className="flex items-center justify-between">
          <span>{{ upper: "Uppercase A-Z", digits: "Numbers 0-9", symbols: "Symbols !@#" }[k]}</span>
          <Toggle
            checked={opts[k]}
            onChange={(v) => {
              const o = { ...opts, [k]: v };
              setOpts(o);
              regen(len, o);
            }}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Btn variant="glass" full onClick={() => regen()}>
          <RefreshCw size={16} /> New
        </Btn>
        <Btn full onClick={() => copy(pw)}>
          <Copy size={16} /> Copy
        </Btn>
      </div>
      <p className="text-[12px] text-muted">Generated on your device with a secure random source. Nothing is stored.</p>
    </Card>
  );
}

/* ---------- QR ---------- */
function QrMaker() {
  const [mode, setMode] = useState<"text" | "wifi" | "upi">("text");
  const [text, setText] = useState("https://");
  const [ssid, setSsid] = useState("");
  const [pass, setPass] = useState("");
  const [upi, setUpi] = useState("");
  const [amt, setAmt] = useState("");
  const [img, setImg] = useState("");
  const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");
  const payload = mode === "wifi" ? `WIFI:T:WPA;S:${esc(ssid)};P:${esc(pass)};;` : mode === "upi" ? `upi://pay?pa=${encodeURIComponent(upi)}${amt ? `&am=${encodeURIComponent(amt)}` : ""}&cu=INR` : text;
  useEffect(() => {
    let alive = true;
    if (!payload.trim()) return;
    QRCode.toDataURL(payload, { margin: 1, width: 600, errorCorrectionLevel: "M" })
      .then((u) => alive && setImg(u))
      .catch(() => alive && setImg(""));
    return () => {
      alive = false;
    };
  }, [payload]);
  return (
    <Card className="space-y-3">
      <div className="flex gap-2">
        {(["text", "wifi", "upi"] as const).map((m) => (
          <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
            {{ text: "🔗 Text / link", wifi: "📶 Wi-Fi", upi: "₹ UPI" }[m]}
          </Chip>
        ))}
      </div>
      {mode === "text" && <textarea className="field min-h-20" value={text} onChange={(e) => setText(e.target.value)} />}
      {mode === "wifi" && (
        <>
          <input className="field" placeholder="Network name (SSID)" value={ssid} onChange={(e) => setSsid(e.target.value)} />
          <input className="field" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} />
        </>
      )}
      {mode === "upi" && (
        <>
          <input className="field" placeholder="UPI ID (name@bank)" value={upi} onChange={(e) => setUpi(e.target.value)} />
          <input className="field" type="number" placeholder="Amount (optional)" value={amt} onChange={(e) => setAmt(e.target.value)} />
        </>
      )}
      {img && (
        <motion.div key={img.length} initial={{ scale: 0.95, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto w-full max-w-[280px] rounded-3xl bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="QR code" className="w-full" />
        </motion.div>
      )}
      <p className="text-center text-[12px] text-muted">Long-press the code to save or share it.</p>
    </Card>
  );
}

/* ---------- Text ---------- */
function TextTools() {
  const [t, setT] = useState("");
  const st = textStats(t);
  const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Card className="space-y-3">
      <textarea className="field min-h-40" placeholder="Paste or type text…" value={t} onChange={(e) => setT(e.target.value)} />
      <div className="grid grid-cols-4 gap-2 text-center text-[12px]">
        {[
          ["Words", st.words],
          ["Chars", st.chars],
          ["Lines", st.lines],
          ["Read", `${st.readMin}m`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-hairline p-2">
            <div className="text-[18px] font-bold">{v}</div>
            {k}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip onClick={() => setT(t.toUpperCase())}>UPPER</Chip>
        <Chip onClick={() => setT(t.toLowerCase())}>lower</Chip>
        <Chip onClick={() => setT(title(t))}>Title Case</Chip>
        <Chip onClick={() => setT(t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim())}>Clean spaces</Chip>
        <Chip onClick={() => copy(t)}>📋 Copy</Chip>
        <Chip onClick={() => setT("")}>Clear</Chip>
      </div>
    </Card>
  );
}
