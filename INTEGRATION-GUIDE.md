# 🚀 Guide d'Intégration Complète LAB 5-6-7

## Vue d'ensemble

Ce guide explique comment démarrer et utiliser l'architecture intégrée qui combine :
- **LAB 5** : Microservices e-commerce de base
- **LAB 6** : Saga Pattern pour les transactions distribuées  
- **LAB 7** : Architecture événementielle avec Event Sourcing et CQRS

## 🏗️ Architecture Intégrée

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAB 5 - MICROSERVICES                       │
│  Produit │ Stock │ Vente │ Reporting │ Compte │ Panier │ Checkout │
│  :3001   │ :3002 │ :3003 │   :3004   │ :3005  │ :3006  │  :3007  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LAB 6 - SAGA PATTERN                       │
│              Saga Orchestrator (:8010)                         │
│          Coordination des transactions distribuées              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAB 7 - ARCHITECTURE ÉVÉNEMENTIELLE              │
│  Réclamation │ Notification │ Audit │ Analytics │ Event Store   │
│    :8011     │    :8012     │ :8013 │   :8014   │ PostgreSQL    │
│              RabbitMQ Message Broker                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE                             │
│ Kong (:8000) │ Prometheus (:9090) │ Grafana (:3000) │ Nginx    │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Démarrage Rapide

### 1. Démarrage Automatique (Recommandé)

```bash
# Démarrage coordonné de tous les composants
scripts\start-integration-complete.bat
```

Ce script :
- ✅ Démarre l'infrastructure LAB 5 (microservices de base)
- ✅ Démarre l'architecture événementielle LAB 7 (RabbitMQ + Event Store)
- ✅ Démarre le Saga Orchestrator LAB 6
- ✅ Lance les tests de validation automatiques
- ✅ Affiche l'état de tous les services

### 2. Validation Post-Démarrage

```bash
# Validation rapide de tous les services
node scripts\tests\validate-startup.js

# Tests d'intégration complets
node scripts\tests\test-integration-complete.js
```

### 3. Arrêt Coordonné

```bash
# Arrêt de tous les composants
scripts\stop-all.bat
```

## 📊 Services et Ports

### LAB 5 - Microservices de Base
| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Produit | 3001 | http://localhost:3001 | Gestion des produits |
| Stock | 3002 | http://localhost:3002 | Gestion des stocks |
| Vente | 3003 | http://localhost:3003 | Gestion des ventes |
| Reporting | 3004 | http://localhost:3004 | Rapports et analytics |
| Compte | 3005 | http://localhost:3005 | Gestion des comptes |
| Panier | 3006 | http://localhost:3006 | Gestion des paniers |
| Checkout | 3007 | http://localhost:3007 | Processus de commande |

### LAB 6 - Saga Pattern
| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Saga Orchestrator | 8010 | http://localhost:8010 | Coordination des transactions |

### LAB 7 - Architecture Événementielle
| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Réclamation | 8011 | http://localhost:8011 | Event Sourcing - Réclamations |
| Notification | 8012 | http://localhost:8012 | Notifications événementielles |
| Audit | 8013 | http://localhost:8013 | Audit Trail des événements |
| Analytics | 8014 | http://localhost:8014 | Analytics temps réel |

### Infrastructure
| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| Kong API Gateway | 8000 | http://localhost:8000 | - |
| Kong Admin | 8001 | http://localhost:8001 | - |
| Prometheus | 9090 | http://localhost:9090 | - |
| Grafana | 3000 | http://localhost:3000 | admin/admin |
| RabbitMQ Management | 15672 | http://localhost:15672 | guest/guest |
| Event Store DB | 5433 | localhost:5433 | postgres/password |

## 🧪 Tests et Validation

### Tests Automatiques

```bash
# Test d'intégration complet (recommandé)
node scripts\tests\test-integration-complete.js

# Validation rapide post-démarrage
node scripts\tests\validate-startup.js

# Test workflow e-commerce existant
node test-microservices-workflow.js
```

### Tests Manuels

#### LAB 5 - Test Microservice
```bash
# Test service produit
curl http://localhost:3001/health
curl http://localhost:3001/produits
```

#### LAB 6 - Test Saga
```bash
# Test Saga orchestrator
curl http://localhost:8010/health
curl -X POST http://localhost:8010/saga/order -H "Content-Type: application/json" -d "{\"produitId\":\"test\",\"quantite\":1,\"clientId\":\"client1\",\"totalAmount\":10.00}"
```

#### LAB 7 - Test Event Sourcing
```bash
# Créer une réclamation (Event Sourcing)
curl -X POST http://localhost:8011/api/v1/reclamations \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"client123\",\"type\":\"DEFAUT_PRODUIT\",\"description\":\"Produit défectueux\",\"priority\":\"HIGH\"}"

# Voir les événements
curl http://localhost:8011/api/v1/eventstore/events
```

## 📈 Monitoring et Observabilité

### Grafana Dashboards
- **URL** : http://localhost:3000 (admin/admin)
- **Dashboards disponibles** :
  - Microservices Performance (LAB 5)
  - Saga Orchestrator Metrics (LAB 6)
  - Event-Driven Architecture (LAB 7)
  - Infrastructure Overview

### Prometheus Metrics
- **URL** : http://localhost:9090
- **Métriques disponibles** :
  - `microservice_*` : Métriques microservices LAB 5
  - `saga_*` : Métriques Saga LAB 6
  - `events_*` : Métriques événements LAB 7
  - `rabbitmq_*` : Métriques RabbitMQ

### RabbitMQ Management
- **URL** : http://localhost:15672 (guest/guest)
- **Fonctionnalités** :
  - Monitoring des queues
  - Visualisation des échanges
  - Statistiques des messages

## 🔧 Résolution de Problèmes

### Services ne démarrent pas
```bash
# Vérifier l'état des conteneurs
docker ps

# Voir les logs d'un service
docker-compose logs [service-name]
docker-compose -f docker-compose-eventdriven.yml logs [service-name]

# Redémarrer un service spécifique
docker-compose restart [service-name]
```

### Ports occupés
```bash
# Vérifier les ports utilisés
netstat -an | findstr ":3001"
netstat -an | findstr ":8010"

# Arrêter tous les services et nettoyer
scripts\stop-all.bat
```

### Problèmes de réseau Docker
```bash
# Nettoyer les réseaux Docker
docker network prune -f

# Recreer les services
docker-compose down
docker-compose up -d
```

### Base de données Event Store
```bash
# Se connecter à l'Event Store
docker exec -it eventstore-db psql -U postgres -d eventstore

# Vérifier les tables
\dt

# Voir les événements récents
SELECT * FROM events ORDER BY created_at DESC LIMIT 10;
```

## 🎯 Scénarios d'Usage

### Scénario 1 : E-commerce Complet avec Saga
1. **LAB 5** : Client créé un panier et passe commande
2. **LAB 6** : Saga orchestre la transaction (stock, paiement, expédition)
3. **LAB 7** : Événements générés pour audit et analytics

### Scénario 2 : Gestion de Réclamation
1. **LAB 7** : Client crée une réclamation (Event Sourcing)
2. **LAB 7** : Notification automatique envoyée
3. **LAB 7** : Audit trail enregistré
4. **LAB 7** : Analytics mis à jour en temps réel

### Scénario 3 : Monitoring Global
1. **Infrastructure** : Prometheus collecte toutes les métriques
2. **Infrastructure** : Grafana affiche les dashboards unifiés
3. **LAB 7** : RabbitMQ route les événements de monitoring

## 📚 Documentation Avancée

### Patterns Implémentés
- **Microservices** (LAB 5) : Décomposition par domaine métier
- **Saga Pattern** (LAB 6) : Transactions distribuées avec compensation
- **Event Sourcing** (LAB 7) : Persistance par événements immutables
- **CQRS** (LAB 7) : Séparation Command/Query avec projections
- **Pub/Sub** (LAB 7) : Communication asynchrone via RabbitMQ

### Architecture Decisions Records (ADR)
- `documentation/adr/ADR-001-Architecture-Microservices.md`
- `documentation/adr/ADR-002-Kong-API-Gateway.md`
- `documentation/adr/ADR-003-Load-Balancing-Strategy.md`
- `documentation/adr/ADR-004-Monitoring-Prometheus-Grafana.md`
- `documentation/adr/ADR-005-Docker-Containerisation.md`

## 🚨 Alertes et Limites

### Ressources Système
- **RAM minimum** : 8GB recommandés
- **CPU** : 4 cores recommandés  
- **Disk** : 10GB libres pour les logs et données

### Limitations Connues
- Les services LAB 7 peuvent prendre 30-60s à démarrer complètement
- RabbitMQ nécessite que tous les conteneurs soient démarrés avant les services Node.js
- Le Saga Orchestrator (LAB 6) est optionnel et peut être désactivé

### Support
- **Logs** : `docker-compose logs -f`
- **Monitoring** : Grafana dashboards
- **Debug** : Scripts de test dans `scripts/tests/`

---

**🎉 Félicitations !** Vous avez maintenant une architecture complète intégrant les patterns Microservices, Saga, Event Sourcing et CQRS avec une observabilité complète !
