# 📊 Configuration Dashboard Saga Orchestrator - Lab 6

## 🎯 Vue d'ensemble

Ce guide détaille la configuration et l'utilisation du dashboard Grafana pour le monitoring du pattern Saga Orchestrator (Lab 6).

---

## 🚀 Installation Dashboard

### 1. Copier le fichier JSON
```bash
cp config/grafana/dashboards/saga-orchestrator-lab6.json /var/lib/grafana/dashboards/
```

### 2. Importer via Grafana UI
1. Accéder à Grafana: http://localhost:3008
2. Se connecter: `admin/admin`
3. Aller dans **"+"** → **"Import"**
4. Coller le contenu du fichier JSON ou upload
5. Sélectionner la datasource **"Prometheus"**
6. Cliquer **"Import"**

### 3. Accès direct
- URL: http://localhost:3008/d/saga-orchestrator-lab6
- Nom: "🎭 Lab 6 - Saga Orchestrator Dashboard"

---

## 📈 Panneaux du Dashboard

### 1. 📊 Saga Orchestrator - Débit Transactions
**Métrique:** `rate(saga_orchestrator_transactions_total[5m])`
- **Transactions/sec:** Débit total des sagas
- **Completed/sec:** Sagas complétées par seconde
- **Failed/sec:** Sagas échouées par seconde

### 2. 🎯 Taux de Succès Saga
**Métrique:** `(sum(saga_orchestrator_completed_total) / sum(saga_orchestrator_transactions_total)) * 100`
- **Seuil Vert:** > 95%
- **Seuil Jaune:** 90-95%
- **Seuil Rouge:** < 90%

### 3. 🔄 Répartition des Étapes Saga
**Métriques:** 
- `saga_orchestrator_step_completed_total{step="stock_reserve"}`
- `saga_orchestrator_step_completed_total{step="payment_debit"}`
- `saga_orchestrator_step_completed_total{step="sale_create"}`

### 4. ⏱️ Latence Saga (Percentiles)
**Métriques:**
- **P50:** `histogram_quantile(0.50, saga_orchestrator_duration_seconds_bucket)`
- **P95:** `histogram_quantile(0.95, saga_orchestrator_duration_seconds_bucket)`
- **P99:** `histogram_quantile(0.99, saga_orchestrator_duration_seconds_bucket)`

### 5. 🔄 Compensations par Étape
**Métriques:**
- **Stock Release:** `rate(saga_orchestrator_compensations_total{step="stock_release"}[5m])`
- **Payment Refund:** `rate(saga_orchestrator_compensations_total{step="payment_refund"}[5m])`
- **Sale Rollback:** `rate(saga_orchestrator_compensations_total{step="sale_rollback"}[5m])`

### 6. 🖥️ Utilisation CPU - Services Saga
**Métrique:** `rate(container_cpu_usage_seconds_total{name=~".*saga.*"}[5m]) * 100`
- Monitoring des ressources CPU par service

### 7. 💾 Utilisation Mémoire - Services Saga
**Métrique:** `container_memory_usage_bytes{name=~".*saga.*"}`
- Monitoring de la consommation mémoire

### 8. 🌐 Requêtes HTTP - Saga Orchestrator
**Métrique:** `rate(http_requests_total{job="saga-orchestrator"}[5m])`
- Débit des requêtes HTTP par méthode et code de statut

---

## 🎯 Seuils et Alertes

### Seuils Critiques
```yaml
Taux de succès: > 95%
Latence P95: < 5000ms
Latence P99: < 10000ms
CPU Usage: < 70%
Memory Usage: < 512MB
```

### Alertes Recommandées
```yaml
- alert: SagaSuccessRateLow
  expr: (sum(rate(saga_orchestrator_completed_total[5m])) / sum(rate(saga_orchestrator_transactions_total[5m]))) * 100 < 95
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Taux de succès saga < 95%"

- alert: SagaLatencyHigh
  expr: histogram_quantile(0.95, saga_orchestrator_duration_seconds_bucket) > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Latence P95 saga > 5s"

- alert: SagaCompensationRateHigh
  expr: (sum(rate(saga_orchestrator_compensations_total[5m])) / sum(rate(saga_orchestrator_transactions_total[5m]))) * 100 > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Taux de compensation > 10%"
```

---

## 🔧 Configuration Prometheus

### Métriques Saga Orchestrator
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'saga-orchestrator'
    static_configs:
      - targets: ['saga-orchestrator:8010']
    metrics_path: '/metrics'
    scrape_interval: 5s
    
  - job_name: 'microservices'
    static_configs:
      - targets: 
        - 'stock-service:3002'
        - 'payment-service:8014'
        - 'sale-service:3003'
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### Métriques Personnalisées
```javascript
// Dans le service Saga Orchestrator
const promClient = require('prom-client');

// Métriques sagas
const sagaTransactionsTotal = new promClient.Counter({
  name: 'saga_orchestrator_transactions_total',
  help: 'Total saga transactions',
  labelNames: ['status']
});

const sagaDuration = new promClient.Histogram({
  name: 'saga_orchestrator_duration_seconds',
  help: 'Saga duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const sagaStepCompleted = new promClient.Counter({
  name: 'saga_orchestrator_step_completed_total',
  help: 'Saga steps completed',
  labelNames: ['step', 'status']
});

const sagaCompensations = new promClient.Counter({
  name: 'saga_orchestrator_compensations_total',
  help: 'Saga compensations executed',
  labelNames: ['step', 'reason']
});
```

---

## 🧪 Tests et Validation

### Script de Test
```bash
# Test complet saga orchestrator
npm run test:saga-orchestrator

# Test de charge K6
npm run test:k6-saga

# Vérification santé
npm run health
```

### Scénarios de Test
1. **Saga Réussie** - Toutes les étapes complètes
2. **Échec Stock** - Compensation immédiate
3. **Échec Paiement** - Compensation stock
4. **Échec Vente** - Compensation complète
5. **Charge Concurrente** - 10 sagas simultanées
6. **Charge Élevée** - 25 sagas en batches
7. **Gestion Timeout** - Saga avec timeout
8. **Récupération Erreur** - Retry automatique

---

## 📊 Interprétation des Métriques

### Indicateurs Clés
- **Success Rate > 95%** = Système stable
- **P95 Latency < 5s** = Performance acceptable
- **Compensation Rate < 10%** = Résilience correcte
- **CPU < 70%** = Ressources suffisantes

### Patterns d'Anomalies
- **Spike latence** = Contention base de données
- **Chute success rate** = Panne service participant
- **Augmentation compensations** = Problème métier/données
- **Memory leak** = Nettoyage états saga insuffisant

---

## 🎯 Optimisations Basées sur les Métriques

### Performance
- **P95 > 5s** → Optimiser requêtes DB, augmenter pool connexions
- **CPU > 70%** → Scaling horizontal, optimiser algorithmes
- **Memory > 512MB** → Nettoyage automatique états terminés

### Résilience
- **Success Rate < 95%** → Améliorer retry policies, circuit breakers
- **Compensation Rate > 10%** → Validation données en amont
- **Timeout Rate > 1%** → Ajuster timeouts, améliorer performances

### Scalabilité
- **TPS plateau** → Load balancing, sharding
- **Queue buildup** → Capacité traitement, backpressure
- **Resource contention** → Isolation ressources, bulkhead pattern

---

## 🔗 Liens Utiles

- **Dashboard:** http://localhost:3008/d/saga-orchestrator-lab6
- **Prometheus:** http://localhost:9090
- **Saga Orchestrator API:** http://localhost:8010
- **Kong Gateway:** http://localhost:8000

---

*Ce dashboard fournit une visibilité complète sur le pattern Saga Orchestrator, permettant l'optimisation continue des performances et de la résilience.*
