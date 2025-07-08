# Architecture Hybride - LOG430 Lab TB

## 🏗️ Vue d'ensemble

Cette architecture hybride combine :
- **Système de base (Legacy)** pour les consoles POS et Maison Mère existantes
- **4 Microservices essentiels** : Produit, Vente, Stock, Reporting
- **Routeur intelligent** qui décide automatiquement vers quel système router
- **Kong Gateway** pour la sécurité, monitoring et gestion centralisée

## 🎯 Routage Intelligent

| Console | Ressource | Destination |
|---------|-----------|-------------|
| **POS** | Produits, Ventes | → Système de base |
| **POS** | Stock temps réel | → Stock Microservice |
| **Maison Mère** | Produits, Ventes | → Système de base |
| **Maison Mère** | Rapports avancés | → Reporting Microservice |
| **API v2** | Tout | → Microservices |
| **API v1** | Tout | → Système de base |

## 🚀 Démarrage Rapide

```bash
# Démarrer l'architecture complète
./start.sh

# Ou manuellement
docker-compose up -d

# Vérifier le statut
docker-compose ps
```

## 🔗 Points d'Accès

| Service | URL | Description |
|---------|-----|-------------|
| **Kong Gateway** | http://localhost:8001 | API Gateway principal |
| **Routeur Hybride** | http://localhost:9000 | Accès direct |
| **Kong Admin** | http://localhost:8002 | Administration Kong |
| **Load Balancer** | http://localhost:8000 | Load balancer services |
| **Prometheus** | http://localhost:9090 | Métriques |
| **Grafana** | http://localhost:3333 | Dashboards (admin/admin) |

## � Sécurité et CORS

L'architecture inclut :
- **CORS configuré** pour les domaines autorisés
- **Rate Limiting** : 200 req/min par défaut
- **API Keys** pour les intégrations externes
- **Headers de sécurité** ajoutés automatiquement
- **Logs d'accès** centralisés

## �📋 Exemples d'Utilisation

### Console POS (via Gateway)
```bash
# Produits (va vers legacy)
curl -H "X-Client-Type: pos" http://localhost:8001/pos/produits

# Stock temps réel (va vers microservice)
curl -H "X-Client-Type: pos" http://localhost:8001/pos/stock/123
```

### Console Maison Mère (via Gateway)
```bash
# Dashboard (va vers legacy)
curl -H "X-Client-Type: maisonmere" http://localhost:8001/maisonmere/dashboard

# Rapports (va vers microservice)
curl -H "X-Client-Type: maisonmere" http://localhost:8001/maisonmere/reports/analytics
```

### API Moderne (via Gateway)
```bash
# Microservices avec authentification
curl -H "X-API-Key: test-key" http://localhost:8001/api/v2/produits
curl -H "X-API-Key: test-key" http://localhost:8001/api/v2/analytics
```

## 🧪 Tests et Validation

### Tests Complets Automatisés
```bash
# Lancer tous les tests (santé, sécurité, performance, comparaisons)
./test-complete.sh
```

### Tests de Performance Comparatifs
```bash
# Tests k6 - Direct vs Gateway
k6 run tests/performance-comparison.js
```

### Collection Postman
Importez `docs/Architecture_Hybride_Postman.json` dans Postman pour tous les tests.

## 📊 Monitoring et Observabilité

### Dashboards Grafana
- **Architecture Hybride - Comparaison Performance** : Métriques Direct vs Gateway
- **Kong Gateway Security** : CORS, Rate limiting, erreurs
- **Services Health** : État de tous les microservices

### Métriques Prometheus
- Latence P95/P50 par architecture
- Taux d'erreur comparatif
- Throughput par console
- Distribution du routage

## 🗄️ Base de Données

- **PostgreSQL** (Port 5433) : Microservice Produit
- **MySQL** (Port 3306) : Système de base + autres microservices
- **Redis** (Port 6379) : Cache partagé

## � Documentation API

- **Swagger/OpenAPI** : `docs/swagger-api.yml`
- **Postman Collection** : `docs/Architecture_Hybride_Postman.json`
- **Dashboard Grafana** : `config/grafana-dashboard-comparison.json`

## ⚡ Comparaison Architecture

### Avantages Gateway (Kong)
- ✅ Sécurité renforcée (CORS, Rate limiting)
- ✅ Observabilité centralisée
- ✅ Gestion unifiée des APIs
- ✅ Transformation des requêtes/réponses

### Coûts Gateway
- ➖ Latence additionnelle (~10-30ms)
- ➖ Point de défaillance supplémentaire
- ➖ Complexité de configuration

### Résultats Tests Performance
Les tests montrent un overhead acceptable du Gateway avec une sécurité et observabilité significativement améliorées.

## 🛑 Arrêt

```bash
docker-compose down
```

## 🔧 Configuration Avancée

### Variables d'Environnement
Modifiez `docker-compose.yml` pour ajuster :
- Limites de rate limiting
- Domaines CORS autorisés
- Clés API
- Timeouts

### Règles de Routage
Modifiez `hybrid-router.js` pour personnaliser la logique de routage.

---

**🎯 Cette architecture hybride permet une migration progressive vers les microservices tout en conservant la stabilité du système legacy, avec une sécurité et une observabilité de niveau production.**
