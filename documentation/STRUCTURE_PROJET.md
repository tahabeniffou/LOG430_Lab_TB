# 📁 Structure du Projet - Système POS Microservices

Cette documentation décrit l'organisation réelle du projet et l'utilité de chaque composant.

## 🗂️ Arborescence Réelle

```
LOG430_Lab_TB/
├── 📖 README.md                         # Vue d'ensemble et démarrage
├── 📦 package.json                      # Configuration npm racine
├── � jest.config.js                    # Configuration tests Jest
├── 🐳 docker-compose.production.yml     # Production Docker
├── 🐳 Dockerfile                        # Image Docker racine
├── 📊 dashboard-standalone.html         # Dashboard HTML/Chart.js
│
├── 📁 app/                              # SYSTÈME LEGACY
│   └── app.js                           # API monolithique (port 3030)
│
├── 📁 infrastructure/                   # ROUTAGE & API GATEWAY
│   └── hybrid-router.js                 # Router principal (port 3000)
│
├── 📁 microservices/                    # SERVICES MICROSERVICES
│   ├── � README.md                     # Documentation services
│   │
│   ├── produit-service/                 # Service Produits (port 3001)
│   │   ├── server.js                    # API REST + métriques
│   │   ├── package.json                 # Dépendances service
│   │   ├── Dockerfile                   # Image Docker
│   │   ├── data/                        # Base SQLite
│   │   │   └── produit_service.db
│   │   └── src/                         # Code métier
│   │
│   ├── stock-service/                   # Service Stock (port 3002)
│   │   ├── server.js                    # API REST + métriques
│   │   ├── package.json                 # Dépendances service
│   │   ├── Dockerfile                   # Image Docker
│   │   └── src/                         # Code métier
│   │
│   ├── vente-service/                   # Service Ventes (port 3003)
│   │   ├── server.js                    # API REST + métriques
│   │   ├── package.json                 # Dépendances service
│   │   ├── Dockerfile                   # Image Docker
│   │   └── src/                         # Code métier
│   │
│   └── reporting-service/               # Service Reporting (port 3004)
│       ├── server.js                    # API REST + analytics
│       ├── package.json                 # Dépendances service
│       ├── Dockerfile                   # Image Docker
│       ├── data/                        # Données rapports
│       └── src/                         # Code métier
│
├── 📁 src/                              # CODE LEGACY & PARTAGÉ
│   ├── api/                             # APIs legacy
│   ├── application/                     # Services applicatifs
│   ├── common/                          # Utilitaires communs
│   ├── domain/                          # Logique métier
│   ├── interfaces/                      # Interfaces utilisateur
│   └── models/                          # Modèles de données
│
├── 📁 tests/                            # TESTS & VALIDATION
│   ├── *.test.js                        # Tests Jest (unit/integration)
│   ├── k6-load-test.js                  # Tests de charge K6
│   ├── k6-load-test-advanced.js         # Tests de charge avancés
│   ├── test-dashboard.html              # Dashboard de tests
│   ├── jest.*.js                        # Configuration Jest
│   └── README.md                        # Documentation tests
│
├── 📁 tools/                            # OUTILS & SCRIPTS
│   ├── � README.md                     # Documentation outils
│   ├── start-all-services.js           # Démarrage complet système
│   ├── start-monitoring.js             # Démarrage monitoring
│   ├── monitoring-dashboard.js          # Gestionnaire dashboards
│   ├── stress-test.js                   # Tests de stress
│   ├── test-system.js                   # Tests santé système
│   ├── open-dashboards.js              # Ouverture dashboards
│   └── monitor-with-stress.js          # Monitoring + stress
│
├── 📁 documentation/                    # DOCUMENTATION COMPLÈTE
│   ├── 📖 INDEX.md                      # Index navigation
│   ├── 📄 RESUME_EXECUTIF.md            # Résumé exécutif
│   ├── 🔧 CHOIX_TECHNOLOGIQUES.md       # Justifications techniques
│   ├── 📁 STRUCTURE_PROJET.md           # Ce document
│   ├── 📄 RAPPORT_TECHNIQUE_COMPLET.md  # Rapport technique
│   │
│   ├── guides/                          # Guides utilisateur
│   │   ├── DEMARRAGE_RAPIDE.md          # Guide express
│   │   ├── GUIDE_COMPLET.md             # Guide technique détaillé
│   │   └── GUIDE_CAPTURES_DASHBOARDS.md # Guide captures écran
│   │
│   ├── monitoring/                      # Documentation monitoring
│   │   ├── ANALYSE_PERFORMANCE_GRAFANA.md
│   │   ├── COMPARAISON_GRAFANA_HTML.md
│   │   ├── DIFFERENCES_VISUELLES_GRAPHIQUES.md
│   │   └── GUIDE_STRESS_TESTING.md
│   │
│   ├── validation/                      # Validation et conformité
│   │   ├── VALIDATION_DOCUMENTATION.md
│   │   ├── VALIDATION_FINALE_DASHBOARDS.md
│   │   ├── CORRECTIONS_DOCUMENTATION_CONFORMITE.md
│   │   └── DASHBOARDS_READY_FINAL.md
│   │
│   ├── adr/                             # Architecture Decision Records
│   │   ├── ADR-001-Migration-Microservices.md
│   │   ├── ADR-002-Choix-Technologique.md
│   │   └── ADR-003-API-Gateway-Strategy.md
│   │
│   ├── architecture/                    # Architecture détaillée
│   │   └── Analyse-Besoins.md
│   │
│   ├── deployment/                      # Guides déploiement
│   │   └── GUIDE_DEPLOIEMENT_PRODUCTION.md
│   │
│   └── diagrams/                        # Diagrammes UML
│       ├── Vue_Cas_Utilisation.puml
│       ├── Vue_Logique.puml
│       ├── Vue_Implementation.puml
│       ├── Vue_Deploiement.puml
│       ├── Vue_Processus_Commande.puml
│       └── Vue_Processus_Sync_Legacy.puml
│
└── 📁 config/                           # CONFIGURATION
    ├── config.json                      # Configuration générale
    ├── prometheus.yml                   # Configuration Prometheus
    ├── docker-compose.monitoring.yml    # Stack monitoring
    ├── grafana-dashboard-config.md      # Config Grafana
    └── grafana/                         # Dashboards Grafana
        ├── dashboards/
        └── datasources/
```

## 🎯 Rôle de Chaque Composant Principal

### 🚀 Point d'Entrée et Scripts

#### `tools/start-all-services.js`
**Rôle** : Orchestrateur principal du système
- Lance tous les microservices en parallèle
- Configure automatiquement les variables d'environnement
- Vérifie la santé de chaque service au démarrage
- Affiche les URLs et ports de tous les services

#### `package.json` (racine)
**Rôle** : Configuration projet et dépendances globales
```json
{
  "scripts": {
    "start": "node tools/start-all-services.js",
    "test": "jest",
    "test:load": "k6 run tests/k6-load-test.js",
    "stress": "node tools/stress-test.js"
  }
}
```
### 🏗️ Infrastructure et Routage

#### `infrastructure/hybrid-router.js`
**Rôle** : API Gateway et routeur principal (port 3000)
- **Point d'entrée unique** pour tous les clients externes
- **Routage intelligent** vers legacy ou microservices selon le contexte
- **Load balancing** simple vers services disponibles
- **Circuit breaker** pour la résilience
- **Health checks** automatiques de tous les services
- **Métriques Prometheus** pour monitoring

**Logique de routage implémentée** :
```javascript
// Routes principales
/health        → Health check global
/metrics       → Métriques Prometheus
/api/products  → produit-service (port 3001)
/api/stock     → stock-service (port 3002)
/api/sales     → vente-service (port 3003)
/api/reports   → reporting-service (port 3004)
/*             → app legacy (port 3030) comme fallback
```

### 🔧 Microservices

#### `microservices/produit-service/` (Port 3001)
**Responsabilités** :
- Gestion du catalogue produits
- CRUD complet sur les produits
- Base de données SQLite dédiée
- Métriques Prometheus intégrées

**Structure** :
- `server.js` : API REST Express
- `data/produit_service.db` : Base SQLite
- `src/` : Logique métier
- `package.json` : Dépendances spécifiques

#### `microservices/stock-service/` (Port 3002)
**Responsabilités** :
- Gestion des niveaux de stock
- Opérations d'entrée/sortie
- Alertes stock bas
- Synchronisation avec ventes

#### `microservices/vente-service/` (Port 3003)
**Responsabilités** :
- Traitement des transactions
- Historique des ventes
- Intégration avec stock pour décrémenter
- Calculs de totaux et taxes

#### `microservices/reporting-service/` (Port 3004)
**Responsabilités** :
- Agrégation de données cross-services
- Génération de rapports
- Analytics et statistiques
- Dashboard data pour monitoring

### � Système Legacy

#### `app/app.js` (Port 3030)
**Rôle** : Système monolithique existant
- **Fallback** pour fonctionnalités non encore migrées
- **Compatibilité** avec interfaces existantes
- **Transition progressive** vers microservices
- **Integration point** pour données historiques

### 📊 Tests et Validation

#### `tests/` - Suite de Tests Complète
**Tests unitaires et intégration** :
- `*.test.js` : Tests Jest pour chaque composant
- `health.test.js` : Tests de santé des services
- `integration.test.js` : Tests communication inter-services
- `performance.test.js` : Tests de performance

**Tests de charge** :
- `k6-load-test.js` : Tests K6 basiques
- `k6-load-test-advanced.js` : Scénarios de charge complexes
- `test-dashboard.html` : Dashboard résultats tests

#### `tools/` - Outils de Développement
**Scripts de productivité** :
- `start-all-services.js` : Démarrage système complet
- `start-monitoring.js` : Stack Prometheus + Grafana
- `test-system.js` : Validation santé globale
- `stress-test.js` : Tests de stress automatisés
- `monitoring-dashboard.js` : Gestionnaire dashboards
- `open-dashboards.js` : Ouverture rapide dashboards

#### `src/interfaces/console/MaisonMereConsoleHttp.js`
**Rôle** : Interface administrateurs (console CLI)
- Supervision multi-magasins
- Rapports consolidés
- Gestion utilisateurs
- Analytics business

### 📊 Monitoring et Dashboards

#### `dashboard-standalone.html`
**Rôle** : Dashboard HTML/Chart.js standalone
- **Visualisation simple** des métriques système
- **Pas de dépendances** externes (Grafana)
- **Portable** : fonctionne dans n'importe quel navigateur
- **Alternative légère** au dashboard Grafana

#### `config/prometheus.yml` + Stack Monitoring
**Rôle** : Configuration monitoring avancé
- **Prometheus** : Collecte métriques time-series
- **Grafana** : Dashboards professionnels
- **Node Exporter** : Métriques système
- **Service Discovery** : Auto-découverte services

### 📖 Documentation Organisée

#### Structure par audience :
- **`guides/`** → Utilisateurs finaux et développeurs
- **`monitoring/`** → Équipe DevOps et SRE  
- **`validation/`** → QA et conformité
- **`adr/`** → Architectes et décideurs techniques
- **`architecture/`** → Analystes et business
- **`diagrams/`** → Documentation visuelle UML
- **`deployment/`** → Équipe infrastructure

## 🔄 Flux de Communication

### Démarrage Système Typique
```
1. tools/start-all-services.js
   ├── Lance hybrid-router (port 3000)      [API Gateway]
   ├── Lance produit-service (port 3001)    [Microservice]
   ├── Lance stock-service (port 3002)      [Microservice]
   ├── Lance vente-service (port 3003)      [Microservice]
   ├── Lance reporting-service (port 3004)  [Microservice]
   └── Lance app legacy (port 3030)         [Fallback]

2. Health checks automatiques
3. Métriques Prometheus démarrées
4. Système prêt à recevoir requêtes
```

### Flux de Requête Client
```
Client → hybrid-router (3000) → [Routing Logic] → Microservice approprié
                              ↓
                        Legacy app (3030) [si route non reconnue]
```

### Architecture Data Flow
```
Vente Request → vente-service → stock-service (décrément)
                            → produit-service (validation)
                            → reporting-service (agrégation)
```

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
- **SQLite** : Pas de serveur DB externe
- **Docker Compose** : Orchestration simple
- **Scripts d'automatisation** : Démarrage en 1 commande
- **Tests intégrés** : Validation continue

---

*Structure documentée basée sur l'implémentation réelle - Dernière mise à jour : Décembre 2024*
└── Vérifie health checks
```

### Requête Utilisateur Console POS
```
Console POS
└── HTTP Request → API Gateway (port 3000)
    ├── /pos/magasins → Legacy System (port 3030)
    ├── /pos/produits → Produit Service (port 3001)
    ├── /pos/stock → Stock Service (port 3002)
    └── /pos/ventes → Vente Service (port 3004)
```

### Monitoring en Temps Réel
```
Chaque Service
├── Expose /metrics (Prometheus)
├── Expose /health (Status)
└── Logs → monitoring-dashboard.js
```

## 🛠️ Commandes Principales

### Démarrage
```bash
npm run start:all          # Tout le système
npm run start              # API Gateway seul
npm run start:legacy       # Système legacy seul
```

### Consoles
```bash
npm run pos-console        # Console vendeurs
npm run maison-mere-console # Console admin
```

### Tests
```bash
npm run test:system        # Santé système
npm run test:load          # Performance
npm run monitoring         # Dashboard
```

---

**📋 Cette structure permet :**
- ✅ **Séparation claire** des responsabilités
- ✅ **Scalabilité** indépendante des services
- ✅ **Maintenance** simplifiée
- ✅ **Tests** complets et automatisés
- ✅ **Documentation** exhaustive et organisée

*Structure optimisée pour l'apprentissage et la production*
