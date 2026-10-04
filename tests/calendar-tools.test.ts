import { describe, expect, it } from "vitest";
import { annualIn, eventsInRange, occurrences } from "@/lib/calendar";
import type { Base, Bill, ImportantDate, Trip } from "@/lib/db";
import { StepDetector } from "@/lib/steps";
import { generatePassword, passwordStrength, textStats } from "@/lib/timers";

const base: Base = { id: "x", createdAt: 0, updatedAt: 0, deletedAt: null };

describe("calendar", () => {
  it("expands recurring dates inside a range", () => {
    expect(occurrences("2026-01-15", { freq: "monthly", interval: 1 }, "2026-03-01", "2026-05-31")).toEqual(["2026-03-15", "2026-04-15", "2026-05-15"]);
    expect(occurrences("2026-03-10", { freq: "none", interval: 1 }, "2026-03-01", "2026-03-31")).toEqual(["2026-03-10"]);
    expect(occurrences("2026-04-10", { freq: "none", interval: 1 }, "2026-03-01", "2026-03-31")).toEqual([]);
  });
  it("places annual dates in each covered year (Feb 29 → Feb 28 in common years)", () => {
    expect(annualIn("1990-12-31", "2026-12-01", "2027-01-31")).toEqual(["2026-12-31"]);
    expect(annualIn("2000-02-29", "2027-02-01", "2027-03-01")).toEqual(["2027-02-28"]);
  });
  it("collects events from many sources, sorted by date", () => {
    const bills: Bill[] = [{ ...base, id: "b", name: "Rent", amount: 100, category: "Rent", kind: "bill", nextDue: "2026-03-05", rule: { freq: "monthly", interval: 1 } }];
    const dates: ImportantDate[] = [{ ...base, id: "d", title: "Mom", kind: "birthday", date: "1960-03-02" }];
    const trips: Trip[] = [{ ...base, id: "t", name: "Goa", start: "2026-03-20", end: "2026-03-22", itinerary: [], packing: [] }];
    const ev = eventsInRange({ bills, dates, trips }, "2026-03-01", "2026-03-31");
    expect(ev.map((e) => `${e.date}:${e.kind}`)).toEqual(["2026-03-02:Birthday", "2026-03-05:Bill", "2026-03-20:Trip", "2026-03-21:Trip", "2026-03-22:Trip"]);
  });
});

describe("step detector", () => {
  it("counts periodic acceleration peaks as steps and ignores stillness", () => {
    const det = new StepDetector();
    let steps = 0;
    // 10 s of walking at ~2 steps/s (50 Hz samples)
    for (let i = 0; i < 500; i++) {
      const t = i * 20;
      const z = 9.81 + 3 * Math.sin((2 * Math.PI * 2 * t) / 1000);
      if (det.push(0, 0, z, t)) steps++;
    }
    expect(steps).toBeGreaterThanOrEqual(17);
    expect(steps).toBeLessThanOrEqual(21);
    let still = 0;
    for (let i = 0; i < 300; i++) if (det.push(0.02, 0.01, 9.81, 10000 + i * 20)) still++;
    expect(still).toBe(0);
  });
});

describe("toolkit helpers", () => {
  it("generates passwords of the right length containing each chosen class", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword(16, { upper: true, digits: true, symbols: true });
      expect(pw).toHaveLength(16);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/\d/);
      expect(pw).toMatch(/[^a-zA-Z0-9]/);
    }
    expect(generatePassword(8, { upper: false, digits: false, symbols: false })).toMatch(/^[a-z]{8}$/);
  });
  it("rates strength", () => {
    expect(passwordStrength("abc").score).toBe(0);
    expect(passwordStrength("Tr0ub4dor&3-horse-battery").score).toBeGreaterThanOrEqual(3);
  });
  it("counts text", () => {
    expect(textStats("hello world\nsecond line")).toMatchObject({ words: 4, lines: 2, chars: 23 });
    expect(textStats("")).toMatchObject({ words: 0, lines: 0, readMin: 0 });
  });
});
