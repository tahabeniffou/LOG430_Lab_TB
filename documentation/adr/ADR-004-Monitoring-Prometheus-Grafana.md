# ADR-004: Monitoring Prometheus + Grafana

## Statut
Accepté - 2024-12-15

## Contexte
Architecture microservices nécessite observabilité :
- Performance instances microservices
- Distribution load balancing
- Alertes anomalies

## Décision
Stack Prometheus + Grafana pour monitoring.
- Fournir des dashboards pour les équipes opérationnelles

## Options considérées

### Stack Prometheus + Grafana
- **Avantages** : Standard industrie, écosystème riche, gratuit
- **Inconvénients** : Configuration initiale, learning curve
- **Intégration** : Kong native, Docker simple

### ELK Stack (Elasticsearch + Logstash + Kibana)
- **Avantages** : Recherche full-text excellente, logs centralisés
- **Inconvénients** : Lourd en ressources, complexité haute
- **Focus** : Logs > Métriques

### DataDog / New Relic
- **Avantages** : SaaS managed, features avancées, support
- **Inconvénients** : Coût élevé, vendor lock-in
- **Adapté** : Grandes entreprises

### Custom Dashboard HTML + APIs
- **Avantages** : Contrôle total, branding custom
- **Inconvénients** : Développement lourd, maintenance continue
- **ROI** : Négatif pour monitoring système

## Décision
**Prometheus + Grafana** pour le monitoring et l'observabilité complète.

## Justification

### Analyse comparative
```
Critère              | Prom+Graf | ELK    | DataDog | Custom
--------------------|-----------|--------|---------|--------
Time to value       | 8/10      | 4/10   | 9/10    | 2/10
Cost effectiveness   | 10/10     | 7/10   | 3/10    | 4/10
Kong integration     | 10/10     | 6/10   | 8/10    | 5/10
Scalability         | 9/10      | 9/10   | 10/10   | 6/10
Learning curve      | 7/10      | 4/10   | 8/10    | 3/10
Community support   | 10/10     | 8/10   | 7/10    | 2/10
--------------------|-----------|--------|---------|--------
Score total         | 54/60     | 38/60  | 45/60   | 22/60
```

### Intégration Kong native
Kong expose nativement les métriques Prometheus :
```
# Kong métriques disponibles
kong_http_requests_total{service,route,status}
kong_request_latency{service,route}
kong_upstream_target_health{upstream,target}
kong_bandwidth_bytes{service,route,direction}
```

### Besoins spécifiques couverts
- ✅ **Time series** : Évolution performance dans le temps
- ✅ **Load balancing** : Distribution entre instances
- ✅ **Alerting** : Seuils configurables
- ✅ **Dashboards** : Visualisation intuitive
- ✅ **Service discovery** : Auto-discovery containers

## Architecture de monitoring

### Composants déployés
```yaml
prometheus:
  image: prom/prometheus:latest
  port: 9090
  config: /etc/prometheus/prometheus.yml
  targets:
    - kong:8001/metrics
    - produit-service-1:3001/metrics
    - produit-service-2:3011/metrics
    - stock-service-1:3002/metrics
    - stock-service-2:3012/metrics
    - vente-service-1:3003/metrics
    - vente-service-2:3013/metrics
    - reporting-service-1:3004/metrics
    - reporting-service-2:3014/metrics

grafana:
  image: grafana/grafana:latest
  port: 3030
  datasource: prometheus:9090
  dashboards:
    - Kong Gateway & Microservices Monitoring
    - Load Balancer Distribution
    - System Resources Overview
```

### Configuration Prometheus
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kong'
    static_configs:
      - targets: ['kong:8001']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'microservices'
    static_configs:
      - targets: 
        - 'produit-service-1:3001'
        - 'produit-service-2:3011'
        # ... autres services
    scrape_interval: 15s

rule_files:
  - "alert_rules.yml"

alertmanager:
  static_configs:
    - targets: ['alertmanager:9093']
```

## Dashboards Grafana

### Dashboard principal : "Kong Gateway & Microservices"
```json
Panels configurés:
1. Kong Requests per Second
   - Métrique: rate(kong_http_requests_total[5m])
   - Type: Stat panel
   
2. Response Time P95
   - Métrique: histogram_quantile(0.95, kong_request_latency_bucket)
   - Type: Time series
   
3. Load Balancer Distribution  
   - Métrique: kong_upstream_target_health
   - Type: Pie chart
   
4. Service Health Status
   - Métrique: up{job=~".*-service.*"}
   - Type: Table
   
5. Error Rate
   - Métrique: rate(kong_http_requests_total{status=~"5.."}[5m])
   - Type: Time series
```

### Seuils et alertes visuelles
```yaml
Seuils configurés:
- Response time: 
  * Vert: <100ms
  * Orange: 100-200ms  
  * Rouge: >200ms
  
- Error rate:
  * Vert: <0.1%
  * Orange: 0.1-1%
  * Rouge: >1%
  
- Load balance ratio:
  * Vert: 45-55%
  * Orange: 40-60%  
  * Rouge: <40% ou >60%
```

## Métriques business

### KPIs techniques surveillés
```prometheus
# Performance
avg(rate(kong_http_requests_total[5m])) # Throughput
histogram_quantile(0.95, kong_request_latency_bucket) # Latency P95
rate(kong_http_requests_total{status=~"5.."}[5m]) # Error rate

# Availability  
up{job=~".*-service.*"} # Service uptime
kong_upstream_target_health # Target health

# Load balancing
rate(kong_http_requests_total[5m]) by (upstream, target) # Distribution

# Resources
rate(container_cpu_usage_seconds_total[5m]) # CPU usage
container_memory_working_set_bytes # Memory usage
```

### KPIs business dérivés
```prometheus
# Transactions per minute
sum(rate(kong_http_requests_total{route="ventes"}[1m])) * 60

# Revenue per hour (estimation)
sum(rate(kong_http_requests_total{route="ventes", status="200"}[1h])) * 50 * 60

# Customer satisfaction (response time)
100 - (histogram_quantile(0.95, kong_request_latency_bucket) / 1000) * 10
```

## Alerting rules

### Alertes critiques
```yaml
groups:
  - name: kong_alerts
    rules:
      - alert: KongHighErrorRate
        expr: rate(kong_http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Kong error rate élevé"
          
      - alert: KongHighLatency
        expr: histogram_quantile(0.95, kong_request_latency_bucket) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kong latence élevée"
          
      - alert: MicroserviceDown
        expr: up{job=~".*-service.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Microservice indisponible"
          
      - alert: LoadBalancerImbalance
        expr: abs(rate(kong_upstream_target_health[5m]) - 0.5) > 0.2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Load balancer déséquilibré"
```

## Retention et stockage

### Politique de rétention
```yaml
Prometheus storage:
  - Real-time: 15 jours (résolution 15s)
  - Archive: 90 jours (résolution 5min)
  - Long-term: Export vers S3 si besoin

Grafana annotations:
  - Événements: 30 jours
  - Dashboards: Backup Git
  - Configurations: Infrastructure as Code
```

### Dimensionnement stockage
```
Métriques collectées: ~5000/minute
Taille par métrique: ~100 bytes
Stockage journalier: ~720MB
Stockage 90 jours: ~65GB
```

## Conséquences

### Bénéfices obtenus
- ✅ **Visibilité complète** : 360° view système
- ✅ **Détection proactive** : Alertes automatiques
- ✅ **Debugging accéléré** : Drill-down rapide
- ✅ **Capacity planning** : Tendances long terme
- ✅ **SLA monitoring** : Métriques objectives

### Coûts et efforts
- **Infrastructure** : +2GB RAM, +50GB storage
- **Learning curve** : 8h formation équipe
- **Maintenance** : 2h/mois configuration
- **ROI** : Positif dès 1 incident évité

### Évolutions futures
- **Machine Learning** : Anomaly detection
- **Tracing distribué** : Jaeger integration
- **Logs correlation** : ELK stack addition
- **Mobile dashboards** : Responsive design

## Conformité

### Exigences LOG430
- ✅ **Observabilité** : Monitoring complet implémenté
- ✅ **Performance tracking** : Métriques temps réel
- ✅ **Dashboards** : Visualisation professionnelle
- ✅ **Alerting** : Surveillance automatique

### Standards DevOps
- ✅ **Infrastructure as Code** : Configuration versionnée
- ✅ **Monitoring as Code** : Dashboards et alertes Git
- ✅ **SRE practices** : SLI/SLO measurement
- ✅ **Incident response** : Runbooks automatisés
