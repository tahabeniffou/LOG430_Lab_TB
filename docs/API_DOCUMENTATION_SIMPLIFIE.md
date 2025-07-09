# 📋 Documentation Simplifiée - Cas d'Usage et Architecture

## 🏗️ Vue d'Ensemble de l'Architecture Hybride

L'architecture combine un **système legacy (monolithique)** avec **4 microservices** spécialisés, orchestrés par Kong Gateway et un routeur intelligent.

---

## 🎯 Cas d'Usage par Type de Client

### 🖥️ **Console POS (Point de Vente)**
**Client Type**: `X-Client-Type: POS`
**Endpoint Principal**: `/pos/*`

#### ✅ **Utilise le Système de Base (Legacy)**
- **Transactions de vente** : `/pos/transactions/*`
- **Interface utilisateur** : `/pos/ui/*`
- **Logique métier complexe** : Calculs, promotions, règles business
- **Gestion des sessions** : Authentification caissier
- **Cache Redis** : Données temporaires, sessions utilisateur
- **Base MySQL** : Données transactionnelles principales

#### ✅ **Utilise les Microservices**
- **Vérification stock temps réel** : `/pos/stock/realtime/*` → **Stock Service**
- **Validation produits** : `/pos/produits/validation/*` → **Produit Service**

---

### 🏢 **Console Maison Mère**
**Client Type**: `X-Client-Type: MAISONMERE`
**Endpoint Principal**: `/maisonmere/*`

#### ✅ **Utilise le Système de Base (Legacy)**
- **Gestion des magasins** : `/maisonmere/magasins/*`
- **Configuration système** : `/maisonmere/config/*`
- **Interface d'administration** : UI complexe
- **Cache Redis** : Configuration, paramètres système
- **Base MySQL** : Données de gestion, configuration

#### ✅ **Utilise les Microservices**
- **Rapports avancés** : `/maisonmere/rapports/*` → **Reporting Service**
- **Analytics et tendances** : `/maisonmere/analytics/*` → **Reporting Service**
- **Export de données** : `/maisonmere/export/*` → **Reporting Service**

---

### 🚀 **API Moderne (Applications Tierces)**
**Client Type**: `X-Client-Type: API`
**Endpoint Principal**: `/api/*`

#### ✅ **Utilise Principalement les Microservices**
- **Gestion produits** : `/api/produits/*` → **Produit Service** (Load Balanced)
  - 3 instances avec load balancer : ports 3001, 3005, 3006
  - Base PostgreSQL dédiée
- **Gestion des ventes** : `/api/ventes/*` → **Vente Service**
- **Gestion du stock** : `/api/stock/*` → **Stock Service**
- **Rapports et analytics** : `/api/rapports/*` → **Reporting Service**

#### ✅ **Utilise le Système de Base (Fallback)**
- **Fallback automatique** si microservice indisponible
- **Données legacy** non encore migrées

---

### 🌐 **Applications Web/Mobile**
**Client Type**: `X-Client-Type: WEB|MOBILE`
**Endpoints**: `/produits`, `/ventes`, etc.

#### ✅ **Utilise Principalement les Microservices**
- **Catalogue produits** : `/produits/*` → **Produit Service** (Load Balanced)
- **Processus de vente** : `/ventes/*` → **Vente Service**
- **Vérification stock** : `/stock/*` → **Stock Service**
- **Synchronisation hors-ligne** : Microservices avec fallback Legacy

---

## 🗄️ Répartition des Bases de Données

### 🐘 **PostgreSQL (Port 5433)**
- **Produit Service** : Base dédiée `produit_service`
- **Avantages** : Performance, isolation, scalabilité

### 🐬 **MySQL (Port 3306)**
- **Système Legacy** : Base principale `main_db`
- **Vente Service** : Partage la base MySQL
- **Stock Service** : Partage la base MySQL
- **Reporting Service** : Lit depuis multiple sources

### 🔴 **Redis (Port 6379)**
- **Cache partagé** : Sessions, données temporaires
- **Système Legacy** : Cache principal
- **Reporting Service** : Cache des rapports

---

## ⚖️ Load Balancing et Performance

### 🔄 **Produit Service - Load Balanced**
```
Load Balancer (Port 8000)
├─ produit-service-1 (Port 3001) ─ PostgreSQL
├─ produit-service-2 (Port 3005) ─ PostgreSQL  
└─ produit-service-3 (Port 3006) ─ PostgreSQL
```
**Algorithme** : Round-robin
**Base de données** : PostgreSQL partagée entre les 3 instances

### 🚀 **Services Uniques**
- **Legacy System** (Port 3000) : MySQL + Redis
- **Vente Service** (Port 3004) : MySQL
- **Stock Service** (Port 3007) : MySQL
- **Reporting Service** (Port 3008) : Multi-sources + Redis cache

---

## 🔒 Sécurité et Gateway

### 🦍 **Kong Gateway (Port 8001)**
- **Point d'entrée unique** : Toutes les requêtes passent par Kong
- **Politiques actives** :
  - ✅ CORS : Gestion des origines
  - ✅ Rate Limiting : 200/minute, 5000/heure
  - ✅ Headers sécurisés
  - ✅ Logging complet

### 🧠 **Routage Intelligent**
```
Requête Client
    ↓
Kong Gateway (8001) ← Sécurité, CORS, Rate Limiting
    ↓
Hybrid Router (9000) ← Analyse client, routage intelligent
    ↓
Service Final (Legacy ou Microservice)
```

---

## 📊 Monitoring et Observabilité

### 📈 **Prometheus (Port 9090)**
- **Collecte métriques** : Tous services (Legacy + Microservices)
- **Métriques** : HTTP requests, latency, errors, health

### 📊 **Grafana (Port 3333)**
- **Dashboards** : Performance temps réel
- **Comparaisons** : Direct vs Gateway
- **Alertes** : Services down, latence élevée

---

## 🎯 Exemples Concrets de Routage

### **Exemple 1: Vente en Caisse POS**
```
1. Scan produit : GET /pos/produits/123
   → Kong → Router → Legacy System (MySQL + Redis)
   
2. Vérif stock : GET /pos/stock/realtime/123  
   → Kong → Router → Stock Microservice (MySQL)
   
3. Finalisation : POST /pos/transactions/456/finaliser
   → Kong → Router → Legacy System (MySQL + Redis)
```

### **Exemple 2: Consultation Produits Mobile**
```
1. Liste produits : GET /api/produits?category=electronique
   → Kong → Router → Load Balancer → Produit Service (PostgreSQL)
   
2. Détail produit : GET /api/produits/123
   → Kong → Router → Load Balancer → Produit Service (PostgreSQL)
   
3. Stock disponible : GET /api/stock/123
   → Kong → Router → Stock Service (MySQL)
```

### **Exemple 3: Rapport Maison Mère**
```
1. Dashboard : GET /maisonmere
   → Kong → Router → Legacy System (MySQL + Redis)
   
2. Rapport ventes : GET /maisonmere/rapports/ventes-mensuelles
   → Kong → Router → Reporting Service (MySQL + Redis cache)
   
3. Export CSV : GET /maisonmere/export/ventes.csv
   → Kong → Router → Reporting Service (Multi-sources)
```

---

## 🔄 Stratégies de Résilience

### **Fallback Automatique**
- **Microservice indisponible** → Fallback vers Legacy
- **Legacy indisponible** → Mode dégradé avec cache
- **Base de données down** → Cache Redis en lecture seule

### **Circuit Breakers**
- **Timeout** : 5 secondes par service
- **Retry** : 3 tentatives avec backoff
- **Health Checks** : Toutes les 30 secondes

---

## 📚 Points d'Accès et Tests

### **URLs Principales**
- **Kong Gateway** : http://localhost:8001
- **Legacy System** : http://localhost:3000
- **Load Balancer** : http://localhost:8000
- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3333

### **Health Checks**
- **Legacy** : http://localhost:3000/health
- **Produit Service** : http://localhost:3001/health
- **Vente Service** : http://localhost:3004/health
- **Stock Service** : http://localhost:3007/health
- **Reporting Service** : http://localhost:3008/health

---

## 🎉 Résumé de la Répartition

| **Type de Client** | **Système Principal** | **Microservices Utilisés** | **Base de Données** |
|-------------------|----------------------|---------------------------|-------------------|
| **POS** | ✅ Legacy | Stock | MySQL + Redis |
| **Maison Mère** | ✅ Legacy | Reporting | MySQL + Redis |
| **API Moderne** | Microservices | Tous (Produit, Vente, Stock, Reporting) | PostgreSQL + MySQL |
| **Web/Mobile** | Microservices | Tous avec fallback Legacy | PostgreSQL + MySQL |

**🔑 Stratégie** : Migration progressive où le Legacy reste pour les cas critiques (POS, administration) tandis que les nouvelles fonctionnalités utilisent les microservices optimisés.

---

## 🚨 **AUDIT CRITIQUE - CONFORMITÉ MICROSERVICES**

### ❌ **Violations Majeures Identifiées**

Votre architecture présente **3 violations critiques** des standards microservices de l'industrie :

#### **1. 🔴 Database-per-Service Non Respecté (CRITIQUE)**
```yaml
# ❌ CONFIGURATION ACTUELLE - NON CONFORME
vente-service:    → MySQL (main_db)     # PARTAGE INTERDIT
stock-service:    → MySQL (main_db)     # PARTAGE INTERDIT  
legacy-system:    → MySQL (main_db)     # PARTAGE INTERDIT
produit-service:  → PostgreSQL (produit_service) # ✅ Seul conforme
```

**Impact Business** :
- ❌ **Scalabilité limitée** : Impossible de scaler indépendamment
- ❌ **Couplage fort** : Changement schema impact multiple services
- ❌ **Single Point of Failure** : Une panne DB arrête tous les services
- ❌ **Transactions distribuées** impossibles

#### **2. 🔴 Communication Synchrone Excessive (CRITIQUE)**
```javascript
// ❌ Code actuel - Couplage fort
vente-service calls → produit-service (HTTP direct)
vente-service calls → stock-service (HTTP direct)
```

**Problèmes** :
- ❌ **Cascade failures** : Un service down = tout l'écosystème affecté
- ❌ **Latence cumulative** : Appels chaînés ralentissent tout
- ❌ **Pas de résilience** : Aucun circuit breaker

#### **3. 🔴 Bounded Context Mal Défini (CRITIQUE)**
```javascript
// ❌ Responsabilités chevauchantes
Produit Service: Gère stock + produits (2 domaines)
Stock Service: Gère aussi stock (duplication)
```

---

### 🎯 **Plan d'Action Conformité - 72 Heures**

#### **Phase 1 : Database Segregation (Jour 1)**
```bash
# 1. Exécuter migration immédiate
./scripts/migrate-to-compliant-architecture.sh

# 2. Créer bases dédiées
docker-compose -f docker-compose.microservices-compliant.yml up -d
```

#### **Phase 2 : Circuit Breakers (Jour 2)**
```bash
# 1. Installer dépendances
npm install opossum --save

# 2. Intégrer circuit breakers
cp src/common/CircuitBreakerService.js microservices/*/src/
```

#### **Phase 3 : Event-Driven (Jour 3)**
```bash
# 1. Configurer Redis Pub/Sub
# 2. Remplacer appels HTTP par événements
# 3. Implémenter saga pattern
```

---

### 📊 **Score de Conformité Actuel**

| **Critère Standards Industrie** | **Score** | **Statut** |
|--------------------------------|-----------|------------|
| Database-per-Service | 25% | ❌ Non Conforme |
| Bounded Context | 60% | ⚠️ Partiellement |
| Event-Driven Architecture | 10% | ❌ Non Conforme |
| Circuit Breakers | 0% | ❌ Absent |
| API Design | 85% | ✅ Bon |
| Containerization | 95% | ✅ Excellent |
| Monitoring | 80% | ✅ Bon |

**🎯 Score Global : 51/100** ⚠️ **NÉCESSITE REFACTORISATION URGENTE**

---

### 🚀 **Architecture Cible Conforme**

```yaml
# ✅ ARCHITECTURE MICROSERVICES CONFORME
services:
  produit-service:   → PostgreSQL (produit_db) ✅
  vente-service:     → MySQL (vente_db) 🔄 À migrer  
  stock-service:     → PostgreSQL (stock_db) 🔄 À migrer
  reporting-service: → Read-replicas + Cache ✅
  legacy-system:     → MySQL (legacy_db) 🔄 À migrer

# Event Bus pour communication asynchrone
redis-events: → Pub/Sub pour découplage
```

---

### 📋 **Checklist Conformité Immédiate**

#### **🔴 Actions Critiques (24h)**
- [ ] **Exécuter** `./scripts/migrate-to-compliant-architecture.sh`
- [ ] **Séparer bases de données** (vente_db, stock_db, legacy_db)
- [ ] **Tester isolation** des services post-migration

#### **🟡 Actions Importantes (48h)**
- [ ] **Implémenter Circuit Breakers** dans tous les appels inter-services
- [ ] **Configurer Event Bus** Redis pour communication asynchrone
- [ ] **Refactorer communication** HTTP → Event-driven

#### **🟢 Actions d'Amélioration (72h)**
- [ ] **SAGA pattern** pour transactions distribuées
- [ ] **CQRS** pour reporting service
- [ ] **Health checks** avancés

---

### 🎓 **Références Standards Industrie**

#### **Principes Microservices (Martin Fowler)**
1. ✅ **Decentralized** : Services autonomes
2. ❌ **Database per Service** : Violation critique
3. ❌ **Failure Isolation** : Circuit breakers manquants
4. ✅ **Infrastructure Automation** : Docker ✅

#### **12-Factor App Compliance**
- ✅ Codebase, Dependencies, Config
- ❌ Backing Services (DB partagées)
- ✅ Build/Release/Run, Processes
- ❌ Concurrency (pas d'event-driven)

#### **Domain-Driven Design**
- ⚠️ **Bounded Context** : Partiellement défini
- ✅ **Ubiquitous Language** : Bonnes entités
- ❌ **Context Mapping** : Relations mal définies

---

### 🏁 **Conclusion**

**🚨 URGENT** : Votre architecture nécessite une **refactorisation immédiate** pour respecter les standards microservices de l'industrie.

**🎯 Objectif** : Passer de **51% à 90%** de conformité en 72 heures.

**📈 Impact Business** :
- ✅ **Scalabilité** : Services indépendants
- ✅ **Résilience** : Pas de cascade failures  
- ✅ **Maintenabilité** : Équipes autonomes
- ✅ **Performance** : Communication optimisée

**🚀 Prochaine Étape** : Exécuter `./scripts/migrate-to-compliant-architecture.sh`
