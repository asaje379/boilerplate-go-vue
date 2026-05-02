/**
 * Tests E2E : Gestion du profil utilisateur
 * 
 * Scénarios :
 * - Affichage du profil
 * - Modification du profil
 * - Changement de mot de passe
 * - Upload de photo
 */

import { test, expect } from "@playwright/test";
import { authenticateViaAPI, TEST_USERS, waitForPageReady } from "../fixtures/auth.js";

test.describe("Profile Management", () => {
  test.beforeEach(async ({ page }) => {
    // Cleanup et authentification
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await authenticateViaAPI(page, TEST_USERS.admin);
  });

  test("displays profile page", async ({ page }) => {
    await page.goto("/profile");
    await waitForPageReady(page);

    // Vérifier le titre
    await expect(
      page.getByRole("heading", { name: /profile|profil/i })
    ).toBeVisible();

    // Vérifier les informations de l'utilisateur
    await expect(
      page.getByText(TEST_USERS.admin.email)
    ).toBeVisible();
  });

  test("updates profile information", async ({ page }) => {
    await page.goto("/profile");
    await waitForPageReady(page);

    // Activer le mode édition (si nécessaire)
    const editButton = page.getByRole("button", { name: /edit|modifier/i });
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
    }

    // Modifier le nom
    const nameInput = page.getByLabel(/name|nom/i).first();
    await nameInput.clear();
    await nameInput.fill("Updated Name");

    // Sauvegarder
    await page.getByRole("button", { name: /save|enregistrer|update/i }).click();

    // Vérifier le succès
    await expect(
      page.getByText(/success|succès|updated|mis à jour/i).first()
    ).toBeVisible();

    // Vérifier que le nom a été mis à jour
    await expect(page.getByText("Updated Name")).toBeVisible();
  });

  test("changes password", async ({ page }) => {
    await page.goto("/profile");
    await waitForPageReady(page);

    // Trouver la section changement de mot de passe
    const changePasswordButton = page.getByRole("button", { name: /change password|modifier mot de passe/i });
    
    if (await changePasswordButton.isVisible().catch(() => false)) {
      await changePasswordButton.click();
    }

    // Remplir le formulaire de changement de mot de passe
    await page.getByLabel(/current password|ancien mot de passe/i).fill(TEST_USERS.admin.password);
    await page.getByLabel(/new password|nouveau mot de passe/i).fill("NewSecurePass123!");
    await page.getByLabel(/confirm password|confirmer/i).fill("NewSecurePass123!");

    // Soumettre
    await page.getByRole("button", { name: /change|update|modifier/i }).click();

    // Vérifier le succès
    await expect(
      page.getByText(/success|succès|password changed|mot de passe modifié/i).first()
    ).toBeVisible();
  });

  test("validates password requirements", async ({ page }) => {
    await page.goto("/profile");
    await waitForPageReady(page);

    // Ouvrir le formulaire de changement de mot de passe
    const changePasswordButton = page.getByRole("button", { name: /change password|modifier mot de passe/i });
    if (await changePasswordButton.isVisible().catch(() => false)) {
      await changePasswordButton.click();
    }

    // Essayer avec un mot de passe trop court
    await page.getByLabel(/current password/i).fill(TEST_USERS.admin.password);
    await page.getByLabel(/new password/i).fill("short");
    await page.getByLabel(/confirm password/i).fill("short");

    await page.getByRole("button", { name: /change|update/i }).click();

    // Vérifier l'erreur de validation
    await expect(
      page.getByText(/short|8 characters|at least/i).first()
    ).toBeVisible();
  });

  test("uploads profile photo", async ({ page }) => {
    await page.goto("/profile");
    await waitForPageReady(page);

    // Trouver l'input de fichier pour la photo
    const fileInput = page.locator("input[type='file']").first();
    
    if (await fileInput.isVisible().catch(() => false)) {
      // Créer un fichier image factice pour le test
      // Note: Dans un vrai test, on utiliserait un fichier existant
      await fileInput.setInputFiles({
        name: "test-avatar.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake-image-data"),
      });

      // Attendre l'upload
      await expect(
        page.getByText(/uploading|téléchargement/i).first()
      ).toBeVisible();
    }
  });
});
