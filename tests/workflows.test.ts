import { describe, expect, it } from "vitest";
import { compare, describeTrigger, eventMatches, fillTemplate, fromTemplate, STEPS, TEMPLATES, timeTriggerDue, toNumber, stepDef } from "@/lib/workflows";

describe("workflow variables", () => {
  it("fills {{vars}} and blanks unknown ones", () => {
    expect(fillTemplate("Hi {{name}}, {{ water }} ml. {{nope}}!", { name: "Alex", water: 750 })).toBe("Hi Alex, 750 ml. !");
    expect(fillTemplate(undefined, {})).toBe("");
  });
  it("parses numbers out of messy text", () => {
    expect(toNumber("₹1,250.50")).toBe(1250.5);
    expect(toNumber("4 🙂")).toBe(4);
    expect(Number.isNaN(toNumber("none"))).toBe(true);
  });
  it("compares numerically when both sides are numbers, else as text", () => {
    expect(compare("2100", ">", "2000")).toBe(true);
    expect(compare("900", ">", "2000")).toBe(false);
    expect(compare("10", "<", "9")).toBe(false); // numeric, not string compare
    expect(compare("Food", "=", "food")).toBe(true);
    expect(compare("Groceries", "contains", "ROC")).toBe(true);
    expect(compare("  ", "empty", "")).toBe(true);
    expect(compare("5", "!=", "5.0")).toBe(false);
  });
});

describe("triggers", () => {
  const t = { type: "time" as const, time: "15:00", days: [1, 2, 3, 4, 5] };
  it("fires once per day after its time on selected days", () => {
    const wedAfter = new Date(2026, 2, 11, 15, 30); // Wed
    expect(timeTriggerDue(t, wedAfter, undefined, "2026-03-11")).toBe(true);
    expect(timeTriggerDue(t, wedAfter, "2026-03-11", "2026-03-11")).toBe(false); // already ran today
    expect(timeTriggerDue(t, new Date(2026, 2, 11, 14, 59), undefined, "2026-03-11")).toBe(false);
    expect(timeTriggerDue(t, new Date(2026, 2, 14, 16, 0), undefined, "2026-03-14")).toBe(false); // Sat
    expect(timeTriggerDue({ type: "manual" }, wedAfter, undefined, "2026-03-11")).toBe(false);
  });
  it("matches events by table and optional condition", () => {
    const big = { type: "event" as const, table: "expenses", field: "amount", op: ">", value: "5000" };
    expect(eventMatches(big, "expenses", { amount: 6000 })).toBe(true);
    expect(eventMatches(big, "expenses", { amount: 400 })).toBe(false);
    expect(eventMatches(big, "water", { amount: 6000 })).toBe(false);
    expect(eventMatches({ type: "event", table: "workouts" }, "workouts", {})).toBe(true);
  });
  it("describes triggers for humans", () => {
    expect(describeTrigger({ type: "time", time: "07:30", days: [0, 1, 2, 3, 4, 5, 6] })).toBe("Every day at 07:30");
    expect(describeTrigger({ type: "time", time: "18:00", days: [0] })).toBe("Sun at 18:00");
    expect(describeTrigger({ type: "open" })).toBe("When Praxis opens");
  });
});

describe("catalog & templates", () => {
  it("every template uses only known step types", () => {
    for (const t of TEMPLATES) for (const s of t.steps) expect(stepDef(s.type), `${t.key}:${s.type}`).toBeTruthy();
  });
  it("step types are unique and have defaults", () => {
    expect(new Set(STEPS.map((s) => s.type)).size).toBe(STEPS.length);
    for (const s of STEPS) expect(typeof s.summary(s.defaults())).toBe("string");
  });
  it("fromTemplate makes independent copies with fresh step ids", () => {
    const a = fromTemplate(TEMPLATES[0]);
    const b = fromTemplate(TEMPLATES[0]);
    expect(a.steps[0].id).not.toBe(b.steps[0].id);
    a.steps[0].params.mode = "changed";
    expect(TEMPLATES[0].steps[0].params.mode).not.toBe("changed");
  });
});
