"use client";

import { addDays, format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Footprints, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis } from "recharts";
import { AnimatedNumber, Btn, Card, PageHeader, Ring, SectionTitle, Segmented } from "@/components/ui";
import { all } from "@/lib/data";
import { iso, todayIso } from "@/lib/recurrence";
import { saveSettings, useSettings } from "@/lib/settings";
import { feedback, haptic } from "@/lib/sound";
import { requestMotionPermission, setSteps, StepDetector } from "@/lib/steps";
import { toast } from "@/lib/store";
import { confetti } from "@/lib/confetti";

export default function Steps() {
  const s = useSettings();
  const today = todayIso();
  const rows = useLiveQuery(async () => (await all("metrics")).filter((m) => m.type === "steps"), []);
  const byDate = new Map((rows ?? []).map((r) => [r.date, r.value]));
  const steps = byDate.get(today) ?? 0;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = iso(addDays(parseISO(today), i - 6));
    return { d: format(parseISO(d), "EEE"), n: byDate.get(d) ?? 0 };
  });
  const last30 = Array.from({ length: 30 }, (_, i) => byDate.get(iso(addDays(parseISO(today), -i))) ?? 0);
  const avg = Math.round(last30.reduce((a, n) => a + n, 0) / Math.max(1, last30.filter(Boolean).length));
  let streak = 0;
  for (let i = steps >= s.stepGoal ? 0 : 1; i < 365; i++) {
    if ((byDate.get(iso(addDays(parseISO(today), -i))) ?? 0) >= s.stepGoal) streak++;
    else break;
  }

  // Import from link: /health/steps/?steps=8432[&date=2026-10-04] (used by the iPhone Shortcuts automation)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = Number(q.get("steps"));
    if (!q.has("steps") || !Number.isFinite(n)) return;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(q.get("date") ?? "") ? q.get("date")! : todayIso();
    void setSteps(date, n, "replace").then((v) => toast(`Synced ${v.toLocaleString()} steps`, { emoji: "👣" }));
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return (
    <div>
      <PageHeader title="Steps" back subtitle={`Goal ${s.stepGoal.toLocaleString()} a day`} />
      <Card strong className="flex items-center gap-5">
        <Ring value={steps / s.stepGoal} size={130} stroke={14} color="#30d158">
          <div className="text-center">
            <Footprints size={18} className="mx-auto text-good" />
            <div className="text-[26px] font-bold leading-tight">
              <AnimatedNumber value={steps} />
            </div>
            <div className="text-[11px] text-muted">steps today</div>
          </div>
        </Ring>
        <div className="space-y-1.5 text-[14px]">
          <div>
            📏 <b>{((steps * 0.762) / 1000).toFixed(2)} km</b>
          </div>
          <div>
            🔥 <b>~{Math.round(steps * 0.04)} kcal</b>
          </div>
          <div>
            📈 30-day avg <b>{avg.toLocaleString()}</b>
          </div>
          <div>
            🏅 Goal streak <b>{streak} days</b>
          </div>
        </div>
      </Card>

      <WalkMode />

      <SectionTitle>This week</SectionTitle>
      <Card>
        <div className="h-40">
          <ResponsiveContainer>
            <BarChart data={week}>
              <XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <ReferenceLine y={s.stepGoal} stroke="var(--faint)" strokeDasharray="4 4" />
              <Bar dataKey="n" fill="#30d158" radius={[8, 8, 8, 8]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Enter manually</SectionTitle>
      <ManualEntry />

      <SectionTitle>Daily goal</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {[5000, 6000, 8000, 10000, 12000].map((g) => (
          <Btn key={g} variant={s.stepGoal === g ? "primary" : "glass"} className="px-4 py-2" onClick={() => saveSettings({ stepGoal: g })}>
            {g / 1000}k
          </Btn>
        ))}
      </div>

      <SectionTitle>Sync from your phone</SectionTitle>
      <SyncHelp />
    </div>
  );
}

/** Counts steps from the motion sensor while the screen is on. */
function WalkMode() {
  const [on, setOn] = useState(false);
  const [count, setCount] = useState(0);
  const saved = useRef(0);
  const det = useRef(new StepDetector());
  const lock = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!on) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      if (det.current.push(a.x, a.y, a.z, e.timeStamp || performance.now())) {
        setCount((c) => {
          const n = c + 1;
          if (n % 10 === 0) haptic(5);
          return n;
        });
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [on]);

  // save progress in chunks so nothing is lost if the tab closes
  useEffect(() => {
    if (count - saved.current >= 20) {
      const delta = count - saved.current;
      saved.current = count;
      void setSteps(todayIso(), delta, "add");
    }
  }, [count]);

  const start = async () => {
    if (!("DeviceMotionEvent" in window)) return toast("Motion sensor not available on this device", { emoji: "📵" });
    if (!(await requestMotionPermission())) return toast("Motion permission denied", { emoji: "🚫" });
    try {
      const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
      lock.current = (await wl?.request("screen")) ?? null;
    } catch {}
    det.current = new StepDetector();
    saved.current = 0;
    setCount(0);
    setOn(true);
    feedback("success");
  };
  const stop = async () => {
    setOn(false);
    const delta = count - saved.current;
    saved.current = count;
    if (delta > 0) await setSteps(todayIso(), delta, "add");
    await lock.current?.release().catch(() => {});
    lock.current = null;
    feedback("complete");
    if (count >= 100) confetti({ count: 50 });
    toast(`${count} steps added`, { emoji: "👣" });
  };

  return (
    <Card className="mt-3">
      <div className="flex items-center gap-3">
        <div className="relative grid h-14 w-14 place-items-center">
          <AnimatePresence>
            {on && <motion.span initial={{ scale: 0.6, opacity: 0.6 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.4 }} className="absolute inset-0 rounded-full bg-good" />}
          </AnimatePresence>
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-good/15 text-2xl">🚶</span>
        </div>
        <div className="flex-1">
          <div className="font-semibold">Walk mode</div>
          <div className="text-[13px] text-muted">{on ? "Counting… keep Praxis open, phone in hand or pocket" : "Live pedometer using your phone's motion sensor"}</div>
        </div>
        {on && <div className="text-[26px] font-bold tabular-nums">{count}</div>}
      </div>
      <Btn full className="mt-3" variant={on ? "glass" : "primary"} onClick={on ? stop : start} sound={null}>
        {on ? <Pause size={16} /> : <Play size={16} />} {on ? "Stop & save" : "Start walking"}
      </Btn>
    </Card>
  );
}

function ManualEntry() {
  const [date, setDate] = useState(todayIso());
  const [n, setN] = useState("");
  return (
    <Card className="flex gap-2">
      <input className="field flex-1" type="number" inputMode="numeric" placeholder="e.g. 8432" value={n} onChange={(e) => setN(e.target.value)} aria-label="Steps" />
      <input className="field w-40" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      <Btn
        onClick={async () => {
          const v = Number(n);
          if (!Number.isFinite(v) || v < 0) return;
          await setSteps(date, v, "replace");
          toast(`${v.toLocaleString()} steps saved`, { emoji: "👣" });
          setN("");
        }}
      >
        Save
      </Btn>
    </Card>
  );
}

function SyncHelp() {
  const [os, setOs] = useState<"ios" | "android">("ios");
  const [origin, setOrigin] = useState("https://your-praxis-site");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);
  const url = `${origin}/health/steps/?steps=`;
  return (
    <Card>
      <Segmented id="os" value={os} onChange={setOs} options={[{ value: "ios", label: " iPhone" }, { value: "android", label: "🤖 Android" }]} />
      {os === "ios" ? (
        <div className="mt-3 space-y-2 text-[14px]">
          <p>Web apps can&apos;t read Apple Health directly, but the built-in <b>Shortcuts</b> app can send your steps here automatically:</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Open Shortcuts → <b>Automation</b> → <b>+</b> → <b>Time of Day</b> (e.g. 9:00 PM, daily) → <b>Run Immediately</b>.</li>
            <li>Add <b>Find Health Samples</b>: Type is <b>Steps</b>, Start Date is <b>Today</b>.</li>
            <li>Add <b>Calculate Statistics</b> → <b>Sum</b>.</li>
            <li>Add <b>Open URL</b> with the link below, then tap the variable button to append the <b>Statistics</b> result at the end.</li>
          </ol>
          <div className="flex items-center gap-2 rounded-xl bg-hairline px-3 py-2 font-mono text-[12px]">
            <span className="flex-1 break-all">{url}</span>
            <button
              aria-label="Copy link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast("Link copied", { emoji: "📋" });
                } catch {}
              }}
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="text-[12px] text-muted">Use the link of your installed (deployed) Praxis so it opens the app with today&apos;s count.</p>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-[14px]">
          <p>Android&apos;s Health Connect and Google Fit data aren&apos;t available to web apps. Easiest options:</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>
              Use <b>Walk mode</b> above while walking with Praxis open.
            </li>
            <li>
              Glance at Google Fit / Samsung Health once a day and run the <b>Log My Steps</b> workflow (Workflows → Gallery). It&apos;s one tap plus the number.
            </li>
            <li>Automation apps like Tasker or MacroDroid can open the link below with your count appended.</li>
          </ul>
          <div className="rounded-xl bg-hairline px-3 py-2 font-mono text-[12px] break-all">{url}</div>
        </div>
      )}
    </Card>
  );
}
