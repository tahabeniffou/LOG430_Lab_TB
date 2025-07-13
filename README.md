# 🏗️ Systè## 🚀 Démarrage Express

### 🐒 Kong API Gateway (Recommandé)
```bash
# 🔧 Installation des dépendances
npm run install:all

# 📊 Initialisation de la base de données
npm run db:seed

# 🚀 Démarrage Kong + microservices (2 instances chacun)
npm run start:kong:full

# � Démarrage monitoring Prometheus + Grafana
npm run monitoring:kong:start

# �🖥️ Démarrage des consoles (dans des terminaux séparés)
npm run start:pos    # Console POS
npm run start:mere   # Console Maison Mère

# ✅ Validation Kong avec load balancing
npm run validate:kong
npm run validate:monitoring
```

### 🔧 Mode Développement (Hybrid Router)
```bash
# 🚀 Démarrage standard (1 instance par service)
npm run start:all

# 🖥️ Consoles
npm run start:pos    # Console POS  
npm run start:mere   # Console Maison Mère

# ✅ Validation système
npm run validate:extraction
```s - LOG430

Système de point de vente (POS) avec architecture microservices hybride, API Gateway, load balancing et monitoring complet.

## 🎯 Architecture Hybride

Ce projet utilise une **architecture hybride** combinant :
- 🧩 **Microservices** pour les fonctionnalités métier critiques (produits, ventes, stock, reporting)
- 🏛️ **Système Legacy** pour les fonctionnalités support (utilisateurs, magasins, configuration)
- � **API Gateway** pour l'orchestration et le routage intelligent

## �🚀 Démarrage Express

```bash
# 🔧 Installation des dépendances
npm run install:all

# 📊 Initialisation de la base de données
npm run db:seed

# 🚀 Démarrage complet (microservices + API Gateway)
npm run start:all

# 🖥️ Démarrage des consoles (dans des terminaux séparés)
npm run start:pos    # Console POS
npm run start:mere   # Console Maison Mère

# ✅ Validation de l'extraction
npm run validate:extraction
```

## 📋 Services et Ports

| Service | Port(s) | Description | Type |
|---------|---------|-------------|------|
| **API Gateway** | 9000 | Routage + Load Balancing | Infrastructure |
| **Produit Service** | 3001/11/21 | Catalogue produits | Microservice |
| **Stock Service** | 3002/12/22 | Gestion inventory | Microservice |
| **Vente Service** | 3004/14/24 | Transactions POS | Microservice |
| **Reporting Service** | 3005/15/25 | Analytics | Microservice |
| **Legacy System** | 3030 | Utilisateurs, Magasins | Monolithe |

## 🏗️ Architecture

### 🐒 Kong API Gateway (Production)
```
Client → Kong Proxy (:8000) → Round-Robin Load Balancer
                    ↓
    ┌─────────────┬─────────────┬─────────────┬─────────────┐
    │ Produit     │ Stock       │ Vente       │ Reporting   │
    │ :3001/3011  │ :3002/3012  │ :3004/3014  │ :3005/3015  │
    │ SQLite      │ SQLite      │ SQLite      │ JSON        │
    └─────────────┴─────────────┴─────────────┴─────────────┘
                    ↓
    Prometheus (:9090) → Grafana (:3030) + Kong Manager (:8002)
```

### 🔧 Hybrid Router (Développement)  
```
Client → API Gateway (:3000) → Load Balancer Round-Robin
                    ↓
    ┌─────────────┬─────────────┬─────────────┬─────────────┐
    │ Produit     │ Stock       │ Vente       │ Reporting   │
    │ :3001/11/21 │ :3002/12/22 │ :3003/13/23 │ :3004/14/24 │
    │ SQLite      │ SQLite      │ SQLite      │ JSON        │
    └─────────────┴─────────────┴─────────────┴─────────────┘
                    ↓
            Prometheus + Grafana
```

## ✅ Fonctionnalités

### 🐒 Kong API Gateway
- **2 instances** par microservice avec load balancing
- **Kong Manager UI** pour configuration et monitoring
- **Health checks** actifs et passifs
- **Plugins** : CORS, Rate Limiting, Prometheus
- **PostgreSQL** pour persistance configuration

### 🔧 Hybrid Router  
- **3 instances** par microservice (mode développement)
- **Load balancing** Round-Robin avec circuit breaker
- **API Gateway** intelligent avec failover
- **Monitoring** Prometheus/Grafana + Dashboard HTML
- **Tests automatisés** Jest + K6 + Load balancing
# Démarrage et gestion
node tools/start-all-services.js    # Démarrage système complet
node tools/test-system.js           # Tests santé système
node tools/start-monitoring.js      # Stack Prometheus + Grafana

# Tests et validation
npm test                            # Tests Jest unitaires
k6 run tests/k6-load-test.js       # Tests de performance
node tools/stress-test.js          # Tests de stress avec monitoring

# Monitoring
node tools/monitoring-dashboard.js  # Dashboard temps réel
node tools/open-dashboards.js      # Ouverture rapide dashboards
```

## 🔧 Technologies Utilisées

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Runtime** | Node.js + Express | Performance I/O, écosystème riche |
| **Base de Données** | SQLite par service | Simplicité, portabilité, isolation |
| **API Gateway** | Custom Express Router | Contrôle total, logique métier spécifique |
| **Monitoring** | Prometheus + Grafana | Standard cloud-native, flexibilité |
| **Tests** | Jest + K6 | Écosystème Node.js + performance testing |
| **Conteneurisation** | Docker + Compose | Portabilité, reproductibilité |

## ⚖️ Load Balancing

**Load balancer Round-Robin** intégré à l'API Gateway.

```bash
# Démarrage avec 3 instances par service (12 microservices)
npm run start:load-balancing

# Test de distribution
npm run test:load-balancing
```

**Architecture** : API Gateway distribue automatiquement les requêtes entre 3 instances de chaque microservice (ports 3001/11/21, 3002/12/22, etc.).

**Métriques** : Distribution observable via `/load-balancer/status` et Prometheus.

## 📖 Documentation

- **[Kong Setup](docs/Kong_Setup.md)** - 🐒 Configuration Kong API Gateway avec load balancing
- **[Arc42 Architecture](docs/Arc42_Architecture_Document.md)** - 📐 Document d'architecture structuré
- **[ADR](documentation/adr/)** - 🎯 Décisions d'architecture documentées
- **[Démarrage Rapide](documentation/guides/DEMARRAGE_RAPIDE.md)** - Guide express 5 minutes
- **[Guide Complet](documentation/guides/GUIDE_COMPLET.md)** - Documentation technique détaillée
- **[Choix Technologiques](documentation/CHOIX_TECHNOLOGIQUES.md)** - Justifications techniques
- **[Structure Projet](documentation/STRUCTURE_PROJET.md)** - Organisation et architecture
- **[Collection Postman](tests/POS_Microservices_Kong.postman_collection.json)** - 🧪 Tests API complets
- **[Index Documentation](documentation/INDEX.md)** - Navigation complète

## 🎯 Points d'Architecture Clés

### Séparation des Responsabilités
- **1 service = 1 domaine métier** (Produits, Stock, Ventes, Reports)
- **1 base de données par service** (SQLite dédiée)
- **API Gateway centralisé** pour le routage
- **Legacy isolé** pour transition progressive

### Observabilité Native
- **Métriques Prometheus** dans chaque service
- **Health checks** automatiques
- **Circuit breaker** pour résilience
- **Logs structurés** pour debugging

### Simplicité Opérationnelle
- **SQLite** : Pas de serveur DB externe à gérer
- **Docker Compose** : Orchestration simple
- **Scripts d'automatisation** : Démarrage en 1 commande
- **Tests intégrés** : Validation continue

## 🚀 Prêt pour l'Évaluation

✅ **Architecture microservices** fonctionnelle avec 4 services + API Gateway  
✅ **Documentation complète** organisée et professionnelle  
✅ **Tests automatisés** (Jest + K6) avec rapports  
✅ **Monitoring** double (Grafana + HTML) opérationnel  
✅ **Scripts de démarrage** automatisés et fiables  
✅ **Code cohérent** avec standards de qualité  

---

*Système développé dans le cadre du cours LOG430 - Architecture Logicielle*
