# 🏗️ Fonctionnement Étape par Étape - Architecture Hybride

## 📋 Vue d'Ensemble du Système

L'architecture hybride combine un **système legacy monolithique** avec **4 microservices essentiels**, le tout orchestré par un **routeur intelligent** et sécurisé par **Kong Gateway**.

## 🔄 Flux de Démarrage Complet

### 1. **Initialisation (start.sh)**
```bash
./start.sh
```

**Séquence d'exécution :**
1. **Nettoyage** des containers existants
2. **Construction** des images Docker
3. **Démarrage** des bases de données (PostgreSQL, MySQL, Redis)
4. **Lancement** des services dans l'ordre de dépendance
5. **Configuration** de Kong Gateway
6. **Activation** du monitoring (Prometheus + Grafana)

### 2. **Architecture des Services**

```
┌─────────────────────────────────────────────────────────────────┐
│                        KONG GATEWAY (8001)                     │
│                     Sécurité • CORS • Rate Limiting            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   HYBRID ROUTER (9000)                         │
│                    Routage Intelligent                         │
└─────┬─────────────┬─────────────┬─────────────┬─────────────────┘
      │             │             │             │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────────────────┐
│  Legacy   │ │ Produit   │ │   Vente   │ │ Stock │ Reporting     │
│ (3000)    │ │(3001,3005)│ │  (3004)   │ │(3007) │    (3008)     │
│           │ │Load       │ │           │ │       │               │
│           │ │Balanced   │ │           │ │       │               │
└───────────┘ └───────────┘ └───────────┘ └───────┘───────────────┘
```

## 🧠 Logique de Routage Intelligent

### **Règles de Routage par Client**

#### 🖥️ **Console POS**
- **Endpoint** : `/pos/*`
- **Client Header** : `X-Client-Type: POS`
- **Stratégie** : Legacy prioritaire + Stock microservice
- **Utilise** :
  - 🔄 Legacy : Transactions, UI, logique métier
  - 🔄 Stock microservice : Vérifications temps réel

#### 🏢 **Console Maison Mère** 
- **Endpoint** : `/maisonmere/*`
- **Client Header** : `X-Client-Type: MAISONMERE`
- **Stratégie** : Legacy prioritaire + Reporting microservice
- **Utilise** :
  - 🔄 Legacy : Gestion magasins, configuration
  - 🔄 Reporting microservice : Rapports avancés, analytics

#### 🚀 **API Moderne**
- **Endpoint** : `/api/*`
- **Client Header** : `X-Client-Type: API`
- **Stratégie** : Microservices prioritaires
- **Utilise** :
  - 🔄 Tous les microservices
  - 🔄 Fallback vers legacy si indisponible

#### 🌐 **Web/Mobile**
- **Endpoint** : `/produits`, `/ventes`, etc.
- **Client Header** : `X-Client-Type: WEB|MOBILE`
- **Stratégie** : Microservices avec fallback intelligent

## 📊 Exemples Concrets de Routage

### **Scénario 1: Vente POS**
```
1. Caissier scanne un produit
   GET /pos/produits/123
   → Router → Legacy System
   
2. Vérification stock temps réel
   GET /pos/stock/realtime/123
   → Router → Stock Microservice
   
3. Finalisation vente
   POST /pos/transactions/456/finaliser
   → Router → Legacy System
```

### **Scénario 2: Rapport Maison Mère**
```
1. Accès console direction
   GET /maisonmere
   → Router → Legacy System
   
2. Demande rapport avancé
   GET /maisonmere/rapports/ventes-tendances
   → Router → Reporting Microservice
   
3. Export données
   GET /maisonmere/rapports/export/csv
   → Router → Reporting Microservice
```

### **Scénario 3: API Mobile**
```
1. Login mobile
   POST /api/auth/login
   → Router → Vente Microservice
   
2. Catalogue produits
   GET /api/produits?category=electronique
   → Router → Load Balancer → Produit Microservice (1,2,3)
   
3. Synchronisation hors-ligne
   POST /api/sync/offline-data
   → Router → Legacy (fallback si microservice down)
```

## 🔒 Sécurité via Kong Gateway

### **Politiques Activées**
- **CORS** : Origines autorisées, headers contrôlés
- **Rate Limiting** : 200/minute, 5000/heure
- **Headers sécurisé** : Transformation, logging
- **Logging** : Toutes requêtes tracées

### **Pipeline de Sécurité**
```
Requête Client
    ↓
Kong Gateway
    ├─ Validation CORS
    ├─ Vérification Rate Limit
    ├─ Ajout Headers Sécurité
    └─ Log de la requête
    ↓
Hybrid Router
    ├─ Analyse du client (X-Client-Type)
    ├─ Détermination du service cible
    └─ Routage intelligent
    ↓
Service Final (Legacy ou Microservice)
```

## ⚖️ Load Balancing

### **Produit Service - 3 Instances**
- **Instance 1** : Port 3001
- **Instance 2** : Port 3005  
- **Instance 3** : Port 3006
- **Load Balancer** : Port 8000
- **Algorithme** : Round-robin

### **Flux Load Balancing**
```
API Request /api/produits
    ↓
Kong Gateway (8001)
    ↓
Hybrid Router (9000)
    ↓
Load Balancer (8000)
    ├─ Instance 1 (3001) ─┐
    ├─ Instance 2 (3005) ─┤ Round-robin
    └─ Instance 3 (3006) ─┘
```

## 📈 Monitoring et Observabilité

### **Prometheus (9090)**
- **Collecte** : Métriques de tous les services
- **Targets** : Legacy, microservices, Kong, load balancer
- **Métriques** : HTTP requests, latency, errors, availability

### **Grafana (3333)**
- **Dashboards** : Comparaison direct vs gateway
- **Alertes** : Services down, haute latence
- **Visualisation** : Performance temps réel

### **Logging**
- **Kong** : Logs d'accès avec détails sécurité
- **Services** : Logs applicatifs structurés
- **Correlation** : Request-ID pour traçabilité

## 🔄 Failover et Résilience

### **Stratégies de Fallback**
1. **Microservice down** → Fallback vers Legacy
2. **Legacy down** → Erreur gracieuse avec cache
3. **Kong down** → Accès direct router (dev only)
4. **Database down** → Mode lecture seule + cache

### **Circuit Breakers**
- **Timeout** : 5s par service
- **Retry** : 3 tentatives avec backoff
- **Health Checks** : /health toutes les 30s

## 🚀 Flux de Développement

### **Tests Automatisés**
```bash
npm run test:all          # Tous les tests
npm run test:health       # Santé services
npm run test:security     # CORS, rate limiting  
npm run test:routing      # Logique routage
npm run test:performance  # Latence, throughput
npm run test:integration  # Scénarios bout-en-bout
```

### **Validation Complète**
1. **Setup** : Configuration et fichiers
2. **Health** : Tous services opérationnels
3. **Security** : CORS, rate limiting, headers
4. **Routing** : Logique par type client
5. **Performance** : Latence direct vs gateway
6. **Monitoring** : Prometheus + Grafana
7. **Integration** : Scénarios utilisateur réels

## 📚 Documentation API

- **Swagger/OpenAPI** : `docs/swagger-api.yml`
- **Collection Postman** : `docs/Architecture_Hybride_Postman.json`
- **Diagrammes** : `docs/Architecture_Hybride_Complete.puml`

## 🎯 Points Clés du Système

### **✅ Avantages**
- **Migration progressive** : Legacy + microservices coexistent
- **Performance optimisée** : Routage intelligent selon contexte
- **Sécurité centralisée** : Kong gateway unifié
- **Monitoring complet** : Observabilité temps réel
- **Scalabilité** : Load balancing et circuit breakers

### **🔧 Maintenance**
- **Logs centralisés** : Kong + services applicatifs
- **Métriques Prometheus** : Performance et santé
- **Tests automatisés** : Validation continue
- **Documentation** : API, architecture, procédures

### **🚀 Évolution Future**
- **Migration graduelle** : Plus de fonctions vers microservices
- **Nouveaux services** : Ajout via router configuration
- **Optimisations** : Cache, CDN, base performances
- **Sécurité avancée** : OAuth, JWT, API keys

---

**🏁 Le système est maintenant opérationnel avec tous les tests validant chaque aspect de l'architecture hybride !**
