/**
 * Fixtures et helpers d'authentification pour les tests E2E
 */

import type { Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  name?: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: "admin@test.com",
    password: "Password123!",
    name: "Test Admin",
  },
  user: {
    email: "user@test.com",
    password: "Password123!",
    name: "Test User",
  },
};

/**
 * Authentifie un utilisateur via l'API (plus rapide que le login UI)
 */
export async function authenticateViaAPI(
  page: Page,
  user: TestUser = TEST_USERS.admin
): Promise<void> {
  // Appel direct à l'API pour obtenir le token
  const response = await page.request.post(
    `${process.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/v1/auth/login`,
    {
      data: {
        email: user.email,
        password: user.password,
      },
    }
  );

  if (!response.ok()) {
    throw new Error(`Authentication failed: ${await response.text()}`);
  }

  const { data } = await response.json();

  // Stocker le token dans le localStorage
  await page.evaluate((token) => {
    localStorage.setItem("accessToken", token);
  }, data.accessToken);

  // Stocker aussi le refresh token si présent
  if (data.refreshToken) {
    await page.evaluate((token) => {
      localStorage.setItem("refreshToken", token);
    }, data.refreshToken);
  }
}

/**
 * Déconnecte l'utilisateur
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  });
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem("accessToken"));
  return !!token;
}

/**
 * Attend que la page soit chargée et stable
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("domcontentloaded");
}
