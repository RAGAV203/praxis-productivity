import { describe, expect, it } from "vitest";
import { dayStreak, habitStreak, longestDayStreak, weekStreak } from "@/lib/streaks";

describe("streaks", () => {
  it("counts consecutive days ending today", () => {
    expect(dayStreak(["2026-03-08", "2026-03-09", "2026-03-10"], "2026-03-10")).toBe(3);
  });
  it("does not break when today is not done yet", () => {
    expect(dayStreak(["2026-03-08", "2026-03-09"], "2026-03-10")).toBe(2);
  });
  it("breaks on a missed day", () => {
    expect(dayStreak(["2026-03-07", "2026-03-09", "2026-03-10"], "2026-03-10")).toBe(2);
    expect(dayStreak(["2026-03-07"], "2026-03-10")).toBe(0);
  });
  it("counts weeks meeting a weekly target", () => {
    // Mon-start weeks in 2026: Mar 2-8, Mar 9-15
    const dates = ["2026-03-02", "2026-03-04", "2026-03-06", "2026-03-09", "2026-03-10", "2026-03-11"];
    expect(weekStreak(dates, 3, "2026-03-11")).toBe(2);
    // current week not yet met → still counts the previous completed week
    expect(weekStreak(dates.slice(0, 4), 3, "2026-03-10")).toBe(1);
    expect(weekStreak(["2026-03-02"], 3, "2026-03-11")).toBe(0);
  });
  it("habitStreak picks daily vs weekly", () => {
    expect(habitStreak(["2026-03-09", "2026-03-10"], 7, "2026-03-10")).toBe(2);
  });
  it("finds the longest run", () => {
    expect(longestDayStreak(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-05", "2026-01-06"])).toBe(3);
    expect(longestDayStreak([])).toBe(0);
  });
});
