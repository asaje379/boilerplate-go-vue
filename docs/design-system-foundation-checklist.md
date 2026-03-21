# Design System & Application Foundation Checklist

Ce document sert de checklist de référence pour construire un cadre de développement cohérent, maintenable et fluide.

Il ne couvre pas seulement les composants UI, mais aussi les conventions applicatives qui permettent à l'interface, à la donnée et à l'API de fonctionner comme un système unique.

## 1. Fondations UI

- [ ] Layout applicatif global défini
- [ ] Sidebar / header / footer / contenu principal normalisés
- [ ] Espacements, rayons, ombres, bordures harmonisés
- [ ] Typographie stabilisée
- [ ] Couleurs sémantiques définies (`primary`, `muted`, `destructive`, `warning`, `success`)
- [ ] Modes thème (`light`, `dark`, `system`) correctement gérés
- [ ] Responsive behavior documenté
- [ ] États hover / focus / active / disabled cohérents
- [ ] Gestion du focus visible uniforme

## 2. Primitives de composants

- [ ] Button
- [ ] Input
- [ ] Textarea
- [ ] Select
- [ ] Checkbox
- [ ] Radio Group
- [ ] Switch
- [ ] Badge
- [ ] Avatar
- [ ] Tooltip
- [ ] Dropdown Menu
- [ ] Dialog / Drawer / Sheet
- [ ] Tabs
- [ ] Table / DataTable primitives
- [ ] Skeleton
- [ ] Empty State
- [ ] Error State
- [ ] Pagination primitives

## 3. Composants système

- [ ] AppLayout
- [ ] AppPreferencesMenu
- [ ] AppNotificationsMenu
- [ ] AppUserMenu
- [ ] AppModalHost
- [ ] AppToastHost
- [ ] AppConfirm helpers
- [ ] AppPageLoader
- [ ] AppPageError
- [ ] AppPageEmpty
- [ ] AppSection / AppCard / AppPanel conventions

## 4. Gestion des requêtes HTTP

- [ ] Client HTTP unique côté frontend
- [ ] Base URL centralisée
- [ ] Headers communs standardisés
- [ ] Injection du token d'accès
- [ ] Gestion du refresh token définie
- [ ] Timeout défini
- [ ] Parsing JSON uniforme
- [ ] Gestion des erreurs réseau
- [ ] Gestion des erreurs HTTP standardisée
- [ ] Support de l'annulation des requêtes
- [ ] Convention de retry explicitée
- [ ] Journalisation minimale des erreurs techniques

## 5. Contrat API / réponses backend

- [ ] Format de succès standardisé
- [ ] Format d'erreur standardisé
- [ ] Codes métier stables
- [ ] Messages destinés au frontend distingués des détails techniques
- [ ] Erreurs de validation structurées par champ
- [ ] Pagination standardisée
- [ ] Tri et filtres standardisés
- [ ] Dates et timestamps homogènes
- [ ] Swagger / OpenAPI aligné avec la réponse réelle

## 6. Authentification / session

- [ ] Session store global
- [ ] `currentUser` comme source de vérité unique
- [ ] `isAuthenticated` dérivé et fiable
- [ ] Login / OTP / verify / refresh / logout unifiés
- [ ] Expiration de session gérée
- [ ] Redirection après 401 définie
- [ ] Guards router définis
- [ ] Permissions / rôles normalisés
- [ ] Logout forcé si refresh invalide

## 7. États asynchrones

Pour chaque écran, liste ou formulaire :

- [ ] idle
- [ ] loading
- [ ] success
- [ ] empty
- [ ] error
- [ ] submitting
- [ ] refreshing si nécessaire

À éviter : gérer ces états différemment dans chaque vue.

## 8. Feedback utilisateur

- [ ] Toast succès
- [ ] Toast erreur
- [ ] Toast info
- [ ] Confirm dialogs
- [ ] Bannières d'erreur
- [ ] Messages inline de validation
- [ ] Indicateurs pending sur actions
- [ ] États vides utiles
- [ ] Messages de récupération après erreur

## 9. Formulaires

- [ ] Convention de validation commune
- [ ] Mapping erreurs backend -> champs
- [ ] Messages d'erreur uniformes
- [ ] États `dirty`, `touched`, `submitting`
- [ ] Sauvegarde optimiste ou non explicitée
- [ ] Unsaved changes guard si nécessaire
- [ ] Composants de sections de formulaire
- [ ] Actions de formulaire homogènes

## 10. Données et modèles frontend

- [ ] Séparer DTO API et modèles UI si nécessaire
- [ ] Nommage cohérent (`camelCase` côté TS)
- [ ] Types partagés par domaine
- [ ] Helpers de transformation centralisés
- [ ] Pas de logique de mapping dispersée dans les vues

## 11. Tables, recherche, pagination, filtres

- [ ] Paramètres query standardisés
- [ ] Convention de pagination commune
- [ ] Recherche avec debounce si nécessaire
- [ ] Tri multi-colonnes ou non explicitement décidé
- [ ] États vides / chargement / erreur prévus
- [ ] Synchronisation possible avec l'URL

## 12. Notifications et activités

- [ ] Modèle de notification clair
- [ ] `read/unread` défini
- [ ] Compteur global géré
- [ ] Événements utilisateur importants identifiés
- [ ] Historique / audit futur anticipé si besoin

## 13. Accessibilité

- [ ] Labels accessibles
- [ ] Focus management sur menus/dialogs
- [ ] Navigation clavier correcte
- [ ] `sr-only` pour icônes seules
- [ ] Contrastes suffisants
- [ ] États d'erreur annoncés correctement
- [ ] Taille de cible clickable correcte

## 14. Internationalisation

- [ ] Clés de traduction structurées
- [ ] Pas de strings hardcodées dans les composants métier
- [ ] Fallback de locale défini
- [ ] Dates / nombres / devises localisés si nécessaire
- [ ] Messages backend localisables si voulu

## 15. Organisation de code

- [ ] `components/ui` réservé aux primitives visuelles
- [ ] `components/system` réservé au shell et transverse
- [ ] `features/*` par domaine métier
- [ ] `services/http` pour la couche réseau
- [ ] `services/api` pour les modules backend
- [ ] `stores` uniquement pour état global légitime
- [ ] `composables` pour logique transverse réutilisable
- [ ] `types` ou `models` organisés par domaine

## 16. Qualité et DX

- [ ] ESLint / Prettier / formatage stabilisés
- [ ] Conventions de nommage documentées
- [ ] Fichiers d'exemple / playgrounds utiles
- [ ] Tests des briques critiques
- [ ] Checklists de review disponibles
- [ ] Documentation d'architecture maintenue

## 17. Observabilité et sécurité

- [ ] Logs backend structurés
- [ ] Corrélation possible des erreurs
- [ ] Gestion des erreurs sensibles sans fuite d'implémentation
- [ ] Rate limiting côté API
- [ ] CORS documenté
- [ ] Politique de secrets claire
- [ ] Audit des permissions prévu

## Priorités recommandées

### Priorité 1

- Client HTTP frontend
- Contrat d'erreur backend/frontend
- Session/auth

### Priorité 2

- Toasts / feedback global
- États de page standardisés
- Query / pagination / filtres standardisés

### Priorité 3

- Permissions
- Formulaires avancés
- Notifications réelles

### Priorité 4

- Documentation formelle
- Tests des patterns critiques
- outillage de review et de qualité

## Décision structurante

Le point clé est le suivant :

Le design system ne doit pas être vu comme un simple catalogue de composants.

Il doit devenir un contrat partagé entre :

- l'UI
- la gestion des données
- les états asynchrones
- les erreurs
- l'API
- l'expérience développeur

Sans ça, l'interface reste jolie mais l'application devient hétérogène.
