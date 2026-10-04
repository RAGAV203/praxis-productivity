"use client";

import { addDays, addMonths, format } from "date-fns";
import { guessAisle } from "./aisles";
import { add } from "./data";
import { iso } from "./recurrence";
import { db } from "./db";
import { withEventsMuted } from "./events";
import { TEMPLATES, fromTemplate } from "./workflows";

/** Deterministic pseudo-random so demo data looks the same each time. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export async function seedDemo() {
  return withEventsMuted(seedAll);
}

async function seedAll() {
  const r = rng(42);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const today = new Date();
  const d = (offset: number) => iso(addDays(today, offset));

  await db.transaction("rw", db.tables, async () => {
    // People
    for (const p of [
      { name: "Priya Sharma", relation: "Wife", phone: "9876543210", dob: "1993-03-14", bloodGroup: "B+" },
      { name: "Amma", relation: "Mother", phone: "9845012345", dob: "1962-08-02", bloodGroup: "O+", allergies: "Penicillin" },
      { name: "Arjun", relation: "Son", dob: "2019-11-20", bloodGroup: "B+" },
    ])
      await add("people", p);

    // Expenses (last 75 days)
    const spends: [string, number, number, string][] = [
      ["Food", 120, 650, "Swiggy"],
      ["Groceries", 300, 2200, "BigBasket"],
      ["Transport", 60, 450, "Uber"],
      ["Fuel", 500, 1800, "Petrol"],
      ["Shopping", 400, 3500, "Amazon"],
      ["Entertainment", 150, 900, "Movie"],
      ["Health", 200, 1200, "Pharmacy"],
    ];
    for (let i = 75; i >= 0; i--) {
      const n = r() < 0.3 ? 0 : 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const [cat, lo, hi, note] = pick(spends);
        await add("expenses", { kind: "expense", amount: Math.round(lo + r() * (hi - lo)), category: cat, date: d(-i), mode: pick(["UPI", "UPI", "Card", "Cash"]), note, tags: [] });
      }
    }
    for (let m = 0; m < 3; m++) {
      const day = format(addMonths(today, -m), "yyyy-MM-01");
      await add("expenses", { kind: "income", amount: 145000, category: "Salary", date: day, mode: "Net banking", note: "Salary", tags: [] });
      await add("expenses", { kind: "expense", amount: 28000, category: "Rent", date: day, mode: "UPI", note: "House rent", tags: [] });
    }

    for (const [category, amount] of [["Food", 8000], ["Groceries", 12000], ["Transport", 4000], ["Shopping", 8000], ["Entertainment", 3000], ["Fuel", 5000]] as [string, number][]) await add("budgets", { category, amount });

    await add("bills", { name: "Netflix", amount: 649, category: "Entertainment", kind: "subscription", nextDue: d(3), rule: { freq: "monthly", interval: 1 } });
    await add("bills", { name: "Spotify", amount: 119, category: "Entertainment", kind: "subscription", nextDue: d(12), rule: { freq: "monthly", interval: 1 }, autopay: true });
    await add("bills", { name: "Electricity", amount: 2340, category: "Bills", kind: "bill", nextDue: d(1), rule: { freq: "monthly", interval: 1 } });
    await add("bills", { name: "Broadband", amount: 999, category: "Bills", kind: "bill", nextDue: d(-1), rule: { freq: "monthly", interval: 1 } });
    await add("bills", { name: "Car insurance", amount: 14500, category: "Bills", kind: "bill", nextDue: d(40), rule: { freq: "yearly", interval: 1 } });

    await add("loans", { name: "Home loan", lender: "SBI", principal: 4500000, rate: 8.5, tenureMonths: 240, startDate: iso(addMonths(today, -26)) });
    await add("savings", { name: "Emergency fund", target: 300000, emoji: "🛟", deadline: iso(addMonths(today, 8)), contributions: [{ date: d(-60), amount: 80000 }, { date: d(-30), amount: 25000 }, { date: d(-2), amount: 25000 }] });
    await add("savings", { name: "Japan trip", target: 250000, emoji: "✈️", deadline: iso(addMonths(today, 14)), contributions: [{ date: d(-20), amount: 30000 }] });

    for (const a of [
      { name: "HDFC Savings", side: "asset", type: "Bank", value: 185000 },
      { name: "Nifty 50 Index Fund", side: "asset", type: "Mutual Funds", value: 620000 },
      { name: "EPF", side: "asset", type: "PF / PPF", value: 540000 },
      { name: "Gold", side: "asset", type: "Gold", value: 210000 },
      { name: "Home loan", side: "liability", type: "Home Loan", value: 4180000 },
      { name: "Credit card", side: "liability", type: "Credit Card", value: 23000 },
    ] as const)
      await add("assets", { ...a });
    for (let m = 5; m >= 1; m--) await add("snapshots", { month: format(addMonths(today, -m), "yyyy-MM"), assets: 1400000 + (5 - m) * 35000 + Math.round(r() * 20000), liabilities: 4300000 - (5 - m) * 25000 });

    await add("splits", { person: "Rahul", amount: 1200, note: "Dinner at Toit", date: d(-3) });
    await add("splits", { person: "Sneha", amount: -450, note: "Cab to airport", date: d(-6) });

    // Health
    const habits = [
      { name: "Walk 8k steps", emoji: "🏃", color: "#ff9f0a", perWeek: 7 },
      { name: "Read 20 pages", emoji: "📚", color: "#5e5ce6", perWeek: 7 },
      { name: "Meditate", emoji: "🧘", color: "#30d158", perWeek: 5 },
      { name: "No sugar", emoji: "🚭", color: "#ff375f", perWeek: 7 },
    ];
    for (const h of habits) {
      const id = await add("habits", h);
      for (let i = 60; i >= 1; i--) if (r() < 0.72) await add("habitLogs", { habitId: id, date: d(-i) });
    }
    for (let i = 30; i >= 1; i--) {
      const cups = 5 + Math.floor(r() * 6);
      for (let k = 0; k < cups; k++) await add("water", { date: d(-i), ml: 250, at: addDays(today, -i).getTime() });
      if (r() < 0.6) await add("workouts", { date: d(-i), type: pick(["Walk", "Run", "Gym", "Yoga", "Cycle"]), minutes: 20 + Math.floor(r() * 40), calories: 120 + Math.floor(r() * 300) });
      await add("sleep", { date: d(-i), bed: pick(["22:45", "23:15", "23:40", "00:20", "23:00"]), wake: pick(["06:30", "07:00", "07:15", "06:45"]), quality: 3 + Math.floor(r() * 3) });
      if (r() < 0.8) {
        const v = 2 + Math.floor(r() * 4);
        await add("moods", { date: d(-i), at: addDays(today, -i).getTime(), value: v, feelings: [pick(["Calm", "Happy", "Grateful", "Tired", "Content", "Stressed"])], associations: [pick(["Family", "Work", "Fitness", "Friends", "Health"])] });
      }
      if (i % 4 === 0) await add("metrics", { date: d(-i), type: "weight", value: Math.round((78 - (30 - i) * 0.08 + r() * 0.6) * 10) / 10 });
      if (r() < 0.5) await add("focus", { date: d(-i), minutes: pick([25, 25, 50]), label: "Focus" });
    }
    await add("water", { date: d(0), ml: 750, at: Date.now() });
    await add("medicines", { name: "Vitamin D3", dose: "1 tablet", times: ["09:00"], active: true, stock: 4, perDose: 1 });
    await add("medicines", { name: "BP tablet", dose: "5 mg", times: ["08:00", "20:00"], person: "Amma", active: true, stock: 40, perDose: 1 });
    await add("records", { person: "Amma", type: "Lab report", title: "Lipid profile", date: d(-40), doctor: "Apollo Diagnostics", notes: "LDL slightly high" });
    await add("records", { type: "Vaccination", title: "Flu shot", date: d(-120), doctor: "Dr. Mehta" });

    // Life
    const entries = ["Long walk by the lake with Priya. The sunset was unreal.", "Finished the presentation. Felt proud.", "Arjun learned to ride his cycle today! 🚲", "Lazy Sunday, made dosa for everyone.", "Called Amma. She sounded happy."];
    for (let i = 20; i >= 1; i -= 2) await add("journal", { date: d(-i), text: pick(entries), mood: 3 + Math.floor(r() * 3), gratitude: ["Family", pick(["Good coffee", "Health", "Sunshine"])] });
    await add("journal", { date: iso(addDays(today, -365)), text: "One year ago: first day in the new apartment. Boxes everywhere, pizza on the floor. 🏠", mood: 5 });

    await add("tasks", { title: "Renew passport photos", done: false, priority: "high", due: d(0) });
    await add("tasks", { title: "Water the plants", done: false, priority: "low", due: d(0), rule: { freq: "daily", interval: 2 } });
    await add("tasks", { title: "Book dentist appointment", done: false, priority: "med", due: d(2) });
    await add("tasks", { title: "Pay school fees", done: false, priority: "high", due: d(-1) });

    await add("goals", { title: "Run a 10K", year: today.getFullYear(), area: "Health", milestones: [{ text: "Run 3K without stopping", done: true }, { text: "Run 5K", done: true }, { text: "Run 8K", done: false }, { text: "Race day 10K", done: false }] });
    await add("goals", { title: "Read 12 books", year: today.getFullYear(), area: "Learning", milestones: [{ text: "Q1: 3 books", done: true }, { text: "Q2: 3 books", done: true }, { text: "Q3: 3 books", done: false }, { text: "Q4: 3 books", done: false }] });

    await add("dates", { title: "Priya's birthday", person: "Priya Sharma", kind: "birthday", date: iso(addDays(new Date(1993, today.getMonth(), today.getDate()), 9)), giftIdeas: ["Pottery class", "Kindle"] });
    await add("dates", { title: "Wedding anniversary", kind: "anniversary", date: iso(addDays(new Date(2017, today.getMonth(), today.getDate()), 25)) });
    await add("countdowns", { title: "Goa trip", date: d(18), emoji: "🏖️" });
    await add("countdowns", { title: "Diwali", date: d(32), emoji: "🪔" });

    await add("books", { title: "Atomic Habits", author: "James Clear", status: "done", pages: 320, pagesRead: 320, rating: 5, finishedAt: d(-50), quotes: ["You do not rise to the level of your goals. You fall to the level of your systems."] });
    await add("books", { title: "The Psychology of Money", author: "Morgan Housel", status: "reading", pages: 256, pagesRead: 142 });
    await add("books", { title: "Project Hail Mary", author: "Andy Weir", status: "want", pages: 496, pagesRead: 0 });

    // More
    await add("docs", { title: "Passport", type: "Passport", number: "P1234567", expiryDate: d(25), issueDate: "2016-11-01" });
    await add("docs", { title: "Driving licence", type: "Driving Licence", number: "KA0120160012345", expiryDate: "2036-05-10" });
    await add("docs", { title: "Health insurance", type: "Insurance", number: "HI-998877", expiryDate: d(60) });
    await add("wallet", { name: "Cult.fit", kind: "Gym", number: "CF20231188", color: "#ff375f", expiry: d(90) });
    await add("wallet", { name: "Decathlon", kind: "Loyalty", number: "7788990011223344", color: "#0a84ff" });
    await add("wallet", { name: "City Library", kind: "Library", number: "LIB-55321", color: "#30d158" });
    await add("warranties", { product: "Washing machine", brand: "LG 8kg", purchaseDate: d(-700), warrantyEnd: d(30), price: 32990, store: "Croma" });
    await add("warranties", { product: "MacBook Air", brand: "Apple M3", purchaseDate: d(-200), warrantyEnd: d(165), price: 114900, store: "Apple BKC" });
    const car = await add("vehicles", { name: "Swift", regNo: "KA 01 AB 1234", insuranceExpiry: d(40), pucExpiry: d(9), serviceDue: d(20) });
    let odo = 24100;
    for (let i = 60; i >= 1; i -= 12) {
      odo += 380 + Math.floor(r() * 80);
      await add("vehicleLogs", { vehicleId: car, date: d(-i), kind: "fuel", odometer: odo, litres: 22, amount: 2300 });
    }
    await add("maintenance", { title: "AC service", nextDue: d(5), rule: { freq: "monthly", interval: 6 }, provider: "CoolCare", phone: "9000012345", cost: 1200 });
    await add("maintenance", { title: "RO filter change", nextDue: d(-2), rule: { freq: "monthly", interval: 4 }, cost: 900 });
    await add("maintenance", { title: "Pest control", nextDue: d(45), rule: { freq: "monthly", interval: 3 }, cost: 1500 });
    for (const n of ["Milk", "Bread", "Tomatoes", "Onions", "Paneer", "Rice 5kg", "Detergent", "Bananas"]) await add("grocery", { name: n, aisle: guessAisle(n), done: false, staple: ["Milk", "Bread"].includes(n) });
    await add("pantry", { name: "Curd", qty: "1 tub", expiry: d(1) });
    await add("pantry", { name: "Atta", qty: "3 kg", expiry: d(60) });
    const dal = await add("recipes", { title: "Dal tadka", minutes: 30, tags: ["veg", "quick"], ingredients: ["Toor dal", "Onion", "Tomato", "Garlic", "Jeera", "Ghee"], steps: "Pressure cook dal. Make tadka with ghee, jeera, garlic, onion, tomato. Mix and simmer." });
    await add("recipes", { title: "Paneer butter masala", minutes: 40, tags: ["veg"], ingredients: ["Paneer", "Butter", "Tomato", "Cream", "Cashew", "Kasuri methi"] });
    await add("meals", { date: d(0), slot: "dinner", text: "Dal tadka", recipeId: dal });
    await add("meals", { date: d(1), slot: "lunch", text: "Paneer butter masala" });
    await add("trips", { name: "Goa getaway", destination: "Goa", start: d(18), end: d(22), budget: 40000, itinerary: ["Day 1: Baga beach & sunset", "Day 2: Fort Aguada, Panjim", "Day 3: Dudhsagar falls"], packing: [{ text: "Sunscreen", done: true }, { text: "Swimwear", done: false }, { text: "Charger", done: false }, { text: "Sunglasses", done: true }] });
    await add("notes", { title: "Wi-Fi for guests", body: "Network: Sharma_Home\nPassword: ask Priya 😉", pinned: true, color: "#64d2ff", tags: ["home"] });
    await add("notes", { title: "Gift budget", body: "Priya 3000 + Amma 2000 + Arjun 1500 = 6500", color: "#ffd60a", tags: ["money"] });
    await add("capsules", { title: "To me, next year", body: "I hope you kept running and stayed kind. Remember how scared you were about the new job? Look at you now. ❤️", unlockAt: iso(addMonths(today, 12)) });
    await add("capsules", { title: "A note from last spring", body: "If you're reading this: take a breath. You've got this.", unlockAt: d(-1) });

    // Steps (last 30 days), fasting history, pets & plants, wishlist, workflows, medical ID
    for (let i = 30; i >= 1; i--) await add("metrics", { date: d(-i), type: "steps", value: 3500 + Math.round(r() * 8500) });
    await add("metrics", { date: d(0), type: "steps", value: 4210 });
    for (let i = 6; i >= 1; i -= 2) {
      const start = addDays(today, -i).setHours(20, 0, 0, 0);
      await add("fasts", { start, end: start + (14 + Math.round(r() * 4)) * 3600_000, goalHours: 16 });
    }
    await add("care", { name: "Bruno", kind: "pet", emoji: "🐶", task: "Deworming", nextDue: d(6), rule: { freq: "monthly", interval: 3 } });
    await add("care", { name: "Bruno", kind: "pet", emoji: "🐶", task: "Bath & grooming", nextDue: d(2), rule: { freq: "weekly", interval: 2 } });
    await add("care", { name: "Monstera", kind: "plant", emoji: "🪴", task: "Water", nextDue: d(0), rule: { freq: "daily", interval: 3 } });
    await add("care", { name: "Tulsi", kind: "plant", emoji: "🌿", task: "Water", nextDue: d(1), rule: { freq: "daily", interval: 1 } });
    await add("wishlist", { name: "Noise-cancelling headphones", price: 24990, priority: "high", link: "https://www.example.com" });
    await add("wishlist", { name: "Air fryer", price: 6999, priority: "med" });
    await add("wishlist", { name: "Kindle Paperwhite", price: 13999, priority: "low" });
    for (const key of ["morning", "hydrate", "quickspend", "winddown", "bigspend", "steps"]) {
      const t = TEMPLATES.find((x) => x.key === key);
      if (t) await add("workflows", fromTemplate(t));
    }
    await db.kv.put({
      key: "medicalId",
      value: { name: "Alex Sharma", dob: "1991-06-12", bloodGroup: "B+", allergies: "Penicillin", conditions: "Mild asthma", height: "176 cm", weight: "74 kg", organDonor: true, contacts: [{ name: "Priya Sharma", relation: "Wife", phone: "9876543210" }] },
    });
  });
}
