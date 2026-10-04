import { describe, expect, it } from "vitest";
import { guessAisle } from "@/lib/aisles";
import { sleepMinutes, sleepScore } from "@/lib/sleep";

describe("aisles", () => {
  it("auto-categorises grocery items", () => {
    expect(guessAisle("Amul Milk")).toBe("Dairy & Eggs");
    expect(guessAisle("tomatoes")).toBe("Produce");
    expect(guessAisle("Basmati rice 5kg")).toBe("Grains & Pulses");
    expect(guessAisle("Surf detergent")).toBe("Household");
    expect(guessAisle("mystery item")).toBe("Other");
  });
});

describe("sleep", () => {
  it("handles midnight crossover", () => {
    expect(sleepMinutes("23:00", "07:00")).toBe(480);
    expect(sleepMinutes("01:30", "08:00")).toBe(390);
  });
  it("scores a great night at 100 and a short late night low", () => {
    expect(sleepScore("22:30", "06:30", 5)).toBe(100);
    expect(sleepScore("03:00", "07:00", 2)).toBeLessThan(40);
  });
});
