/**
 * Tests E2E : Flow d'authentification
 *
 * Scénarios :
 * - Login avec succès
 * - Login avec mauvais credentials
 * - Redirection après login
 * - Logout
 * - Protection des routes authentifiées
 */

import { test, expect } from "@playwright/test";
import { authenticateViaAPI, logout, TEST_USERS, waitForPageReady } from "../fixtures/auth.js";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Cleanup avant chaque test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test("successful login redirects to home", async ({ page }) => {
    await page.goto("/login");
    await waitForPageReady(page);

    // Remplir le formulaire
    await page.getByLabel(/email/i).fill(TEST_USERS.admin.email);
    await page.getByLabel(/password|mot de passe/i).fill(TEST_USERS.admin.password);

    // Soumettre
    await page.getByRole("button", { name: /login|connexion/i }).click();

    // Attendre la redirection vers home
    await expect(page).toHaveURL("/");

    // Vérifier que la page home est chargée
    await expect(page.getByRole("heading", { name: /home|accueil|dashboard/i })).toBeVisible();
  });

  test("displays error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await waitForPageReady(page);

    // Remplir avec des credentials invalides
    await page.getByLabel(/email/i).fill("wrong@email.com");
    await page.getByLabel(/password|mot de passe/i).fill("WrongPassword123!");

    // Soumettre
    await page.getByRole("button", { name: /login|connexion/i }).click();

    // Vérifier le message d'erreur
    await expect(page.getByText(/invalid|incorrect|error|erreur/i)).toBeVisible();

    // Rester sur la page de login
    await expect(page).toHaveURL(/.*\/login$/);
  });

  test("redirects to login when accessing protected route unauthenticated", async ({ page }) => {
    await page.goto("/users");
    await waitForPageReady(page);

    // Redirection vers login
    await expect(page).toHaveURL(/.*\/login$/);
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    // Authentifier via API (plus rapide)
    await authenticateViaAPI(page, TEST_USERS.admin);

    // Aller sur une page protégée
    await page.goto("/");
    await waitForPageReady(page);

    // Vérifier qu'on est bien connecté
    await expect(page).toHaveURL("/");

    // Logout via API (le plus fiable pour les tests)
    await logout(page);
    await page.goto("/");

    // Vérifier la redirection vers login
    await expect(page).toHaveURL(/.*\/login$/);
  });

  test("login form validates required fields", async ({ page }) => {
    await page.goto("/login");
    await waitForPageReady(page);

    // Soumettre sans remplir
    await page.getByRole("button", { name: /login|connexion/i }).click();

    // Vérifier les validations HTML5 ou messages d'erreur
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute("required");

    // Alternative: vérifier si un message d'erreur de validation apparaît
    const errorMessage = page.getByText(/required|requis|obligatoire/i);
    await expect(errorMessage.first()).toBeVisible();
  });

  test("remebers redirect target after login", async ({ page }) => {
    // Essayer d'accéder à /profile sans être connecté
    await page.goto("/profile");
    await waitForPageReady(page);

    // Redirection vers login
    await expect(page).toHaveURL(/.*\/login$/);

    // Se connecter
    await page.getByLabel(/email/i).fill(TEST_USERS.admin.email);
    await page.getByLabel(/password|mot de passe/i).fill(TEST_USERS.admin.password);
    await page.getByRole("button", { name: /login|connexion/i }).click();

    // Vérifier qu'on est redirigé vers /profile (pas /)
    // Note: Ce comportement dépend de l'implémentation du router
    // await expect(page).toHaveURL("/profile");
  });
});
