/** Keyword → aisle auto-categorisation (like iOS 26 Reminders grocery lists). */
export const AISLES = [
  "Produce",
  "Dairy & Eggs",
  "Bakery",
  "Meat & Fish",
  "Grains & Pulses",
  "Spices & Oils",
  "Snacks",
  "Beverages",
  "Frozen",
  "Household",
  "Personal Care",
  "Other",
] as const;

const KEYWORDS: Record<string, string[]> = {
  Produce: ["apple", "banana", "onion", "tomato", "potato", "carrot", "spinach", "lettuce", "fruit", "vegetable", "mango", "lemon", "ginger", "garlic", "chilli", "coriander", "cucumber", "grape", "orange", "palak", "methi", "capsicum", "beans", "cabbage"],
  "Dairy & Eggs": ["milk", "curd", "yogurt", "cheese", "paneer", "butter", "ghee", "egg", "cream"],
  Bakery: ["bread", "bun", "cake", "pav", "croissant", "rusk"],
  "Meat & Fish": ["chicken", "mutton", "fish", "prawn", "meat", "beef", "pork"],
  "Grains & Pulses": ["rice", "atta", "flour", "dal", "lentil", "oats", "pasta", "noodle", "rava", "poha", "wheat", "quinoa", "chana", "rajma"],
  "Spices & Oils": ["salt", "sugar", "oil", "masala", "turmeric", "pepper", "jeera", "cumin", "spice", "vinegar", "sauce", "ketchup"],
  Snacks: ["chips", "biscuit", "cookie", "chocolate", "namkeen", "nuts", "almond", "cashew"],
  Beverages: ["tea", "coffee", "juice", "soda", "water", "cola"],
  Frozen: ["ice cream", "frozen", "peas"],
  Household: ["detergent", "soap", "dish", "cleaner", "tissue", "garbage", "bulb", "battery", "foil", "phenyl"],
  "Personal Care": ["shampoo", "toothpaste", "brush", "lotion", "razor", "deodorant", "sanitary", "face wash"],
};

export function guessAisle(name: string): string {
  const n = name.toLowerCase();
  for (const [aisle, words] of Object.entries(KEYWORDS)) if (words.some((w) => n.includes(w))) return aisle;
  return "Other";
}
