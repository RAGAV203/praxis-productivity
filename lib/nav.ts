export type Tab = "today" | "money" | "health" | "life" | "more";

export interface ModuleLink {
  href: string;
  title: string;
  emoji: string;
  color: string;
  tab: Tab;
  group: string;
  desc: string;
  keywords?: string;
}

export const MODULES: ModuleLink[] = [
  // Money
  { href: "/money/expenses/", title: "Transactions", emoji: "💸", color: "#ff9f0a", tab: "money", group: "Track", desc: "Expenses & income", keywords: "spend expense income transaction upi" },
  { href: "/money/budgets/", title: "Budgets", emoji: "🎯", color: "#5e5ce6", tab: "money", group: "Track", desc: "Monthly limits" },
  { href: "/money/bills/", title: "Bills & Subs", emoji: "🧾", color: "#ff375f", tab: "money", group: "Track", desc: "Recurring payments", keywords: "subscription netflix rent emi recharge" },
  { href: "/money/reports/", title: "Reports", emoji: "📊", color: "#ac8e68", tab: "money", group: "Track", desc: "Trends & CSV export" },
  { href: "/money/savings/", title: "Savings Goals", emoji: "🐷", color: "#30d158", tab: "money", group: "Grow", desc: "Save towards goals" },
  { href: "/money/networth/", title: "Net Worth", emoji: "📈", color: "#0a84ff", tab: "money", group: "Grow", desc: "Assets − liabilities", keywords: "investments mutual fund stocks gold" },
  { href: "/money/loans/", title: "Loans & EMI", emoji: "🏦", color: "#64d2ff", tab: "money", group: "Grow", desc: "Amortization & payoff" },
  { href: "/money/wishlist/", title: "Wishlist", emoji: "🎁", color: "#ff375f", tab: "money", group: "Tools", desc: "Things to buy someday", keywords: "wish shopping buy later" },
  { href: "/money/split/", title: "Split", emoji: "🤝", color: "#bf5af2", tab: "money", group: "Tools", desc: "Who owes whom" },
  { href: "/money/tools/", title: "Calculators", emoji: "🧮", color: "#8e8e93", tab: "money", group: "Tools", desc: "EMI, SIP, split, units", keywords: "convert calculator unit tip sip" },
  // Health
  { href: "/health/habits/", title: "Habits", emoji: "✅", color: "#30d158", tab: "health", group: "Daily", desc: "Streaks & heatmap" },
  { href: "/health/steps/", title: "Steps", emoji: "👣", color: "#30d158", tab: "health", group: "Daily", desc: "Pedometer & health sync", keywords: "walk pedometer apple health google fit" },
  { href: "/health/water/", title: "Water", emoji: "💧", color: "#64d2ff", tab: "health", group: "Daily", desc: "Hydration goal" },
  { href: "/health/mood/", title: "State of Mind", emoji: "🌈", color: "#bf5af2", tab: "health", group: "Daily", desc: "Moods & feelings" },
  { href: "/health/sleep/", title: "Sleep", emoji: "🌙", color: "#5e5ce6", tab: "health", group: "Daily", desc: "Sleep score" },
  { href: "/health/workouts/", title: "Workouts", emoji: "🏃", color: "#ff9f0a", tab: "health", group: "Body", desc: "Move minutes" },
  { href: "/health/fasting/", title: "Fasting", emoji: "🥗", color: "#30d158", tab: "health", group: "Body", desc: "Intermittent fasting timer", keywords: "16:8 intermittent fast" },
  { href: "/health/metrics/", title: "Body Metrics", emoji: "⚖️", color: "#0a84ff", tab: "health", group: "Body", desc: "Weight, BP, sugar", keywords: "weight bmi blood pressure sugar" },
  { href: "/health/cycle/", title: "Cycle", emoji: "🌸", color: "#ff375f", tab: "health", group: "Body", desc: "Period tracking" },
  { href: "/health/medicines/", title: "Medications", emoji: "💊", color: "#ff375f", tab: "health", group: "Care", desc: "Doses & refills" },
  { href: "/health/records/", title: "Medical Records", emoji: "🩺", color: "#ff453a", tab: "health", group: "Care", desc: "Reports & vaccines" },
  { href: "/health/medical-id/", title: "Medical ID", emoji: "🆘", color: "#ff453a", tab: "health", group: "Care", desc: "Emergency info card", keywords: "emergency sos blood group allergies ice" },
  { href: "/health/breathe/", title: "Breathe", emoji: "🫁", color: "#64d2ff", tab: "health", group: "Care", desc: "Mindful minute", keywords: "meditation mindfulness calm" },
  // Life
  { href: "/life/calendar/", title: "Calendar", emoji: "📅", color: "#ff453a", tab: "life", group: "Plan", desc: "Everything by date", keywords: "agenda schedule month planner" },
  { href: "/life/tasks/", title: "Reminders", emoji: "☑️", color: "#0a84ff", tab: "life", group: "Plan", desc: "To-dos & repeats", keywords: "tasks todo" },
  { href: "/life/focus/", title: "Focus Timer", emoji: "⏱️", color: "#ff375f", tab: "life", group: "Plan", desc: "Pomodoro sessions", keywords: "pomodoro timer clock" },
  { href: "/life/goals/", title: "Goals", emoji: "🏔️", color: "#30d158", tab: "life", group: "Plan", desc: "Yearly goals & milestones" },
  { href: "/life/countdowns/", title: "Countdowns", emoji: "⏳", color: "#bf5af2", tab: "life", group: "Plan", desc: "Days until…" },
  { href: "/life/journal/", title: "Journal", emoji: "📔", color: "#ff9f0a", tab: "life", group: "Reflect", desc: "Daily reflections", keywords: "diary" },
  { href: "/life/review/", title: "Life Review", emoji: "🧭", color: "#5e5ce6", tab: "life", group: "Reflect", desc: "Quarterly check-in" },
  { href: "/life/reading/", title: "Reading", emoji: "📚", color: "#ac8e68", tab: "life", group: "Reflect", desc: "Books & quotes" },
  { href: "/life/dates/", title: "Important Dates", emoji: "🎂", color: "#ff375f", tab: "life", group: "People", desc: "Birthdays & anniversaries" },
  { href: "/life/people/", title: "Family & People", emoji: "👨‍👩‍👧", color: "#64d2ff", tab: "life", group: "People", desc: "Profiles & info" },
  // More
  { href: "/more/workflows/", title: "Workflows", emoji: "⚡", color: "#5e5ce6", tab: "more", group: "Automate", desc: "Shortcuts & automations", keywords: "shortcut automation routine macro trigger" },
  { href: "/more/toolkit/", title: "Toolkit", emoji: "🧰", color: "#ff9f0a", tab: "more", group: "Automate", desc: "Timers, counter, QR, more", keywords: "stopwatch timer counter tally dice coin password qr word count" },
  { href: "/more/grocery/", title: "Grocery", emoji: "🛒", color: "#30d158", tab: "more", group: "Home", desc: "Auto-sorted list", keywords: "shopping list" },
  { href: "/more/pantry/", title: "Pantry", emoji: "🥫", color: "#ff9f0a", tab: "more", group: "Home", desc: "Expiry tracking" },
  { href: "/more/recipes/", title: "Recipes & Meals", emoji: "🍳", color: "#ff375f", tab: "more", group: "Home", desc: "Meal planner", keywords: "cook food meal plan" },
  { href: "/more/home/", title: "Home Care", emoji: "🏠", color: "#ac8e68", tab: "more", group: "Home", desc: "Maintenance schedule" },
  { href: "/more/care/", title: "Pets & Plants", emoji: "🐾", color: "#30d158", tab: "more", group: "Home", desc: "Feeding, watering, vet", keywords: "dog cat plant water feed vet" },
  { href: "/more/vehicles/", title: "Vehicles", emoji: "🚗", color: "#ff9f0a", tab: "more", group: "Home", desc: "Fuel, service, PUC" },
  { href: "/more/wallet/", title: "Wallet", emoji: "💳", color: "#1c1c1e", tab: "more", group: "Wallet & Docs", desc: "Cards & passes", keywords: "loyalty membership card id" },
  { href: "/more/documents/", title: "Documents", emoji: "🗂️", color: "#0a84ff", tab: "more", group: "Wallet & Docs", desc: "IDs with expiry", keywords: "aadhaar pan passport licence insurance" },
  { href: "/more/warranties/", title: "Warranties", emoji: "🛡️", color: "#30d158", tab: "more", group: "Wallet & Docs", desc: "Purchases & invoices" },
  { href: "/more/notes/", title: "Notes", emoji: "📝", color: "#ffd60a", tab: "more", group: "Keepsakes", desc: "Quick notes" },
  { href: "/more/voice/", title: "Voice Memos", emoji: "🎙️", color: "#ff453a", tab: "more", group: "Keepsakes", desc: "Record & replay", keywords: "audio record voice recorder" },
  { href: "/more/travel/", title: "Trips", emoji: "✈️", color: "#64d2ff", tab: "more", group: "Keepsakes", desc: "Itinerary & packing", keywords: "travel packing" },
  { href: "/more/capsule/", title: "Time Capsule", emoji: "💌", color: "#bf5af2", tab: "more", group: "Keepsakes", desc: "Letters to future you" },
  { href: "/more/review/", title: "Year in Review", emoji: "🏆", color: "#ff9f0a", tab: "more", group: "Keepsakes", desc: "Your year, wrapped", keywords: "wrapped recap summary" },
  { href: "/more/settings/", title: "Settings", emoji: "⚙️", color: "#8e8e93", tab: "more", group: "App", desc: "Theme, modules, backup", keywords: "backup restore export import theme pin lock customize" },
];

export const TABS: { id: Tab; href: string; label: string }[] = [
  { id: "today", href: "/", label: "Today" },
  { id: "money", href: "/money/", label: "Money" },
  { id: "health", href: "/health/", label: "Health" },
  { id: "life", href: "/life/", label: "Life" },
  { id: "more", href: "/more/", label: "More" },
];

export function tabFor(pathname: string): Tab {
  const seg = pathname.split("/")[1];
  return (["money", "health", "life", "more"].includes(seg) ? seg : "today") as Tab;
}

export const moduleFor = (href: string) => MODULES.find((m) => m.href === href);
