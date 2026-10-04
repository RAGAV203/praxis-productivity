import { describe, expect, it } from "vitest";
import { describeRule, nextOccurrence, rollForward } from "@/lib/recurrence";

describe("recurrence", () => {
  it("returns null for one-off rules", () => {
    expect(nextOccurrence("2026-01-10", { freq: "none", interval: 1 })).toBeNull();
    expect(nextOccurrence("2026-01-10", undefined)).toBeNull();
  });
  it("steps by each frequency and interval", () => {
    expect(nextOccurrence("2026-01-10", { freq: "daily", interval: 2 })).toBe("2026-01-12");
    expect(nextOccurrence("2026-01-10", { freq: "weekly", interval: 1 })).toBe("2026-01-17");
    expect(nextOccurrence("2026-01-31", { freq: "monthly", interval: 1 })).toBe("2026-02-28");
    expect(nextOccurrence("2024-02-29", { freq: "yearly", interval: 1 })).toBe("2025-02-28");
    expect(nextOccurrence("2026-01-10", { freq: "monthly", interval: 6 })).toBe("2026-07-10");
  });
  it("treats interval < 1 as 1", () => {
    expect(nextOccurrence("2026-01-10", { freq: "daily", interval: 0 })).toBe("2026-01-11");
  });
  it("rolls forward past a gap", () => {
    expect(rollForward("2026-01-01", { freq: "monthly", interval: 1 }, "2026-04-15")).toBe("2026-05-01");
    expect(rollForward("2026-05-01", { freq: "monthly", interval: 1 }, "2026-04-15")).toBe("2026-05-01");
  });
  it("describes rules", () => {
    expect(describeRule({ freq: "monthly", interval: 1 })).toBe("Every month");
    expect(describeRule({ freq: "weekly", interval: 2 })).toBe("Every 2 weeks");
    expect(describeRule()).toBe("Once");
  });
});
