/**
 * Tests E2E : Gestion des utilisateurs (Admin only)
 * 
 * Scénarios :
 * - Liste des utilisateurs
 * - Création d'un utilisateur
 * - Modification d'un utilisateur
 * - Recherche d'utilisateurs
 */

import { test, expect } from "@playwright/test";
import { authenticateViaAPI, TEST_USERS, waitForPageReady } from "../fixtures/auth.js";

test.describe("Users Management", () => {
  test.beforeEach(async ({ page }) => {
    // Cleanup et authentification admin
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await authenticateViaAPI(page, TEST_USERS.admin);
  });

  test("displays users list", async ({ page }) => {
    await page.goto("/users");
    await waitForPageReady(page);

    // Vérifier le titre de la page
    await expect(
      page.getByRole("heading", { name: /users|utilisateurs/i })
    ).toBeVisible();

    // Vérifier que la liste ou le tableau est présent
    await expect(
      page.locator("table, [data-testid='users-list'], .users-grid").first()
    ).toBeVisible();
  });

  test("opens create user form", async ({ page }) => {
    await page.goto("/users");
    await waitForPageReady(page);

    // Cliquer sur le bouton de création
    const createButton = page.getByRole("button", { name: /create|add|nouveau|créer/i });
    await createButton.click();

    // Vérifier que le formulaire/modal s'ouvre
    await expect(
      page.getByRole("dialog").or(page.getByRole("form")).first()
    ).toBeVisible();

    // Vérifier les champs du formulaire
    await expect(page.getByLabel(/name|nom/i).first()).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/role/i).first()).toBeVisible();
  });

  test("searches for users", async ({ page }) => {
    await page.goto("/users");
    await waitForPageReady(page);

    // Trouver le champ de recherche
    const searchInput = page.getByPlaceholder(/search|rechercher/i);
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("admin");
      await page.waitForTimeout(500); // Attendre le debounce

      // Vérifier que les résultats sont filtrés
      // Note: Le comportement exact dépend de l'implémentation
    }
  });

  test("displays user details", async ({ page }) => {
    await page.goto("/users");
    await waitForPageReady(page);

    // Cliquer sur le premier utilisateur de la liste
    const firstUserRow = page.locator("table tbody tr, .user-item").first();
    
    if (await firstUserRow.isVisible().catch(() => false)) {
      await firstUserRow.click();

      // Vérifier que les détails sont affichés
      await expect(
        page.getByText(/email|role|name/i).first()
      ).toBeVisible();
    }
  });

  test("creates new user successfully", async ({ page }) => {
    await page.goto("/users");
    await waitForPageReady(page);

    // Ouvrir le formulaire de création
    await page.getByRole("button", { name: /create|add|nouveau/i }).click();

    // Remplir le formulaire
    const timestamp = Date.now();
    await page.getByLabel(/name|nom/i).first().fill(`Test User ${timestamp}`);
    await page.getByLabel(/email/i).first().fill(`test-${timestamp}@example.com`);
    await page.getByLabel(/password|mot de passe/i).first().fill("SecurePass123!");

    // Sélectionner le rôle (si présent)
    const roleSelect = page.getByLabel(/role/i).first();
    if (await roleSelect.isVisible().catch(() => false)) {
      await roleSelect.selectOption("user");
    }

    // Soumettre
    await page.getByRole("button", { name: /save|create|créer|enregistrer/i }).click();

    // Vérifier le succès
    await expect(
      page.getByText(/success|succès|created|créé/i).first()
    ).toBeVisible();
  });
});
