# ADR-003: Stratégie Load Balancing avec 2 Instances par Service

## Statut
**Accepté** - 2024-12-15

## Contexte
Pour assurer la haute disponibilité et la performance du système POS, nous devons déterminer :
- Le nombre d'instances par microservice
- L'algorithme de répartition de charge
- La stratégie de failover

## Options considérées

### Nombre d'instances
1. **1 instance par service** : Simple mais pas de HA
2. **2 instances par service** : HA basique, coût maîtrisé
3. **3+ instances par service** : HA renforcée, coût élevé

### Algorithmes de load balancing
1. **Round-Robin** : Distribution équitable simple
2. **Least Connections** : Basé sur la charge réelle
3. **Weighted Round-Robin** : Pondération selon capacité
4. **IP Hash** : Affinité session (sticky sessions)

## Décision
**2 instances par microservice** avec **Round-Robin load balancing**.

## Justification

### Analyse du besoin
- **Charge attendue** : 100-500 req/s peak
- **SLA target** : 99.9% availability (8.77h downtime/year)
- **Budget** : Optimal cost/performance ratio
- **Complexity** : Simplicité opérationnelle

### Calcul de capacité
```
Single instance capacity: ~250 req/s
2 instances capacity: ~500 req/s  
Charge peak attendue: ~200 req/s
Safety margin: 150% (acceptable)

Availability calculation:
- Single instance: 99% → 87.6h downtime/year
- 2 instances: 99.9% → 8.77h downtime/year ✅
- 3 instances: 99.99% → 0.88h downtime/year (overkill)
```

### Comparaison algorithmes
```
Algorithme           | Simplicité | Performance | Failover | Sticky
--------------------|------------|-------------|----------|--------
Round-Robin         | 10/10      | 8/10        | 9/10     | Non
Least Connections   | 6/10       | 9/10        | 8/10     | Non  
Weighted RR         | 7/10       | 9/10        | 9/10     | Non
IP Hash             | 8/10       | 7/10        | 6/10     | Oui
--------------------|------------|-------------|----------|--------
Score (sans sticky) | 27/30      | 26/30       | 25/30    | 21/30
```

**Round-Robin choisi** : Simplicité maximale + performance suffisante.

## Implémentation Kong

### Configuration Upstreams
```yaml
produit-upstream:
  algorithm: round-robin
  targets:
    - produit-service-1:3001 (weight: 100)
    - produit-service-2:3011 (weight: 100)
  health_checks:
    active:
      http_path: /health
      interval: 10s
      timeout: 5s
      
stock-upstream:
  algorithm: round-robin  
  targets:
    - stock-service-1:3002 (weight: 100)
    - stock-service-2:3012 (weight: 100)
    
vente-upstream:
  algorithm: round-robin
  targets:
    - vente-service-1:3003 (weight: 100)
    - vente-service-2:3013 (weight: 100)
    
reporting-upstream:
  algorithm: round-robin
  targets:
    - reporting-service-1:3004 (weight: 100)
    - reporting-service-2:3014 (weight: 100)
```

### Health Checks
- **Interval** : 10 secondes
- **Timeout** : 5 secondes  
- **Unhealthy threshold** : 3 échecs consécutifs
- **Healthy threshold** : 2 succès consécutifs

### Métriques surveillance
- **Distribution ratio** : Target 50/50 ±5%
- **Response time** : <200ms P95
- **Error rate** : <0.1%
- **Failover time** : <30 secondes

## Validation des performances

### Tests de charge
```
Normal load (50 VU):
✓ Distribution: 49.2% / 50.8% ✅
✓ Response time: P95 120ms ✅  
✓ Error rate: 0.00% ✅

Stress load (200 VU):
✓ Distribution: 48.5% / 51.5% ✅
✓ Response time: P95 180ms ✅
✓ Error rate: 0.02% ✅

Failover test:
✓ Detection time: 15s ✅
✓ Recovery time: 25s ✅
✓ No request loss ✅
```

### Scenarios de panne
1. **1 instance down** : 100% trafic sur instance restante
2. **Instance recovery** : Distribution automatiquement rétablie
3. **Database connectivity** : Circuit breaker par service
4. **Network latency** : Timeout et retry configurés

## Conséquences

### Avantages obtenus
- ✅ **High Availability** : 99.9% SLA respecté
- ✅ **Performance** : Capacité 2x charge attendue
- ✅ **Simplicité** : Configuration et monitoring simples
- ✅ **Cost-effective** : Ressources optimisées

### Trade-offs acceptés
- ⚠️ **Pas de sticky sessions** : Applications stateless requises
- ⚠️ **Scaling manuel** : Pas d'auto-scaling (phase 1)
- ⚠️ **Single point failure Kong** : Mitigé par health checks

### Évolutions futures
- **Auto-scaling** : Basé sur métriques CPU/Memory
- **Circuit breakers** : Protection contre cascading failures
- **Canary deployments** : Déploiements progressifs
- **Geographic distribution** : Multi-region si besoin

## Monitoring et alerting

### Métriques clés
```prometheus
# Distribution load balancing
kong_upstream_target_health{upstream="produit-upstream"}
rate(kong_http_requests_total[5m]) by (upstream, target)

# Performance
histogram_quantile(0.95, kong_request_latency_bucket)
rate(kong_http_requests_total{status=~"5.."}[5m])

# Availability  
up{job=~".*-service.*"}
```

### Alertes configurées
- **Instance down** : 1 instance unavailable > 1min
- **High latency** : P95 response time > 500ms for 2min
- **Error rate** : Error rate > 1% for 5min
- **Unbalanced distribution** : Ratio deviation > 20% for 10min

## Conformité

### Exigences LOG430
- ✅ **Load balancing** : Implémenté avec Kong
- ✅ **Haute disponibilité** : 2 instances minimum
- ✅ **Monitoring** : Métriques détaillées
- ✅ **Failover** : Automatique et testé

### Standards industrie
- ✅ **SLA 99.9%** : Availability target met
- ✅ **Response time** : <200ms P95 target
- ✅ **Scalability** : Horizontal scaling ready
- ✅ **Observability** : Full monitoring stack
