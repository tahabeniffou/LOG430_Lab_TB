# 📊 ARCHITECTURE DU DASHBOARD - FLUX DE DONNÉES

## 🔄 1. SOURCES DE DONNÉES

### A. Serveur Saga Orchestrator (Port 8010)
```
saga-orchestrator-prometheus.js
├── Express Server
├── SQLite Database (en mémoire)
├── Winston Logger (logs structurés)
└── Prometheus Client (métriques)
```

**Données générées:**
- Métriques Prometheus (compteurs, histogrammes, gauges)
- Logs JSON structurés  
- Base de données SQLite (sagas, steps, events, transitions)
- API REST endpoints

## 🎯 2. COLLECTION DES MÉTRIQUES

### A. Prometheus (Port 9090)
**Configuration:** `monitoring/prometheus-saga.yml`
```yaml
scrape_configs:
  - job_name: 'saga-orchestrator'
    static_configs:
      - targets: ['localhost:8010']
    scrape_interval: 5s
    metrics_path: '/metrics'
```

**Métriques collectées toutes les 5 secondes:**
- `saga_total{status="completed|failed"}`
- `saga_duration_seconds_bucket{le="0.1,0.5,1,2,5,10,30"}`
- `saga_step_total{step_name,status}`
- `saga_active_transactions`
- `saga_compensations_total`
- `saga_business_events_total`
- `saga_state_transitions_total`

### B. Stockage Prometheus
- **TSDB** (Time Series Database)
- **Rétention:** 200h configurée
- **Scraping:** Toutes les 5 secondes depuis /metrics

## 🎨 3. VISUALISATION GRAFANA

### A. Configuration Grafana (Port 3000)
**Datasource:** `monitoring/grafana/datasources/prometheus.yml`
```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
```

### B. Dashboard JSON
**Fichier:** `monitoring/grafana/dashboards/saga-orchestrator-dashboard.json`

**Structure des panneaux:**
1. **Throughput Panel** - Requêtes PromQL
2. **Latence Panel** - Histogrammes
3. **Stats Panels** - Métriques instantanées
4. **Timeseries** - Évolution temporelle

## 🔧 4. REQUÊTES PROMQL DÉTAILLÉES

### A. Saga Throughput (req/sec)
```promql
# Sagas complétées par seconde
rate(saga_total{status="completed"}[5m])

# Sagas échouées par seconde  
rate(saga_total{status="failed"}[5m])
```

### B. Latence (percentiles)
```promql
# Percentile 50 en millisecondes
histogram_quantile(0.50, rate(saga_duration_seconds_bucket[5m])) * 1000

# Percentile 95 en millisecondes
histogram_quantile(0.95, rate(saga_duration_seconds_bucket[5m])) * 1000

# Percentile 99 en millisecondes
histogram_quantile(0.99, rate(saga_duration_seconds_bucket[5m])) * 1000
```

### C. Taux de Succès
```promql
# Pourcentage de succès
saga_total{status="completed"} / (saga_total{status="completed"} + saga_total{status="failed"}) * 100
```

### D. Étapes par Seconde
```promql
# Étapes complétées par seconde, groupées par nom
rate(saga_step_total{status="completed"}[5m])
```

### E. Événements Métiers
```promql
# Événements business par seconde
rate(saga_business_events_total[5m])
```

## 🚀 5. GÉNÉRATION DES DONNÉES

### A. Dans le Code Saga Orchestrator
```javascript
// Compteur de sagas
sagaCounter.inc({ status: 'completed', type: 'transaction' });

// Histogramme de durée  
const timer = sagaDuration.startTimer({ type: 'transaction' });
timer({ status: 'completed' });

// Événements métiers
businessEventCounter.inc({ event_type: 'stock_reserved', service: 'stock' });

// Transitions d'état
stateTransitionCounter.inc({ from_state: 'PENDING', to_state: 'COMPLETED' });
```

### B. Endpoint /metrics
```
# HELP saga_total Total number of sagas executed
# TYPE saga_total counter
saga_total{status="completed",type="transaction"} 91

# HELP saga_duration_seconds Duration of saga execution in seconds  
# TYPE saga_duration_seconds histogram
saga_duration_seconds_bucket{le="0.5",type="transaction",status="completed"} 3
saga_duration_seconds_bucket{le="1",type="transaction",status="completed"} 6
```

## 📱 6. INTERFACES UTILISATEUR

### A. Dashboard Web (localhost:8010)
- **HTML/CSS/JavaScript** intégré dans Express
- **API REST** vers le même serveur
- **Charts.js** pour graphiques en temps réel
- **Refresh automatique** toutes les 5 secondes

### B. Grafana (localhost:3000)
- **Panels configurés** via JSON
- **Requêtes PromQL** vers Prometheus
- **Refresh automatique** toutes les 5 secondes
- **Alertes visuelles** par seuils

### C. Prometheus UI (localhost:9090)
- **Interface native** Prometheus
- **Exploration des métriques** brutes
- **Graphiques simples** pour debugging

## 🔗 7. FLUX COMPLET DE BOUT EN BOUT

```
[Saga Execution] 
    ↓ (génère)
[Métriques Prometheus + Logs + DB]
    ↓ (expose via /metrics)
[Prometheus scraping toutes les 5s]
    ↓ (stocke dans TSDB)
[Grafana Dashboard]
    ↓ (requêtes PromQL)
[Visualisation en temps réel]
```

## 🎯 8. POINTS DE CONFIGURATION

### A. Fréquence de collecte
- **Prometheus scraping:** 5 secondes
- **Dashboard refresh:** 5 secondes  
- **Logs:** Temps réel
- **Métriques:** Temps réel

### B. Rétention des données
- **Prometheus:** 200 heures
- **Logs:** Fichier persistent
- **SQLite:** En mémoire (reset au redémarrage)

### C. Performance
- **Prometheus:** Optimisé pour time-series
- **Grafana:** Cache et agrégations
- **Dashboard web:** Léger, API direct

Voilà l'architecture complète ! Chaque composant a un rôle spécifique dans la chaîne d'observabilité.
