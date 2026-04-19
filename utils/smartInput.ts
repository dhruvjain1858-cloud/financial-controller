import { Transaction } from "@/types";
import { todayISO } from "@/utils/helpers";

/**
 * Detects the category of a transaction based on its description.
 */
export function detectCategory(
  description: string,
  customMappings: Record<string, string> = {}
): { category: string; confidence: "HIGH" | "MEDIUM" | "LOW" } {
  if (!description) return { category: "Other", confidence: "LOW" };
  const lower = description.toLowerCase().replace(/[^\w\s]/gi, "").trim();

  // 1. Check custom mappings (Exact match -> HIGH)
  for (const [customDesc, mappedCat] of Object.entries(customMappings)) {
    if (lower === customDesc || lower.includes(customDesc)) {
      console.log(`[Categorization] Input: "${description}" -> Custom Mapped: "${mappedCat}" (HIGH)`);
      return { category: mappedCat, confidence: "HIGH" };
    }
  }

  // 2. Keyword check (Partial match -> MEDIUM)
  const foodKeywords = ["zomato", "swiggy", "momos", "momo", "dosa", "chai", "coffee", "biryani", "pizza", "burger", "food", "dinner", "lunch", "breakfast", "restaurant", "cafe", "groceries", "grocery"];
  const transportKeywords = ["rapido", "uber", "ola", "metro", "auto", "taxi", "fuel", "petrol", "diesel", "cab", "transport", "bus", "train", "flight", "ride"];
  const shoppingKeywords = ["amazon", "flipkart", "myntra", "store", "mall", "shopping", "shoes", "clothes", "apparel", "zara", "h&m", "shop"];
  const housingKeywords = ["rent", "housing", "maintenance", "electricity", "water", "bill", "broadband", "wifi", "internet"];
  const entertainmentKeywords = ["movie", "entertainment", "netflix", "prime", "hotstar", "spotify", "cinema", "game"];
  const healthKeywords = ["pharmacy", "hospital", "clinic", "doctor", "medicine", "health"];
  const loanKeywords = ["emi", "loan"];

  let category = "Other";
  let confidence: "MEDIUM" | "LOW" = "LOW";

  const words = lower.split(/\s+/);
  
  const checkMatch = (keywords: string[]) => keywords.some(k => words.includes(k) || lower.includes(k));

  if (checkMatch(foodKeywords)) category = "Food";
  else if (checkMatch(transportKeywords)) category = "Transport";
  else if (checkMatch(shoppingKeywords)) category = "Shopping";
  else if (checkMatch(housingKeywords)) category = "Housing";
  else if (checkMatch(entertainmentKeywords)) category = "Entertainment";
  else if (checkMatch(healthKeywords)) category = "Healthcare";
  else if (checkMatch(loanKeywords)) category = "Loans";
  else if (lower.includes("salary")) category = "Salary";
  else if (lower.includes("freelance")) category = "Freelance";

  if (category !== "Other") confidence = "MEDIUM";

  console.log(`[Categorization] Input: "${description}" -> Detected: "${category}" (${confidence})`);
  return { category, confidence };
}

/**
 * Parses a quick input string like "2000 swiggy dinner"
 * Returns parsed amount, description, and auto-detected category.
 */
export function parseQuickInput(
  input: string, 
  customMappings: Record<string, string> = {}
): { amount: number; description: string; category: string; confidence: "HIGH" | "MEDIUM" | "LOW" } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
  if (!match) return null;

  const amountStr = match[0].replace(/,/g, '');
  const amount = parseFloat(amountStr);
  
  if (isNaN(amount) || amount <= 0) return null;

  let description = trimmed.replace(match[0], "").trim();
  description = description.replace(/^[^\w\s]+/, "").trim();

  const detection = detectCategory(description, customMappings);

  return { amount, description, category: detection.category, confidence: detection.confidence };
}

/**
 * Parses raw text containing multiple transactions.
 */
export function parseBulkImport(
  rawText: string,
  customMappings: Record<string, string> = {}
): Omit<Transaction, "id">[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const transactions: Omit<Transaction, "id">[] = [];

  for (const line of lines) {
    const parsed = parseQuickInput(line, customMappings);
    if (parsed) {
      transactions.push({
        type: "expense",
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        date: todayISO(),
      });
    }
  }

  return transactions;
}
