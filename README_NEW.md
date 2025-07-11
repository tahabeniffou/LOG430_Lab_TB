# 🏗️ Système POS Microservices - LOG430

Un système de point de vente (POS) moderne utilisant une architecture microservices avec API Gateway, monitoring Prometheus/Grafana, et suite de tests complète.

## 🚀 Démarrage Rapide

```bash
# 1. Cloner et naviguer
git clone <repository-url>
cd LOG430_Lab_TB

# 2. Démarrer tout le système (installe automatiquement les dépendances)
node tools/start-all-services.js

# 3. Vérifier que tout fonctionne
node tools/test-system.js

# 4. Ouvrir le dashboard simple
start dashboard-standalone.html
```

## 📋 Accès aux Services

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| **Hybrid Router** | http://localhost:3000/health | 3000 | API Gateway principal |
| **Produit Service** | http://localhost:3001/health | 3001 | Catalogue produits |
| **Stock Service** | http://localhost:3002/health | 3002 | Gestion inventory |
| **Vente Service** | http://localhost:3003/health | 3003 | Transactions POS |
| **Reporting Service** | http://localhost:3004/health | 3004 | Analytics & reports |
| **Legacy App** | http://localhost:3030/ | 3030 | Système hérité |
| **Dashboard HTML** | `dashboard-standalone.html` | - | Monitoring simple |

## 🏗️ Architecture Réelle

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS & TESTS                      │
│  [Tests K6] [Dashboard HTML] [Postman] [Browser]       │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP Requests
┌─────────────────────▼───────────────────────────────────┐
│              HYBRID ROUTER (:3000)                      │
│  • Routage intelligent                                  │
│  • Circuit breaker                                      │
│  • Health checks                                        │
│  • Métriques Prometheus                                 │
└─────┬──────┬───────┬────────┬─────────────┬─────────────┘
      │      │       │        │             │
┌─────▼──┐ ┌─▼────┐ ┌▼─────┐ ┌▼──────────┐ ┌▼─────────────┐
│Produit │ │Stock │ │Vente │ │Reporting  │ │Legacy App    │
│:3001   │ │:3002 │ │:3003 │ │:3004      │ │:3030         │
│+SQLite │ │+SQL  │ │+SQL  │ │+JSON      │ │+SQLite       │
└────────┘ └──────┘ └──────┘ └───────────┘ └──────────────┘
```

## 📊 Fonctionnalités Principales

### ✅ Microservices Implémentés
- **Produit Service** : CRUD complet des produits avec SQLite
- **Stock Service** : Gestion inventory avec alertes stock bas
- **Vente Service** : Traitement transactions POS complètes
- **Reporting Service** : Analytics et rapports business
- **Hybrid Router** : API Gateway avec circuit breaker et load balancing

### ✅ Monitoring & Observabilité
- **Prometheus** : Collecte métriques time-series de tous les services
- **Grafana** : Dashboards avancés pour monitoring production
- **Dashboard HTML** : Alternative simple et portable sans dépendances
- **Health Checks** : Surveillance automatique de la santé des services

### ✅ Tests & Validation
- **Tests Jest** : Suite complète unitaires et intégration
- **Tests K6** : Performance et stress testing
- **Tests Système** : Validation santé globale automatisée
- **CI/CD Ready** : Intégration continue avec GitHub Actions

## 🛠️ Scripts Utilitaires

```bash
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

## 📖 Documentation

- **[Démarrage Rapide](documentation/guides/DEMARRAGE_RAPIDE.md)** - Guide express 5 minutes
- **[Guide Complet](documentation/guides/GUIDE_COMPLET.md)** - Documentation technique détaillée
- **[Choix Technologiques](documentation/CHOIX_TECHNOLOGIQUES.md)** - Justifications techniques
- **[Structure Projet](documentation/STRUCTURE_PROJET.md)** - Organisation et architecture
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
