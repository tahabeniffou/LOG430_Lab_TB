# Plan d'Implémentation Saga Orchestrée - Lab 6 LOG430

## 🎯 Objectif
Implémenter une Saga orchestrée synchrone pour coordonner une transaction distribuée entre les microservices TB-POS existants.

---

## 🏗️ Scénario Métier Choisi : **Processus de Commande E-Commerce**

### Workflow de la Saga "Commande Client"

```
1. VALIDATION_PANIER → Validation des articles du panier
2. VERIFICATION_STOCK → Vérification disponibilité stock
3. RESERVATION_STOCK → Réservation temporaire du stock
4. TRAITEMENT_PAIEMENT → Processus de paiement client
5. CONFIRMATION_COMMANDE → Finalisation et confirmation
```

### Services Impliqués
- **Orchestrateur Saga** (nouveau service)
- **Panier Service** (existant)
- **Stock Service** (existant) 
- **Checkout Service** (existant)
- **Vente Service** (existant)

---

## 🔧 Architecture Technique

### Structure du Service Orchestrateur

```
saga-orchestrator-service/
├── src/
│   ├── domain/
│   │   ├── SagaState.js          # Machine d'état
│   │   ├── CommandeAggregate.js  # Agrégat métier
│   │   └── events/               # Événements métier
│   ├── application/
│   │   ├── SagaOrchestrator.js   # Orchestrateur principal
│   │   ├── CompensationHandler.js # Gestion rollback
│   │   └── StateManager.js       # Gestion états
│   ├── infrastructure/
│   │   ├── database/             # Persistence état saga
│   │   ├── http/                 # Appels microservices
│   │   └── monitoring/           # Métriques Prometheus
│   └── api/
│       └── routes/               # API REST saga
├── Dockerfile
└── package.json
```

### Machine d'État Saga

```javascript
const SagaStates = {
  SAGA_STARTED: 'SAGA_STARTED',
  PANIER_VALIDE: 'PANIER_VALIDE', 
  STOCK_VERIFIE: 'STOCK_VERIFIE',
  STOCK_RESERVE: 'STOCK_RESERVE',
  PAIEMENT_TRAITE: 'PAIEMENT_TRAITE',
  COMMANDE_CONFIRMEE: 'COMMANDE_CONFIRMEE',
  
  // États d'échec
  PANIER_INVALIDE: 'PANIER_INVALIDE',
  STOCK_INSUFFISANT: 'STOCK_INSUFFISANT', 
  PAIEMENT_ECHEC: 'PAIEMENT_ECHEC',
  SAGA_FAILED: 'SAGA_FAILED',
  
  // États de compensation
  COMPENSATION_STARTED: 'COMPENSATION_STARTED',
  STOCK_LIBERE: 'STOCK_LIBERE',
  SAGA_COMPENSATED: 'SAGA_COMPENSATED'
};
```

---

## 📝 Étapes d'Implémentation

### Phase 1 : Service Orchestrateur (Semaine 1)
- [ ] Créer le microservice `saga-orchestrator-service`
- [ ] Implémenter la machine d'état `SagaState.js`
- [ ] Configurer la base PostgreSQL dédiée
- [ ] Ajouter au docker-compose.yml avec 2 instances

### Phase 2 : Orchestration Synchrone (Semaine 1-2)
- [ ] Implémenter `SagaOrchestrator.js` avec appels HTTP synchrones
- [ ] Créer les clients HTTP vers panier/stock/checkout/vente services
- [ ] Gestion des timeouts et retry policies
- [ ] Tests unitaires de l'orchestrateur

### Phase 3 : Gestion Événements (Semaine 2)
- [ ] Système d'événements métier (SagaStarted, StepCompleted, SagaFailed)
- [ ] Logs structurés pour traçabilité complète
- [ ] Persistence de l'état saga en base PostgreSQL
- [ ] API REST pour consultation état saga

### Phase 4 : Compensation et Rollback (Semaine 2-3)
- [ ] Implémenter `CompensationHandler.js`
- [ ] Actions de rollback : libération stock, annulation réservation
- [ ] Tests de cas d'échec contrôlés
- [ ] Validation de la cohérence des données

### Phase 5 : Observabilité Avancée (Semaine 3)
- [ ] Métriques Prometheus spécialisées saga
- [ ] Dashboards Grafana pour suivi des sagas
- [ ] Alerting sur échecs de saga
- [ ] Traces distribuées avec corrélation IDs

### Phase 6 : Tests et Validation (Semaine 3-4)
- [ ] Tests d'intégration end-to-end
- [ ] Simulation d'échecs contrôlés
- [ ] Tests de performance sous charge
- [ ] Documentation et démo

---

## 🔍 Métriques Prometheus Spécialisées

```javascript
// Métriques saga spécifiques
const sagaMetrics = {
  saga_duration: new promClient.Histogram({
    name: 'saga_duration_seconds',
    help: 'Duration of saga execution',
    labelNames: ['saga_type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  }),
  
  saga_step_duration: new promClient.Histogram({
    name: 'saga_step_duration_seconds', 
    help: 'Duration of individual saga steps',
    labelNames: ['saga_type', 'step', 'status'],
    buckets: [0.05, 0.1, 0.2, 0.5, 1, 2]
  }),
  
  saga_failures: new promClient.Counter({
    name: 'saga_failures_total',
    help: 'Total number of saga failures',
    labelNames: ['saga_type', 'failure_step', 'error_type']
  }),
  
  saga_compensations: new promClient.Counter({
    name: 'saga_compensations_total',
    help: 'Total number of saga compensations executed',
    labelNames: ['saga_type', 'compensation_step']
  })
};
```

---

## 🎭 Scénarios de Test

### Cas de Succès
1. **Commande Standard** : Panier valide → Stock OK → Paiement OK → Commande confirmée
2. **Commande avec Stock Limite** : Validation avec réservation exacte

### Cas d'Échec avec Compensation
1. **Stock Insuffisant** : Compensation = annulation panier
2. **Paiement Refusé** : Compensation = libération stock + annulation
3. **Timeout Service** : Compensation = rollback complet

### Cas Complexes
1. **Échec Partiel** : Succès partiel puis compensation selective
2. **Charge Élevée** : Comportement saga sous stress

---

## 📊 Dashboard Grafana Saga

### Panels Principaux
- **Saga Success Rate** : Taux de succès par type de saga
- **Saga Duration Distribution** : Histogramme temps d'exécution
- **Step Failure Analysis** : Analyse des échecs par étape
- **Compensation Frequency** : Fréquence des compensations
- **Concurrent Sagas** : Nombre de sagas actives simultanément

---

## 🚀 Intégration Kong Gateway

### Nouvelles Routes
```yaml
# Configuration Kong pour saga-orchestrator
- name: saga-orchestrator-service
  url: http://saga-orchestrator-upstream
  routes:
  - name: start-saga
    paths: ["/api/v3/saga/commande"]
    methods: ["POST"]
  - name: saga-status  
    paths: ["/api/v3/saga/status"]
    methods: ["GET"]
```

### Load Balancing
- **2 instances** saga-orchestrator (ports 3008, 3018)
- **Round-robin** via Kong comme les autres services

---

## 📋 Livrables Lab 6

### Code
- [ ] Service `saga-orchestrator` fonctionnel
- [ ] Intégration avec services existants
- [ ] Tests automatisés saga

### Documentation
- [ ] **ADR-011** : Saga Orchestration Pattern
- [ ] **ADR-012** : Compensation Strategy  
- [ ] Guide d'utilisation API saga
- [ ] Diagrammes de séquence saga

### Démonstration
- [ ] Scénario succès avec traces
- [ ] Scénario échec avec compensation
- [ ] Métriques temps réel Grafana
- [ ] Performance sous charge

---

## 🎯 Critères de Succès

### Fonctionnels
✅ Saga complète fonctionnelle sur scénario commande  
✅ Compensation automatique en cas d'échec  
✅ Machine d'état persistée et consultable  
✅ Intégration Kong Gateway réussie  

### Techniques  
✅ Métriques Prometheus spécialisées  
✅ Dashboards Grafana saga operationnels  
✅ Tests automatisés > 80% couverture  
✅ Performance acceptable (< 2s par saga)  

### Académiques
✅ Documentation ADR complète  
✅ Démonstration cas succès/échec  
✅ Analyse comparative avant/après saga  
✅ Respect patterns industrie (Saga, CQRS, Event Sourcing)  

---

**🏆 Résultat Attendu** : Architecture microservices TB-POS avec orchestration saga enterprise-ready, positionnant le projet comme référence technique pour LOG430.
