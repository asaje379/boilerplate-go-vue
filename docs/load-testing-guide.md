# Load Testing Guide

Guide de tests de charge (performance) pour l'API et le Realtime Gateway.

---

## Outil : Artillery

Artillery est un outil de load testing moderne, scalable et facile à utiliser.

### Installation

```bash
# Global (recommandé)
npm install -g artillery

# Ou local dans chaque projet
cd api/load-tests && npm install
cd realtime-gateway/load-tests && npm install
```

Vérification :
```bash
artillery --version
```

---

## API Load Tests

### Structure

```
api/load-tests/
├── artillery.config.yml    # Test de charge principal
├── quick-smoke-test.yml    # Test rapide (smoke)
├── spike-test.yml          # Test de résilience (spike)
└── package.json            # Scripts npm
```

### Scénarios de test

#### 1. Smoke Test (Vérification rapide)

```bash
cd api/load-tests

# Test rapide 10 secondes, 1 req/s
artillery run quick-smoke-test.yml

# Ou via npm
npm run smoke
```

**Vérifie :**
- Health endpoint répond
- Setup status répond
- Temps de réponse < 1s
- Pas d'erreurs

#### 2. Load Test (Test de charge)

```bash
cd api/load-tests

# Test complet (6 minutes)
artillery run artillery.config.yml

# Avec variables d'environnement
API_BASE_URL=http://localhost:8080 artillery run artillery.config.yml

# Avec rapport HTML
npm run report
```

**Phases :**
| Phase | Durée | RPS | Description |
|-------|-------|-----|-------------|
| Warm up | 60s | 5 | Montée progressive |
| Ramp up | 120s | 10→50 | Augmentation charge |
| Peak | 60s | 50 | Charge maximale |
| Recovery | 60s | 10 | Récupération |

**Scénarios :**
- Health Check (20%)
- Authentication (30%)
- Users Management (25%)
- Setup Status (15%)
- Mixed Operations (10%)

**Seuils :**
- `http.response_time.p95 < 500ms`
- `http.response_time.p99 < 1000ms`
- `http.error_rate < 1%`

#### 3. Spike Test (Test de résilience)

```bash
cd api/load-tests
npm run spike
```

**Simule :**
- Trafic normal (10 RPS)
- Pic brutal (200 RPS)
- Maintien du pic (60s)
- Retour à la normale

**Objectif :** Vérifier que l'API ne plante pas sous charge extrême.

### Commandes utiles

```bash
# Avec token JWT (pour tests authentifiés)
JWT_TOKEN=xxx artillery run artillery.config.yml

# Sortie JSON pour analyse
artillery run artillery.config.yml --output report.json

# Générer rapport HTML
artillery report report.json

# Environnement spécifique
artillery run --environment production artillery.config.yml
```

---

## Realtime Gateway Load Tests

### Structure

```
realtime-gateway/load-tests/
├── sse-load-test.yml        # Connexions Server-Sent Events
├── websocket-load-test.yml  # Connexions WebSocket
├── websocket-load-test.js    # Fonctions custom
└── package.json             # Scripts
```

### SSE (Server-Sent Events)

```bash
cd realtime-gateway/load-tests

# Test SSE
npm run sse

# Avec rapport
npm run sse-report
```

**Teste :**
- Connexions SSE simultanées (jusqu'à 50)
- Authentification via URL params
- Multi-canaux (notifications, users)
- Tenue des connexions longues

**Métriques :**
- Temps d'établissement connexion
- Nombre de connexions actives
- Taux d'erreur de connexion
- Messages reçus par seconde

### WebSocket

```bash
cd realtime-gateway/load-tests

# Test WebSocket
npm run websocket

# Avec rapport
npm run ws-report
```

**Teste :**
- Connexions WebSocket (jusqu'à 100)
- Subscribe/unsubscribe channels
- Reconnexions fréquentes
- Ping/pong pour maintenir connexions

**Scénarios :**
| Scénario | Weight | Description |
|----------|--------|-------------|
| Basic Connection | 50% | Connexion simple, 1 canal |
| Multi-Channel | 30% | 3 canaux, changements dynamiques |
| Reconnections | 20% | Déco/reco fréquentes |

---

## Intégration CI/CD

### GitHub Actions

```yaml
# .github/workflows/load-test.yml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * 1'  # Tous les lundis à 2h
  workflow_dispatch:

jobs:
  api-load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Artillery
        run: npm install -g artillery
      
      - name: Start infrastructure
        run: docker-compose up -d postgres rabbitmq
      
      - name: Start API
        run: |
          cd api
          go build -o api .
          ./api serve &
          sleep 10  # Attendre le démarrage
      
      - name: Run smoke test
        run: |
          cd api/load-tests
          artillery run quick-smoke-test.yml
      
      - name: Run load test
        run: |
          cd api/load-tests
          artillery run artillery.config.yml --output report.json
      
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: load-test-report
          path: api/load-tests/report.json
```

---

## Interprétation des résultats

### Métriques clés

| Métrique | Bon | Moyen | Mauvais |
|----------|-----|-------|---------|
| `http.response_time.min` | < 50ms | 50-100ms | > 100ms |
| `http.response_time.median` | < 100ms | 100-300ms | > 300ms |
| `http.response_time.p95` | < 200ms | 200-500ms | > 500ms |
| `http.response_time.p99` | < 500ms | 500-1000ms | > 1000ms |
| `http.error_rate` | < 0.1% | 0.1-1% | > 1% |
| `vusers.completed` | > 95% | 90-95% | < 90% |

### Rapport HTML

Générer un rapport visuel :
```bash
artillery run artillery.config.yml --output report.json
artillery report report.json
# Ouvrir report.html dans le navigateur
```

**Le rapport montre :**
- Latence (min, max, moyenne, percentiles)
- RPS (requests per second)
- Codes HTTP
- Scénarios réussis/échoués
- Graphiques temporels

---

## Optimisation basée sur les tests

### Si latence élevée

1. **Database**
   - Ajouter des index sur les colonnes filtrées
   - Vérifier les N+1 queries
   - Activer le connection pooling

2. **API**
   - Activer le caching Redis
   - Optimiser les serializers JSON
   - Utiliser gzip compression

3. **Infrastructure**
   - Augmenter les ressources CPU/RAM
   - Mettre en place un load balancer
   - Activer le rate limiting

### Si erreurs sous charge

1. **Database connections**
   - Augmenter `max_connections` PostgreSQL
   - Ajuster le pool de connexions GORM

2. **Timeout**
   - Augmenter `read_timeout` / `write_timeout`
   - Mettre en place des circuit breakers

3. **Queue**
   - Augmenter les workers RabbitMQ
   - Implémenter des retries avec backoff

---

## Tests de charge distribués

Pour des tests à grande échelle (> 1000 RPS) :

```bash
# Utiliser Artillery Pro ou AWS Fargate
artillery run-cluster --count 10 --region eu-west-1 artillery.config.yml
```

Ou avec k6 (alternative) :
```bash
# k6 pour tests distribués
k6 run --out influxdb=http://localhost:8086/k6 script.js
```

---

## Résumé des commandes

```bash
# API
cd api/load-tests
npm run smoke      # Test rapide
npm run load       # Test de charge
npm run spike      # Test de résilience
npm run report     # Avec rapport HTML

# Realtime Gateway
cd realtime-gateway/load-tests
npm run sse        # Test SSE
npm run websocket  # Test WebSocket
npm run combined   # Les deux

# Makefile (racine)
make load-test     # Si ajouté au Makefile
```

---

## Ressources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Artillery WebSocket Engine](https://www.artillery.io/docs/reference/engines/websocket)
- [Performance Testing Best Practices](https://www.artillery.io/docs/guides/guides-performance-testing)
