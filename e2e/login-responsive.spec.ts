import { expect, test } from "@playwright/test";

test("login remains usable on each target viewport", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bem-vindo" })).toBeVisible();
  await expect(page.getByLabel("Nome de usuário")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("invalid credentials produce a comprehensible error", async ({ page }) => {
  await page.goto("/login?error=credentials");
  await expect(page.getByRole("alert")).toContainText("E-mail ou senha incorretos");
});
