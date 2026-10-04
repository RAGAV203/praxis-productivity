import Dexie, { type Table } from "dexie";
import type { RecurrenceRule } from "./recurrence";

/** Fields every stored record carries (soft delete keeps sync possible later). */
export interface Base {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export type Check = { text: string; done: boolean };

export interface Expense extends Base { kind: "expense" | "income"; amount: number; category: string; date: string; mode: string; note?: string; tags?: string[]; files?: string[]; billId?: string; tripId?: string }
export interface Budget extends Base { category: string; amount: number }
export interface Bill extends Base { name: string; amount: number; category: string; kind: "bill" | "subscription"; nextDue: string; rule: RecurrenceRule; autopay?: boolean; note?: string }
export interface Loan extends Base { name: string; lender?: string; principal: number; rate: number; tenureMonths: number; startDate: string; prepaid?: number }
export interface SavingsGoal extends Base { name: string; target: number; deadline?: string; contributions: { date: string; amount: number }[]; emoji?: string }
export interface Asset extends Base { name: string; side: "asset" | "liability"; type: string; value: number; note?: string }
export interface NetWorthSnapshot extends Base { month: string; assets: number; liabilities: number }
export interface SplitEntry extends Base { person: string; amount: number; note?: string; date: string; settled?: boolean }

export interface Habit extends Base { name: string; emoji: string; color: string; perWeek: number; archived?: boolean; reminder?: string }
export interface HabitLog extends Base { habitId: string; date: string }
export interface WaterLog extends Base { date: string; ml: number; at: number }
export interface Metric extends Base { date: string; type: "weight" | "bp" | "sugar" | "sleep" | "steps"; value: number; value2?: number; note?: string }
export interface Medicine extends Base { name: string; dose?: string; times: string[]; person?: string; stock?: number; perDose?: number; endDate?: string; active: boolean }
export interface MedLog extends Base { medId: string; date: string; time: string }
export interface MedicalRecord extends Base { person?: string; type: string; title: string; date: string; doctor?: string; notes?: string; files?: string[] }
export interface Workout extends Base { date: string; type: string; minutes: number; calories?: number; notes?: string }
export interface Cycle extends Base { start: string; end?: string; notes?: string }
export interface Sleep extends Base { date: string; bed: string; wake: string; quality: number; note?: string }
export interface Mood extends Base { date: string; at: number; value: number; feelings: string[]; associations: string[]; note?: string }

export interface JournalEntry extends Base { date: string; text: string; mood?: number; gratitude?: string[]; prompt?: string; files?: string[] }
export interface Task extends Base { title: string; due?: string; rule?: RecurrenceRule; done: boolean; priority: "low" | "med" | "high"; list?: string }
export interface Goal extends Base { title: string; year: number; area: string; milestones: Check[]; habitIds?: string[]; notes?: string; done?: boolean }
export interface Review extends Base { period: string; scores: Record<string, number>; wins?: string; lessons?: string }
export interface ImportantDate extends Base { title: string; person?: string; kind: "birthday" | "anniversary" | "other"; date: string; giftIdeas?: string[] }
export interface Countdown extends Base { title: string; date: string; emoji: string; pinned?: boolean }
export interface Book extends Base { title: string; author?: string; status: "want" | "reading" | "done"; pages: number; pagesRead: number; rating?: number; quotes?: string[]; finishedAt?: string }
export interface Person extends Base { name: string; relation?: string; phone?: string; dob?: string; bloodGroup?: string; allergies?: string; notes?: string }

export interface Doc extends Base { title: string; type: string; number?: string; person?: string; issueDate?: string; expiryDate?: string; notes?: string; files?: string[] }
export interface WalletCard extends Base { name: string; kind: string; number?: string; color: string; expiry?: string; notes?: string; files?: string[] }
export interface Warranty extends Base { product: string; brand?: string; purchaseDate: string; warrantyEnd: string; price?: number; store?: string; service?: string; files?: string[] }
export interface Vehicle extends Base { name: string; regNo?: string; insuranceExpiry?: string; pucExpiry?: string; serviceDue?: string }
export interface VehicleLog extends Base { vehicleId: string; date: string; kind: "fuel" | "service" | "other"; odometer?: number; amount: number; litres?: number; notes?: string }
export interface Maintenance extends Base { title: string; nextDue: string; rule: RecurrenceRule; provider?: string; phone?: string; cost?: number; lastDone?: string }
export interface GroceryItem extends Base { name: string; qty?: string; aisle: string; done: boolean; staple?: boolean }
export interface PantryItem extends Base { name: string; qty?: string; expiry?: string }
export interface Recipe extends Base { title: string; ingredients: string[]; steps?: string; minutes?: number; tags?: string[] }
export interface Meal extends Base { date: string; slot: "breakfast" | "lunch" | "dinner"; text: string; recipeId?: string }
export interface Trip extends Base { name: string; destination?: string; start: string; end?: string; budget?: number; itinerary: string[]; packing: Check[] }
export interface Note extends Base { title: string; body: string; tags?: string[]; pinned?: boolean; color?: string }
export interface Capsule extends Base { title: string; body: string; unlockAt: string; opened?: boolean }
export interface FocusSession extends Base { date: string; minutes: number; label?: string }

/* ---------- Workflows (Shortcuts-style automations) ---------- */
export interface WorkflowStep { id: string; type: string; params: Record<string, unknown> }
export interface WorkflowTrigger {
  type: "manual" | "time" | "open" | "event";
  time?: string; // HH:mm for "time"
  days?: number[]; // 0=Sun..6=Sat for "time"
  table?: string; // for "event": record type that was added
  field?: string;
  op?: string;
  value?: string;
}
export interface Workflow extends Base { name: string; emoji: string; color: string; description?: string; trigger: WorkflowTrigger; steps: WorkflowStep[]; enabled: boolean; pinned?: boolean; lastRun?: number; lastAutoDate?: string; runs?: number; template?: string }
export interface WorkflowRun extends Base { workflowId: string; name: string; at: number; ok: boolean; source: string; log: string[] }

export interface Fast extends Base { start: number; end?: number; goalHours: number; note?: string }
export interface Memo extends Base { title: string; fileId: string; seconds: number; tags?: string[] }
export interface CareItem extends Base { name: string; kind: "pet" | "plant"; emoji: string; task: string; nextDue: string; rule: RecurrenceRule; lastDone?: string; notes?: string; files?: string[] }
export interface WishItem extends Base { name: string; price?: number; link?: string; priority: "low" | "med" | "high"; bought?: boolean; notes?: string; files?: string[] }

export interface StoredFile { id: string; name: string; type: string; blob: Blob; createdAt: number }
export interface KV { key: string; value: unknown }

class PraxisDB extends Dexie {
  expenses!: Table<Expense, string>;
  budgets!: Table<Budget, string>;
  bills!: Table<Bill, string>;
  loans!: Table<Loan, string>;
  savings!: Table<SavingsGoal, string>;
  assets!: Table<Asset, string>;
  snapshots!: Table<NetWorthSnapshot, string>;
  splits!: Table<SplitEntry, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  water!: Table<WaterLog, string>;
  metrics!: Table<Metric, string>;
  medicines!: Table<Medicine, string>;
  medLogs!: Table<MedLog, string>;
  records!: Table<MedicalRecord, string>;
  workouts!: Table<Workout, string>;
  cycles!: Table<Cycle, string>;
  sleep!: Table<Sleep, string>;
  moods!: Table<Mood, string>;
  journal!: Table<JournalEntry, string>;
  tasks!: Table<Task, string>;
  goals!: Table<Goal, string>;
  reviews!: Table<Review, string>;
  dates!: Table<ImportantDate, string>;
  countdowns!: Table<Countdown, string>;
  books!: Table<Book, string>;
  people!: Table<Person, string>;
  docs!: Table<Doc, string>;
  wallet!: Table<WalletCard, string>;
  warranties!: Table<Warranty, string>;
  vehicles!: Table<Vehicle, string>;
  vehicleLogs!: Table<VehicleLog, string>;
  maintenance!: Table<Maintenance, string>;
  grocery!: Table<GroceryItem, string>;
  pantry!: Table<PantryItem, string>;
  recipes!: Table<Recipe, string>;
  meals!: Table<Meal, string>;
  trips!: Table<Trip, string>;
  notes!: Table<Note, string>;
  capsules!: Table<Capsule, string>;
  focus!: Table<FocusSession, string>;
  workflows!: Table<Workflow, string>;
  workflowRuns!: Table<WorkflowRun, string>;
  fasts!: Table<Fast, string>;
  memos!: Table<Memo, string>;
  care!: Table<CareItem, string>;
  wishlist!: Table<WishItem, string>;
  files!: Table<StoredFile, string>;
  kv!: Table<KV, string>;

  constructor() {
    super("praxis");
    const b = "id, createdAt, updatedAt, deletedAt";
    this.version(1).stores({
      expenses: `${b}, date, category, kind`,
      budgets: `${b}, category`,
      bills: `${b}, nextDue`,
      loans: b,
      savings: b,
      assets: b,
      snapshots: `${b}, month`,
      splits: `${b}, person`,
      habits: b,
      habitLogs: `${b}, habitId, date, [habitId+date]`,
      water: `${b}, date`,
      metrics: `${b}, date, type`,
      medicines: b,
      medLogs: `${b}, date, medId`,
      records: `${b}, date`,
      workouts: `${b}, date`,
      cycles: `${b}, start`,
      sleep: `${b}, date`,
      moods: `${b}, date`,
      journal: `${b}, date`,
      tasks: `${b}, due, done`,
      goals: `${b}, year`,
      reviews: `${b}, period`,
      dates: b,
      countdowns: `${b}, date`,
      books: `${b}, status`,
      people: b,
      docs: `${b}, expiryDate`,
      wallet: b,
      warranties: `${b}, warrantyEnd`,
      vehicles: b,
      vehicleLogs: `${b}, vehicleId, date`,
      maintenance: `${b}, nextDue`,
      grocery: `${b}, aisle, done`,
      pantry: `${b}, expiry`,
      recipes: b,
      meals: `${b}, date`,
      trips: `${b}, start`,
      notes: b,
      capsules: `${b}, unlockAt`,
      focus: `${b}, date`,
      files: "id, createdAt",
      kv: "key",
    });
    this.version(2).stores({
      workflows: b,
      workflowRuns: `${b}, workflowId, at`,
      fasts: `${b}, start`,
      memos: b,
      care: `${b}, nextDue`,
      wishlist: b,
    });
  }
}

export const db = new PraxisDB();

export type TableName = Exclude<
  { [K in keyof PraxisDB]: PraxisDB[K] extends Table<Base, string> ? K : never }[keyof PraxisDB],
  undefined
>;

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
