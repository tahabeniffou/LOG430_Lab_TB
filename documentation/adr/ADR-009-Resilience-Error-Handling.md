# ADR-009: Gestion des Erreurs et Résilience

## Statut
Accepté - 2024-12-15

## Contexte
Architecture distribuée nécessite gestion robuste :
- Pannes de services dépendants
- Latence réseau imprévisible
- Charges variables en production
- Récupération gracieuse après incident

## Décision
**Circuit Breaker Pattern** + **Retry avec Backoff** + **Timeout configurables**.

## Options considérées

### Patterns de résilience

#### Circuit Breaker
- **Avantages** : Protection cascade failures, recovery automatique
- **Inconvénients** : Configuration délicate, faux positifs
- **Adapté** : Services avec dépendances externes

#### Retry Pattern
- **Avantages** : Simple, efficace sur erreurs transitoires
- **Inconvénients** : Peut aggraver charge, retry storms
- **Adapté** : Erreurs réseau temporaires

#### Bulkhead Pattern
- **Avantages** : Isolation ressources, limitation blast radius
- **Inconvénients** : Complexité ressources, waste si mal configuré
- **Adapté** : Services haute charge

#### Timeout Pattern
- **Avantages** : Prévention hang indefini, SLA respect
- **Inconvénients** : Tuning difficile, peut interrompre prématurément
- **Adapté** : Toutes communications réseau

### Stratégies de fallback

#### Cache de données
- **Avantages** : Réponse immédiate, disponibilité haute
- **Inconvénients** : Données potentiellement stale
- **Adapté** : Données référentielles (produits, prix)

#### Mode dégradé
- **Avantages** : Service partiel maintenu
- **Inconvénients** : UX réduite, logique métier complexe
- **Adapté** : Fonctionnalités non-critiques

#### Queue/Messaging
- **Avantages** : Persistance, traitement asynchrone
- **Inconvénients** : Délai, complexité infrastructure
- **Adapté** : Opérations pouvant être différées

## Décision
**Circuit Breaker** + **Retry exponential backoff** + **Cache fallback**.

## Justification

### Architecture de résilience

```
┌─────────────┐    Circuit    ┌─────────────┐    Health     ┌─────────────┐
│   Service   │   Breaker    │   Network   │    Check     │   Target    │
│   Client    │ ────────────► │   Request   │ ────────────► │   Service   │
└─────────────┘              └─────────────┘              └─────────────┘
       │                            │                            │
       │ Fallback                   │ Retry                      │
       ▼                            ▼                            ▼
┌─────────────┐              ┌─────────────┐              ┌─────────────┐
│    Cache    │              │  Exponential│              │   Metrics   │
│   Local     │              │   Backoff   │              │ Prometheus  │
└─────────────┘              └─────────────┘              └─────────────┘
```

### Configuration Circuit Breaker

```javascript
// Configuration par microservice
const circuitBreakerConfig = {
  // Produit Service - Critique pour ventes
  'produit-service': {
    failureThreshold: 5,        // 5 échecs consécutifs
    resetTimeout: 30000,        // 30s avant retry
    monitoringPeriod: 60000,    // 1min fenêtre monitoring
    fallbackEnabled: true,      // Cache local produits
    cacheMaxAge: 300000        // 5min cache validity
  },
  
  // Stock Service - Tolérant erreurs courtes
  'stock-service': {
    failureThreshold: 3,
    resetTimeout: 15000,        // 15s recovery plus rapide
    monitoringPeriod: 30000,
    fallbackEnabled: true,      // Dernière valeur connue
    cacheMaxAge: 120000
  },
  
  // Reporting Service - Non critique
  'reporting-service': {
    failureThreshold: 10,       // Plus tolérant
    resetTimeout: 60000,        // 1min avant retry
    monitoringPeriod: 120000,
    fallbackEnabled: false,     // Pas de fallback
    cacheMaxAge: 0
  }
};
```

### Implémentation Circuit Breaker

```javascript
class CircuitBreaker {
  constructor(service, config) {
    this.service = service;
    this.config = config;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    
    // Métriques Prometheus
    this.metrics = {
      requests: new promClient.Counter({
        name: 'circuit_breaker_requests_total',
        help: 'Total requests through circuit breaker',
        labelNames: ['service', 'state', 'result']
      }),
      state_changes: new promClient.Counter({
        name: 'circuit_breaker_state_changes_total',
        help: 'Circuit breaker state changes',
        labelNames: ['service', 'from_state', 'to_state']
      })
    };
  }

  async execute(operation, fallback = null) {
    // Vérification état circuit
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.metrics.requests.inc({ 
          service: this.service, 
          state: 'OPEN', 
          result: 'blocked' 
        });
        return this.executeFallback(fallback);
      } else {
        this.setState('HALF_OPEN');
      }
    }

    try {
      // Tentative d'exécution avec timeout
      const result = await this.executeWithTimeout(operation);
      
      // Succès : reset compteur
      if (this.state === 'HALF_OPEN') {
        this.setState('CLOSED');
      }
      this.failures = 0;
      
      this.metrics.requests.inc({ 
        service: this.service, 
        state: this.state, 
        result: 'success' 
      });
      
      return result;
      
    } catch (error) {
      // Échec : incrément compteur
      this.failures++;
      this.lastFailureTime = Date.now();
      
      this.metrics.requests.inc({ 
        service: this.service, 
        state: this.state, 
        result: 'failure' 
      });

      // Seuil atteint : ouverture circuit
      if (this.failures >= this.config.failureThreshold) {
        this.setState('OPEN');
        this.nextAttempt = Date.now() + this.config.resetTimeout;
      }

      // Fallback ou propagation erreur
      if (fallback) {
        return this.executeFallback(fallback);
      } else {
        throw error;
      }
    }
  }

  async executeWithTimeout(operation) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout after ${this.config.timeout}ms`));
      }, this.config.timeout || 5000);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    
    this.metrics.state_changes.inc({
      service: this.service,
      from_state: oldState,
      to_state: newState
    });

    logger.info(`Circuit breaker ${this.service}: ${oldState} → ${newState}`);
  }
}
```

### Retry avec Exponential Backoff

```javascript
class RetryPolicy {
  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  async execute(operation, retryableErrors = ['ECONNREFUSED', 'TIMEOUT']) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Vérification si erreur est retryable
        if (!this.isRetryableError(error, retryableErrors)) {
          throw error;
        }
        
        // Dernier essai atteint
        if (attempt === this.maxRetries) {
          break;
        }
        
        // Calcul délai avec jitter
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          this.maxDelay
        );
        
        logger.warn(`Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms: ${error.message}`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  isRetryableError(error, retryableErrors) {
    return retryableErrors.some(retryableError => 
      error.code === retryableError || 
      error.message.includes(retryableError)
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Cache de fallback

```javascript
class FallbackCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5min TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    // Éviction LRU si cache plein
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value: value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Vérification TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  clear() {
    this.cache.clear();
  }
}
```

### Intégration dans les microservices

```javascript
// Exemple : produit-service avec résilience
class ProduitService {
  constructor() {
    this.stockServiceBreaker = new CircuitBreaker('stock-service', circuitBreakerConfig['stock-service']);
    this.retryPolicy = new RetryPolicy(3, 1000, 5000);
    this.fallbackCache = new FallbackCache(500, 300000);
  }

  async getProduitWithStock(produitId) {
    try {
      // 1. Récupération produit (local)
      const produit = await this.getProduitLocal(produitId);
      
      // 2. Récupération stock (service externe avec résilience)
      const stock = await this.stockServiceBreaker.execute(
        () => this.retryPolicy.execute(() => this.getStockFromService(produitId)),
        () => this.fallbackCache.get(`stock:${produitId}`) || { quantite: 0, status: 'unknown' }
      );

      // 3. Cache résultat pour fallback futur
      this.fallbackCache.set(`stock:${produitId}`, stock);

      return { ...produit, stock };
      
    } catch (error) {
      logger.error(`Erreur getProduitWithStock ${produitId}:`, error);
      throw error;
    }
  }

  async getStockFromService(produitId) {
    const response = await axios.get(`${STOCK_SERVICE_URL}/stocks/${produitId}`, {
      timeout: 3000
    });
    return response.data;
  }
}
```

## Observabilité et monitoring

### Métriques de résilience

```javascript
// Métriques Prometheus pour resilience
const resilienceMetrics = {
  circuit_breaker_state: new promClient.Gauge({
    name: 'circuit_breaker_state',
    help: 'Circuit breaker current state (0=closed, 1=open, 2=half-open)',
    labelNames: ['service']
  }),
  
  fallback_executions: new promClient.Counter({
    name: 'fallback_executions_total',
    help: 'Total fallback executions',
    labelNames: ['service', 'fallback_type']
  }),
  
  retry_attempts: new promClient.Histogram({
    name: 'retry_attempts',
    help: 'Number of retry attempts per operation',
    labelNames: ['service', 'operation'],
    buckets: [0, 1, 2, 3, 5, 10]
  })
};
```

### Dashboard Grafana

```json
{
  "dashboard": {
    "title": "Microservices Resilience",
    "panels": [
      {
        "title": "Circuit Breaker States",
        "type": "stat",
        "targets": [
          {
            "expr": "circuit_breaker_state",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Fallback Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(fallback_executions_total[5m])",
            "legendFormat": "{{service}} - {{fallback_type}}"
          }
        ]
      },
      {
        "title": "Retry Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(retry_attempts_bucket[5m])",
            "legendFormat": "{{le}}"
          }
        ]
      }
    ]
  }
}
```

## Conséquences

### Avantages obtenus
- ✅ **Disponibilité** : Service partiel même si dépendances down
- ✅ **Performance** : Fallback cache évite attentes inutiles
- ✅ **Observabilité** : Métriques détaillées pour debugging
- ✅ **Auto-recovery** : Circuit breaker permet récupération automatique

### Défis acceptés
- ⚠️ **Complexité** : Configuration délicate par service
- ⚠️ **Données stale** : Cache peut servir données obsolètes
- ⚠️ **Tuning** : Paramètres à ajuster selon charge réelle
- ⚠️ **Memory** : Cache et métriques consomment RAM

### SLA targets
- **Availability** : 99.9% avec fallbacks
- **P95 latency** : < 500ms including fallbacks
- **Recovery time** : < 30s après retour service
- **Cache hit rate** : > 80% pendant incidents

## Conformité

- ✅ **Netflix OSS** : Patterns validés en production
- ✅ **Microservices** : Résilience distribuée
- ✅ **Observability** : Metrics + logging + tracing
- ✅ **SRE** : Error budgets et SLI/SLO

---

**Références** :
- Circuit Breaker Pattern - Martin Fowler
- Release It! - Michael Nygard
- Building Microservices - Sam Newman
- Site Reliability Engineering - Google SRE
