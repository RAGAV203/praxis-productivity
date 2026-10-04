"use client";

import { db } from "./db";
import { add, update } from "./data";

/** Steps are stored as a "steps" body metric, one row per day. */
export async function setSteps(date: string, count: number, mode: "replace" | "add" | "max" = "replace") {
  const n = Math.max(0, Math.round(count));
  const existing = (await db.metrics.where("date").equals(date).toArray()).find((m) => m.type === "steps" && !m.deletedAt);
  if (existing) {
    const value = mode === "add" ? existing.value + n : mode === "max" ? Math.max(existing.value, n) : n;
    await update("metrics", existing.id, { value });
    return value;
  }
  await add("metrics", { date, type: "steps", value: n });
  return n;
}

export async function stepsOn(date: string): Promise<number> {
  const m = (await db.metrics.where("date").equals(date).toArray()).find((x) => x.type === "steps" && !x.deletedAt);
  return m?.value ?? 0;
}

/**
 * Accelerometer step detector (works while the page is open and the screen is on).
 * Low-pass filters acceleration magnitude and counts peaks with a refractory gap.
 * This is pure logic, so it's unit tested; the browser listener lives in StepCounter.
 */
export class StepDetector {
  private avg = 9.81;
  private above = false;
  private lastStep = 0;
  constructor(
    private threshold = 1.2, // m/s² above the running average
    private minGapMs = 280, // max ~3.5 steps/s
  ) {}

  /** Feed one sample; returns true when a step is detected. */
  push(x: number, y: number, z: number, t: number): boolean {
    const mag = Math.sqrt(x * x + y * y + z * z);
    this.avg = this.avg * 0.95 + mag * 0.05;
    const delta = mag - this.avg;
    if (!this.above && delta > this.threshold) {
      this.above = true;
      if (t - this.lastStep >= this.minGapMs) {
        this.lastStep = t;
        return true;
      }
    } else if (this.above && delta < this.threshold * 0.4) {
      this.above = false;
    }
    return false;
  }
}

/** iOS 13+ needs an explicit permission prompt from a user gesture. */
export async function requestMotionPermission(): Promise<boolean> {
  const DME = (typeof window !== "undefined" ? window.DeviceMotionEvent : undefined) as unknown as { requestPermission?: () => Promise<string> } | undefined;
  if (!DME) return false;
  if (typeof DME.requestPermission === "function") {
    try {
      return (await DME.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true;
}
