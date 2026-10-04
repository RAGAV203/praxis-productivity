import { describe, expect, it } from "vitest";
import type { Base, Bill, Doc, ImportantDate, Medicine, Task } from "@/lib/db";
import { buildReminders, dueLabel, nextAnnual } from "@/lib/reminders";

const base: Base = { id: "x", createdAt: 0, updatedAt: 0, deletedAt: null };

describe("reminders", () => {
  it("finds the next anniversary", () => {
    expect(nextAnnual("1990-12-25", "2026-03-01")).toBe("2026-12-25");
    expect(nextAnnual("1990-01-05", "2026-03-01")).toBe("2027-01-05");
    expect(nextAnnual("1990-03-01", "2026-03-01")).toBe("2026-03-01");
  });
  it("merges sources, respects horizons, skips deleted and done, sorts by urgency", () => {
    const bills: Bill[] = [
      { ...base, id: "b1", name: "Rent", amount: 1, category: "Rent", kind: "bill", nextDue: "2026-03-03", rule: { freq: "monthly", interval: 1 } },
      { ...base, id: "b2", name: "Far", amount: 1, category: "Bills", kind: "bill", nextDue: "2026-04-30", rule: { freq: "monthly", interval: 1 } },
      { ...base, id: "b3", name: "Deleted", amount: 1, category: "Bills", kind: "bill", nextDue: "2026-03-02", rule: { freq: "monthly", interval: 1 }, deletedAt: 5 },
    ];
    const tasks: Task[] = [
      { ...base, id: "t1", title: "Overdue", due: "2026-02-27", done: false, priority: "med" },
      { ...base, id: "t2", title: "Done", due: "2026-03-01", done: true, priority: "med" },
    ];
    const docs: Doc[] = [{ ...base, id: "d1", title: "Passport", type: "Passport", expiryDate: "2026-03-25" }];
    const dates: ImportantDate[] = [{ ...base, id: "i1", title: "Mom bday", kind: "birthday", date: "1960-03-10" }];
    const medicines: Medicine[] = [{ ...base, id: "m1", name: "Vit D", times: ["09:00"], active: true, stock: 3, perDose: 1 }];
    const out = buildReminders({ bills, tasks, docs, dates, medicines }, "2026-03-01");
    // medicine refill uses days of stock left (3) as its urgency
    expect(out.map((r) => r.id)).toEqual(["task-t1", "bill-b1", "med-m1", "date-i1", "doc-d1"]);
    expect(out[0].daysLeft).toBe(-2);
  });
  it("labels due dates", () => {
    expect(dueLabel(-3)).toBe("3 days overdue");
    expect(dueLabel(0)).toBe("Today");
    expect(dueLabel(1)).toBe("Tomorrow");
    expect(dueLabel(5)).toBe("In 5 days");
  });
});
