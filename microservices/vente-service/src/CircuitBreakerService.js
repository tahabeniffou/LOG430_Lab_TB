// Circuit Breaker Pattern Implementation pour LOG430 Lab
// À intégrer dans tous les microservices

const CircuitBreaker = require('opossum');

/**
 * Configuration Circuit Breaker conforme aux standards industrie
 */
const circuitBreakerOptions = {
  timeout: 3000,                    // 3s timeout
  errorThresholdPercentage: 50,     // 50% erreurs = ouverture
  resetTimeout: 30000,              // 30s avant retry
  capacity: 10,                     // Taille du buffer
  volumeThreshold: 5,               // Minimum requêtes avant évaluation
  monitoringPeriod: 10000,          // 10s période monitoring
  rollingCountTimeout: 10000,       // 10s fenêtre glissante
  name: 'ServiceCircuitBreaker',
  allowWarmUp: true,
  warming: 2000
};

/**
 * Factory pour créer circuit breakers typés
 */
class CircuitBreakerFactory {
  static createHttpBreaker(serviceName, serviceUrl) {
    const options = {
      ...circuitBreakerOptions,
      name: `${serviceName}-http-breaker`
    };

    const breaker = new CircuitBreaker(async (path, config) => {
      const axios = require('axios');
      const fullUrl = `${serviceUrl}${path}`;
      
      console.log(`[Circuit Breaker] Calling ${fullUrl}`);
      const response = await axios({
        url: fullUrl,
        timeout: options.timeout,
        ...config
      });
      
      return response.data;
    }, options);

    // Events pour monitoring
    breaker.on('open', () => {
      console.error(`🔴 [Circuit Breaker] ${serviceName} OPEN - Service indisponible`);
    });

    breaker.on('halfOpen', () => {
      console.warn(`🟡 [Circuit Breaker] ${serviceName} HALF-OPEN - Test de récupération`);
    });

    breaker.on('close', () => {
      console.log(`🟢 [Circuit Breaker] ${serviceName} CLOSED - Service récupéré`);
    });

    breaker.on('failure', (error) => {
      console.error(`❌ [Circuit Breaker] ${serviceName} Échec:`, error.message);
    });

    return breaker;
  }

  static createDatabaseBreaker(dbName, dbOperation) {
    const options = {
      ...circuitBreakerOptions,
      name: `${dbName}-db-breaker`,
      timeout: 5000 // DB timeout plus long
    };

    const breaker = new CircuitBreaker(dbOperation, options);

    breaker.on('open', () => {
      console.error(`🔴 [DB Circuit Breaker] ${dbName} OPEN - Base indisponible`);
    });

    breaker.on('close', () => {
      console.log(`🟢 [DB Circuit Breaker] ${dbName} CLOSED - Base récupérée`);
    });

    return breaker;
  }
}

/**
 * Service Client avec Circuit Breaker intégré
 */
class ResilientServiceClient {
  constructor(serviceName, serviceUrl) {
    this.serviceName = serviceName;
    this.serviceUrl = serviceUrl;
    this.breaker = CircuitBreakerFactory.createHttpBreaker(serviceName, serviceUrl);
    this.cache = new Map(); // Cache simple pour fallback
  }

  async get(path, options = {}) {
    const cacheKey = `GET_${path}`;
    
    try {
      const result = await this.breaker.fire(path, { method: 'GET', ...options });
      
      // Mettre en cache pour fallback
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.warn(`⚠️ [Fallback] ${this.serviceName} - Utilisation cache pour ${path}`);
      
      // Fallback vers cache
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 min
        return cached.data;
      }
      
      // Fallback vers valeur par défaut
      return this.getDefaultResponse(path);
    }
  }

  async post(path, data, options = {}) {
    try {
      return await this.breaker.fire(path, { 
        method: 'POST', 
        data, 
        ...options 
      });
    } catch (error) {
      console.error(`❌ [POST Failed] ${this.serviceName}${path}:`, error.message);
      throw new Error(`Service ${this.serviceName} indisponible pour l'écriture`);
    }
  }

  getDefaultResponse(path) {
    // Réponses par défaut selon le service
    const defaults = {
      '/health': { status: 'degraded', service: this.serviceName },
      '/produits': { produits: [], message: 'Service temporairement indisponible' },
      '/stock': { stock: 0, disponible: false, message: 'Vérification impossible' }
    };

    return defaults[path] || { 
      error: 'Service indisponible', 
      service: this.serviceName 
    };
  }

  // Méthodes utilitaires
  isOpen() {
    return this.breaker.opened;
  }

  getStats() {
    return this.breaker.stats;
  }

  clearCache() {
    this.cache.clear();
  }
}

/**
 * Middleware Express pour Circuit Breaker sur endpoints
 */
function circuitBreakerMiddleware(breaker) {
  return async (req, res, next) => {
    if (breaker.opened) {
      return res.status(503).json({
        error: 'Service temporairement indisponible',
        status: 'circuit_breaker_open',
        retryAfter: breaker.options.resetTimeout / 1000
      });
    }
    next();
  };
}

/**
 * Retry Policy avec backoff exponentiel
 */
class RetryPolicy {
  static async withBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`⏱️ [Retry] Tentative ${attempt}/${maxRetries} échouée, retry dans ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

/**
 * Health Check avec Circuit Breaker
 */
class HealthCheckService {
  constructor() {
    this.services = new Map();
  }

  addService(name, url, healthPath = '/health') {
    const client = new ResilientServiceClient(name, url);
    this.services.set(name, { client, healthPath });
  }

  async checkAll() {
    const results = {};
    
    for (const [name, { client, healthPath }] of this.services) {
      try {
        const health = await client.get(healthPath);
        results[name] = {
          status: 'healthy',
          ...health,
          circuitBreaker: {
            state: client.isOpen() ? 'open' : 'closed',
            stats: client.getStats()
          }
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          circuitBreaker: {
            state: client.isOpen() ? 'open' : 'closed'
          }
        };
      }
    }
    
    return results;
  }
}

/**
 * Configuration pour chaque microservice
 */
const ServiceRegistry = {
  PRODUIT_SERVICE: {
    name: 'produit-service',
    urls: [
      'http://produit-service-1:3001',
      'http://produit-service-2:3005', 
      'http://produit-service-3:3006'
    ]
  },
  VENTE_SERVICE: {
    name: 'vente-service',
    urls: ['http://vente-service:3004']
  },
  STOCK_SERVICE: {
    name: 'stock-service', 
    urls: ['http://stock-service:3007']
  },
  REPORTING_SERVICE: {
    name: 'reporting-service',
    urls: ['http://reporting-service:3008']
  }
};

module.exports = {
  CircuitBreakerFactory,
  ResilientServiceClient,
  circuitBreakerMiddleware,
  RetryPolicy,
  HealthCheckService,
  ServiceRegistry
};
