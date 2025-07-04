# LOG430 - Système POS DDD (Domain Driven Design)

> **Architecture épurée** - Système multi-magasins avec DDD, cache distribué, load balancing, et observabilité complète

## 📁 Structure du Projet

```
📦 LOG430_Lab_TB/
├── 🏗️ src/                    # Code source
│   ├── domain/               # Logique métier DDD
│   ├── application/          # Services applicatifs
│   ├── infrastructure/       # DB, Cache, Repositories
│   ├── interfaces/           # API + Consoles
│   ├── api/                  # Infrastructure technique
│   └── models/               # Modèles Sequelize
├── 📊 tests/                 # Tests unitaires + benchmarks
├── 🧪 load-tests/           # Tests de charge K6
├── ⚙️ config/               # Configuration (nginx, prometheus)
├── 🔧 scripts/              # Scripts utilitaires
├── 📚 docs/                 # Documentation essentielle
├── 🐳 docker-compose.yml    # Orchestration complète
├── 🖥️ pos-console.js        # Console POS DDD
└── 🏢 maison-mere-console.js # Console Maison Mère DDD
```

## ⚡ Démarrage Rapide

### Démarrage du Système Complet
```bash
docker compose up --build
```

**Services accessibles :**
- 🌐 **Load Balancer**: http://localhost:8000
- 📊 **Grafana**: http://localhost:3030 (admin/admin)  
- 📈 **Prometheus**: http://localhost:9090

### Consoles Interactives
```bash
# Console POS (Magasin)
docker exec -it pos-console node pos-console.js

# Console Maison Mère  
docker exec -it maison-mere-console node maison-mere-console.js
```

## 🔧 Commandes Principales

```bash
# Développement local
npm run pos-console           # Console POS
npm run maison-mere-console   # Console Maison Mère
npm start                     # API principale

# Tests
npm test                      # Tests unitaires
npm run test:load            # Tests de charge K6
npm run benchmark            # Benchmarks performance
npm run validate             # Validation système

# Données
npm run seed                 # Initialiser données de test
```

## 🎯 Use Cases Implémentés

### 🏪 Console POS (Magasin)
- ✅ Création de ventes multi-articles
- ✅ Gestion des stocks en temps réel
- ✅ Annulation de ventes avec remise en stock
- ✅ Consultation des produits

### 🏢 Console Maison Mère  
- ✅ Rapports consolidés des ventes
- ✅ Tableau de bord global multi-magasins
- ✅ Surveillance des stocks (ruptures, niveaux)
- ✅ Analytics en temps réel

## 📊 Performance & Monitoring

- **Cache Redis** : Hit ratio >80%, latence réduite de 45%
- **Load Balancer** : 4 instances API, tolérance aux pannes
- **Métriques** : Prometheus + Grafana dashboards
- **Logs structurés** : Winston pour traçabilité complète

## 🏆 Avantages Architecture DDD

1. **Simplicité** : 3 domaines clairs, 1 service applicatif
2. **Maintenabilité** : Logique métier isolée et testable  
3. **Évolutivité** : Ajout facile de nouveaux domaines
4. **Performance** : Cache intelligent + load balancing
5. **Observabilité** : Monitoring complet production-ready
- ✅ Recherche de produits en temps réel
- ✅ Création de ventes multi-articles
- ✅ Gestion des paiements
- ✅ Suivi des stocks locaux
- ✅ Demandes de réapprovisionnement automatiques

### 🏢 Maison Mère
- ✅ Rapports consolidés en temps réel
- ✅ Classements des produits les plus vendus
- ✅ Vue d'ensemble des stocks de tous les magasins
- ✅ Analytics et tableaux de bord

### 📦 Logistique (Centre de Distribution)
- ✅ Traitement des demandes de réapprovisionnement
- ✅ Gestion des stocks du centre de distribution
- ✅ API REST complète pour intégrations

---

## 🚄 Performance et Cache

### Cache Redis Distribué
Le système utilise Redis pour optimiser les performances :

```bash
# Statistiques du cache en temps réel
curl http://localhost:8080/api/cache/stats

# Vider le cache (admin)
curl -X DELETE http://localhost:8080/api/cache/clear
```

### Endpoints Optimisés avec Cache
- `GET /api/produits` - Cache 5 min, invalidation auto
- `GET /api/rapports/*` - Cache 10 min, invalidation intelligente
- `GET /api/magasins` - Cache 15 min
- `GET /api/ventes` - Cache 2 min avec pagination

### Tests de Performance Automatisés

```bash
# Tests de performance du cache
npm run test:cache

# Benchmarks comparatifs (avec/sans cache)
npm run benchmark

# Tests de charge K6
npm run test:load
```

**Résultats typiques :**
```
Cache Performance:
✓ Latence moyenne réduite de 45%
✓ Débit augmenté de 1.8x
✓ Cache hit ratio: 85%
✓ Temps de réponse P95: 120ms → 65ms
```

---

## 📊 Observabilité et Monitoring

### Métriques Prometheus
Le système expose automatiquement les **4 Golden Signals** :
- **Latence** : P50, P95, P99 par endpoint
- **Trafic** : Requêtes/seconde, répartition par API
- **Erreurs** : Taux d'erreur 4xx/5xx par service
- **Saturation** : CPU, mémoire, connexions DB/Redis

### Dashboards Grafana
Accédez à Grafana sur http://localhost:3001 (admin/admin)

**Dashboards disponibles :**
- 📈 **API Performance** : Latence, débit, erreurs
- 🔄 **Load Balancer** : Répartition, santé des instances
- 💾 **Cache Redis** : Hit ratio, performance, utilisation
- 💽 **Base de Données** : Connexions, requêtes lentes
- 🏗️ **Infrastructure** : CPU, mémoire, réseau

### Logs Structurés
```bash
# Logs en temps réel avec Winston
docker compose logs -f api

# Filtrage par niveau
docker compose logs -f api | grep ERROR
docker compose logs -f api | grep CACHE
```

---

## ⚖️ Load Balancing et Résilience

### Configuration NGINX
4 instances API derrière NGINX avec :
- **Round-robin** par défaut
- **Health checks** automatiques
- **Failover** transparent
- **Session affinity** configurable

### Tests de Résilience

```bash
# Test de charge pendant une panne simulée
k6 run k6_load_balancer.js &

# Arrêt d'une instance pendant le test
docker stop log430_lab_tb-api-2

# Observation de la continuité de service dans Grafana
```

### Stratégies de Load Balancing

Modifiez `nginx.conf` pour changer la stratégie :

```nginx
upstream api_backend {
    # Round Robin (défaut)
    server api-1:3000;
    server api-2:3000;
    server api-3:3000;
    server api-4:3000;
    
    # Décommentez pour d'autres stratégies :
    # least_conn;    # Least Connections
    # ip_hash;       # IP Hash (session affinity)
}
```

---

## 🧪 Tests et Qualité

### Suite de Tests Complète

```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Tests du cache
npm run test:cache

# Tests de charge
npm run test:load

# Tests de l'API complète
npm run test:api
```

### Tests de Charge K6

```bash
# Test de charge standard
k6 run k6_load_test.js

# Test spécifique load balancer
k6 run k6_load_balancer.js

# Test API unique (comparaison)
k6 run k6_single_api.js
```

### Benchmarks Performance

```bash
# Comparaison avec/sans cache
npm run benchmark

# Profiling complet
npm run profile
```

---

## 🐳 Déploiement et DevOps

### Docker Compose Services

| Service | Port(s) | Description |
|---------|---------|-------------|
| **nginx** | 8080 | Load balancer principal |
| **api-1** | 3000 | Instance API primaire |
| **api-2** | 3001 | Instance API secondaire |
| **api-3** | 3002 | Instance API tertiaire |
| **api-4** | 3003 | Instance API quaternaire |
| **redis** | 6379 | Cache distribué |
| **db** | 5432 | Base PostgreSQL |
| **prometheus** | 9090 | Collecteur de métriques |
| **grafana** | 3001 | Dashboards et alertes |

### Variables d'Environnement

Créez un fichier `.env` :

```env
# Base de données
DB_HOST=db
DB_PORT=5432
DB_NAME=pos_system
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# API
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Cache
CACHE_TTL_DEFAULT=300
CACHE_TTL_PRODUITS=300
CACHE_TTL_RAPPORTS=600
CACHE_TTL_MAGASINS=900
```

### Commandes de Gestion

```bash
# Démarrage clean
docker compose down -v
docker compose up --build

# Scaling manuel
docker compose up --scale api=6

# Nettoyage complet
docker compose down -v --remove-orphans
docker system prune -af

# Logs détaillés
docker compose logs -f --tail=100
```

---

## 📈 Métriques et KPIs

### Performances Système
- **Latence P95** : < 100ms (objectif < 50ms avec cache)
- **Débit** : > 1000 req/sec par instance
- **Availability** : 99.9% (objectif 99.99%)
- **Cache Hit Ratio** : > 80%

### Métriques Métier
- **Ventes/minute** : Suivi en temps réel
- **Stock alerts** : Notifications automatiques
- **Revenue tracking** : Analytics par magasin
- **Product performance** : Top sellers, slow movers

### Monitoring Proactif
- **Alertes Grafana** : Latence, erreurs, indisponibilité
- **Health checks** : API, Redis, PostgreSQL
- **Capacity planning** : Prédiction de charge
- **Performance regression** : Tests automatisés

---

## 🔧 Configuration Avancée

### Optimisation Redis

```bash
# Configuration Redis optimisée
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 1gb
redis-cli CONFIG SET timeout 300
```

### Optimisation PostgreSQL

```sql
-- Configuration pour haute performance
SET shared_buffers = '256MB';
SET max_connections = 200;
SET work_mem = '4MB';
SET maintenance_work_mem = '64MB';
```

### Optimisation NGINX

```nginx
# nginx.conf - optimisations
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
keepalive_requests 100;

# Compression
gzip on;
gzip_types text/plain application/json;

# Caching static
location ~* \.(css|js|png|jpg)$ {
    expires 1y;
    add_header Cache-Control public;
}
```

---

## 🚀 Guide de Mise en Production

### Checklist Pré-Production

- [ ] **Tests** : Tous les tests passent
- [ ] **Performance** : Benchmarks satisfaisants
- [ ] **Sécurité** : Scan de vulnérabilités
- [ ] **Monitoring** : Alertes configurées
- [ ] **Backup** : Stratégie de sauvegarde
- [ ] **DR** : Plan de reprise d'activité

### Déploiement Production

```bash
# 1. Préparation
export NODE_ENV=production
docker compose -f docker-compose.prod.yml build

# 2. Migration base
docker compose exec db psql -U postgres -d pos_system -f migrations/latest.sql

# 3. Déploiement
docker compose -f docker-compose.prod.yml up -d

# 4. Vérification
curl -f http://localhost:8080/health || exit 1
```

### Monitoring Production

```bash
# Monitoring continu
docker compose logs -f --tail=100
curl http://localhost:8080/api/cache/stats
curl http://localhost:9090/metrics
```

---

## 📚 Documentation Technique

### Liens Utiles
- 📖 [Documentation Cache](./docs/Cache_Documentation.md)
- 🚀 [Guide de Déploiement](./CACHE_DEPLOYMENT.md)
- 🏗️ [Architecture Decision Records](./docs/ADR.md)
- 📊 [Analyse des Besoins](./docs/Analyse_besoins.md)
- 🎯 [Cas d'Utilisation](./docs/VueCasUtilisation.md)

### API Reference
- **Swagger UI** : http://localhost:8080/api-docs
- **Postman Collection** : `./docs/api-collection.json`
- **OpenAPI Spec** : `./docs/openapi.yaml`

---

## 🤝 Contribution et Support

### Développement Local

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement
npm run dev

# Tests en mode watch
npm run test:watch

# Linting et formatage
npm run lint
npm run format
```

### Contribution Guidelines
1. **Fork** le repository
2. **Branch** : `git checkout -b feature/ma-feature`
3. **Commit** : `git commit -m "feat: nouvelle fonctionnalité"`
4. **Push** : `git push origin feature/ma-feature`
5. **Pull Request** avec description détaillée

### Support
- 🐛 **Issues** : Utilisez GitHub Issues
- 💬 **Discussions** : GitHub Discussions
- 📧 **Contact** : `taha.beniffou@ens.etsmtl.ca`

---

## 📄 Licence et Crédits

**Projet académique** - LOG430 - École de technologie supérieure (ÉTS)

**Auteur** : Taha Beniffou

**Remerciements** :
- Professeurs du cours LOG430
- Communauté open source (Node.js, Redis, NGINX, Prometheus, Grafana)
- Outils d'assistance IA pour l'optimisation du code et de la documentation

---

## 🎯 Roadmap et Améliorations Futures

### Version Actuelle (v4.0)
- ✅ Cache distribué Redis
- ✅ Load balancer NGINX 4 instances
- ✅ Observabilité complète
- ✅ Tests de performance automatisés

### Prochaines Versions
- 🔄 **v4.1** : Auto-scaling Kubernetes
- 🔄 **v4.2** : Circuit breaker pattern
- 🔄 **v4.3** : Message queues (RabbitMQ)
- 🔄 **v4.4** : Multi-région deployment
- 🔄 **v5.0** : Microservices architecture

---

**🎉 Système POS Distribué Haute Performance - Prêt pour l'Entreprise !**

> *"Performance, Résilience, Observabilité - Les trois piliers d'un système distribué moderne"*
