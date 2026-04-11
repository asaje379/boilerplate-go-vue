# API

Serveur web Go base sur Gin, Gorm, Postgres, JWT, refresh tokens et Swaggo, organise avec une clean architecture simple.

## Architecture

- `internal/domain`: entites et contrats metier
- `internal/application`: logique metier / use cases
- `internal/infrastructure`: acces Postgres via Gorm
- `internal/interfaces/http`: handlers Gin, middleware, presenters, routes
- `internal/bootstrap`: assemblage des dependances
- `internal/platform`: configuration et concerns transverses

## Variables d'environnement

- `PORT`: port HTTP du serveur
- `DATABASE_URL`: URL Postgres complete, ex. `postgres://user:pass@host:5432/dbname?sslmode=disable`
- `JWT_SECRET`: secret de signature JWT
- `ACCESS_TOKEN_TTL_MINUTES`: duree de vie du token d'acces
- `REFRESH_TOKEN_TTL_MINUTES`: duree de vie du refresh token
- `FILE_SIGNED_URL_TTL_MINUTES`: duree de vie des URLs signees de download
- `FILE_MAX_SIZE_MB`: taille maximale autorisee pour un upload
- `LOGIN_OTP_TTL_MINUTES`: duree de vie de l'OTP email pour le 2FA de connexion
- `PASSWORD_RESET_OTP_TTL_MINUTES`: duree de vie de l'OTP email de reinitialisation
- `DEFAULT_LOCALE`: locale par defaut pour les nouveaux users (`fr` ou `en`)
- `ADMIN_NAME`: nom de l'admin seed
- `ADMIN_EMAIL`: email du seed admin optionnel
- `ADMIN_PASSWORD`: mot de passe du seed admin optionnel
- `SEED_USER_NAME`: nom du user seed optionnel
- `SEED_USER_EMAIL`: email du user seed optionnel
- `SEED_USER_PASSWORD`: mot de passe du user seed optionnel
- `SWAGGER_USERNAME` / `SWAGGER_PASSWORD`: basic auth pour Swagger
- `CORS_ALLOWED_ORIGINS`: whitelist des origines front autorisees
- `PUBLIC_API_BASE_URL`: base URL publique de l'API, utilisee pour construire les URLs media proxy
- `RATE_LIMIT_RPM` / `RATE_LIMIT_BURST`: limites rate limiting local par IP
- `REGISTER_ALLOWED_EMAILS`: whitelist explicite d'emails autorises a s'inscrire
- `REGISTER_ALLOWED_DOMAINS`: whitelist de domaines email autorises a s'inscrire
- `OBJECT_STORAGE_PROVIDER`: `aws` ou `minio`
- `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `MINIO_PUBLIC_URL`
- `MAIL_PROVIDER`: `mailchimp`, `brevo` ou `smtp`
- `MAILCHIMP_TRANSACTIONAL_API_KEY`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_SSL`
- `RABBITMQ_URL`: URL AMQP vers RabbitMQ 4.1+
- `RABBITMQ_TASKS_EXCHANGE`: exchange topic pour les taches asynchrones (`boilerplate.tasks`)
- `RABBITMQ_REALTIME_EXCHANGE`: exchange topic pour les evenements realtime (`boilerplate.realtime`)
- `RABBITMQ_WORKER_QUEUE`, `RABBITMQ_WORKER_CONSUMER_TAG`: queue et consumer tag du worker API
- `WASENDER_API_KEY`: provider WhatsApp optionnel

## Demarrage

```bash
cp .env.example .env
go mod tidy
go run . swagger
go run . serve
go run . worker
```

Au demarrage, l'application:

- cree la base Postgres cible si elle n'existe pas encore
- applique les migrations SQL embarquees
- execute les seeds optionnels (admin et user)

## Commandes CLI

```bash
go run . serve
go run . worker
go run . migrate
go run . seed
go run . swagger
```

- `serve`: lance le serveur, applique les migrations et execute les seeds
- `worker`: consomme les taches asynchrones RabbitMQ (emails OTP et futures taches)
- `migrate`: cree la base si besoin et applique uniquement les migrations
- `seed`: applique d'abord les migrations puis execute uniquement les seeds
- `swagger`: regenere `docs/docs.go`, `docs/swagger.json` et `docs/swagger.yaml`

Le conteneur `api` demarre `serve` par defaut. En deploiement, vous pouvez lancer le worker avec `API_COMMAND=worker`; il expose alors un healthcheck minimal sur `/api/v1/health`.

Swagger UI est expose sur `http://localhost:8080/swagger/index.html`.

Swagger est protege par basic auth.

## Endpoints principaux

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me/profile-photo`
- `GET /api/v1/users` (admin)
- `GET /api/v1/users/:id` (admin)
- `POST /api/v1/files/upload`
- `GET /api/v1/files`
- `GET /api/v1/files/:id`
- `GET /api/v1/files/:id/download`
- `DELETE /api/v1/files/:id`
- `GET /api/v1/files/:id/download-signed`
- `GET /api/v1/files/public/:id/download`
- `GET /api/v1/media/:id`
- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `POST /api/v1/notifications/:id/read`
- `POST /api/v1/notifications/read-all`

## Pagination et recherche

- Les routes liste utilisent un helper commun de query params
- Parametres supportes: `page`, `limit`, `search`, `sortBy`, `sortOrder`
- Exemple: `GET /api/v1/users?page=1&limit=20&search=admin&sortBy=email&sortOrder=asc`
- Exemple fichiers: `GET /api/v1/files?page=1&limit=20&search=pdf&sortBy=createdAt&sortOrder=desc`

## Notes securite

- Les mails temporaires sont bloques via la blocklist publique du projet `disposable-email-domains`, avec prise en compte de son `allowlist.conf`.
- Si `REGISTER_ALLOWED_EMAILS` ou `REGISTER_ALLOWED_DOMAINS` est renseigne, l'inscription est restreinte a cette allowlist.
- Le CORS travaille sur des origines HTTP, pas sur des emails. La restriction par email est donc geree cote inscription.

## Migrations

- Les migrations SQL embarquees vivent dans `internal/platform/migrations/sql`
- L'etat est trace dans la table `schema_migrations`
- La structure initiale cree `users` et `refresh_tokens`
- Les migrations creent aussi la table `files` pour les metadonnees d'upload
- Les IDs applicatifs sont des CUID string, plus des auto-increment int

## Stockage de fichiers

- Les binaires sont stockes sur un backend S3-compatible
- Support direct de `aws` et `minio`
- Les metadonnees sont stockees en base Postgres
- La suppression efface l'objet stocke puis supprime la metadata en base
- Les uploads sont valides par taille maximale via `FILE_MAX_SIZE_MB`
- Un utilisateur peut reutiliser un fichier uploadé comme photo de profil via `PATCH /api/v1/users/me/profile-photo`
- `download-signed` retourne une URL temporaire signee
- `download public` stream directement le binaire si le fichier est public
- `GET /api/v1/media/:id` expose une URL media stable basee sur l'API, utile pour les frontends publics et les PWAs

## Emails transactionnels et OTP

- L'envoi d'email peut passer par Mailchimp Transactional, Brevo ou SMTP
- Tous les emails transactionnels passent par un template HTML unique avec contenu localise
- Locales supportees actuellement: `fr` et `en`
- Le login declenche un OTP envoye par email avant emission des tokens
- `verify-otp` finalise la connexion et retourne les tokens JWT
- `forgot-password` envoie un OTP email et `reset-password` permet la reinitialisation du mot de passe

## RabbitMQ, worker et realtime

- RabbitMQ est utilise comme colonne vertebrale inter-services, avec une cible serveur minimum `4.1`
- l'API publie des taches asynchrones sur `RABBITMQ_TASKS_EXCHANGE`
- le worker API consomme `email.send` pour l'envoi des emails transactionnels et relaye des notifications applicatives basees sur `notifications.yaml`
- l'API publie aussi des evenements realtime sur `RABBITMQ_REALTIME_EXCHANGE` pour le service `realtime-gateway`

## Notifications et crons

- Les notifications metier generiques se configurent dans `notifications.yaml`
- Les canaux supportes par defaut sont `in_app` et `email`
- Les notifications in-app sont persistees dans la table `notifications` puis republiees en realtime sur `notification.created`
- Les crons worker se configurent dans `crons.yaml`
- Deux jobs d'entretien sont fournis: purge des OTP expires et purge des refresh tokens expires/revoques

## Seeds

- `ADMIN_EMAIL` + `ADMIN_PASSWORD` seedent un compte admin si absent
- `SEED_USER_EMAIL` + `SEED_USER_PASSWORD` seedent un compte user si absent
