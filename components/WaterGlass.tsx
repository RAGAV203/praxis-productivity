"use client";

import { motion } from "motion/react";

export function WaterGlass({ value, size = 64 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative overflow-hidden rounded-b-[18px] rounded-t-md border-2 border-[#64d2ff]/60" style={{ width: size * 0.75, height: size }}>
      <motion.div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a84ff] to-[#64d2ff]" initial={{ height: 0 }} animate={{ height: `${v * 100}%` }} transition={{ type: "spring", stiffness: 60, damping: 14 }}>
        <motion.svg viewBox="0 0 120 10" preserveAspectRatio="none" className="absolute -top-2 left-0 h-3 w-[200%] fill-[#64d2ff]" animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}>
          <path d="M0 5 Q15 0 30 5 T60 5 T90 5 T120 5 V10 H0 Z" />
        </motion.svg>
      </motion.div>
    </div>
  );
}
