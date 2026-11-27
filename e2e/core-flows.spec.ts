import { expect, test, type Page } from "@playwright/test";

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const seeded = {
  user: { name: "Dhruv", monthlyIncome: 50000 },
  balance: 40000,
  onboarded: true,
  theme: "dark",
  categories: ["Food", "Transport", "Shopping", "Housing", "Entertainment", "Salary", "Other"],
  customMappings: {},
  cards: [{ id: "c1", name: "HDFC", network: "Visa", limit: 100000, used: 30000 }],
  loans: [
    { id: "l1", name: "Bike", totalAmount: 80000, remaining: 40000, emi: 4000, interest: 9.5, monthsRemaining: 10 },
    { id: "l2", name: "Phone", totalAmount: 30000, remaining: 12000, emi: 2500, interest: 0, monthsRemaining: 5 },
  ],
  transactions: [
    { id: "t1", type: "income", amount: 50000, category: "Salary", date: today, description: "salary" },
    { id: "corrupt", type: "expense", amount: "oops", category: "Food", date: "x" },
  ],
  budgets: [{ id: "b1", category: "Food", limit: 5000 }],
  goals: [],
};

async function open(page: Page, path = "/") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("financial-controller-state", s);
      sessionStorage.setItem("seeded", "1");
    }
  }, JSON.stringify(seeded));
  await page.goto(path);
  return errors;
}

test("dashboard shows real balance and post-EMI projection, and drops corrupt saved rows", async ({ page }) => {
  const errors = await open(page);
  const main = page.locator("main");
  await expect(main).toContainText("₹10,000"); // real balance = 40,000 bank - 30,000 card due
  await expect(main).toContainText("-₹6,500"); // two EMIs
  await expect(main).toContainText("₹3,500"); // projected balance after EMIs
  await expect(main).toContainText("Saved in this browser only");
  expect(errors).toEqual([]);
});

test("quick add categorises, updates totals and triggers the budget alert", async ({ page }) => {
  await open(page);
  await page.getByPlaceholder("Quick Add (e.g. '1500 swiggy dinner')").fill("4200 swiggy dinner");
  await page.keyboard.press("Enter");
  await page.goto("/alerts");
  await expect(page.locator("main")).toContainText("Food Budget: 84% Used");
  await expect(page.locator("main")).toContainText("Total EMI of ₹6,500");
  // persisted to the browser cache (reload keeps it)
  await page.reload();
  await expect(page.locator("main")).toContainText("Food Budget: 84% Used");
});

test("a duplicate budget is rejected with a visible message", async ({ page }) => {
  await open(page, "/budgets");
  await page.getByRole("button", { name: "Set Budget" }).first().click();
  await expect(page.getByRole("heading", { name: "Set Budget" })).toBeVisible();
  await page.locator("select").last().selectOption("Food");
  await page.getByPlaceholder("10,000").fill("3000");
  await page.getByRole("button", { name: "Set Budget" }).last().click();
  await expect(page.getByText(/already exists/i)).toBeVisible();
});

test("CSV import books credits as income and debits as expenses", async ({ page }) => {
  await open(page, "/transactions");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  const csv = "Txn Date,Narration,Withdrawal Amt,Deposit Amt\n05/11/2026,REFUND AMAZON,,1200\n06/11/2026,UBER TRIP,350,\n";
  await page.locator("input[type=file]").setInputFiles({ name: "statement.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByText("REFUND AMAZON")).toBeVisible();
  await page.getByRole("button", { name: /^Import \d+ Transactions$/ }).click();
  await expect(page.getByText(/2 transactions imported/)).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("financial-controller-state")!));
  const byDesc = Object.fromEntries(saved.transactions.map((t: { description: string; type: string }) => [t.description, t.type]));
  expect(byDesc["REFUND AMAZON"]).toBe("income");
  expect(byDesc["UBER TRIP"]).toBe("expense");
});
