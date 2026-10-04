import { describe, expect, it } from "vitest";
import { amortization, emi, loanStatus, monthlyNeeded, yearlyCost } from "@/lib/finance";

describe("finance", () => {
  it("computes EMI like bank calculators", () => {
    // 10L @ 8.5% for 20y ≈ ₹8,678
    expect(Math.round(emi(1_000_000, 8.5, 240))).toBe(8678);
    expect(emi(12000, 0, 12)).toBe(1000);
    expect(emi(1000, 10, 0)).toBe(0);
  });
  it("amortization ends at zero and sums to principal", () => {
    const rows = amortization(500_000, 9, 60, "2026-01-05");
    expect(rows).toHaveLength(60);
    expect(rows[59].balance).toBeCloseTo(0, 2);
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBeCloseTo(500_000, 2);
    expect(rows[0].month).toBe("Jan 2026");
  });
  it("tracks loan status by date", () => {
    const st = loanStatus(500_000, 9, 60, "2026-01-05", "2026-03-20");
    expect(st.paidCount).toBe(3);
    expect(st.remainingMonths).toBe(57);
    expect(st.balance).toBeLessThan(500_000);
    expect(loanStatus(500_000, 9, 60, "2026-06-01", "2026-03-01").paidCount).toBe(0);
  });
  it("monthly savings needed", () => {
    expect(monthlyNeeded(120_000, 0, "2026-01-01", "2027-01-01")).toBe(10_000);
    expect(monthlyNeeded(100, 200, "2026-01-01", "2026-06-01")).toBe(0);
    expect(monthlyNeeded(100, 0, "2026-01-01")).toBeNull();
  });
  it("annualises recurring costs", () => {
    expect(yearlyCost(649, "monthly", 1)).toBe(7788);
    expect(yearlyCost(1200, "monthly", 6)).toBe(2400);
    expect(yearlyCost(500, "none", 1)).toBe(0);
  });
});
