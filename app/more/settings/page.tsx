"use client";

import { motion } from "motion/react";
import { Check, Download, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mascot } from "@/components/Mascot";
import { hashPin } from "@/components/Shell";
import { Btn, Card, PageHeader, Segmented, SectionTitle, Sheet, Toggle } from "@/components/ui";
import { downloadBackup, eraseEverything, restoreBackup } from "@/lib/backup";
import { confetti } from "@/lib/confetti";
import { ago } from "@/lib/format";
import { ACCENTS, saveSettings, useSettings } from "@/lib/settings";
import { feedback, play, type SoundName } from "@/lib/sound";
import { toast } from "@/lib/store";
import { MODULES } from "@/lib/nav";
import { ArrowUp, X } from "lucide-react";

function Row({ label, sub, children }: { label: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline py-3 last:border-0">
      <div className="min-w-0">
        <div className="text-[16px]">{label}</div>
        {sub && <div className="text-[13px] text-muted">{sub}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [erase, setErase] = useState(false);
  const [eraseText, setEraseText] = useState("");
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState<string>("default");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // browser-only APIs: read after mount so the static HTML matches hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  return (
    <div>
      <PageHeader title="Settings" back />

      <Card strong className="flex items-center gap-3">
        <Mascot mood="happy" speak={false} size={60} />
        <div className="flex-1">
          <input className="field" placeholder="Your name" defaultValue={s.name} key={s.name} onBlur={(e) => saveSettings({ name: e.target.value.trim() })} aria-label="Your name" />
        </div>
      </Card>

      <SectionTitle>Appearance</SectionTitle>
      <Card>
        <Segmented id="theme" value={s.theme} onChange={(v) => saveSettings({ theme: v })} options={[{ value: "auto", label: "Auto" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        <div className="mt-4 flex flex-wrap gap-3">
          {ACCENTS.map((c) => (
            <motion.button key={c} whileTap={{ scale: 0.85 }} aria-label={`Accent ${c}`} onClick={() => (feedback("tap"), saveSettings({ accent: c }))} className="grid h-10 w-10 place-items-center rounded-full" style={{ background: c, boxShadow: s.accent === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : undefined }}>
              {s.accent === c && <Check size={18} color="white" />}
            </motion.button>
          ))}
        </div>
        <Row label="Text size" sub="Scales the whole app">
          <div className="w-44">
            <Segmented id="textscale" value={String(s.textScale)} onChange={(v) => saveSettings({ textScale: Number(v) })} options={[{ value: "0.9", label: "A" }, { value: "1", label: "A" }, { value: "1.1", label: "A" }, { value: "1.2", label: "A" }].map((o, i) => ({ ...o, label: <span style={{ fontSize: 11 + i * 2 }}>A</span> }))} />
          </div>
        </Row>
        <Row label="Praxis Companion" sub="Animated mascot on Today">
          <Toggle checked={s.mascot} onChange={(v) => saveSettings({ mascot: v })} />
        </Row>
      </Card>

      <SectionTitle>Sounds & haptics</SectionTitle>
      <Card>
        <Row label="Sound effects" sub="Muted automatically in Sleep focus">
          <Toggle checked={s.sound} onChange={(v) => saveSettings({ sound: v })} />
        </Row>
        <Row label="Volume">
          <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => saveSettings({ volume: Number(e.target.value) })} onMouseUp={() => play("success")} onTouchEnd={() => play("success")} style={{ accentColor: "var(--accent)" }} aria-label="Volume" />
        </Row>
        <Row label="Haptics" sub="Vibration on supported Android devices">
          <Toggle checked={s.haptics} onChange={(v) => saveSettings({ haptics: v })} />
        </Row>
        <div className="flex flex-wrap gap-2 pt-3">
          {(["tap", "success", "complete", "water", "levelup", "alarm"] as SoundName[]).map((n) => (
            <button key={n} onClick={() => play(n)} className="rounded-full bg-hairline px-3 py-1.5 text-[13px] font-medium">
              ▶ {n}
            </button>
          ))}
        </div>
      </Card>

      <SectionTitle>Goals & features</SectionTitle>
      <Card>
        <Row label="Daily water goal" sub="ml">
          <input className="field w-24 py-2! text-right" type="number" defaultValue={s.waterGoal} key={s.waterGoal} onBlur={(e) => saveSettings({ waterGoal: Number(e.target.value) || 2500 })} aria-label="Water goal" />
        </Row>
        <Row label="Daily move goal" sub="active minutes">
          <input className="field w-24 py-2! text-right" type="number" defaultValue={s.workoutGoal} key={s.workoutGoal} onBlur={(e) => saveSettings({ workoutGoal: Number(e.target.value) || 30 })} aria-label="Move goal" />
        </Row>
        <Row label="Currency">
          <select className="field py-2!" value={s.currency} onChange={(e) => saveSettings({ currency: e.target.value })} aria-label="Currency">
            {["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Row>
        <Row label="Daily step goal">
          <input className="field w-24 py-2! text-right" type="number" defaultValue={s.stepGoal} key={s.stepGoal} onBlur={(e) => saveSettings({ stepGoal: Number(e.target.value) || 8000 })} aria-label="Step goal" />
        </Row>
        <Row label="Weather on Today" sub="Free Open-Meteo forecast. The only feature that goes online">
          <Toggle checked={s.weather} onChange={(v) => saveSettings({ weather: v })} />
        </Row>
        <Row label="Cycle tracking" sub="Shows the Cycle module in Health">
          <Toggle checked={s.cycleTracking} onChange={(v) => saveSettings({ cycleTracking: v })} />
        </Row>
      </Card>

      <div id="modules" />
      <SectionTitle>Favorites</SectionTitle>
      <Card>
        <p className="mb-2 text-[13px] text-muted">Shown as an app dock on Today. Tip: long-press any tile in a hub to pin it.</p>
        {s.favorites.length === 0 && <p className="py-2 text-muted">No favorites yet.</p>}
        {s.favorites.map((href, i) => {
          const m = MODULES.find((x) => x.href === href);
          if (!m) return null;
          return (
            <div key={href} className="flex items-center gap-3 border-b border-hairline py-2 last:border-0">
              <span className="text-xl">{m.emoji}</span>
              <span className="flex-1">{m.title}</span>
              {i > 0 && (
                <button aria-label="Move up" onClick={() => { const f = [...s.favorites]; [f[i - 1], f[i]] = [f[i], f[i - 1]]; void saveSettings({ favorites: f }); }} className="text-muted">
                  <ArrowUp size={16} />
                </button>
              )}
              <button aria-label="Remove" onClick={() => saveSettings({ favorites: s.favorites.filter((x) => x !== href) })} className="text-muted">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </Card>

      <SectionTitle>Modules</SectionTitle>
      <Card>
        <p className="mb-2 text-[13px] text-muted">Hide what you don&apos;t use. Hidden modules keep their data and can be turned back on anytime.</p>
        {(["money", "health", "life", "more"] as const).map((tab) => (
          <div key={tab}>
            <div className="mb-1 mt-3 text-[12px] font-semibold uppercase text-muted">{tab}</div>
            {MODULES.filter((m) => m.tab === tab && m.href !== "/more/settings/").map((m) => (
              <Row key={m.href} label={<span>{m.emoji} {m.title}</span>}>
                <Toggle checked={!s.hiddenModules.includes(m.href)} onChange={(v) => saveSettings({ hiddenModules: v ? s.hiddenModules.filter((x) => x !== m.href) : [...s.hiddenModules, m.href] })} />
              </Row>
            ))}
          </div>
        ))}
      </Card>

      <SectionTitle>Notifications</SectionTitle>
      <Card>
        <Row label="Daily digest" sub={perm === "denied" ? "Blocked in browser settings" : "Shows what's due when you open the app, and alerts when focus timers end"}>
          <Toggle
            checked={s.notifications && perm === "granted"}
            onChange={async (v) => {
              if (v && typeof Notification !== "undefined") {
                const p = await Notification.requestPermission();
                setPerm(p);
                if (p !== "granted") return toast("Permission not granted", { emoji: "🔕" });
              }
              await saveSettings({ notifications: v });
            }}
          />
        </Row>
        <p className="pt-2 text-[12px] text-muted">On iPhone, notifications work after you add Praxis to your Home Screen (iOS 16.4+).</p>
      </Card>

      <SectionTitle>Privacy</SectionTitle>
      <Card>
        <Row label="Passcode lock" sub={s.pinHash ? "On. Asked once per session" : "Off"}>
          {s.pinHash ? (
            <Btn variant="danger" className="px-3 py-1.5 text-[14px]" onClick={() => (saveSettings({ pinHash: undefined, pinSalt: undefined }), toast("Passcode removed", { emoji: "🔓" }))}>
              Remove
            </Btn>
          ) : (
            <Btn variant="soft" className="px-3 py-1.5 text-[14px]" onClick={() => (setPin(""), setPinOpen(true))}>
              Set
            </Btn>
          )}
        </Row>
        <p className="pt-2 text-[12px] text-muted">All data stays on this device in your browser&apos;s private storage. Nothing is uploaded.</p>
      </Card>

      <div id="backup" />
      <SectionTitle>Backup</SectionTitle>
      <Card>
        <div className="mb-3 text-[14px] text-muted">{s.lastBackup ? `Last backup ${ago(s.lastBackup)}` : "Never backed up. Clearing browser data would erase everything."}</div>
        <div className="flex gap-2">
          <Btn
            full
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await downloadBackup();
                toast("Backup downloaded", { emoji: "🛟" });
              } finally {
                setBusy(false);
              }
            }}
          >
            <Download size={17} /> Export
          </Btn>
          <Btn full variant="glass" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload size={17} /> Restore
          </Btn>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            try {
              await restoreBackup(f);
              confetti();
              toast("Backup restored", { emoji: "✅" });
            } catch (err) {
              toast(err instanceof Error ? err.message : "Restore failed", { emoji: "⚠️", ms: 5000 });
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>

      <SectionTitle>App</SectionTitle>
      <Card>
        <Row label="Install on your phone" sub={installed ? "Installed ✓" : "iPhone: Share → Add to Home Screen. Android: menu → Install app."} />
        <Row label="Demo data" sub="Fill the app with sample entries">
          <Btn
            variant="soft"
            className="px-3 py-1.5 text-[14px]"
            onClick={async () => {
              const { seedDemo } = await import("@/lib/seed");
              await seedDemo();
              confetti();
              toast("Demo data added", { emoji: "✨" });
            }}
          >
            Add
          </Btn>
        </Row>
        <Row label={<span className="text-bad">Erase all data</span>}>
          <Btn variant="danger" className="px-3 py-1.5 text-[14px]" onClick={() => (setEraseText(""), setErase(true))}>
            Erase
          </Btn>
        </Row>
      </Card>
      <p className="mt-6 text-center text-[12px] text-muted">Praxis · private, offline, yours.</p>

      <Sheet
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title="Set a 4-digit passcode"
        footer={
          <Btn
            full
            disabled={pin.length !== 4}
            onClick={async () => {
              const salt = crypto.getRandomValues(new Uint32Array(2)).join("-");
              await saveSettings({ pinHash: await hashPin(pin, salt), pinSalt: salt });
              try {
                sessionStorage.setItem("praxis-unlocked", "1");
              } catch {}
              setPinOpen(false);
              toast("Passcode set", { emoji: "🔒" });
            }}
          >
            Save passcode
          </Btn>
        }
      >
        <input autoFocus className="field text-center text-3xl tracking-[0.6em]" inputMode="numeric" maxLength={4} type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} aria-label="Passcode" />
        <p className="mt-2 text-center text-[13px] text-muted">If you forget it, you&apos;ll need to clear site data (and restore from a backup).</p>
      </Sheet>

      <Sheet
        open={erase}
        onClose={() => setErase(false)}
        title="Erase everything?"
        footer={
          <Btn
            full
            variant="danger"
            disabled={eraseText !== "ERASE"}
            onClick={async () => {
              await eraseEverything();
              window.location.replace(window.location.origin);
            }}
          >
            Permanently erase
          </Btn>
        }
      >
        <p className="mb-3 text-[15px]">This deletes all your data on this device and can&apos;t be undone. Export a backup first if you might need it.</p>
        <input className="field" placeholder="Type ERASE to confirm" value={eraseText} onChange={(e) => setEraseText(e.target.value)} aria-label="Type ERASE to confirm" />
      </Sheet>
    </div>
  );
}
