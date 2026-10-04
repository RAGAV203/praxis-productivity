"use client";

import { motion } from "motion/react";
import { Search, Star } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { MODULES, type ModuleLink, type Tab } from "@/lib/nav";
import { saveSettings, useSettings } from "@/lib/settings";
import { feedback, haptic } from "@/lib/sound";
import { toast } from "@/lib/store";
import { PageHeader, spring } from "./ui";

/** Hidden by preference, or the opt-in cycle tracker. */
export function useVisibleModules() {
  const s = useSettings();
  return MODULES.filter((m) => !s.hiddenModules.includes(m.href) && (m.href !== "/health/cycle/" || s.cycleTracking));
}

export async function toggleFavorite(href: string, favorites: string[]) {
  const on = favorites.includes(href);
  await saveSettings({ favorites: on ? favorites.filter((f) => f !== href) : [...favorites, href] });
  haptic([10, 30, 10]);
  toast(on ? "Removed from Favorites" : "Pinned to Favorites on Today", { emoji: on ? "☆" : "⭐", ms: 1800 });
}

/** App-icon tile: tap opens, long-press pins to Favorites. */
export function ModuleTile({ m, i = 0, compact }: { m: ModuleLink; i?: number; compact?: boolean }) {
  const s = useSettings();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const fav = s.favorites.includes(m.href);
  const start = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      void toggleFavorite(m.href, s.favorites);
    }, 520);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring, delay: Math.min(i, 12) * 0.02 }} whileTap={{ scale: 0.94 }}>
      <Link
        href={m.href}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          if (longPressed.current) {
            e.preventDefault();
            return;
          }
          feedback("tap");
        }}
        className={compact ? "flex w-[68px] flex-col items-center gap-1.5 select-none" : "glass relative flex h-full flex-col gap-2 rounded-[24px] p-3.5 select-none"}
        style={{ WebkitTouchCallout: "none" }}
      >
        <span className={compact ? "grid h-[58px] w-[58px] place-items-center rounded-[18px] text-[28px] shadow-sm" : "grid h-11 w-11 place-items-center rounded-[14px] text-[22px]"} style={{ background: compact ? `linear-gradient(145deg, color-mix(in srgb, ${m.color} 35%, transparent), color-mix(in srgb, ${m.color} 15%, transparent))` : `color-mix(in srgb, ${m.color} 20%, transparent)` }}>
          {m.emoji}
        </span>
        {compact ? (
          <span className="w-full truncate text-center text-[11px] font-medium">{m.title}</span>
        ) : (
          <span>
            <span className="block text-[15px] font-semibold leading-tight">{m.title}</span>
            <span className="block text-[12px] text-muted">{m.desc}</span>
          </span>
        )}
        {fav && !compact && <Star size={12} className="absolute right-3 top-3 fill-warn text-warn" />}
      </Link>
    </motion.div>
  );
}

export function Hub({ tab, title, subtitle, children }: { tab: Tab; title: string; subtitle?: ReactNode; children?: ReactNode }) {
  const visible = useVisibleModules();
  const [q, setQ] = useState("");
  const mods = visible.filter((m) => m.tab === tab && (!q || `${m.title} ${m.desc} ${m.keywords ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const groups = [...new Set(mods.map((m) => m.group))];
  let i = 0;
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      {children}
      <div className="glass mt-4 flex items-center gap-2 rounded-full px-4">
        <Search size={16} className="text-muted" />
        <input className="h-11 flex-1 bg-transparent text-[16px] outline-none" placeholder={`Search ${title.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${title}`} />
      </div>
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-2 mt-5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{g}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {mods
              .filter((m) => m.group === g)
              .map((m) => (
                <ModuleTile key={m.href} m={m} i={i++} />
              ))}
          </div>
        </section>
      ))}
      {mods.length === 0 && <p className="mt-6 text-center text-muted">No matches</p>}
      <p className="mt-6 text-center text-[12px] text-muted">
        Long-press a tile to pin it to Today ·{" "}
        <Link href="/more/settings/#modules" className="text-accent">
          Customize
        </Link>
      </p>
    </div>
  );
}
