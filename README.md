# 🏗️ Système POS Microservices - LOG430

Système de point de vente (POS) avec architecture microservices, API Gateway, load balancing et monitoring complet.

## 🚀 Démarrage Express

```bash
# Démarrage standard (1 instance par service)
npm run start:all

# Avec load balancing (3 instances par service)
npm run start:load-balancing

# Tests du système
npm run test:system
```

## 📋 Services

| Service | Port(s) | Description |
|---------|---------|-------------|
| **API Gateway** | 3000 | Routage + Load Balancing |
| **Produit** | 3001/11/21 | Catalogue produits |
| **Stock** | 3002/12/22 | Gestion inventory |
| **Vente** | 3003/13/23 | Transactions POS |
| **Reporting** | 3004/14/24 | Analytics |

## 🏗️ Architecture

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

- **4 microservices** avec bases SQLite dédiées
- **Load balancing** Round-Robin avec 3 instances par service
- **API Gateway** intelligent avec circuit breaker
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
