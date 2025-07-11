# 📊 Configuration Grafana - Tableau de Bord POS

## 📋 Vue d'Ensemble

Configuration complète pour analyser les performances et retours du système Point de Vente (POS) avec Grafana et Prometheus.

---

## 🚀 Installation et Configuration

### 1. Docker Compose pour Grafana + Prometheus

Créer le fichier `docker-compose.monitoring.yml` :

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: pos-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: pos-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./config/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - monitoring
    depends_on:
      - prometheus

volumes:
  prometheus_data: {}
  grafana_data: {}

networks:
  monitoring:
    driver: bridge
```

### 2. Configuration Prometheus

Fichier `config/prometheus.yml` :

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"

scrape_configs:
  # API Gateway Metrics
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['host.docker.internal:9000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  # Microservices Metrics
  - job_name: 'produit-service'
    static_configs:
      - targets: ['host.docker.internal:3001']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'stock-service'
    static_configs:
      - targets: ['host.docker.internal:3002']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'vente-service'
    static_configs:
      - targets: ['host.docker.internal:3004']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'reporting-service'
    static_configs:
      - targets: ['host.docker.internal:3005']
    metrics_path: '/metrics'
    scrape_interval: 5s

  # Legacy System
  - job_name: 'legacy-system'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

---

## 📊 Dashboards Grafana

### Dashboard 1: Vue d'Ensemble Système POS

Fichier `config/grafana/dashboards/pos-overview.json` :

```json
{
  "dashboard": {
    "id": null,
    "title": "📊 POS System - Vue d'Ensemble",
    "tags": ["pos", "microservices", "overview"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "🏥 Santé des Services",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "{{job}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              {
                "options": {
                  "0": {"text": "DOWN", "color": "red"},
                  "1": {"text": "UP", "color": "green"}
                },
                "type": "value"
              }
            ]
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "🚀 Requêtes par Seconde",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{service}} - {{method}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "⏱️ Latence Moyenne",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])",
            "legendFormat": "{{service}}"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "❌ Taux d'Erreurs",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"4..|5..\"}[5m])",
            "legendFormat": "Erreurs {{service}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "id": 5,
        "title": "🔀 Décisions de Routage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(routing_decisions_total[5m])",
            "legendFormat": "{{console_type}} → {{target_type}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

### Dashboard 2: Performance Microservices

Fichier `config/grafana/dashboards/microservices-performance.json` :

```json
{
  "dashboard": {
    "id": null,
    "title": "🧩 Microservices - Performance Détaillée",
    "tags": ["pos", "microservices", "performance"],
    "panels": [
      {
        "id": 1,
        "title": "📦 Service Produit - Métriques",
        "type": "row",
        "gridPos": {"h": 1, "w": 24, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Requêtes Produit/sec",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"produit-service\"}[5m])",
            "legendFormat": "Produit Service"
          }
        ],
        "gridPos": {"h": 6, "w": 6, "x": 0, "y": 1}
      },
      {
        "id": 3,
        "title": "Latence P95 Produit",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"produit-service\"}[5m]))",
            "legendFormat": "P95"
          }
        ],
        "gridPos": {"h": 6, "w": 6, "x": 6, "y": 1}
      },
      {
        "id": 4,
        "title": "Operations DB Produit",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(db_operations_total{job=\"produit-service\"}[5m])",
            "legendFormat": "{{operation}} - {{table}}"
          }
        ],
        "gridPos": {"h": 6, "w": 12, "x": 12, "y": 1}
      },
      {
        "id": 5,
        "title": "📦 Service Stock - Métriques",
        "type": "row",
        "gridPos": {"h": 1, "w": 24, "x": 0, "y": 7}
      },
      {
        "id": 6,
        "title": "Operations Stock",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(stock_operations_total[5m])",
            "legendFormat": "{{operation}} - {{product}}"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      },
      {
        "id": 7,
        "title": "💰 Service Vente - Métriques",
        "type": "row",
        "gridPos": {"h": 1, "w": 24, "x": 0, "y": 16}
      },
      {
        "id": 8,
        "title": "Ventes par Minute",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"vente-service\",route=~\".*ventes.*\"}[1m])",
            "legendFormat": "Ventes"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 17}
      },
      {
        "id": 9,
        "title": "Revenus Estimés",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"vente-service\",method=\"POST\"}[5m]) * 25",
            "legendFormat": "€/min estimé"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 17}
      }
    ],
    "time": {
      "from": "now-30m",
      "to": "now"
    },
    "refresh": "10s"
  }
}
```

### Dashboard 3: Analyse Business POS

Fichier `config/grafana/dashboards/business-analytics.json` :

```json
{
  "dashboard": {
    "id": null,
    "title": "📈 POS Analytics - Vue Business",
    "tags": ["pos", "business", "analytics"],
    "panels": [
      {
        "id": 1,
        "title": "💳 Transactions par Heure",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(http_requests_total{job=\"vente-service\",method=\"POST\"}[1h])",
            "legendFormat": "Transactions"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "🏪 Utilisation Console POS",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(routing_decisions_total{console_type=\"pos\"}[5m])",
            "legendFormat": "Console POS"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "🏢 Utilisation Console Maison Mère",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(routing_decisions_total{console_type=\"maisonmere\"}[5m])",
            "legendFormat": "Console Admin"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "📊 Services les Plus Utilisés",
        "type": "piechart",
        "targets": [
          {
            "expr": "topk(5, rate(http_requests_total[5m]))",
            "legendFormat": "{{job}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "id": 5,
        "title": "⚠️ Alertes et Problèmes",
        "type": "table",
        "targets": [
          {
            "expr": "up == 0",
            "legendFormat": "Service DOWN: {{job}}"
          },
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) > 0",
            "legendFormat": "Erreurs 5xx: {{job}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      }
    ],
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

---

## 🚀 Déploiement et Configuration

### 1. Structure des Fichiers

```
config/
├── prometheus.yml
├── grafana/
│   ├── datasources/
│   │   └── prometheus.yml
│   └── dashboards/
│       ├── pos-overview.json
│       ├── microservices-performance.json
│       └── business-analytics.json
└── docker-compose.monitoring.yml
```

### 2. Commandes de Déploiement

```bash
# 1. Créer la structure
mkdir -p config/grafana/{datasources,dashboards}

# 2. Démarrer le monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# 3. Vérifier les services
docker-compose -f docker-compose.monitoring.yml ps

# 4. Accéder aux interfaces
# Grafana: http://localhost:3000 (admin/admin123)
# Prometheus: http://localhost:9090
```

### 3. Configuration Source de Données

Fichier `config/grafana/datasources/prometheus.yml` :

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

---

## 📊 Métriques Clés Analysées

### Performance Technique
- **Latence** : Temps de réponse par service
- **Throughput** : Requêtes par seconde
- **Erreurs** : Taux d'échec 4xx/5xx
- **Disponibilité** : Uptime des services

### Analyse Business
- **Transactions** : Volume ventes par heure
- **Utilisation** : Console POS vs Maison Mère
- **Services** : Répartition charge par microservice
- **Alertes** : Problèmes en temps réel

### Métriques POS Spécifiques
- **Routage** : Décisions Gateway par type console
- **Stock** : Opérations inventaire temps réel  
- **Produits** : Consultations catalogue
- **Ventes** : Transactions et revenus estimés

---

## 🎯 URLs et Accès

- **Grafana Dashboard** : http://localhost:3000
  - Login : `admin` / Password : `admin123`
- **Prometheus** : http://localhost:9090
- **Métriques Services** : 
  - API Gateway : http://localhost:9000/metrics
  - Produit : http://localhost:3001/metrics
  - Stock : http://localhost:3002/metrics
  - Vente : http://localhost:3004/metrics

---

**📊 DASHBOARDS GRAFANA PRÊTS POUR ANALYSE POS**  
*Monitoring complet performance + business analytics*
