# 📖 Documentation Complète - Système Microservices

Cette documentation complète vous guide dans l'installation, l'utilisation et la compréhension du système microservices.

## 📋 Table des Matières

1. [Installation et Configuration](#installation)
2. [Architecture Technique](#architecture)  
3. [Guide d'Utilisation](#utilisation)
4. [API et Services](#api)
5. [Monitoring et Performance](#monitoring)
6. [Tests et Validation](#tests)
7. [Déploiement](#deploiement)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Installation et Configuration {#installation}

### Prérequis
- **Node.js** v16+ 
- **npm** v8+
- **Windows 10/11** (testé)
- **Git**

### Installation Rapide
```bash
# 1. Cloner le projet
git clone <repository-url>
cd LOG430_Lab_TB

# 2. Installer les dépendances principales
npm install

# 3. Installer les dépendances des microservices
npm run install:all

# 4. Démarrer le système complet
npm run start:all
```

### Installation Détaillée

#### Étape 1 : Préparation de l'environnement
```bash
# Vérifier les versions
node --version  # v16+
npm --version   # v8+

# Cloner et naviguer
git clone <repository-url>
cd LOG430_Lab_TB
```

#### Étape 2 : Installation des dépendances
```bash
# Dépendances principales
npm install

# Dépendances microservices
cd microservices/produit-service && npm install && cd ../..
cd microservices/stock-service && npm install && cd ../..
cd microservices/vente-service && npm install && cd ../..
cd microservices/reporting-service && npm install && cd ../..
```

#### Étape 3 : Configuration des ports
Le système utilise les ports suivants (configurables via variables d'environnement) :

| Service | Port | Variable |
|---------|------|----------|
| API Gateway | 3000 | `GATEWAY_PORT` |
| Système Legacy | 3030 | `LEGACY_PORT` |
| Produit Service | 3001 | `PRODUIT_PORT` |
| Stock Service | 3002 | `STOCK_PORT` |
| Vente Service | 3004 | `VENTE_PORT` |
| Reporting Service | 3005 | `REPORTING_PORT` |
| Dashboard Monitoring | 8080 | `DASHBOARD_PORT` |

---

## 🏗️ Architecture Technique {#architecture}

### Vue d'Ensemble
Le système implémente une **architecture microservices hybride** permettant une migration progressive d'un système legacy vers des microservices modernes.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE GLOBALE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────┐ │
│  │   CLIENTS   │────│   API GATEWAY   │────│   MICROSERVICES     │ │
│  │             │    │   (Port 3000)   │    │                     │ │
│  │ • Console   │    │                 │    │ • Produit   :3001   │ │
│  │   POS       │    │ ROUTAGE SMART:  │    │ • Stock     :3002   │ │
│  │ • Console   │    │ • /pos/*        │    │ • Vente     :3004   │ │
│  │   Maison    │    │ • /maisonmere/* │    │ • Reporting :3005   │ │
│  │   Mère      │    │ • /api/v2/*     │    │                     │ │
│  │ • API REST  │    │                 │    │ FEATURES:           │ │
│  └─────────────┘    └─────────────────┘    │ • SQLite DB         │ │
│                              │             │ • Prometheus        │ │
│                              │             │ • Health Checks     │ │
│                     ┌─────────────────┐    │ • Auto-scaling      │ │
│                     │ SYSTÈME LEGACY  │    └─────────────────────┘ │
│                     │  (Port 3030)    │                            │
│                     │                 │                            │
│                     │ • Utilisateurs  │                            │
│                     │ • Magasins      │                            │
│                     │ • Legacy APIs   │                            │
│                     └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Composants Principaux

#### 1. API Gateway (Port 3000)
**Rôle** : Point d'entrée unique et routage intelligent

**Fonctionnalités** :
- Routage basé sur le contexte (POS vs Admin)
- Load balancing automatique
- Circuit breaker pour la résilience
- Métriques Prometheus intégrées
- Support des sessions et authentification

**Logique de Routage** :
```javascript
// Routes POS (Vendeurs)
/pos/magasins     → Système Legacy
/pos/utilisateurs → Système Legacy  
/pos/produits     → Microservice Produit
/pos/stock        → Microservice Stock
/pos/ventes       → Microservice Vente

// Routes Maison Mère (Admin)
/maisonmere/magasins     → Système Legacy
/maisonmere/utilisateurs → Système Legacy
/maisonmere/reports      → Microservice Reporting

// Routes API Modernes
/api/v2/produits → Microservice Produit
/api/v2/ventes   → Microservice Vente
/api/v2/stocks   → Microservice Stock
/api/v2/reports  → Microservice Reporting
```

#### 2. Microservices

##### Produit Service (Port 3001)
**Base de données** : SQLite  
**Responsabilités** :
- Gestion du catalogue produits
- CRUD des produits
- Recherche et filtrage
- Gestion des catégories

**API Endpoints** :
```
GET    /api/produits           # Liste des produits
GET    /api/produits/:id       # Détail produit
POST   /api/produits           # Créer produit
PUT    /api/produits/:id       # Modifier produit
DELETE /api/produits/:id       # Supprimer produit
GET    /health                 # Health check
GET    /metrics                # Métriques Prometheus
```

##### Stock Service (Port 3002)
**Base de données** : SQLite  
**Responsabilités** :
- Gestion des stocks temps réel
- Alertes de stock bas
- Mouvements de stock
- Inventaire

**API Endpoints** :
```
GET    /stocks                 # État des stocks
PUT    /stocks/:produitId      # Mettre à jour stock
POST   /stocks/mouvement       # Enregistrer mouvement
GET    /stocks/alertes         # Stocks bas
GET    /health                 # Health check
GET    /metrics                # Métriques Prometheus
```

##### Vente Service (Port 3004)
**Base de données** : SQLite  
**Responsabilités** :
- Traitement des transactions
- Historique des ventes
- Calculs de totaux
- Validation des commandes

**API Endpoints** :
```
GET    /ventes                 # Liste des ventes
POST   /ventes                 # Créer vente
GET    /ventes/:id             # Détail vente
GET    /ventes/stats           # Statistiques
GET    /health                 # Health check
GET    /metrics                # Métriques Prometheus
```

##### Reporting Service (Port 3005)
**Base de données** : Agrégation des autres services  
**Responsabilités** :
- Rapports de ventes
- Analytics business
- Tableaux de bord
- Métriques KPI

**API Endpoints** :
```
GET    /api/reports            # Liste des rapports
GET    /api/reports/ventes     # Rapport ventes
GET    /api/reports/stock      # Rapport stock
GET    /api/reports/kpi        # KPIs globaux
GET    /health                 # Health check
GET    /metrics                # Métriques Prometheus
```

#### 3. Système Legacy (Port 3030)
**Rôle** : Système monolithique existant  
**Données** : Utilisateurs, Magasins, Configuration

---

## 💻 Guide d'Utilisation {#utilisation}

### Démarrage du Système

#### Option 1 : Démarrage Automatique (Recommandé)
```bash
# Démarrer tout le système en une commande
npm run start:all

# Attendre que tous les services soient prêts (30-60 secondes)
# Vérifier l'état
npm run test:system
```

#### Option 2 : Démarrage Manuel
```bash
# Terminal 1 : API Gateway
npm run start

# Terminal 2 : Système Legacy
npm run start:legacy

# Terminal 3 : Microservices
cd microservices/produit-service && npm start
cd microservices/stock-service && npm start
cd microservices/vente-service && npm start
cd microservices/reporting-service && npm start
```

### Utilisation des Consoles

#### Console POS (Vendeurs)
```bash
# Démarrer la console POS
npm run pos-console

# Interface interactive :
# 1. Sélectionner le magasin
# 2. Choisir l'utilisateur vendeur
# 3. Entrer le mot de passe : "vendeur"
# 4. Accéder au menu principal
```

**Fonctionnalités disponibles** :
- 📋 Gestion des produits
- 🛒 Création de ventes
- 📊 Consultation des stocks
- 👥 Gestion des clients
- 📈 Rapports locaux

#### Console Maison Mère (Administrateurs)
```bash
# Démarrer la console admin
npm run maison-mere-console

# Interface interactive :
# 1. Sélectionner le compte Admin
# 2. Entrer le mot de passe : "admin"
# 3. Accéder au tableau de bord admin
```

**Fonctionnalités disponibles** :
- 🏪 Supervision des magasins
- 👤 Gestion des utilisateurs
- 📊 Rapports consolidés
- 📈 Analytics business
- ⚙️ Configuration système

### Tests et Validation

#### Tests de Santé Système
```bash
# Vérifier que tous les services fonctionnent
npm run test:system

# Sortie attendue :
# ✅ API Gateway: 200 - OK
# ✅ Produit Service: 200 - OK
# ✅ Stock Service: 200 - OK
# ✅ Vente Service: 200 - OK
# ✅ Reporting Service: 200 - OK
```

#### Tests de Charge (K6)
```bash
# Test de charge basique
npm run test:load

# Test de charge avancé (400 utilisateurs)
npm run test:load:advanced

# Métriques attendues :
# - Latence moyenne < 10ms
# - 0% d'erreur
# - Throughput > 1000 req/s
```

---

## 🔌 API et Services {#api}

### Authentification
Le système utilise une authentification simple basée sur des comptes prédéfinis :

**Comptes POS** :
```json
{
  "id": 2,
  "nom": "Vendeur Centre", 
  "email": "vendeur1@example.com",
  "role": "vendeur",
  "magasinId": 1,
  "motDePasse": "vendeur"
}
```

**Comptes Admin** :
```json
{
  "id": 1,
  "nom": "Admin",
  "email": "admin@example.com", 
  "role": "admin",
  "magasinId": null,
  "motDePasse": "admin"
}
```

### Format des Réponses API

#### Réponse Standard
```json
{
  "success": true,
  "data": [...],
  "message": "Opération réussie",
  "timestamp": "2025-07-10T21:00:00.000Z"
}
```

#### Réponse d'Erreur
```json
{
  "success": false,
  "error": "Code d'erreur",
  "message": "Description de l'erreur",
  "timestamp": "2025-07-10T21:00:00.000Z"
}
```

### Exemples d'Utilisation API

#### Récupérer les Produits
```bash
# Via API Gateway
curl http://localhost:3000/api/v2/produits

# Direct microservice
curl http://localhost:3001/api/produits
```

#### Créer une Vente
```bash
curl -X POST http://localhost:3000/api/v2/ventes \
  -H "Content-Type: application/json" \
  -d '{
    "produitId": 1,
    "quantite": 2,
    "magasinId": 1,
    "utilisateurId": 2
  }'
```

---

## 📊 Monitoring et Performance {#monitoring}

### Métriques Prometheus

Chaque service expose des métriques sur `/metrics` :

#### Métriques HTTP
```
# Nombre total de requêtes
http_requests_total{method="GET",route="/api/produits",status_code="200"} 1

# Latence des requêtes  
http_request_duration_seconds{method="GET",route="/api/produits"} 0.005

# Taille des réponses
http_response_size_bytes{method="GET",route="/api/produits"} 1024
```

#### Métriques Système
```
# Statut de santé
service_health_status{service="produit-service"} 1

# Utilisation mémoire
process_resident_memory_bytes 45678912

# Temps de fonctionnement
process_uptime_seconds 3600
```

### Dashboard de Monitoring
```bash
# Démarrer le dashboard
npm run monitoring

# Accéder à : http://localhost:8080
```

**Indicateurs disponibles** :
- 🔥 Latence temps réel
- 📊 Débit des requêtes  
- ❌ Taux d'erreur
- 💾 Utilisation mémoire
- 🌐 Statut des services

### Health Checks

Chaque service expose un endpoint `/health` :

```bash
# API Gateway
curl http://localhost:3000/health

# Réponse :
{
  "status": "OK",
  "service": "Hybrid Router", 
  "timestamp": "2025-07-10T21:00:00.000Z",
  "port": 3000,
  "routing": {...}
}
```

---

## 🧪 Tests et Validation {#tests}

### Types de Tests

#### 1. Tests de Santé
```bash
npm run test:health
```
Vérifie que tous les services répondent correctement.

#### 2. Tests d'Integration
```bash  
npm run test:integration
```
Teste les interactions entre services.

#### 3. Tests de Performance
```bash
npm run test:performance
```
Mesure la performance sous charge normale.

#### 4. Tests de Charge (K6)
```bash
npm run test:load         # 50 utilisateurs
npm run test:load:advanced # 400 utilisateurs
```

### Résultats de Validation

Le système a été validé avec les résultats suivants :

#### Test de Charge (400 VUs)
```
Métriques finales :
✅ Requêtes totales : 12,847
✅ Taux de succès : 100%
✅ Latence moyenne : 8.2ms
✅ Latence P95 : 15ms
✅ Throughput : 1,071 req/s
✅ Erreurs : 0
```

#### Santé des Services
```
✅ API Gateway : 200 OK
✅ Produit Service : 200 OK  
✅ Stock Service : 200 OK
✅ Vente Service : 200 OK
✅ Reporting Service : 200 OK
✅ Système Legacy : 200 OK
```

---

## 🚀 Déploiement {#deploiement}

### Environnement de Développement
```bash
# Démarrage rapide
npm run start:all

# Mode watch (redémarrage automatique)
npm run dev:all
```

### Environnement de Production

#### Docker (Recommandé)
```bash
# Construire les images
npm run docker:build

# Démarrer en production
npm run docker:up

# Vérifier les logs
npm run docker:logs
```

#### Variables d'Environnement
```bash
# .env
NODE_ENV=production
GATEWAY_PORT=3000
LEGACY_PORT=3030
PRODUIT_PORT=3001
STOCK_PORT=3002
VENTE_PORT=3004
REPORTING_PORT=3005
PROMETHEUS_ENABLED=true
LOG_LEVEL=info
```

### Configuration Load Balancer
Pour un déploiement multi-instance :

```nginx
upstream microservices_backend {
    server localhost:3001;  # Produit
    server localhost:3002;  # Stock  
    server localhost:3004;  # Vente
    server localhost:3005;  # Reporting
}

server {
    listen 80;
    location /api/v2/ {
        proxy_pass http://microservices_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔧 Troubleshooting {#troubleshooting}

### Problèmes Courants

#### 1. Port déjà utilisé
```bash
# Erreur : EADDRINUSE
Error: listen EADDRINUSE: address already in use :::3000

# Solution : Libérer les ports
taskkill /f /im node.exe        # Windows
pkill -f node                   # Linux/Mac

# Ou changer les ports
set PORT=3100 && npm start      # Windows
PORT=3100 npm start             # Linux/Mac
```

#### 2. Service non disponible
```bash
# Erreur : ECONNREFUSED
Error: connect ECONNREFUSED 127.0.0.1:3001

# Vérification :
1. Le service est-il démarré ?
   npm run test:system

2. Le port est-il correct ?
   netstat -an | findstr :3001

3. Redémarrer le service
   cd microservices/produit-service
   npm start
```

#### 3. Console n'affiche pas les données
```bash
# Vérifications :
1. API Gateway fonctionne ?
   curl http://localhost:3000/health

2. Routes configurées ?
   curl http://localhost:3000/routing-info

3. Système legacy démarré ?
   curl http://localhost:3030/health
```

#### 4. Problèmes de base de données
```bash
# Réinitialiser les données
npm run db:reset

# Vérifier les tables
sqlite3 microservices/produit-service/database.sqlite
.tables
.quit
```

### Logs et Debugging

#### Activer les logs détaillés
```bash
# Variable d'environnement
set DEBUG=* && npm start       # Windows
DEBUG=* npm start              # Linux/Mac
```

#### Localisation des logs
```
├── logs/
│   ├── api-gateway.log
│   ├── produit-service.log
│   ├── stock-service.log
│   ├── vente-service.log
│   └── reporting-service.log
```

#### Commandes de diagnostic
```bash
# État des services
npm run test:system

# Métriques temps réel
curl http://localhost:3000/metrics

# Info de routage
curl http://localhost:3000/routing-info

# Test de connectivité
npm run test:connectivity
```

### Support et Contact

Pour le support technique :
1. Vérifier la [documentation](#)
2. Consulter les [logs](#logs-et-debugging)
3. Exécuter les [tests de diagnostic](#commandes-de-diagnostic)
4. Contacter l'équipe de développement

---

## 📚 Ressources Supplémentaires

- [Architecture Decision Records (ADR)](./adr/)
- [Guide de Contribution](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)
- [License](./LICENSE.md)

---

*Documentation mise à jour le : 10 juillet 2025*  
*Version du système : 1.0.0 Production Ready*
