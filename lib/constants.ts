export const EXPENSE_CATS: { name: string; emoji: string; color: string }[] = [
  { name: "Food", emoji: "🍔", color: "#ff9f0a" },
  { name: "Groceries", emoji: "🛒", color: "#30d158" },
  { name: "Transport", emoji: "🚕", color: "#0a84ff" },
  { name: "Fuel", emoji: "⛽", color: "#ff453a" },
  { name: "Shopping", emoji: "🛍️", color: "#bf5af2" },
  { name: "Bills", emoji: "🧾", color: "#ff375f" },
  { name: "Rent", emoji: "🏠", color: "#ac8e68" },
  { name: "Health", emoji: "💊", color: "#ff6482" },
  { name: "Entertainment", emoji: "🎬", color: "#5e5ce6" },
  { name: "Travel", emoji: "✈️", color: "#64d2ff" },
  { name: "Education", emoji: "🎓", color: "#32ade6" },
  { name: "Gifts", emoji: "🎁", color: "#ff2d55" },
  { name: "Personal", emoji: "💇", color: "#a2845e" },
  { name: "EMI", emoji: "🏦", color: "#8e8e93" },
  { name: "Investments", emoji: "📈", color: "#34c759" },
  { name: "Other", emoji: "📦", color: "#8e8e93" },
];
export const INCOME_CATS: { name: string; emoji: string; color: string }[] = [
  { name: "Salary", emoji: "💼", color: "#30d158" },
  { name: "Freelance", emoji: "🧑‍💻", color: "#0a84ff" },
  { name: "Interest", emoji: "🏦", color: "#64d2ff" },
  { name: "Refund", emoji: "↩️", color: "#ff9f0a" },
  { name: "Gift", emoji: "🎁", color: "#ff375f" },
  { name: "Other", emoji: "💰", color: "#8e8e93" },
];
export const catMeta = (name: string) => [...EXPENSE_CATS, ...INCOME_CATS].find((c) => c.name === name) ?? { name, emoji: "📦", color: "#8e8e93" };
export const PAY_MODES = ["UPI", "Card", "Cash", "Net banking", "Wallet"];

export const LIFE_AREAS = ["Health", "Money", "Family", "Career", "Learning", "Fun", "Mind", "Home"];

export const MOOD_SCALE = [
  { v: 1, label: "Very Unpleasant", emoji: "😣", color: "#5e5ce6" },
  { v: 2, label: "Unpleasant", emoji: "😕", color: "#0a84ff" },
  { v: 3, label: "Neutral", emoji: "😐", color: "#64d2ff" },
  { v: 4, label: "Pleasant", emoji: "🙂", color: "#30d158" },
  { v: 5, label: "Very Pleasant", emoji: "😄", color: "#ff9f0a" },
];
export const FEELINGS: Record<number, string[]> = {
  1: ["Angry", "Anxious", "Scared", "Overwhelmed", "Sad", "Hopeless", "Stressed"],
  2: ["Annoyed", "Worried", "Disappointed", "Lonely", "Drained", "Irritated", "Discouraged"],
  3: ["Calm", "Content", "Indifferent", "Peaceful", "Tired", "Bored", "Okay"],
  4: ["Happy", "Grateful", "Hopeful", "Relieved", "Satisfied", "Confident", "Relaxed"],
  5: ["Joyful", "Excited", "Proud", "Amazed", "Passionate", "Brave", "Thrilled"],
};
export const ASSOCIATIONS = ["Health", "Fitness", "Family", "Friends", "Partner", "Work", "Money", "Weather", "Hobbies", "Education", "Travel", "Self-care", "Spirituality", "Tasks"];

export const JOURNAL_PROMPTS = [
  "What made you smile today?",
  "What's one thing you're grateful for right now?",
  "What drained your energy today, and what restored it?",
  "Describe a small win from today.",
  "What would make tomorrow great?",
  "Who did you appreciate today, and why?",
  "What did you learn about yourself this week?",
  "What's something you're looking forward to?",
  "If today had a title, what would it be?",
  "What's a worry you can let go of?",
  "Describe a place where you felt at peace.",
  "What's one habit you're proud of building?",
  "What would your future self thank you for?",
  "What made today different from yesterday?",
];

export const DOC_TYPES = ["Aadhaar", "PAN", "Passport", "Driving Licence", "Voter ID", "Insurance", "Vehicle RC", "Property", "Certificate", "Other"];
export const RECORD_TYPES = ["Lab report", "Prescription", "Vaccination", "Scan / X-ray", "Discharge summary", "Doctor visit", "Other"];
export const WORKOUT_TYPES = ["Walk", "Run", "Cycle", "Gym", "Yoga", "Swim", "Sports", "HIIT", "Dance", "Other"];
export const ASSET_TYPES = ["Bank", "Fixed Deposit", "Mutual Funds", "Stocks", "Gold", "PF / PPF", "NPS", "Property", "Crypto", "Cash", "Other"];
export const LIABILITY_TYPES = ["Home Loan", "Car Loan", "Personal Loan", "Credit Card", "Education Loan", "Other"];
export const WALLET_KINDS = ["Loyalty", "Membership", "Gift card", "ID", "Library", "Gym", "Insurance", "Other"];
