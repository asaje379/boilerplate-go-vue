# API Endpoints Reference

Référence complète des endpoints API avec méthodes, contrats et codes de retour.

---

## Conventions générales

### Base URL
```
Production : https://api.votredomaine.com/api/v1
Développement : http://localhost:8080/api/v1
```

### Authentification
```
Authorization: Bearer <access_token>
```

### Enveloppe de réponse

**Succès (200-299)** :
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Erreur (400-599)** :
```json
{
  "error": "Description lisible",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Pagination

Paramètres de query pour les listes :
- `page` : Numéro de page (1-based, défaut: 1)
- `limit` : Items par page (max: 100, défaut: 20)
- `search` : Recherche texte
- `sortBy` : Champ de tri
- `sortOrder` : `asc` ou `desc`

---

## Endpoints

### Health

#### GET /api/v1/health
**Description** : Vérifier l'état du service

**Auth** : Non requise

**Response (200)** :
```json
{
  "data": {
    "status": "ok"
  }
}
```

---

### Authentification

#### POST /api/v1/auth/register
**Description** : Créer un compte utilisateur

**Auth** : Non requise (mais setup doit être complet ou user connecté admin)

**Body** :
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "user",
  "preferredLocale": "fr"
}
```

**Response (201)** :
```json
{
  "data": {
    "id": "usr_...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "preferredLocale": "fr",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

**Errors** :
- `400` : Validation error (email invalide, password trop court)
- `409` : Email déjà utilisé
- `403` : Non autorisé (seul admin peut créer des users après setup)

---

#### POST /api/v1/auth/login
**Description** : Initier la connexion (retourne tokens ou challenge OTP)

**Auth** : Non requise

**Body** :
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200) - Sans 2FA** :
```json
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresAt": "2026-01-01T00:15:00Z",
    "message": "Login successful",
    "user": {
      "id": "usr_...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

**Response (200) - Avec 2FA** :
```json
{
  "data": {
    "email": "john@example.com",
    "otpExpiresAt": "2026-01-01T00:10:00Z",
    "message": "OTP sent by email",
    "user": { ... }
  }
}
```

**Errors** :
- `400` : Email/password manquants
- `401` : Credentials invalides ou compte inactif

---

#### POST /api/v1/auth/verify-otp
**Description** : Vérifier OTP et finaliser connexion (2FA)

**Auth** : Non requise

**Body** :
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response (200)** : Même format que login sans 2FA

**Errors** :
- `401` : OTP invalide ou expiré

---

#### POST /api/v1/auth/refresh
**Description** : Rafraîchir les tokens d'accès

**Auth** : Non requise (utilise refresh_token)

**Body** :
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200)** : Nouveaux access_token + refresh_token

**Errors** :
- `401` : Refresh token invalide, expiré ou révoqué

---

#### POST /api/v1/auth/logout
**Description** : Révoquer le refresh token

**Auth** : Non requise

**Body** :
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200)** :
```json
{
  "data": {
    "message": "Logout successful"
  }
}
```

---

#### POST /api/v1/auth/forgot-password
**Description** : Demander réinitialisation mot de passe

**Auth** : Non requise

**Body** :
```json
{
  "email": "john@example.com"
}
```

**Response (200)** :
```json
{
  "data": {
    "message": "If the email exists, an OTP has been sent"
  }
}
```

> **Note** : Retourne toujours 200 pour ne pas exposer les emails existants

---

#### POST /api/v1/auth/reset-password
**Description** : Réinitialiser mot de passe avec OTP

**Auth** : Non requise

**Body** :
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response (200)** :
```json
{
  "data": {
    "message": "Password reset successful"
  }
}
```

**Errors** :
- `400` : Password trop court
- `401` : OTP invalide

---

### Utilisateurs

#### GET /api/v1/users/me
**Description** : Profil de l'utilisateur connecté

**Auth** : Requise

**Response (200)** :
```json
{
  "data": {
    "id": "usr_...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "preferredLocale": "fr",
    "profilePhotoUrl": "https://...",
    "twoFactorEnabled": true,
    "notifyEmail": true,
    "notifyInApp": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  }
}
```

---

#### PATCH /api/v1/users/me/profile
**Description** : Modifier son profil

**Auth** : Requise

**Body** :
```json
{
  "name": "John Updated",
  "email": "john.new@example.com",
  "preferredLocale": "en",
  "whatsappPhone": "+33612345678"
}
```

**Response (200)** : Profil mis à jour

**Errors** :
- `409` : Email déjà utilisé par un autre compte

---

#### PATCH /api/v1/users/me/profile-photo
**Description** : Changer la photo de profil

**Auth** : Requise

**Body** :
```json
{
  "fileId": "fil_..."
}
```

**Response (200)** : Profil avec nouvelle photo URL

---

#### POST /api/v1/users/me/change-password
**Description** : Changer son mot de passe

**Auth** : Requise

**Body** :
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword123"
}
```

**Response (200)** :
```json
{
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Errors** :
- `401` : Current password incorrect
- `400` : New password trop court ou identique

---

#### PATCH /api/v1/users/me/preferences
**Description** : Modifier préférences notifications

**Auth** : Requise

**Body** :
```json
{
  "notifyEmail": true,
  "notifyInApp": true,
  "notifyWhatsapp": false,
  "whatsappPhone": "+33612345678"
}
```

**Response (200)** : Préférences mises à jour

---

#### GET /api/v1/users
**Description** : Liste des utilisateurs (admin uniquement)

**Auth** : Requise (role=admin)

**Query** : `?page=1&limit=20&search=john&sortBy=createdAt&sortOrder=desc`

**Response (200)** :
```json
{
  "data": [
    {
      "id": "usr_...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

---

#### GET /api/v1/users/:id
**Description** : Détail d'un utilisateur (admin uniquement)

**Auth** : Requise (role=admin)

**Response (200)** : Même format que `/users/me` avec champs complets

---

#### POST /api/v1/users
**Description** : Créer un utilisateur (admin uniquement)

**Auth** : Requise (role=admin)

**Body** : Même format que `POST /auth/register` + `mustChangePassword: boolean`

---

#### PATCH /api/v1/users/:id
**Description** : Modifier un utilisateur (admin uniquement)

**Auth** : Requise (role=admin)

**Body** :
```json
{
  "name": "Updated",
  "email": "new@example.com",
  "role": "admin",
  "isActive": true
}
```

---

### Fichiers

#### POST /api/v1/files/upload
**Description** : Uploader un fichier

**Auth** : Requise

**Content-Type** : `multipart/form-data`

**Body** :
```
file: <binary>
```

**Response (201)** :
```json
{
  "data": {
    "id": "fil_...",
    "name": "document.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "url": "/api/v1/files/fil_.../download",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

**Errors** :
- `400` : Fichier trop grand (limite: FILE_MAX_SIZE_MB)
- `413` : Payload too large

---

#### GET /api/v1/files
**Description** : Liste des fichiers de l'utilisateur

**Auth** : Requise

**Query** : `?page=1&limit=20&search=document`

**Response (200)** : Liste paginée de fichiers

---

#### GET /api/v1/files/:id
**Description** : Détail d'un fichier

**Auth** : Requise (owner ou admin)

**Response (200)** : Métadonnées du fichier

---

#### GET /api/v1/files/:id/download
**Description** : Télécharger le fichier (authentifié)

**Auth** : Requise (owner ou admin)

**Response (200)** : Fichier binaire avec headers appropriés

---

#### GET /api/v1/files/:id/download-signed
**Description** : URL signée temporaire pour téléchargement

**Auth** : Requise (owner ou admin)

**Response (200)** :
```json
{
  "data": {
    "url": "https://minio/...?X-Amz-Algorithm=...",
    "expiresAt": "2026-01-01T00:15:00Z"
  }
}
```

---

#### DELETE /api/v1/files/:id
**Description** : Supprimer un fichier

**Auth** : Requise (owner ou admin)

**Response (200)** :
```json
{
  "data": {
    "message": "File deleted"
  }
}
```

---

#### GET /api/v1/media/:id
**Description** : URL publique stable pour média (sans auth)

**Auth** : Non requise

**Response (200)** : Redirect vers fichier ou stream

> **Usage** : Idéal pour PWAs et images publiques

---

### Notifications

#### GET /api/v1/notifications
**Description** : Liste des notifications de l'utilisateur

**Auth** : Requise

**Query** : `?page=1&limit=20&unreadOnly=true`

**Response (200)** :
```json
{
  "data": [
    {
      "id": "ntf_...",
      "type": "user.welcome",
      "title": "Bienvenue",
      "content": "Merci de rejoindre la plateforme",
      "isRead": false,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

---

#### GET /api/v1/notifications/unread-count
**Description** : Nombre de notifications non lues

**Auth** : Requise

**Response (200)** :
```json
{
  "data": {
    "count": 5
  }
}
```

---

#### POST /api/v1/notifications/:id/read
**Description** : Marquer une notification comme lue

**Auth** : Requise

**Response (200)** : Notification mise à jour

---

#### POST /api/v1/notifications/read-all
**Description** : Marquer toutes les notifications comme lues

**Auth** : Requise

**Response (200)** :
```json
{
  "data": {
    "count": 5,
    "message": "All notifications marked as read"
  }
}
```

---

## Codes d'erreur

| Code HTTP | Code API | Description |
|-----------|----------|-------------|
| 400 | `VALIDATION_ERROR` | Paramètres invalides |
| 401 | `UNAUTHORIZED` | Auth requise ou token invalide |
| 403 | `FORBIDDEN` | Pas les permissions nécessaires |
| 404 | `NOT_FOUND` | Ressource inexistante |
| 409 | `CONFLICT` | Conflit (email dupliqué, etc.) |
| 413 | `PAYLOAD_TOO_LARGE` | Fichier trop grand |
| 429 | `RATE_LIMITED` | Trop de requêtes |
| 500 | `INTERNAL_ERROR` | Erreur serveur |

---

## Realtime (SSE/WebSocket)

### Connection SSE

```
GET /rt/sse?access_token=<token>&channels=notifications,users
```

**Headers** :
```
Accept: text/event-stream
```

**Events** :
```
event: notification.created
data: {"id":"...","type":"...","payload":{...}}

event: user.updated
data: {"id":"...","userId":"...","changes":{...}}
```

### Connection WebSocket

```
ws://realtime.example.com/rt/ws?access_token=<token>&channels=notifications
```

**Format messages** :
```json
{
  "type": "subscribe",
  "channels": ["notifications"]
}
```

---

## Rate Limiting

| Endpoint | Limite |
|----------|--------|
| Auth (login, register) | 5/min/IP |
| API générale | 100/min/IP |
| Upload fichiers | 10/min/IP |

**Headers de réponse** :
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```
