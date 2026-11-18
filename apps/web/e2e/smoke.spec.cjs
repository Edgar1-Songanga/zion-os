const { test, expect } = require("@playwright/test");

test("public landing page exposes the main entry points", async ({ page }) => {
  const response = await page.goto("/");
  expect(response && response.status()).toBe(200);

  await expect(page.getByRole("heading", { name: /ZIONOS/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "CREATE ACCOUNT" })).toHaveAttribute("href", "/auth/sign-up");
  await expect(page.getByRole("link", { name: "SIGN IN" })).toHaveAttribute("href", "/auth/sign-in");
  await expect(page.getByRole("link", { name: "ESCOLHER ÁREA DE ACESSO" })).toHaveAttribute("href", "/auth/access");
});

test("sign-in form switches between Angola phone and email methods", async ({ page }) => {
  const response = await page.goto("/auth/sign-in");
  expect(response && response.status()).toBe(200);

  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByLabel("Número de telefone")).toBeVisible();
  await expect(page.getByLabel("Palavra-passe")).toBeVisible();

  await page.getByRole("button", { name: "Email", exact: true }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Número de telefone")).toHaveCount(0);

  await page.getByRole("button", { name: "Telefone", exact: true }).click();
  await expect(page.getByLabel("Número de telefone")).toBeVisible();
});

test("sign-up form exposes both methods and enforces the password minimum", async ({ page }) => {
  const response = await page.goto("/auth/sign-up");
  expect(response && response.status()).toBe(200);

  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
  await expect(page.getByLabel("Número de telefone")).toBeVisible();
  await expect(page.getByLabel("Palavra-passe")).toHaveAttribute("minlength", "8");

  await page.getByRole("button", { name: "Email", exact: true }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Palavra-passe")).toBeVisible();
});

test("unauthenticated users are redirected away from the protected dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

for (const width of [320, 360, 390]) {
  test(`sign-in page has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/auth/sign-in");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
}
