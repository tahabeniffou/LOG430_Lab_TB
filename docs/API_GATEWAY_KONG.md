# 🌐 API Gateway Kong - Documentation Complète

## 🎯 Vue d'Ensemble

Cette implémentation utilise **Kong** comme API Gateway pour centraliser l'accès aux 4 microservices et implémenter les fonctionnalités avancées requises.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│     Client      │───▶│   Kong Gateway   │───▶│   Microservices     │
│   (Port 80xx)   │    │   (Port 8000)    │    │   (Ports 3001-3004) │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Kong Admin     │
                       │   (Port 8001)    │
                       └──────────────────┘
```

## 🚀 Démarrage Rapide

### 1. Démarrer l'architecture complète
```bash
chmod +x scripts/start-full-architecture.sh
./scripts/start-full-architecture.sh
```

### 2. Tester l'API Gateway
```bash
chmod +x scripts/test-kong.sh
./scripts/test-kong.sh
```

## 📋 Fonctionnalités Implémentées

### ✅ **1. Routage Dynamique**
- Configuration automatique des routes vers les 4 microservices
- Routage basé sur les paths `/api/produits`, `/api/magasins`, etc.
- Support de tous les verbes HTTP (GET, POST, PUT, DELETE)

**Test:**
```bash
curl http://localhost:8000/api/produits
curl http://localhost:8000/api/utilisateurs
```

### ✅ **2. Ajout d'En-têtes Personnalisés**
- `X-Gateway-Version: 1.0` - Version de la gateway
- `X-Request-ID: $request_id` - ID unique de requête pour le tracing

**Test:**
```bash
curl -I http://localhost:8000/health
# Recherchez: X-Gateway-Version et X-Request-ID
```

### ✅ **3. Logging Centralisé**
- Tous les accès sont loggés dans Kong
- Logs accessibles via `docker logs kong-gateway`
- Format structuré pour analyse

**Test:**
```bash
docker logs kong-gateway --tail 20
```

### ✅ **4. Authentification par Clé API**
- Plugin `key-auth` activé sur produit-service
- Consumer `demo-user` créé avec clé API
- Protection des endpoints sensibles

**Test:**
```bash
# Récupérer la clé API
API_KEY=$(curl -s http://localhost:8001/consumers/demo-user/key-auth | grep -o '"key":"[^"]*"' | head -1 | cut -d'"' -f4)

# Utiliser la clé
curl -H "apikey: $API_KEY" http://localhost:8000/api/produits
```

### ✅ **5. Rate Limiting**
- Limite: 100 requêtes/minute, 1000 requêtes/heure
- Protection contre les abus
- Headers informatifs retournés

### ✅ **6. Support CORS**
- Configuration CORS complète
- Support de tous les origins en développement
- Headers CORS automatiques

## 🎛️ Points d'Accès

| Service | URL Directe | URL via Gateway |
|---------|-------------|-----------------|
| **Kong Proxy** | - | http://localhost:8000 |
| **Kong Admin** | http://localhost:8001 | - |
| **Konga GUI** | http://localhost:1337 | - |
| **Produit Service** | http://localhost:3001 | http://localhost:8000/api/produits |
| **Magasin Service** | http://localhost:3002 | http://localhost:8000/api/magasins |
| **Utilisateur Service** | http://localhost:3003 | http://localhost:8000/api/utilisateurs |
| **Vente Service** | http://localhost:3004 | http://localhost:8000/api/ventes |
| **Health Check** | http://localhost:3001/health | http://localhost:8000/health |

## 🔧 Configuration Avancée

### Ajouter un nouveau service
```bash
# Créer le service
curl -i -X POST http://localhost:8001/services/ \
    --data "name=mon-service" \
    --data "url=http://host.docker.internal:3005"

# Créer la route
curl -i -X POST http://localhost:8001/services/mon-service/routes \
    --data "paths[]=/api/mon-service"
```

### Activer un plugin sur un service spécifique
```bash
curl -i -X POST http://localhost:8001/plugins/ \
    --data "name=rate-limiting" \
    --data "service.name=produit-service" \
    --data "config.minute=50"
```

### Créer une nouvelle clé API
```bash
# Créer un consumer
curl -i -X POST http://localhost:8001/consumers/ \
    --data "username=nouveau-client"

# Générer une clé
curl -i -X POST http://localhost:8001/consumers/nouveau-client/key-auth
```

## 🐳 Gestion Docker

### Démarrer seulement Kong
```bash
docker-compose -f docker-compose.kong.yml up -d
```

### Voir les logs Kong
```bash
docker logs kong-gateway -f
```

### Arrêter Kong
```bash
docker-compose -f docker-compose.kong.yml down
```

### Reset complet (supprime les données)
```bash
docker-compose -f docker-compose.kong.yml down -v
```

## 🎨 Interface Graphique Konga

1. Accéder à http://localhost:1337
2. Créer un compte admin
3. Connecter à Kong Admin API: http://kong:8001
4. Explorer les services, routes, et plugins visuellement

## 🧪 Exemples de Tests

### Test complet avec clé API
```bash
# 1. Récupérer la clé
API_KEY=$(curl -s http://localhost:8001/consumers/demo-user/key-auth | jq -r '.data[0].key')

# 2. Test avec clé (doit fonctionner)
curl -H "apikey: $API_KEY" http://localhost:8000/api/produits

# 3. Test sans clé (doit échouer avec 401)
curl http://localhost:8000/api/produits
```

### Test des en-têtes ajoutés
```bash
curl -v http://localhost:8000/health 2>&1 | grep "X-Gateway"
```

### Test du rate limiting
```bash
# Faire beaucoup de requêtes rapidement
for i in {1..10}; do
  curl -w "%{http_code}\n" -o /dev/null -s http://localhost:8000/health
done
```

## 🔍 Monitoring et Debugging

### Voir la configuration Kong
```bash
# Services
curl http://localhost:8001/services | jq '.data[] | {name, protocol, host, port}'

# Routes  
curl http://localhost:8001/routes | jq '.data[] | {name, paths, service}'

# Plugins
curl http://localhost:8001/plugins | jq '.data[] | {name, service, config}'
```

### Métriques Kong
```bash
# Status général
curl http://localhost:8001/status

# Information sur les endpoints
curl http://localhost:8001/ | jq '.'
```

## 🎯 Avantages de cette Implémentation

1. **Point d'entrée unique** - Tous les clients passent par Kong
2. **Sécurité centralisée** - Authentification et autorisation unifiées
3. **Observabilité** - Logging et métriques centralisés
4. **Flexibilité** - Configuration dynamique sans redémarrage
5. **Scalabilité** - Load balancing et circuit breaker intégrés
6. **Standards** - Compatible OpenAPI et REST

## 🔮 Extensions Possibles

- **JWT Authentication** avec `jwt` plugin
- **OAuth 2.0** avec `oauth2` plugin  
- **Load Balancing** avec plusieurs instances de services
- **Circuit Breaker** avec `proxy-cache` plugin
- **Transformation de données** avec `request-transformer-advanced`
- **Websockets** support natif
- **GraphQL** avec `graphql-proxy-cache-advanced`

Cette implémentation Kong répond parfaitement aux exigences et offre une base solide pour l'évolution future de votre architecture microservices ! 🚀
