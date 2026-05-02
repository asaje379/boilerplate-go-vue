# E2E Tests (Playwright)

Tests end-to-end pour l'admin panel du boilerplate.

---

## Structure

```
e2e/
├── fixtures/
│   └── auth.ts          # Helpers d'authentification
├── specs/
│   ├── setup.spec.ts    # Flow de setup initial
│   ├── login.spec.ts    # Authentification
│   ├── users.spec.ts    # Gestion des utilisateurs
│   └── profile.spec.ts  # Gestion du profil
└── README.md            # Ce fichier
```

---

## Exécution

```bash
cd admin

# Lancer tous les tests E2E
pnpm test:e2e

# Lancer avec UI
pnpm test:e2e --ui

# Lancer un fichier spécifique
pnpm test:e2e setup.spec.ts

# Lancer en mode debug
pnpm test:e2e --debug

# Générer le rapport HTML
pnpm test:e2e --reporter=html
```

---

## Prérequis

1. **Infrastructure démarrée** :
```bash
docker-compose up postgres rabbitmq minio
```

2. **API démarrée** :
```bash
cd api && go run . serve
```

3. **Build du frontend** (pour les tests CI) :
```bash
cd admin && pnpm build
```

---

## Flows testés

### Setup Flow (`setup.spec.ts`)
- Redirection vers `/setup` quand aucun admin n'existe
- Création du premier admin
- Redirection vers `/login` après setup

### Authentication Flow (`login.spec.ts`)
- Login avec succès
- Login avec mauvais credentials
- Redirection après login
- Logout
- Protection des routes authentifiées
- Validation des champs requis

### Users Management (`users.spec.ts`)
- Affichage de la liste des utilisateurs
- Ouverture du formulaire de création
- Recherche d'utilisateurs
- Affichage des détails utilisateur
- Création d'un nouvel utilisateur

### Profile Management (`profile.spec.ts`)
- Affichage du profil
- Modification des informations
- Changement de mot de passe
- Validation du mot de passe
- Upload de photo (si applicable)

---

## Fixtures

### `auth.ts`

Helpers pour l'authentification dans les tests :

```typescript
// Authentifier via API (plus rapide que le login UI)
await authenticateViaAPI(page, TEST_USERS.admin);

// Déconnecter
await logout(page);

// Vérifier l'état
const isAuth = await isAuthenticated(page);

// Attendre le chargement
await waitForPageReady(page);
```

**Utilisateurs de test** :
- `TEST_USERS.admin` - Admin avec tous les droits
- `TEST_USERS.user` - Utilisateur standard

---

## Configuration

La config Playwright est dans `playwright.config.ts` :

```typescript
// URL de base
baseURL: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173'

// Navigateurs testés
- Chromium
- Firefox
- WebKit

// Retry sur CI
retries: process.env.CI ? 2 : 0
```

---

## Variables d'environnement

```bash
# URL de l'API (pour les fixtures)
VITE_API_BASE_URL=http://localhost:8080

# Mode CI
CI=true
```

---

## Bonnes pratiques

1. **Isoler les tests** : Chaque test démarre avec un état clean (storage vidé)
2. **Authentification via API** : Utiliser `authenticateViaAPI()` plutôt que le login UI pour gagner du temps
3. **Sélecteurs robustes** : Utiliser les roles (`getByRole`) et labels (`getByLabel`) plutôt que les classes CSS
4. **Attentes explicites** : Utiliser `waitForPageReady()` après les navigations
5. **Tests indépendants** : Éviter les dépendances entre tests

---

## Dépannage

### "Authentication failed"
- Vérifier que l'API est démarrée
- Vérifier que `VITE_API_BASE_URL` pointe sur la bonne URL

### "Element not found"
- Vérifier que la page est chargée (`waitForPageReady`)
- Vérifier les sélecteurs avec `npx playwright codegen`

### Tests lents
- Utiliser `authenticateViaAPI()` au lieu du login UI
- Réduire le nombre de navigateurs dans `playwright.config.ts`

---

## Génération de tests

Utiliser le codegen pour générer des tests :

```bash
npx playwright codegen http://localhost:5173
```
