# ADR-003: API Gateway et Stratégie de Routage

## Statut
**ACCEPTÉ** - Décembre 2024

## Contexte
L'architecture microservices nécessite un point d'entrée unifié pour :
- **Routage** des requêtes vers les services appropriés
- **Sécurité** centralisée (authentification, autorisation)
- **Observabilité** des flux entrants
- **Gestion de versions** d'API
- **Rate limiting** et protection DDoS

## Décision

### API Gateway Custom (Hybrid Router)
Développement d'un **API Gateway custom** en Node.js plutôt qu'une solution externe.

#### Justifications
1. **Contrôle total** : Logique de routage spécifique au domaine
2. **Performance** : Pas d'overhead d'une solution générique
3. **Simplicité** : Intégration native avec la stack Node.js
4. **Coût** : Pas de licensing d'outils tiers
5. **Évolutivité** : Ajout de fonctionnalités selon besoins

### Architecture de Routage

#### Pattern de Routage par Domaine (API v2)
```
/api/v2/produits/*    → Produit Service (3001)
/api/v2/stocks/*      → Stock Service (3002)  
/api/v2/ventes/*      → Vente Service (3004)
/api/v2/reports/*     → Reporting Service (3005)
/health               → Health Check global
/routing-info         → Information de routage
```

#### Routage Hybride par Console
- **Routes POS** (`/pos/*`) : Système legacy + microservices sélectifs
- **Routes Maison Mère** (`/maisonmere/*`) : Système legacy + reporting
- **Routes API v2** (`/api/v2/*`) : 100% microservices

#### Configuration Services
```javascript
const SERVICES = {
  legacy: 'http://localhost:3000',
  microservices: {
    produit: 'http://localhost:3001',
    stock: 'http://localhost:3002',
    vente: 'http://localhost:3004',
    reporting: 'http://localhost:3005'
  }
};
```

#### Port et Déploiement
- **API Gateway Port** : 9000 (point d'entrée principal)
- **Legacy System** : 3000 (support consoles)
- **Microservices** : 3001, 3002, 3004, 3005
  stock: {
    baseUrl: 'http://localhost:3002', 
    prefix: '/api/v1/stock',
    healthPath: '/health',
    timeout: 3000
  }
  // ...
};
```

## Alternatives Considérées

### Solutions Externes
| Solution | Avantages | Inconvénients | Décision |
|----------|-----------|---------------|----------|
| **Kong** | Fonctionnalités riches, plugins | Complexité, overhead | ❌ Rejeté |
| **AWS API Gateway** | Managé, scaling auto | Vendor lock-in, coût | ❌ Rejeté |
| **Envoy Proxy** | Performance, observabilité | Configuration complexe | ❌ Rejeté |
| **NGINX** | Performance, maturité | Pas de logique métier | ❌ Rejeté |
| **Custom Node.js** | Contrôle total, simplicité | Développement à faire | ✅ **Choisi** |

### Patterns de Routage
| Pattern | Avantages | Inconvénients | Décision |
|---------|-----------|---------------|----------|
| **Path-based** | Simple, RESTful | Rigide pour évolutions | ✅ **Choisi** |
| **Header-based** | Flexible, versioning | Complexité client | ❌ Rejeté |
| **Subdomain** | Isolation DNS | Infrastructure DNS | ❌ Rejeté |

## Fonctionnalités Implémentées

### 1. Routage Intelligent
```javascript
// Auto-découverte des services
const discoverServices = async () => {
  for (const service of services) {
    try {
      await checkHealth(service);
      service.status = 'healthy';
    } catch {
      service.status = 'unhealthy';
    }
  }
};
```

### 2. Health Checking
- **Actif** : Ping périodique des services (30s)
- **Passif** : Circuit breaker sur échecs consécutifs
- **Exposition** : Endpoint `/health` global avec détail par service

### 3. Observabilité Intégrée
```javascript
// Métriques exposées
- gateway_requests_total
- gateway_request_duration_seconds  
- gateway_upstream_errors_total
- gateway_active_connections
```

### 4. Gestion d'Erreurs
- **Timeout** : 5s par défaut, configurable par service
- **Retry** : 2 tentatives avec backoff exponentiel
- **Circuit Breaker** : Isolation des services défaillants
- **Fallback** : Réponse dégradée si possible

### 5. Sécurité (Future)
```javascript
// Hooks prêts pour implémentation
- authenticate()     // JWT validation
- authorize()        // RBAC check  
- rateLimit()        // Par IP/user
- validateInput()    // Schema validation
```

## Configuration de Déploiement

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 9000
CMD ["node", "hybrid-router.js"]
```

### Variables d'Environnement
```bash
# Configuration services
PRODUIT_SERVICE_URL=http://produit-service:3001
STOCK_SERVICE_URL=http://stock-service:3002
VENTE_SERVICE_URL=http://vente-service:3004
REPORTING_SERVICE_URL=http://reporting-service:3005

# Configuration gateway
GATEWAY_PORT=9000
HEALTH_CHECK_INTERVAL=30000
REQUEST_TIMEOUT=5000
MAX_RETRIES=2
```

## Critères de Succès
- [ ] Latence gateway < 2ms (overhead acceptable)
- [ ] Disponibilité > 99.95%
- [ ] Débit > 1000 req/sec
- [ ] Circuit breaker : Isolation < 10s
- [ ] Health check : Détection panne < 30s

## Évolutions Prévues

### Phase 2 - Sécurité
- Authentification JWT
- Rate limiting par utilisateur
- CORS configuration avancée

### Phase 3 - Performance  
- Cache Redis pour réponses fréquentes
- Load balancing si multi-instances
- Compression gzip/brotli

### Phase 4 - Observabilité
- Tracing distribué (Jaeger)
- Logs structurés (ELK)
- Alerting automatique

## Risques et Mitigations

### SPOF (Single Point of Failure)
- **Risque** : Gateway down = tout le système inaccessible
- **Mitigation** : Déploiement multi-instances + load balancer

### Performance Bottleneck
- **Risque** : Gateway devient le goulot d'étranglement
- **Mitigation** : Monitoring proactif + scaling horizontal

---
*Auteur : Équipe Platform*  
*Réviseurs : Architecture, Security*
