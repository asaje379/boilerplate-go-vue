/**
 * Tests E2E : Flow de setup initial
 *
 * Scénarios :
 * - Redirection vers /setup quand aucun admin n'existe
 * - Création du premier admin
 * - Redirection vers /login après setup
 */

import { test, expect } from "@playwright/test";
import { waitForPageReady } from "../fixtures/auth.js";

test.describe("Setup Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Vider le storage pour partir d'un état clean
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test("redirects to setup when no admin exists", async ({ page }) => {
    // Note: Ce test suppose que la base est en état "needs setup"
    // Dans un environnement de test contrôlé, il faudrait reset la DB

    await page.goto("/");
    await waitForPageReady(page);

    // Vérifier la redirection vers /setup
    await expect(page).toHaveURL(/.*\/setup$/);

    // Vérifier que le formulaire de setup est présent
    await expect(page.getByRole("heading", { name: /setup|configuration/i })).toBeVisible();
  });

  test("completes initial setup and creates first admin", async ({ page }) => {
    await page.goto("/setup");
    await waitForPageReady(page);

    // Remplir le formulaire de setup
    await page.getByLabel(/name|nom/i).fill("Setup Admin");
    await page.getByLabel(/email/i).fill("setup-admin@test.com");
    await page.getByLabel(/password|mot de passe/i).fill("SecurePass123!");

    // Soumettre le formulaire
    await page.getByRole("button", { name: /create|créer|setup/i }).click();

    // Attendre la redirection vers login
    await expect(page).toHaveURL(/.*\/login$/);

    // Vérifier le message de succès
    await expect(page.getByText(/success|succès|created|créé/i)).toBeVisible();
  });

  test("setup page is accessible when setup is required", async ({ page }) => {
    await page.goto("/setup");
    await waitForPageReady(page);

    // Vérifier les éléments clés de la page
    await expect(page.getByLabel(/name|nom/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create|créer/i })).toBeVisible();
  });
});
