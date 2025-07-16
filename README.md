# 🏪 Système POS Microservices - Laboratoire 5
## Architecture Logicielle (LOG430) - Été 2025

[![Docker](https://img.shields.io/badge/Docker-Containerized-blue?logo=docker)](https://www.docker.com/)
[![Kong](https://img.shields.io/badge/Kong-API%20Gateway-green?logo=kong)](https://konghq.com/)
[![Prometheus](https://img.shields.io/badge/Prometheus-Monitoring-orange?logo=prometheus)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboards-red?logo=grafana)](https://grafana.com/)

---

## 📋 Vue d'ensemble

Système **Point of Sale (POS)** multi-magasins transformé en **architecture microservices** avec API Gateway Kong, load balancing et observabilité complète.

### 🎯 Objectifs du Laboratoire 5

- ✅ **Architecture Microservices** : 7 services indépendants avec DDD
- ✅ **API Gateway Kong** : Routes, CORS, load balancing, logging
- ✅ **Load Balancing** : 2 instances par service avec failover
- ✅ **Observabilité** : Prometheus + Grafana avec métriques temps réel
- ✅ **Documentation** : Arc42, ADR, Swagger, tests automatisés

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 CONSOLES POS & E-COMMERCE                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 KONG API GATEWAY                           │
│          Load Balancer + CORS + Monitoring                 │
└─────────┬───────────┬───────────┬───────────┬───────────────┘
          │           │           │           │
┌─────────▼─┐ ┌───────▼─┐ ┌───────▼─┐ ┌───────▼─┐
│ PRODUIT   │ │ STOCK   │ │ VENTE   │ │REPORTING│
│ Service   │ │ Service │ │ Service │ │ Service │
│ (2 inst.) │ │(2 inst.)│ │(2 inst.)│ │(2 inst.)│
└─────┬─────┘ └────┬────┘ └────┬────┘ └────┬────┘
      │            │           │           │
┌─────▼─┐    ┌─────▼─┐   ┌─────▼─┐   ┌─────▼─┐
│ProdDB │    │StockDB│   │VenteDB│   │ReportDB│
└───────┘    └───────┘   └───────┘   └───────┘

┌─────────────────────────────────────────────────────────────┐
│              SERVICES E-COMMERCE                            │
├─────────┬───────────┬───────────┬───────────────────────────┤
│ COMPTE  │ PANIER    │ CHECKOUT  │      LEGACY               │
│ Service │ Service   │ Service   │     Service               │
│(2 inst.)│ (2 inst.) │ (2 inst.) │    (SQLite)               │
└─────┬───┴─────┬─────┴─────┬─────┴───────────────────────────┘
      │         │           │
┌─────▼─┐ ┌─────▼─┐   ┌─────▼─┐
│CompteDB│ │PanierDB│   │CheckDB│
└───────┘ └───────┘   └───────┘
```

### 🔧 Technologies

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **API Gateway** | Kong 3.4 | Routage, load balancing, CORS |
| **Microservices** | Node.js + Express | 7 services DDD |
| **Base de Données** | PostgreSQL 15 | 7 bases dédiées |
| **Monitoring** | Prometheus + Grafana | Métriques et dashboards |
| **Conteneurisation** | Docker + Docker Compose | Orchestration |
| **Legacy** | SQLite | Migration données |

---

## 🚀 Démarrage Rapide

### Prérequis
- **Docker Desktop** installé et démarré
- **8GB RAM** minimum recommandé
- **Ports disponibles** : 3000-3017, 8000-8001, 9090, 3008

### 1. Clone et démarrage
```bash
git clone https://github.com/tahabeniffou/LOG430_Lab_TB.git
cd LOG430_Lab_TB

# Démarrer tous les services
docker-compose up -d

# Vérifier le statut
docker-compose ps
```

### 2. Configuration Kong Gateway
```bash
# Configurer les routes (Windows PowerShell)
cd config
bash kong-config.sh

# Ou manuellement via Kong Admin API
curl -X POST http://localhost:8001/services \
  --data "name=produit-service" \
  --data "url=http://produit-upstream"
```

### 3. Tests et validation
```bash
# Test automatisé complet
node test-workflow.js

# Test workflow e-commerce
node test-ecommerce-workflow.js
```

### 4. Accès aux interfaces

| Service | URL | Credentials |
|---------|-----|-------------|
| **Kong Gateway** | http://localhost:8000 | - |
| **Kong Admin** | http://localhost:8001 | - |
| **Grafana** | http://localhost:3008 | admin/admin |
| **Prometheus** | http://localhost:9090 | - |

---

## 📦 Microservices

### Services POS (Magasin Physique)

| Service | Ports | Responsabilité | Base DB |
|---------|-------|----------------|---------|
| **produit-service** | 3001, 3011 | Gestion catalogue produits | produit_db |
| **stock-service** | 3002, 3012 | Inventaire et mouvements | stock_db |
| **vente-service** | 3003, 3013 | Transactions et historique | vente_db |
| **reporting-service** | 3004, 3014 | Analytics et rapports | reporting_db |

### Services E-commerce

| Service | Ports | Responsabilité | Base DB |
|---------|-------|----------------|---------|
| **compte-service** | 3005, 3015 | Gestion utilisateurs + JWT | compte_db |
| **panier-service** | 3006, 3016 | Paniers d'achat + calculs | panier_db |
| **checkout-service** | 3007, 3017 | Processus commande + paiement | checkout_db |

### Service Legacy

| Service | Port | Responsabilité | Base DB |
|---------|------|----------------|---------|
| **legacy-service** | 3000 | Migration données anciennes | SQLite |

---

## 🔌 API Gateway Kong

### Routes configurées

```bash
# Exemples d'appels via Kong Gateway
curl http://localhost:8000/api/produits      # Service Produit
curl http://localhost:8000/api/stocks        # Service Stock
curl http://localhost:8000/api/ventes        # Service Vente
curl http://localhost:8000/api/reports       # Service Reporting
curl http://localhost:8000/api/comptes       # Service Compte
curl http://localhost:8000/api/paniers       # Service Panier
curl http://localhost:8000/api/checkout      # Service Checkout
```

### Load Balancing

Chaque service dispose de **2 instances** avec load balancing automatique :
- **Round-robin** entre instances
- **Health checks** continus
- **Failover** automatique

---

## 🔍 Monitoring et Observabilité

### Prometheus Metrics
- **HTTP metrics** : latence, throughput, codes erreur
- **Business metrics** : ventes, stock, commandes
- **Infrastructure metrics** : CPU, RAM, réseau

### Grafana Dashboards
- **Infrastructure Overview** : Santé des services
- **API Performance** : Latence par endpoint
- **Business Analytics** : KPIs temps réel
- **Error Tracking** : Monitoring erreurs

### Accès monitoring
```bash
# Prometheus
open http://localhost:9090

# Grafana (admin/admin)
open http://localhost:3008
```

---

## 🧪 Tests

### Tests automatisés disponibles

```bash
# Test complet infrastructure + microservices
node test-workflow.js

# Test workflow e-commerce spécifique
node test-ecommerce-workflow.js

# Test load balancing avancé
node test-microservices-workflow.js
```

### Collection Postman
Importez `tests/POS_Microservices_Kong.postman_collection.json` pour tests manuels complets.

---

## 📚 Documentation

### Documentation complète disponible

| Document | Emplacement | Contenu |
|----------|-------------|---------|
| **Architecture Arc42** | `documentation/INDEX.md` | Architecture complète |
| **ADR (10 décisions)** | `documentation/adr/` | Décisions architecturales |
| **API Swagger** | `documentation/api/` | Documentation APIs |
| **Guide déploiement** | `documentation/deployment/` | Instructions déploiement |
| **Monitoring** | `documentation/monitoring/` | Guide Grafana/Prometheus |
| **📋 Synthèse ADR** | `documentation/adr/SYNTHESE_ADR.md` | Vue d'ensemble ADR |

### ADR Principaux (10 décisions complètes)
- [ADR-001](documentation/adr/ADR-001-Architecture-Microservices.md) : Architecture Microservices
- [ADR-002](documentation/adr/ADR-002-Kong-API-Gateway.md) : Kong API Gateway
- [ADR-003](documentation/adr/ADR-003-Load-Balancing-Strategy.md) : Stratégie Load Balancing
- [ADR-004](documentation/adr/ADR-004-Monitoring-Prometheus-Grafana.md) : Monitoring
- [ADR-005](documentation/adr/ADR-005-Docker-Containerisation.md) : Containerisation
- [ADR-006](documentation/adr/ADR-006-Documentation-Gouvernance-Projet.md) : Documentation Projet
- [ADR-007](documentation/adr/ADR-007-Database-Strategy.md) : Stratégie Base de Données
- [ADR-008](documentation/adr/ADR-008-Authentication-Security.md) : Authentification JWT + RBAC
- [ADR-009](documentation/adr/ADR-009-Resilience-Error-Handling.md) : Résilience + Circuit Breaker
- [ADR-010](documentation/adr/ADR-010-Legacy-Migration-Strategy.md) : Migration Legacy → µServices

---

## 🛠️ Développement

### Structure du projet

```
📁 microservices/
├── 📁 produit-service/
│   ├── 📁 src/domain/          # Entités métier
│   ├── 📁 src/application/     # Use cases
│   └── 📁 src/infrastructure/  # Adapters
├── 📁 stock-service/
├── 📁 vente-service/
├── 📁 reporting-service/
├── 📁 compte-service/
├── 📁 panier-service/
└── 📁 checkout-service/

📁 config/
├── kong-config.sh            # Configuration Kong
├── prometheus.yml            # Configuration Prometheus
└── grafana/                  # Dashboards Grafana

📁 tests/
├── test-workflow.js          # Tests complets
├── test-ecommerce-workflow.js
└── *.postman_collection.json
```

### Ajout d'un nouveau microservice

1. **Créer la structure DDD**
```bash
mkdir microservices/nouveau-service
cd microservices/nouveau-service
mkdir -p src/{domain,application,infrastructure}
```

2. **Ajouter au docker-compose.yml**
```yaml
nouveau-service-1:
  build: ./microservices/nouveau-service
  ports:
    - "3008:3008"
  environment:
    - DATABASE_URL=postgresql://user:pass@postgres-nouveau/nouveau_db
```

3. **Configurer Kong**
```bash
curl -X POST http://localhost:8001/services \
  --data "name=nouveau-service" \
  --data "url=http://nouveau-upstream"
```

---

## ⚡ Troubleshooting

### Problèmes fréquents

#### Services ne démarrent pas
```bash
# Vérifier logs
docker-compose logs [service-name]

# Rebuild si nécessaire
docker-compose build [service-name]
docker-compose up -d [service-name]
```

#### Kong routes non configurées
```bash
# Vérifier services Kong
curl http://localhost:8001/services

# Re-configurer si nécessaire
cd config && bash kong-config.sh
```

#### Ports occupés
```bash
# Identifier processus utilisant port
netstat -ano | findstr :8000

# Arrêter tous services
docker-compose down
```

#### Grafana inaccessible
```bash
# Vérifier port Grafana (3008)
docker-compose ps grafana

# Redémarrer si nécessaire
docker-compose restart grafana
```

---

## 🤝 Contribution

### Standards de développement
- **DDD** : Respecter les couches Domain/Application/Infrastructure
- **Tests** : Ajouter tests pour nouveaux endpoints
- **Documentation** : Mettre à jour ADR pour décisions importantes
- **Monitoring** : Ajouter métriques Prometheus pour nouveaux services

### Pull Requests
1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

---

## 📄 Licence

Ce projet est développé dans le cadre du cours LOG430 - Architecture Logicielle à l'ETS.

---

## 👨‍💻 Auteur

Taha Beniffou 
Étudiant en Génie Logiciel - ETS  
Laboratoire 5 - Architecture Microservices  
Été 2025

---

## 🎯 Statut du Projet

✅ **Phase 1** : Architecture Microservices (7 services)  
✅ **Phase 2** : API Gateway Kong avec load balancing  
✅ **Phase 3** : Observabilité Prometheus + Grafana  
✅ **Phase 4** : Tests automatisés et documentation  
🎯 **Projet complété** - Prêt pour évaluation Labo 5

---

*Dernière mise à jour : 15 Juillet 2025*
