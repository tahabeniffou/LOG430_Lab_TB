# ADR-002: Choix de Kong comme API Gateway

## Statut
**Accepté** - 2024-12-15

## Contexte
Avec l'architecture microservices, nous avons besoin d'un API Gateway pour :
- Centraliser les accès aux microservices
- Implémenter le load balancing
- Gérer l'authentification et autorisation
- Fournir monitoring et observabilité

## Options considérées

### Kong Gateway
- **Avantages** : Performance élevée, plugins riches, monitoring intégré
- **Inconvénients** : Courbe d'apprentissage, configuration complexe
- **Licence** : Open Source + Enterprise options

### NGINX Plus
- **Avantages** : Performance excellente, reverse proxy mature
- **Inconvénients** : Fonctionnalités API Gateway limitées
- **Licence** : Commerciale

### Traefik
- **Avantages** : Configuration automatique, Docker native
- **Inconvénients** : Performance moindre, moins de features entreprise
- **Licence** : Open Source

### AWS API Gateway
- **Avantages** : Managed service, scaling automatique
- **Inconvénients** : Vendor lock-in, coûts variables
- **Licence** : Pay-per-use

## Décision
Kong Gateway (Open Source) pour l'API Gateway et load balancing.

## Justification

### Critères de sélection
1. **Performance** : >10,000 req/s capability ✅
2. **Load Balancing** : Round-robin, health checks ✅
3. **Monitoring** : Prometheus metrics native ✅
4. **Extensibilité** : Plugin architecture ✅
5. **Coût** : Open Source ✅
6. **Learning curve** : Documentation complète ✅

### Analyse comparative
```
Critère          | Kong | NGINX+ | Traefik | AWS
-----------------|------|---------|---------|----
Performance      | 9/10 | 10/10   | 7/10    | 8/10
Features         | 9/10 | 6/10    | 7/10    | 8/10
Cost             | 10/10| 5/10    | 10/10   | 6/10
Complexity       | 6/10 | 8/10    | 9/10    | 9/10
Lock-in          | 10/10| 10/10   | 10/10   | 3/10
-----------------|------|---------|---------|----
Score total      | 44/50| 39/50   | 43/50   | 34/50
```

### Fonctionnalités clés utilisées
- **Load Balancing** : Round-robin entre 2 instances/service
- **Health Checks** : Monitoring automatique services
- **Rate Limiting** : Protection DDoS
- **CORS** : Support applications web
- **Prometheus** : Métriques détaillées
- **Admin API** : Configuration dynamique

## Implémentation
- **Kong Proxy** : Port 8000 (public API)
- **Kong Admin** : Port 8001 (configuration)
- **Kong Manager** : Port 8002 (interface web)
- **Database** : PostgreSQL pour configuration
- **Plugins** : CORS, Rate Limiting, Prometheus

## Configuration
```yaml
Services configurés:
- produit-service → /api/v2/produits
- stock-service → /api/v2/stocks  
- vente-service → /api/v2/ventes
- reporting-service → /api/v2/reports

Upstreams (Load Balancing):
- 2 instances par service
- Algorithm: round-robin
- Health checks: active monitoring
```

## Conséquences
- Point central pour toutes les requêtes API
- Monitoring unifié via Kong métriques
- Configuration centralisée des politiques
- Dépendance sur Kong pour disponibilité système

## Alternatives futures
- Migration vers Kong Enterprise si besoins avancés
- Évaluation Envoy Proxy pour service mesh
- Considération Istio pour orchestration Kubernetes

## Conformité
- ✅ **LOG430** : API Gateway moderne
- ✅ **Performance** : Load balancing efficace  
- ✅ **Observabilité** : Monitoring intégré
- ✅ **Scalabilité** : Architecture horizontale
