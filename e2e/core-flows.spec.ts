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
  await expect(page.locator("main")).toContainText("EMIs of ₹6,500 are still due");
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
  await page.getByRole("button", { name: "Import CSV" }).click();
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

test("paying an EMI books the expense and removes it from what is still due", async ({ page }) => {
  await open(page, "/loans");
  await page.getByRole("button", { name: "Pay EMI" }).first().click();
  await expect(page.getByText("Paid this month")).toBeVisible();
  await expect(page.getByText("₹36,317")).toBeVisible(); // 40,000 - (4,000 - 316.67 interest at 9.5%)
  await page.goto("/");
  await expect(page.locator("main")).toContainText("-₹2,500"); // only the Phone EMI is still due
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("financial-controller-state")!));
  expect(saved.balance).toBe(36000);
  expect(saved.transactions[0]).toMatchObject({ category: "Loans", amount: 4000, description: "EMI: Bike" });
});

test.describe("first visit (no saved data)", () => {
  test("onboarding without an account asks for real figures instead of inventing them", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Continue without an account" }).click();
    await expect(page.getByRole("heading", { name: "What should we call you?" })).toBeVisible();
    await page.getByRole("textbox").first().fill("Dhruv"); // the onboarding overlay's name field
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Set your baselines" })).toBeVisible();
    await page.getByRole("button", { name: /Get Started/ }).click();
    await expect(page.getByText(/Enter your monthly income and current bank balance/)).toBeVisible();
    await page.getByPlaceholder("50,000").fill("42000");
    await page.getByPlaceholder("1,00,000").fill("15000");
    await page.getByRole("button", { name: /Get Started/ }).click();
    await expect(page.getByText("Welcome back, Dhruv")).toBeVisible({ timeout: 5000 });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("financial-controller-state")!));
    expect(saved.user.monthlyIncome).toBe(42000);
    expect(saved.balance).toBe(15000);
  });

  test("sample data fills the dashboard, is labelled, and can be cleared", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Explore with sample data" }).click();
    await expect(page.getByTestId("demo-banner")).toBeVisible();
    await expect(page.locator("main")).toContainText("₹16,500"); // 38,000 bank - 21,500 card due
    await page.getByRole("button", { name: "Start with my own data" }).click();
    await expect(page.getByRole("button", { name: "Continue without an account" })).toBeVisible();
  });
});

test("affordability check accounts for EMIs still due", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Affordability" }).click();
  // real balance 10,000 covers 5,000, but not with 6,500 of EMIs still due this month
  await page.getByLabel("Purchase amount").fill("5000");
  await expect(page.getByText("Not Recommended", { exact: true })).toBeVisible();
  await page.getByLabel("Purchase amount").fill("1000");
  await expect(page.getByText("Safe Spend", { exact: true })).toBeVisible();
});

test("phones can reach every page and the affordability check", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await open(page);
  for (const name of ["Goals", "Credit Cards", "Insights", "Alerts"]) {
    await page.getByRole("button", { name: "More" }).click();
    await page.locator("#mobile-more-menu").getByRole("link", { name }).click();
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.getByRole("button", { name: "Affordability" }).click();
  await expect(page.getByLabel("Purchase amount")).toBeVisible();
});

test("account pages explain that sign-in is not configured instead of failing", async ({ page }) => {
  for (const path of ["/auth", "/forgot-password", "/reset-password", "/verify-otp?email=a@b.co"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Accounts are not set up here" })).toBeVisible();
  }
});

test("a card bill cannot be overpaid and a goal cannot be dated in the past", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await page.getByRole("dialog").getByPlaceholder("0").fill("40000"); // only 30,000 is owed
  await page.getByRole("dialog").getByRole("button", { name: /^Pay/ }).last().click();
  await expect(page.getByText(/You only owe ₹30,000/)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/goals");
  await page.getByRole("button", { name: "Add Goal" }).first().click();
  await page.getByRole("dialog").getByPlaceholder("e.g., Emergency Fund").fill("Old goal");
  await page.getByRole("dialog").getByPlaceholder("1,00,000").fill("1000");
  await page.getByRole("dialog").locator("input[type=date]").fill("2020-01-01");
  await page.getByRole("dialog").getByRole("button", { name: /Add|Save|Create/ }).last().click();
  await expect(page.getByText("The deadline cannot be in the past")).toBeVisible();
});

test("security headers are sent", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
});
