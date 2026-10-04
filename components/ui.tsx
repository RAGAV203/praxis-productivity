"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/format";
import { feedback } from "@/lib/sound";

const noopSubscribe = () => () => {};

export const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

/* ---------------- Card ---------------- */
export function Card({ children, className, onClick, href, strong }: { children: ReactNode; className?: string; onClick?: () => void; href?: string; strong?: boolean }) {
  const cls = cn(strong ? "glass-strong" : "glass", "rounded-[26px] p-4 block", className);
  const press = onClick || href ? { whileTap: { scale: 0.97 } } : {};
  if (href)
    return (
      <motion.div {...press} transition={spring}>
        <Link href={href} className={cls} onClick={() => feedback("tap")}>
          {children}
        </Link>
      </motion.div>
    );
  return (
    <motion.div {...press} transition={spring} className={cls} onClick={onClick ? () => (feedback("tap"), onClick()) : undefined} role={onClick ? "button" : undefined}>
      {children}
    </motion.div>
  );
}

/* ---------------- Buttons ---------------- */
type BtnVariant = "primary" | "soft" | "ghost" | "danger" | "glass";
export function Btn({ children, onClick, variant = "primary", className, type = "button", disabled, sound = "tap", full }: { children: ReactNode; onClick?: () => void; variant?: BtnVariant; className?: string; type?: "button" | "submit"; disabled?: boolean; sound?: Parameters<typeof feedback>[0] | null; full?: boolean }) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-accent text-white shadow-lg shadow-accent/25",
    soft: "bg-accent/12 text-accent",
    ghost: "text-accent",
    danger: "bg-bad/12 text-bad",
    glass: "glass text-fg",
  };
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      transition={spring}
      onClick={() => {
        if (sound) feedback(sound);
        onClick?.();
      }}
      className={cn("inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold disabled:opacity-40", styles[variant], full && "w-full", className)}
    >
      {children}
    </motion.button>
  );
}

export function IconBtn({ children, onClick, label, className }: { children: ReactNode; onClick?: () => void; label: string; className?: string }) {
  return (
    <motion.button whileTap={{ scale: 0.88 }} transition={spring} aria-label={label} title={label} onClick={() => (feedback("tap"), onClick?.())} className={cn("glass grid h-10 w-10 place-items-center rounded-full text-fg", className)}>
      {children}
    </motion.button>
  );
}

/* ---------------- Page header with large → compact title ---------------- */
export function PageHeader({ title, subtitle, back, actions }: { title: string; subtitle?: ReactNode; back?: boolean; actions?: ReactNode }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 48);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <div className="pt-safe sticky top-0 z-30 -mx-4 px-4">
        <div className={cn("flex h-14 items-center gap-2 transition-all duration-300", scrolled && "glass-strong -mx-4 rounded-b-3xl px-4")}>
          {back && (
            <IconBtn label="Back" onClick={() => router.back()}>
              <ChevronLeft size={20} />
            </IconBtn>
          )}
          <AnimatePresence>
            {scrolled && (
              <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex-1 truncate text-center text-[17px] font-semibold">
                {title}
              </motion.span>
            )}
          </AnimatePresence>
          {!scrolled && <span className="flex-1" />}
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mb-4 mt-1">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[15px] text-muted">{subtitle}</div>}
      </motion.div>
    </>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[20px] font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/* ---------------- Bottom sheet ---------------- */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useEffect(() => {
    if (!open) return;
    feedback("open");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label={title}
            className="glass-strong relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[32px] sm:rounded-[32px]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            onDragEnd={(_, i: PanInfo) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
          >
            <SheetGrabber />
            <div className="flex items-center justify-between px-5 pb-2">
              <h3 className="text-[19px] font-semibold">{title}</h3>
              <IconBtn label="Close" onClick={onClose} className="h-8 w-8">
                <X size={16} />
              </IconBtn>
            </div>
            <div className="overflow-y-auto px-5 pb-4">{children}</div>
            {footer && <div className="pb-safe px-5 pb-4 pt-2">{footer}</div>}
            {!footer && <div className="pb-safe" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SheetGrabber() {
  return <div className="mx-auto mb-2 mt-2.5 h-1.5 w-10 rounded-full bg-faint/60" />;
}

/* ---------------- Controls ---------------- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => (feedback("toggle"), onChange(!checked))} className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300", checked ? "bg-good" : "bg-faint/40")}>
      <motion.span layout transition={spring} className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md" style={{ left: checked ? 22 : 2 }} />
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; id: string }) {
  return (
    <div className="glass flex rounded-full p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => (feedback("tap"), onChange(o.value))} className={cn("relative flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors", value === o.value ? "text-fg" : "text-muted")}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-full bg-[var(--glass-strong)] shadow-sm" />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Chip({ children, active, onClick, color }: { children: ReactNode; active?: boolean; onClick?: () => void; color?: string }) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={() => (feedback("tap"), onClick?.())} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors", active ? "bg-accent text-white" : "glass text-fg")} style={active && color ? { background: color } : undefined}>
      {children}
    </motion.button>
  );
}

/* ---------------- Ring & progress ---------------- */
export function Ring({ value, size = 64, stroke = 8, color = "var(--accent)", children, track }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; track?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? color} strokeOpacity={track ? 1 : 0.18} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }} transition={{ type: "spring", stiffness: 60, damping: 18 }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = "var(--accent)", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-hairline", className)}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} transition={{ type: "spring", stiffness: 80, damping: 20 }} />
    </div>
  );
}

export function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const ctl = animate(prev.current, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format ? format(v) : Math.round(v).toLocaleString();
      },
    });
    prev.current = value;
    return () => ctl.stop();
  }, [value, format]);
  return <span ref={ref}>{format ? format(value) : Math.round(value).toLocaleString()}</span>;
}

/* ---------------- Swipe row (iOS list gestures) ---------------- */
export function SwipeRow({ children, onDelete, onComplete, completeLabel = "Done", className }: { children: ReactNode; onDelete?: () => void; onComplete?: () => void; completeLabel?: string; className?: string }) {
  const x = useMotionValue(0);
  const leftOpacity = useTransform(x, [0, 70], [0, 1]);
  const rightOpacity = useTransform(x, [-70, 0], [1, 0]);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={spring} className={cn("relative mb-2 overflow-hidden rounded-[22px]", className)}>
      {onComplete && (
        <motion.div style={{ opacity: leftOpacity }} className="absolute inset-0 flex items-center rounded-[22px] bg-good pl-5 font-semibold text-white">
          {completeLabel}
        </motion.div>
      )}
      {onDelete && (
        <motion.div style={{ opacity: rightOpacity }} className="absolute inset-0 flex items-center justify-end rounded-[22px] bg-bad pr-5 font-semibold text-white">
          Delete
        </motion.div>
      )}
      <motion.div
        drag={onDelete || onComplete ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: onDelete ? -140 : 0, right: onComplete ? 140 : 0 }}
        dragElastic={0.2}
        dragSnapToOrigin
        style={{ x }}
        onDragEnd={(_, i) => {
          if (i.offset.x < -100 && onDelete) {
            feedback("delete");
            onDelete();
          } else if (i.offset.x > 100 && onComplete) {
            feedback("complete");
            onComplete();
          }
        }}
        className="glass relative rounded-[22px]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Misc ---------------- */
export function Empty({ emoji, title, hint, action }: { emoji: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass flex flex-col items-center rounded-[26px] px-6 py-10 text-center">
      <motion.div className="text-5xl" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
        {emoji}
      </motion.div>
      <div className="mt-3 text-[17px] font-semibold">{title}</div>
      {hint && <div className="mt-1 max-w-xs text-[14px] text-muted">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

export function Stat({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="glass rounded-[22px] p-3.5">
      <div className="text-[12px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-bold tracking-tight" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[12px] text-muted">{sub}</div>}
    </div>
  );
}

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={{ hidden: { opacity: 0, y: 14, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: spring } }}>
      {children}
    </motion.div>
  );
}
