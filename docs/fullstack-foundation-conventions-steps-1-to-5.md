# Full-Stack Foundation Conventions (Steps 1 to 5)

Ce document propose des conventions communes entre le frontend `admin` en Vue et l'API `api` en Go.

L'objectif est de construire une base fluide, cohérente et facile à faire évoluer.

Les étapes 1 à 5 couvrent :

1. Client HTTP et couche API frontend
2. Contrat de réponses et d'erreurs backend/frontend
3. Session, authentification et utilisateur courant
4. Feedback utilisateur global
5. États de page, listes et formulaires

---

# 0. Lecture de l'existant

## Frontend admin actuel

### Points déjà en place

- `Pinia` est présent
- `vue-router` est présent
- `vue-i18n` est présent
- `preferences` store existe déjà
- `AppLayout` et des composants système commencent à structurer l'application
- la structure `components/ui` et `components/system` est déjà une bonne base

### Points encore absents ou embryonnaires

- pas encore de vraie couche HTTP unifiée
- pas encore de modules API frontend par domaine
- pas encore de store de session/auth
- pas encore de contrat d'erreur unifié côté frontend
- pas encore de toasts globaux
- pas encore de states loaders/empty/error standardisés au niveau application

## API Go actuelle

### Points déjà en place

- architecture claire (`domain`, `application`, `interfaces/http`, `bootstrap`, `platform`)
- routes versionnées sous `/api/v1`
- auth JWT + refresh token + OTP déjà présents
- middleware auth et rôles déjà présents
- Swagger déjà présent
- pagination de listes déjà amorcée via helper de query
- configuration applicative déjà structurée

### Points à harmoniser

- les réponses de succès n'ont pas encore une enveloppe commune
- les erreurs sont encore exposées majoritairement sous la forme `{ "error": "..." }`
- les erreurs de validation ne sont pas encore structurées par champ
- la gestion des codes d'erreur applicatifs n'est pas encore normalisée
- les handlers répètent encore une partie de la logique de mapping erreur -> HTTP

---

# 1. Étape 1 — Client HTTP et couche API frontend

## Objectif

Empêcher les vues, composants ou stores d'appeler directement `fetch` ou `axios` de manière hétérogène.

## Convention proposée

## 1.1 Structure frontend

```text
admin/src/
  services/
    http/
      client.ts
      errors.ts
      types.ts
      auth.ts
    api/
      auth.api.ts
      users.api.ts
      files.api.ts
      notifications.api.ts
```

## 1.2 Règle de responsabilité

- `services/http/*`
  - gère le transport
  - gère base URL, headers, auth, parsing, erreurs

- `services/api/*`
  - expose des fonctions orientées métier
  - ne connaît pas l'UI

- `stores/*`
  - orchestrent l'état global, mais ne construisent pas elles-mêmes les requêtes brutes

- `views/components`
  - n'appellent jamais directement le client HTTP

## 1.3 Convention de client HTTP

Le client HTTP doit gérer :

- `baseURL`
- `Accept: application/json`
- `Content-Type: application/json` quand nécessaire
- `Authorization: Bearer <token>` si disponible
- `credentials` uniquement si explicitement nécessaire
- timeout standard
- `AbortController`
- parsing uniforme du JSON
- conversion de toute erreur en un type frontend stable

## 1.4 Convention d'API module

Exemples attendus :

- `authApi.login(payload)`
- `authApi.verifyOtp(payload)`
- `authApi.refresh(payload)`
- `authApi.logout()`
- `usersApi.me()`
- `usersApi.list(params)`
- `usersApi.getById(id)`
- `filesApi.upload(file, options)`

## 1.5 Convention de types frontend

Le frontend doit distinguer :

- `Api DTO`
- `UI model` si besoin
- `Query params`
- `Mutation payloads`

Exemple :

- `UserDto`
- `CurrentUser`
- `ListUsersParams`
- `UpdateProfilePhotoPayload`

## 1.6 Décision recommandée

Pour ce projet, je recommande de commencer avec `fetch` natif encapsulé proprement, pas forcément `axios`.

Pourquoi :

- stack plus légère
- contrôle suffisant
- plus simple à faire évoluer tant que l'app reste maîtrisée

---

# 2. Étape 2 — Contrat de réponses et d'erreurs backend/frontend

## Problème actuel

L'API retourne principalement des réponses de succès brutes et des erreurs sous la forme :

```json
{ "error": "message" }
```

C'est simple, mais insuffisant pour une application admin structurée.

## Objectif

Avoir un contrat stable qui permette au frontend de réagir proprement sans parser des messages libres.

## 2.1 Convention de succès recommandée

Deux options existent.

### Option A — Réponse brute

Exemple :

```json
{
  "id": "usr_x",
  "email": "x@example.com"
}
```

### Option B — Enveloppe standardisée

Exemple :

```json
{
  "data": {
    "id": "usr_x",
    "email": "x@example.com"
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

## Recommandation

Je recommande **l'enveloppe standardisée**.

Format cible :

```json
{
  "data": {},
  "meta": {}
}
```

Bénéfices :

- pagination plus propre
- métadonnées plus faciles à transmettre
- contrat stable entre endpoints
- debug plus simple

## 2.2 Convention d'erreur recommandée

Format cible :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "email": ["Email is invalid"],
        "password": ["Password must contain at least 8 characters"]
      }
    }
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

## 2.3 Codes d'erreur recommandés

Un code métier stable doit exister pour les cas fréquents.

Exemples :

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CONFLICT`
- `RATE_LIMITED`
- `TOKEN_EXPIRED`
- `INVALID_CREDENTIALS`
- `OTP_REQUIRED`
- `OTP_INVALID`
- `OTP_EXPIRED`
- `INTERNAL_ERROR`
- `FILE_TOO_LARGE`
- `UNSUPPORTED_FILE_TYPE`

## 2.4 Mapping backend Go recommandé

Créer une couche HTTP de réponse commune, par exemple :

```text
api/internal/interfaces/http/response/
  success.go
  error.go
```

Avec des helpers du type :

- `RespondOK(c, data)`
- `RespondCreated(c, data)`
- `RespondNoContent(c)`
- `RespondError(c, status, code, message, details)`
- `RespondValidationError(c, fieldErrors)`

## 2.5 Conventions Go recommandées

### Aujourd'hui

- beaucoup de handlers font `c.JSON(...)` directement
- `handleError` est répété par handler
- middleware auth renvoie un format minimal différent du futur format cible

### Recommandation

Centraliser le contrat HTTP.

Par exemple :

- une structure `APIError`
- une structure `APIResponse[T]`
- des helpers partagés
- un mapper `error -> status/code/message/details`

## 2.6 Validation

Au lieu de renvoyer un simple `err.Error()` pour `ShouldBindJSON`, viser une erreur structurée par champ.

Exemple :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "email": ["This field is required"],
        "password": ["Must contain at least 8 characters"]
      }
    }
  }
}
```

Cela simplifie énormément les formulaires frontend.

---

# 3. Étape 3 — Session, authentification et utilisateur courant

## Existant backend

L'API a déjà :

- `login`
- `verify-otp`
- `refresh`
- `logout`
- `users/me`
- middleware JWT
- rôles

C'est une très bonne base.

## 3.1 Convention frontend recommandée

Créer :

```text
admin/src/stores/session.ts
admin/src/services/api/auth.api.ts
admin/src/services/api/users.api.ts
```

## 3.2 Responsabilités du `session` store

Le store de session doit être la source de vérité pour :

- `accessToken`
- `refreshToken`
- `accessTokenExpiresAt`
- `currentUser`
- `isAuthenticated`
- `isBootstrappingSession`

## 3.3 Actions attendues

- `login(email, password)`
- `verifyOtp(email, otp)`
- `refreshSession()`
- `fetchCurrentUser()`
- `bootstrapSession()`
- `logout()`

## 3.4 Flux recommandé

### Login

1. `POST /auth/login`
2. backend répond `OTP_REQUIRED` ou `challenge`
3. écran OTP
4. `POST /auth/verify-otp`
5. backend retourne tokens + user
6. frontend hydrate `session`

### Démarrage app

1. lire tokens depuis storage sécurisé choisi
2. si refresh token présent, tenter refresh ou `me`
3. hydrater `currentUser`
4. si échec, vider session et rediriger si nécessaire

### 401 sur requête protégée

1. tenter refresh une seule fois
2. rejouer la requête si refresh OK
3. sinon vider session
4. rediriger login ou écran public

## 3.5 Convention backend recommandée

Le backend doit rendre explicites :

- les erreurs `TOKEN_EXPIRED`
- `UNAUTHORIZED`
- `INVALID_CREDENTIALS`
- `OTP_INVALID`
- `OTP_EXPIRED`

Le frontend ne doit pas déduire le comportement à partir d'un simple message texte.

## 3.6 `/users/me`

Ce endpoint doit devenir le pivot principal du shell applicatif.

Il doit fournir au minimum :

- `id`
- `firstName` / `lastName` ou `name`
- `email`
- `role`
- `profilePhotoUrl`
- `preferredLocale`
- éventuellement `permissions`

## 3.7 Permissions

Même si le système de rôles existe déjà côté Go, je recommande de préparer une convention frontend :

- `role`
- `permissions: string[]`

Même si `permissions` est initialement dérivé du rôle côté backend.

---

# 4. Étape 4 — Feedback utilisateur global

## Objectif

Éviter que chaque vue gère ses messages de succès/erreur à sa manière.

## 4.1 Côté frontend

Créer :

```text
admin/src/components/system/AppToastHost.vue
admin/src/stores/toast.ts
admin/src/composables/use-toast.ts
```

## 4.2 Catégories de feedback

### Toasts

Pour :

- succès de mutation
- erreur non bloquante
- information courte

### Confirm dialogs

Pour :

- suppression
- logout
- reset
- action destructive

### Error states page-level

Pour :

- échec de chargement d'écran
- erreur serveur non locale à un champ

### Empty states

Pour :

- listes vides
- notifications vides
- recherches sans résultat

### Inline feedback

Pour :

- formulaires
- upload
- actions ciblées

## 4.3 Convention de mapping erreur -> UX

### Erreur validation

- affichage inline dans le formulaire
- pas de toast global par défaut

### Erreur auth

- message global + redirection si nécessaire

### Erreur réseau

- toast ou bannière

### Erreur serveur inattendue

- toast générique + log technique éventuel

## 4.4 Convention backend utile au feedback

Le backend doit fournir :

- un `code`
- un `message`
- des `details` exploitables

Sans cela, le frontend est obligé de faire des heuristiques fragiles.

---

# 5. Étape 5 — États de page, listes et formulaires

## Objectif

Uniformiser la manière dont l'app représente les états asynchrones.

## 5.1 Convention de state frontend

Pour chaque ressource distante, penser en termes de :

- `idle`
- `loading`
- `success`
- `empty`
- `error`
- `submitting`
- `refreshing` si nécessaire

## 5.2 Composants système recommandés

Créer progressivement :

```text
admin/src/components/system/
  AppPageLoader.vue
  AppPageError.vue
  AppPageEmpty.vue
  AppSectionLoader.vue
  AppInlineError.vue
```

## 5.3 Listes et pagination

L'API Go a déjà une base de pagination et query params (`page`, `limit`, `search`, `sortBy`, `sortOrder`).

Je recommande d'en faire une convention formelle full-stack.

### Query params standards

- `page`
- `limit`
- `search`
- `sortBy`
- `sortOrder`
- plus tard `filters[...]` ou schéma équivalent

### Réponse paginée recommandée

```json
{
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 145,
      "totalPages": 8
    }
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

## 5.4 Formulaires

### Convention frontend

- les vues ne mappent pas elles-mêmes `VALIDATION_ERROR`
- un helper commun transforme les erreurs backend en erreurs de champs
- les composants système affichent les erreurs de manière uniforme

### Convention backend

- les erreurs de validation doivent référencer les noms de champs JSON attendus par le frontend
- éviter des messages trop techniques

## 5.5 Tables et recherche

Créer plus tard un pattern unifié :

- état de chargement
- query synchronisée à l'URL si pertinent
- debounce de recherche
- tri standard
- pagination standard
- empty state standard
- error state standard

---

# Proposition d'architecture cible

## Frontend admin

```text
admin/src/
  components/
    ui/
    system/
  composables/
  services/
    http/
    api/
  stores/
    preferences.ts
    session.ts
    toast.ts
  features/
    auth/
    users/
    files/
    notifications/
  router/
  lib/
```

## API Go

```text
api/internal/
  application/
  domain/
  infrastructure/
  interfaces/
    http/
      handlers/
      middleware/
      presenter/
      query/
      response/
  platform/
```

---

# Ajustements backend Go recommandés

## 1. Créer une couche `response`

Aujourd'hui, les handlers répondent encore manuellement via `c.JSON(...)`.

Je recommande de créer une couche dédiée :

- `success.go`
- `error.go`
- `mapper.go`

## 2. Créer un mapper d'erreurs applicatives

Objectif : ne plus répéter `switch errors.Is(...)` dans plusieurs handlers.

Exemple de convention :

- `appcommon.ErrUnauthorized` -> `401 / UNAUTHORIZED`
- `appcommon.ErrForbidden` -> `403 / FORBIDDEN`
- `appcommon.ErrNotFound` -> `404 / NOT_FOUND`
- `validation errors` -> `400 / VALIDATION_ERROR`
- conflit métier -> `409 / CONFLICT`

## 3. Ajouter `requestId`

Je recommande un middleware qui injecte un `requestId` dans le contexte et dans les réponses.

Bénéfices :

- corrélation logs/frontend/backend
- debug plus propre

## 4. Clarifier le contrat auth

Les endpoints auth sont déjà bons fonctionnellement.

Je recommande seulement de formaliser les réponses :

- challenge OTP
- succès auth
- erreur auth

avec codes stables.

## 5. Harmoniser Swagger avec le contrat final

Quand le contrat d'enveloppe sera adopté, Swagger devra refléter exactement la réalité.

---

# Roadmap recommandée

## Sprint 1

- définir le contrat d'erreur backend/frontend
- créer la couche `response` côté Go
- créer le client HTTP frontend
- créer `auth.api.ts`, `users.api.ts`

## Sprint 2

- créer `session.ts`
- brancher `users/me`
- brancher `AppUserMenu` sur les vraies données
- gérer refresh/logout proprement

## Sprint 3

- créer `toast.ts` et `AppToastHost`
- définir le mapping erreur -> feedback
- créer `AppPageLoader`, `AppPageError`, `AppPageEmpty`

## Sprint 4

- standardiser listes, pagination, tri, recherche
- standardiser formulaires et erreurs de validation

## Sprint 5

- permissions frontend
- guards router
- documentation finale des patterns

---

# Décisions recommandées à valider ensemble

Voici les décisions structurantes que je te recommande de valider avant implémentation :

## A. Réponse backend

- garder réponse brute
- ou adopter enveloppe `{ data, meta }`

### Recommandation

Adopter `{ data, meta }`

## B. Erreur backend

- garder `{ error: string }`
- ou adopter erreur structurée avec `code`

### Recommandation

Adopter erreur structurée avec `code`, `message`, `details`

## C. Transport frontend

- `fetch` natif encapsulé
- ou `axios`

### Recommandation

`fetch` encapsulé

## D. Session

- stockage local des tokens
- ou stratégie plus stricte selon contexte produit

### Recommandation initiale

Commencer simple mais centralisé, puis durcir si le produit l'exige.

## E. Pagination

- standard unique partout

### Recommandation

Oui, sans exception.

---

# Conclusion

Tu as déjà une bonne base de shell UI et une API Go saine côté architecture.

Le vrai saut de maturité maintenant consiste à contractualiser les zones suivantes :

- réseau
- erreurs
- session
- feedback
- états asynchrones

C'est là que le design system devient réellement un système applicatif.

Ces conventions sont pensées pour que frontend et backend se renforcent mutuellement, au lieu de s'adapter l'un à l'autre de manière opportuniste.
