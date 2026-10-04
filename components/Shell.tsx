"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Delete, HeartPulse, LayoutGrid, Lock, Pause, Play, Plus, Search, Sparkles, Sun, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addWater } from "@/lib/actions";
import { all, add } from "@/lib/data";
import { confetti } from "@/lib/confetti";
import { cn } from "@/lib/format";
import { MODULES, TABS, tabFor } from "@/lib/nav";
import { buildReminders } from "@/lib/reminders";
import { todayIso } from "@/lib/recurrence";
import { loadSettings, saveSettings, useSettings } from "@/lib/settings";
import { configureHaptics, configureSound, feedback, play } from "@/lib/sound";
import { dismissToast, focusActions, focusRemaining, focusStore, toast, toasts, ui, useStore } from "@/lib/store";
import { guessAisle } from "@/lib/aisles";
import { QuickExpense } from "./QuickExpense";
import { Sheet, spring } from "./ui";
import { TimerWatcher } from "./TimerWatcher";
import { WorkflowRunner, WorkflowScheduler } from "./WorkflowRunner";
import { MedicalIdCard } from "./MedicalIdCard";
import { runWorkflow } from "@/lib/runner";
import { getKV, setKV } from "@/lib/data";

/* ---------------- Root shell ---------------- */
export function AppShell({ children }: { children: ReactNode }) {
  const s = useSettings();
  const pathname = usePathname();

  // theme + accent
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = s.theme === "dark" || (s.theme === "auto" && mq.matches);
      root.classList.toggle("dark", dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#000000" : "#f2f2f7");
    };
    apply();
    root.style.setProperty("--accent", s.accent);
    try {
      localStorage.setItem("praxis-theme", s.theme);
      localStorage.setItem("praxis-accent", s.accent);
    } catch {}
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [s.theme, s.accent]);

  useEffect(() => {
    configureSound({ enabled: s.sound && s.focusMode !== "sleep", volume: s.volume });
    configureHaptics(s.haptics);
  }, [s.sound, s.volume, s.haptics, s.focusMode]);

  // service worker (production only — dev server assets change constantly)
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // keyboard shortcut: Ctrl/Cmd+K opens the command palette
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.set((u) => ({ ...u, palette: !u.palette }));
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  useDailyNotification(s.notifications);

  // Text size (like iOS Dynamic Type) scales the whole UI
  useEffect(() => {
    document.documentElement.style.setProperty("zoom", String(s.textScale || 1));
  }, [s.textScale]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="wallpaper" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <LockGate>
        <LiveActivity />
        <Toaster />
        <AnimatePresence mode="wait">
          <motion.main key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-36">
            {children}
          </motion.main>
        </AnimatePresence>
        <BottomNav />
        <QuickAdd />
        <CommandPalette />
        <WorkflowRunner />
        <WorkflowScheduler />
        <TimerWatcher />
      </LockGate>
    </MotionConfig>
  );
}

/* ---------------- Floating Liquid Glass tab bar ---------------- */
const TAB_ICONS = { today: Sun, money: Wallet, health: HeartPulse, life: Sparkles, more: LayoutGrid };

function BottomNav() {
  const pathname = usePathname();
  const active = tabFor(pathname);
  const [compact, setCompact] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    const on = () => {
      const y = window.scrollY;
      if (Math.abs(y - last.current) > 8) setCompact(y > last.current && y > 80);
      last.current = y;
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
      <div className="pointer-events-auto flex items-center gap-1.5">
        <motion.nav layout transition={spring} className={cn("glass-strong flex items-center rounded-full p-1.5")} aria-label="Main">
          {TABS.map((t) => {
            const Icon = TAB_ICONS[t.id];
            const on = active === t.id;
            if (compact && !on) return null;
            return (
              <Link key={t.id} href={t.href} onClick={() => feedback("tap")} className={cn("relative flex flex-col items-center rounded-full px-2.5 py-1.5 min-[400px]:px-3.5 sm:px-5", on ? "text-accent" : "text-fg/70")} aria-current={on ? "page" : undefined}>
                {on && <motion.span layoutId="tab-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent/14" />}
                <motion.span animate={{ scale: on ? 1.08 : 1 }} transition={spring} className="relative">
                  <Icon size={22} strokeWidth={on ? 2.4 : 2} />
                </motion.span>
                <AnimatePresence initial={false}>
                  {!compact && (
                    <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative text-[10px] font-semibold">
                      {t.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </motion.nav>
        <motion.button whileTap={{ scale: 0.88 }} aria-label="Search" onClick={() => (feedback("open"), ui.set((u) => ({ ...u, palette: true })))} className="glass-strong grid h-12 w-12 shrink-0 place-items-center rounded-full">
          <Search size={21} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.88 }} aria-label="Quick add" onClick={() => (feedback("open"), ui.set((u) => ({ ...u, quickAdd: true })))} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/40">
          <Plus size={26} />
        </motion.button>
      </div>
    </div>
  );
}

/* ---------------- Quick add ---------------- */
function QuickAdd() {
  const { quickAdd } = useStore(ui);
  const router = useRouter();
  const [expense, setExpense] = useState(false);
  const [mini, setMini] = useState<null | "task" | "note" | "grocery">(null);
  const [text, setText] = useState("");
  const close = () => ui.set((u) => ({ ...u, quickAdd: false }));
  const go = (href: string) => {
    close();
    router.push(href);
  };

  const actions: { emoji: string; label: string; color: string; run: () => void }[] = [
    { emoji: "💸", label: "Expense", color: "#ff9f0a", run: () => (close(), setExpense(true)) },
    { emoji: "💧", label: "+250 ml", color: "#64d2ff", run: () => (close(), void addWater(250)) },
    { emoji: "☑️", label: "Reminder", color: "#0a84ff", run: () => (close(), setText(""), setMini("task")) },
    { emoji: "🛒", label: "Grocery", color: "#30d158", run: () => (close(), setText(""), setMini("grocery")) },
    { emoji: "📝", label: "Note", color: "#ffd60a", run: () => (close(), setText(""), setMini("note")) },
    { emoji: "🌈", label: "Mood", color: "#bf5af2", run: () => go("/health/mood/?log=1") },
    { emoji: "📔", label: "Journal", color: "#ff9f0a", run: () => go("/life/journal/?new=1") },
    { emoji: "⏱️", label: "Focus", color: "#ff375f", run: () => (close(), focusActions.start(), toast("Focus started", { emoji: "⏱️" })) },
    { emoji: "👣", label: "Steps", color: "#30d158", run: () => go("/health/steps/") },
    { emoji: "⚡", label: "Workflows", color: "#5e5ce6", run: () => go("/more/workflows/") },
    { emoji: "⏲️", label: "Timer", color: "#ff9f0a", run: () => go("/more/toolkit/") },
    { emoji: "🎙️", label: "Voice", color: "#ff453a", run: () => go("/more/voice/") },
  ];

  const saveMini = async () => {
    const t = text.trim();
    if (!t) return;
    if (mini === "task") await add("tasks", { title: t, done: false, priority: "med", due: todayIso() });
    if (mini === "note") await add("notes", { title: t.split("\n")[0].slice(0, 60), body: t, tags: [] });
    if (mini === "grocery") for (const name of t.split(/,|\n/).map((x) => x.trim()).filter(Boolean)) await add("grocery", { name, aisle: guessAisle(name), done: false });
    feedback("success");
    toast(mini === "grocery" ? "Added to grocery list" : mini === "task" ? "Reminder added" : "Note saved", { emoji: "✅" });
    setMini(null);
  };

  return (
    <>
      <Sheet open={quickAdd} onClose={close} title="Quick add">
        <div className="grid grid-cols-4 gap-3 pb-2">
          {actions.map((a, i) => (
            <motion.button key={a.label} initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring, delay: i * 0.03 }} whileTap={{ scale: 0.88 }} onClick={() => (feedback("tap"), a.run())} className="flex flex-col items-center gap-1.5">
              <span className="grid h-16 w-16 place-items-center rounded-[20px] text-[28px] shadow-sm" style={{ background: `color-mix(in srgb, ${a.color} 22%, transparent)` }}>
                {a.emoji}
              </span>
              <span className="text-[12px] font-medium">{a.label}</span>
            </motion.button>
          ))}
        </div>
      </Sheet>
      <QuickExpense open={expense} onClose={() => setExpense(false)} />
      <Sheet open={!!mini} onClose={() => setMini(null)} title={mini === "task" ? "New reminder" : mini === "grocery" ? "Add groceries" : "Quick note"} footer={<button onClick={saveMini} className="w-full rounded-full bg-accent py-3 font-semibold text-white">Add</button>}>
        {mini === "note" ? (
          <textarea autoFocus className="field min-h-40" placeholder="Write anything…" value={text} onChange={(e) => setText(e.target.value)} />
        ) : (
          <input autoFocus className="field" placeholder={mini === "grocery" ? "milk, bread, tomatoes…" : "Call mom at 6pm"} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveMini()} />
        )}
        {mini === "grocery" && <p className="mt-2 px-1 text-[13px] text-muted">Separate with commas — items auto-sort into aisles.</p>}
      </Sheet>
    </>
  );
}

/* ---------------- Command palette (Spotlight) ---------------- */
interface Hit {
  id: string;
  title: string;
  sub: string;
  emoji: string;
  run: () => void;
}

function CommandPalette() {
  const { palette } = useStore(ui);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Hit[]>([]);
  const close = () => ui.set((u) => ({ ...u, palette: false }));

  const [wasOpen, setWasOpen] = useState(palette);
  if (palette !== wasOpen) {
    setWasOpen(palette);
    if (palette) setQ("");
  }

  useEffect(() => {
    if (!palette) return;
    (async () => {
      const [journal, notes, expenses, docs, people, tasks, books, flows] = await Promise.all([all("journal"), all("notes"), all("expenses"), all("docs"), all("people"), all("tasks"), all("books"), all("workflows")]);
      const nav = (href: string) => () => (close(), router.push(href));
      setData([
        ...flows.map((w) => ({ id: w.id, title: `Run: ${w.name}`, sub: "Workflow", emoji: w.emoji, run: () => (close(), void runWorkflow(w, { source: "manual" })) })),
        ...journal.map((j) => ({ id: j.id, title: j.text.slice(0, 80) || "Journal entry", sub: `Journal · ${j.date}`, emoji: "📔", run: nav("/life/journal/") })),
        ...notes.map((n) => ({ id: n.id, title: n.title, sub: `Note · ${n.body.slice(0, 40)}`, emoji: "📝", run: nav("/more/notes/") })),
        ...expenses.map((e) => ({ id: e.id, title: `${e.note || e.category} · ₹${e.amount}`, sub: `${e.kind} · ${e.date}`, emoji: "💸", run: nav("/money/expenses/") })),
        ...docs.map((d) => ({ id: d.id, title: d.title, sub: `Document · ${d.type}`, emoji: "🗂️", run: nav("/more/documents/") })),
        ...people.map((p) => ({ id: p.id, title: p.name, sub: `Person · ${p.relation ?? ""}`, emoji: "👤", run: nav("/life/people/") })),
        ...tasks.map((t) => ({ id: t.id, title: t.title, sub: `Reminder${t.due ? " · " + t.due : ""}`, emoji: "☑️", run: nav("/life/tasks/") })),
        ...books.map((b) => ({ id: b.id, title: b.title, sub: `Book · ${b.author ?? ""}`, emoji: "📚", run: nav("/life/reading/") })),
      ]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette]);

  const actions: Hit[] = useMemo(
    () => [
      { id: "a-water", title: "Log 250 ml water", sub: "Action", emoji: "💧", run: () => (close(), void addWater(250)) },
      { id: "a-focus", title: "Start focus timer", sub: "Action", emoji: "⏱️", run: () => (close(), focusActions.start()) },
      { id: "a-add", title: "Quick add…", sub: "Action", emoji: "➕", run: () => ui.set({ palette: false, quickAdd: true }) },
      { id: "a-breathe", title: "Breathe for a minute", sub: "Action", emoji: "🫁", run: () => (close(), router.push("/health/breathe/")) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const ql = q.toLowerCase().trim();
  const modules: Hit[] = MODULES.filter((m) => !ql || `${m.title} ${m.desc} ${m.keywords ?? ""}`.toLowerCase().includes(ql)).map((m) => ({ id: m.href, title: m.title, sub: m.desc, emoji: m.emoji, run: () => (close(), router.push(m.href)) }));
  const results = ql ? [...actions.filter((a) => a.title.toLowerCase().includes(ql)), ...modules, ...data.filter((d) => `${d.title} ${d.sub}`.toLowerCase().includes(ql)).slice(0, 30)] : [...actions, ...data.filter((d) => d.sub === "Workflow").slice(0, 4), ...modules.slice(0, 8)];

  return (
    <AnimatePresence>
      {palette && (
        <div className="fixed inset-0 z-50 flex justify-center px-3 pt-[10vh]">
          <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div initial={{ opacity: 0, scale: 0.94, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={spring} className="glass-strong relative flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px]">
            <div className="flex items-center gap-2 border-b border-hairline px-4">
              <Search size={18} className="text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) results[0].run();
                  if (e.key === "Escape") close();
                }}
                placeholder="Search everything or type an action…"
                className="h-14 flex-1 bg-transparent text-[17px] outline-none"
              />
              <button aria-label="Close search" onClick={close}>
                <X size={18} className="text-muted" />
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {results.length === 0 && <div className="p-6 text-center text-muted">No results</div>}
              {results.map((r, i) => (
                <motion.button key={r.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.015 }} onClick={() => (feedback("tap"), r.run())} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-hairline">
                  <span className="text-xl">{r.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{r.title}</span>
                    <span className="block truncate text-[12px] text-muted">{r.sub}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Dynamic-Island toasts ---------------- */
function Toaster() {
  const list = useStore(toasts, []);
  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-2 z-[60] flex flex-col items-center gap-2">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: -30, scale: 0.6, borderRadius: 40 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.7 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="pointer-events-auto flex items-center gap-3 rounded-full bg-black px-4 py-2.5 text-[14px] font-medium text-white shadow-2xl">
            {t.emoji && <span className="text-lg">{t.emoji}</span>}
            <span>{t.message}</span>
            {t.undo && (
              <button
                className="font-semibold text-[#64d2ff]"
                onClick={() => {
                  t.undo?.();
                  feedback("tap");
                  dismissToast(t.id);
                }}
              >
                Undo
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Live Activity (focus timer banner) ---------------- */
export const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function LiveActivity() {
  const f = useStore(focusStore);
  const pathname = usePathname();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!f.running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [f.running]);

  const remaining = focusRemaining(f, now);
  useEffect(() => {
    if (!f.running || remaining > 0) return;
    // finished
    const wasFocus = f.phase === "focus";
    const minutes = Math.round(f.total / 60_000);
    focusActions.reset();
    play("alarm");
    if (wasFocus) {
      void add("focus", { date: todayIso(), minutes, label: f.label });
      confetti();
      toast(`${minutes} min focus complete!`, { emoji: "🎉", ms: 5000 });
    } else toast("Break over — ready?", { emoji: "☕" });
    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker?.ready.then((r) => r.showNotification(wasFocus ? "Focus complete 🎉" : "Break over", { body: wasFocus ? "Time for a short break." : "Let's get back to it.", icon: "/icon-192.png" })).catch(() => {});
    }
  }, [remaining, f]);

  const show = (f.running || (f.remaining < f.total && f.remaining > 0)) && pathname !== "/life/focus/";
  const progress = 1 - remaining / f.total;
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} transition={spring} className="pt-safe fixed inset-x-0 top-2 z-[55] flex justify-center">
          <div className="flex items-center gap-3 rounded-full bg-black py-2 pl-2 pr-4 text-white shadow-2xl">
            <Link href="/life/focus/" className="flex items-center gap-3">
              <svg width="30" height="30" className="-rotate-90">
                <circle cx="15" cy="15" r="12" stroke="#ff375f" strokeOpacity="0.3" strokeWidth="4" fill="none" />
                <circle cx="15" cy="15" r="12" stroke="#ff375f" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={75.4} strokeDashoffset={75.4 * (1 - progress)} />
              </svg>
              <span className="text-[13px] text-white/70">{f.phase === "focus" ? f.label : "Break"}</span>
              <span className="font-semibold tabular-nums">{mmss(remaining)}</span>
            </Link>
            <button aria-label={f.running ? "Pause" : "Resume"} onClick={() => (feedback("tap"), f.running ? focusActions.pause() : focusActions.start())} className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
              {f.running ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- PIN lock ---------------- */
export async function hashPin(pin: string, salt: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${pin}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function LockGate({ children }: { children: ReactNode }) {
  const s = useSettings();
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(0);
  const [sos, setSos] = useState(false);

  useEffect(() => {
    loadSettings().then((st) => {
      let ok = !st.pinHash;
      try {
        ok = ok || sessionStorage.getItem("praxis-unlocked") === "1";
      } catch {}
      setUnlocked(ok);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (pin.length !== 4 || !s.pinHash) return;
    hashPin(pin, s.pinSalt ?? "").then((h) => {
      if (h === s.pinHash) {
        feedback("success");
        try {
          sessionStorage.setItem("praxis-unlocked", "1");
        } catch {}
        setUnlocked(true);
      } else {
        feedback("delete");
        setShake((x) => x + 1);
        setPin("");
      }
    });
  }, [pin, s.pinHash, s.pinSalt]);

  if (!ready) return null;
  if (unlocked || !s.pinHash) return <>{children}</>;
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 px-8">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass grid h-16 w-16 place-items-center rounded-full">
        <Lock />
      </motion.div>
      <div className="text-[20px] font-semibold">Enter passcode</div>
      <motion.div key={shake} animate={shake ? { x: [0, -14, 14, -10, 10, 0] } : {}} transition={{ duration: 0.4 }} className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <motion.span key={i} animate={{ scale: pin.length > i ? 1.15 : 1 }} className={cn("h-3.5 w-3.5 rounded-full border-2 border-fg", pin.length > i && "bg-fg")} />
        ))}
      </motion.div>
      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k) =>
          k === "" ? (
            <span key="blank" />
          ) : (
            <motion.button key={k} whileTap={{ scale: 0.88 }} aria-label={k === "del" ? "Delete" : k} onClick={() => (feedback("tap"), setPin((p) => (k === "del" ? p.slice(0, -1) : (p + k).slice(0, 4))))} className="glass grid h-[72px] w-[72px] place-items-center rounded-full text-[28px] font-light">
              {k === "del" ? <Delete size={22} /> : k}
            </motion.button>
          ),
        )}
      </div>
      <button onClick={() => (feedback("open"), setSos(true))} className="rounded-full bg-bad/15 px-4 py-2 text-[14px] font-semibold text-bad">
        🆘 Emergency · Medical ID
      </button>
      <Sheet open={sos} onClose={() => setSos(false)} title="Medical ID">
        <MedicalIdCard />
      </Sheet>
    </div>
  );
}

/* ---------------- Daily notification digest ---------------- */
function useDailyNotification(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    (async () => {
      const today = todayIso();
      if ((await getKV("notifiedOn", "")) === today) return;
      const [bills, tasks, docs, warranties, dates, maintenance, vehicles, wallet, capsules, medicines, care] = await Promise.all([all("bills"), all("tasks"), all("docs"), all("warranties"), all("dates"), all("maintenance"), all("vehicles"), all("wallet"), all("capsules"), all("medicines"), all("care")]);
      const due = buildReminders({ bills, tasks, docs, warranties, dates, maintenance, vehicles, wallet, capsules, medicines, care }, today, 1, 7);
      await setKV("notifiedOn", today);
      if (!due.length) return;
      const body = due.slice(0, 4).map((r) => `• ${r.title}`).join("\n") + (due.length > 4 ? `\n+${due.length - 4} more` : "");
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) reg.showNotification(`Praxis · ${due.length} things need you`, { body, icon: "/icon-192.png", tag: "daily" });
      else new Notification(`Praxis · ${due.length} things need you`, { body });
    })();
  }, [enabled]);
}

export { saveSettings };
