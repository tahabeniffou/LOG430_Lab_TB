# 📊 Guide Monitoring Prometheus & Grafana

## Vue d'ensemble

Le système POS microservices utilise une stack d'observabilité moderne avec **Prometheus** pour la collecte de métriques et **Grafana** pour la visualisation.

---

## 🔍 Prometheus - Collecte de Métriques

### Configuration

**Port** : 9090  
**URL** : http://localhost:9090  
**Configuration** : `monitoring/prometheus.yml`

### Métriques collectées

#### Métriques Infrastructure
```yaml
# Kong Gateway
kong_http_requests_total
kong_http_request_duration_ms
kong_upstream_target_health

# Services
http_request_duration_seconds
http_requests_total
nodejs_heap_size_used_bytes
nodejs_heap_size_total_bytes
```

#### Métriques Business
```yaml
# Produits
pos_produits_total
pos_produits_categories_total

# Stock
pos_stock_quantity_current
pos_stock_movements_total
pos_stock_alerts_total

# Ventes
pos_ventes_total
pos_ventes_amount_total
pos_ventes_daily_count

# E-commerce
pos_comptes_total
pos_paniers_active_total
pos_commandes_total
```

### Queries utiles

```promql
# Latence P95 par service
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Taux d'erreur par service
rate(http_requests_total{status=~"5.."}[5m])

# Throughput par endpoint
rate(http_requests_total[5m])

# Santé des services
up{job="kong-gateway"}
```

---

## 📈 Grafana - Visualisation

### Configuration

**Port** : 3008  
**URL** : http://localhost:3008  
**Credentials** : admin/admin  
**Configuration** : `config/grafana/`

### Dashboards disponibles

#### 1. Infrastructure Overview
```json
{
  "title": "POS Infrastructure",
  "panels": [
    {
      "title": "Services Health",
      "type": "stat",
      "targets": ["up{job=~'.*-service'}"]
    },
    {
      "title": "Kong Gateway Status", 
      "type": "stat",
      "targets": ["up{job='kong-gateway'}"]
    },
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": ["rate(http_requests_total[5m])"]
    }
  ]
}
```

#### 2. API Performance
```json
{
  "title": "API Performance",
  "panels": [
    {
      "title": "Response Time P95",
      "type": "graph", 
      "targets": ["histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"]
    },
    {
      "title": "Error Rate",
      "type": "graph",
      "targets": ["rate(http_requests_total{status=~'5..'}[5m])"]
    },
    {
      "title": "Throughput by Service",
      "type": "graph",
      "targets": ["rate(http_requests_total[5m]) by (service)"]
    }
  ]
}
```

#### 3. Business Metrics
```json
{
  "title": "POS Business Analytics",
  "panels": [
    {
      "title": "Ventes Aujourd'hui",
      "type": "stat",
      "targets": ["increase(pos_ventes_total[1d])"]
    },
    {
      "title": "Chiffre d'Affaires",
      "type": "stat", 
      "targets": ["increase(pos_ventes_amount_total[1d])"]
    },
    {
      "title": "Stock Alerts",
      "type": "stat",
      "targets": ["pos_stock_alerts_total"]
    },
    {
      "title": "Comptes Actifs",
      "type": "stat",
      "targets": ["pos_comptes_total"]
    }
  ]
}
```

---

## 🚨 Alerting

### Règles d'alerte Prometheus

```yaml
# prometheus.rules.yml
groups:
  - name: pos-alerts
    rules:
      - alert: ServiceDown
        expr: up{job=~".*-service"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on {{ $labels.service }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency on {{ $labels.service }}"

      - alert: LowStock
        expr: pos_stock_quantity_current < pos_stock_threshold
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Low stock for product {{ $labels.product_id }}"
```

### Configuration alerting Grafana

```json
{
  "alert": {
    "conditions": [
      {
        "evaluator": {
          "params": [0.95],
          "type": "gt"
        },
        "operator": {
          "type": "and"
        },
        "query": {
          "params": ["A", "5m", "now"]
        },
        "reducer": {
          "params": [],
          "type": "avg"
        },
        "type": "query"
      }
    ],
    "executionErrorState": "alerting",
    "for": "5m",
    "frequency": "10s",
    "handler": 1,
    "name": "High Latency Alert",
    "noDataState": "no_data"
  }
}
```

---

## 📊 Métriques Custom par Service

### Implémentation dans les microservices

```javascript
// metrics.js
const promClient = require('prom-client');

// Créer le registre
const register = new promClient.Registry();

// Métriques HTTP
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

// Métriques business
const businessCounter = new promClient.Counter({
  name: 'pos_business_operations_total',
  help: 'Total business operations',
  labelNames: ['operation_type', 'service']
});

const stockGauge = new promClient.Gauge({
  name: 'pos_stock_quantity_current',
  help: 'Current stock quantity by product',
  labelNames: ['product_id', 'product_name']
});

// Enregistrer métriques
register.registerMetric(httpRequestDuration);
register.registerMetric(businessCounter);
register.registerMetric(stockGauge);

// Middleware Express
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

// Endpoint métriques
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});

module.exports = {
  register,
  httpRequestDuration,
  businessCounter,
  stockGauge,
  metricsMiddleware
};
```

### Utilisation dans les services

```javascript
// Dans un service (ex: produit-service)
const { businessCounter, stockGauge } = require('./metrics');

// Compteur pour création produit
app.post('/api/produits', (req, res) => {
  // Logique création produit
  const produit = createProduit(req.body);
  
  // Incrémenter métrique
  businessCounter.labels('create_product', 'produit-service').inc();
  
  res.json({ success: true, data: produit });
});

// Gauge pour stock
app.get('/api/stocks/:id', (req, res) => {
  const stock = getStock(req.params.id);
  
  // Mettre à jour gauge
  stockGauge.labels(stock.produitId, stock.produitNom).set(stock.quantite);
  
  res.json({ success: true, data: stock });
});
```

---

## 🔧 Configuration avancée

### Prometheus scraping configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'kong-gateway'
    static_configs:
      - targets: ['kong:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'produit-service'
    static_configs:
      - targets: ['produit-service-1:3001', 'produit-service-2:3001']
    metrics_path: '/metrics'

  - job_name: 'stock-service'
    static_configs:
      - targets: ['stock-service-1:3002', 'stock-service-2:3002']
    metrics_path: '/metrics'

  - job_name: 'vente-service'
    static_configs:
      - targets: ['vente-service-1:3003', 'vente-service-2:3003']
    metrics_path: '/metrics'

  - job_name: 'reporting-service'
    static_configs:
      - targets: ['reporting-service-1:3004', 'reporting-service-2:3004']
    metrics_path: '/metrics'

  - job_name: 'compte-service'
    static_configs:
      - targets: ['compte-service-1:3005', 'compte-service-2:3005']
    metrics_path: '/metrics'

  - job_name: 'panier-service'
    static_configs:
      - targets: ['panier-service-1:3006', 'panier-service-2:3006']
    metrics_path: '/metrics'

  - job_name: 'checkout-service'
    static_configs:
      - targets: ['checkout-service-1:3007', 'checkout-service-2:3007']
    metrics_path: '/metrics'
```

### Grafana datasource configuration

```json
{
  "name": "Prometheus",
  "type": "prometheus",
  "url": "http://prometheus:9090",
  "access": "proxy",
  "isDefault": true,
  "jsonData": {
    "timeInterval": "5s",
    "httpMethod": "POST"
  }
}
```

---

## 🎯 KPIs et Dashboards Business

### KPIs Magasin Physique

```promql
# Chiffre d'affaires journalier
increase(pos_ventes_amount_total[1d])

# Nombre de transactions
increase(pos_ventes_total[1d])

# Panier moyen
increase(pos_ventes_amount_total[1d]) / increase(pos_ventes_total[1d])

# Top produits vendus
topk(10, increase(pos_produits_sold_total[1d]))

# Alertes stock bas
count(pos_stock_quantity_current < pos_stock_threshold)
```

### KPIs E-commerce

```promql
# Nouveaux comptes
increase(pos_comptes_total[1d])

# Paniers abandonnés
pos_paniers_active_total - increase(pos_commandes_total[1d])

# Taux de conversion
increase(pos_commandes_total[1d]) / increase(pos_paniers_created_total[1d])

# Commandes en cours
pos_commandes_pending_total
```

---

## 🚀 Démarrage et Vérification

### 1. Vérifier Prometheus

```bash
# Status targets
curl http://localhost:9090/api/v1/targets

# Query test
curl "http://localhost:9090/api/v1/query?query=up"

# Status configuration
curl http://localhost:9090/api/v1/status/config
```

### 2. Vérifier Grafana

```bash
# Health check
curl http://localhost:3008/api/health

# Login admin
curl -X POST http://localhost:3008/api/login \
  -H "Content-Type: application/json" \
  -d '{"user":"admin","password":"admin"}'
```

### 3. Test métriques services

```bash
# Métriques service produit
curl http://localhost:3001/metrics

# Métriques Kong
curl http://localhost:8000/metrics
```

---

## 📋 Checklist Monitoring

- [ ] Prometheus accessible sur port 9090
- [ ] Grafana accessible sur port 3008
- [ ] Tous les services exposent `/metrics`
- [ ] Targets Prometheus "UP"
- [ ] Dashboards Grafana configurés
- [ ] Alertes configurées
- [ ] Métriques business collectées

---

*Guide maintenu par l'équipe monitoring - Dernière mise à jour : 15 Juillet 2025*
