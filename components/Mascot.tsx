"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { feedback } from "@/lib/sound";

export type MascotMood = "happy" | "cheer" | "sleepy" | "calm" | "worried";

const LINES: Record<MascotMood, string[]> = {
  happy: ["You're doing great!", "Small steps, big wins ✨", "Proud of you today!"],
  cheer: ["Wooo! Everything done! 🎉", "Legendary day!", "Rings closed! You rock!"],
  sleepy: ["Time to wind down… 🌙", "Sleep is a superpower.", "Zzz… rest well."],
  calm: ["Let's start gently ☀️", "One thing at a time.", "Drink some water? 💧"],
  worried: ["Some things are due soon!", "Let's catch up together.", "Don't forget your bills!"],
};

/**
 * "Praxis Companion" — a little anime-style blob companion. Blinks, bobs, reacts to taps,
 * and its mood mirrors your day.
 */
export function Mascot({ mood, size = 76, speak = true }: { mood: MascotMood; size?: number; speak?: boolean }) {
  const [blink, setBlink] = useState(false);
  const [bounce, setBounce] = useState(0);
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3200 + Math.random() * 1500);
    return () => clearInterval(id);
  }, []);

  const lines = LINES[mood];
  const eyesClosed = blink || mood === "sleepy";
  const blush = mood === "happy" || mood === "cheer";

  return (
    <div className="flex items-center gap-3">
      <motion.button
        aria-label="Praxis Companion"
        onClick={() => {
          feedback("success");
          setBounce((b) => b + 1);
          setLine((l) => (l + 1) % lines.length);
        }}
        key={bounce}
        initial={bounce ? { scale: 0.8, rotate: -8 } : false}
        animate={{ scale: 1, rotate: 0, y: [0, -5, 0] }}
        transition={{ y: { repeat: Infinity, duration: mood === "sleepy" ? 4 : 2.4, ease: "easeInOut" }, scale: { type: "spring", stiffness: 500, damping: 12 } }}
        style={{ width: size, height: size }}
        className="shrink-0"
      >
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <defs>
            <radialGradient id="companion-body" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="color-mix(in srgb, var(--accent) 45%, white)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </radialGradient>
          </defs>
          {/* sprout */}
          <motion.path d="M50 18 C 48 8, 40 6, 36 10 C 42 12, 46 14, 50 18 Z" fill="#30d158" animate={{ rotate: [-6, 6, -6] }} style={{ originX: "50px", originY: "18px" }} transition={{ repeat: Infinity, duration: 2.5 }} />
          <path d="M50 18 L50 24" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" />
          {/* body */}
          <path d="M50 22 C 78 22, 90 44, 88 64 C 86 84, 70 92, 50 92 C 30 92, 14 84, 12 64 C 10 44, 22 22, 50 22 Z" fill="url(#companion-body)" />
          <ellipse cx="34" cy="38" rx="9" ry="5" fill="white" opacity="0.6" />
          {/* eyes */}
          {eyesClosed ? (
            <>
              <path d="M30 58 Q36 62 42 58" stroke="#1c1c1e" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M58 58 Q64 62 70 58" stroke="#1c1c1e" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : mood === "cheer" ? (
            <>
              <path d="M30 60 Q36 52 42 60" stroke="#1c1c1e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M58 60 Q64 52 70 60" stroke="#1c1c1e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <ellipse cx="36" cy="58" rx="6" ry="8" fill="#1c1c1e" />
              <ellipse cx="64" cy="58" rx="6" ry="8" fill="#1c1c1e" />
              <circle cx="38" cy="55" r="2.4" fill="white" />
              <circle cx="66" cy="55" r="2.4" fill="white" />
              <circle cx="34" cy="61" r="1.2" fill="white" />
              <circle cx="62" cy="61" r="1.2" fill="white" />
            </>
          )}
          {blush && (
            <>
              <ellipse cx="25" cy="70" rx="6" ry="3.5" fill="#ff375f" opacity="0.35" />
              <ellipse cx="75" cy="70" rx="6" ry="3.5" fill="#ff375f" opacity="0.35" />
            </>
          )}
          {/* mouth */}
          {mood === "worried" ? (
            <path d="M44 76 Q50 71 56 76" stroke="#1c1c1e" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : mood === "sleepy" ? (
            <ellipse cx="50" cy="75" rx="3" ry="2.5" fill="#1c1c1e" />
          ) : (
            <path d={mood === "cheer" ? "M42 70 Q50 82 58 70 Z" : "M44 71 Q50 77 56 71"} stroke="#1c1c1e" strokeWidth="3" fill={mood === "cheer" ? "#ff6b81" : "none"} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {mood === "sleepy" && (
            <motion.text x="78" y="26" fontSize="14" fontWeight="700" fill="var(--muted)" animate={{ opacity: [0, 1, 0], y: [30, 18, 8] }} transition={{ repeat: Infinity, duration: 2.6 }}>
              z
            </motion.text>
          )}
        </svg>
      </motion.button>
      {speak && (
        <motion.div key={`${mood}-${line}`} initial={{ opacity: 0, x: -6, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} className="glass relative rounded-2xl rounded-bl-md px-3 py-2 text-[14px] font-medium">
          {lines[line % lines.length]}
        </motion.div>
      )}
    </div>
  );
}
