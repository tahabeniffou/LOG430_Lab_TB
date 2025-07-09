// Load Balancer avec Circuit Breakers - Architecture Microservices Conforme
// LOG430 Lab - Standards Industrie

const express = require('express');
const axios = require('axios');
const { ResilientServiceClient, RetryPolicy, HealthCheckService } = require('./src/CircuitBreakerService');

const app = express();
const port = process.env.PORT || 8000;

// Configuration des services cibles
const TARGET_SERVICES = (process.env.TARGET_SERVICES || 
  'http://produit-service-1:3001,http://produit-service-2:3005,http://produit-service-3:3006')
  .split(',');

console.log('🚀 Load Balancer Conforme - Initialisation');
console.log('Target services:', TARGET_SERVICES);

// Clients résilients pour chaque service
const serviceClients = TARGET_SERVICES.map((serviceUrl, index) => ({
  id: index,
  url: serviceUrl,
  client: new ResilientServiceClient(`produit-service-${index + 1}`, serviceUrl),
  isHealthy: true,
  lastHealthCheck: Date.now(),
  failureCount: 0
}));

// Health check service
const healthChecker = new HealthCheckService();
TARGET_SERVICES.forEach((url, index) => {
  healthChecker.addService(`produit-service-${index + 1}`, url);
});

// Round-robin avec services sains uniquement
let currentIndex = 0;

function getNextHealthyService() {
  const healthyServices = serviceClients.filter(s => s.isHealthy && !s.client.isOpen());
  
  if (healthyServices.length === 0) {
    throw new Error('Aucun service disponible');
  }
  
  // Round-robin sur services sains
  const service = healthyServices[currentIndex % healthyServices.length];
  currentIndex = (currentIndex + 1) % healthyServices.length;
  
  return service;
}

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('X-Load-Balancer', 'compliant-v1.0');
  res.header('X-Circuit-Breaker', 'enabled');
  next();
});

// Health check des services en arrière-plan
setInterval(async () => {
  try {
    const healthResults = await healthChecker.checkAll();
    
    serviceClients.forEach(service => {
      const serviceName = `produit-service-${service.id + 1}`;
      const health = healthResults[serviceName];
      
      service.isHealthy = health && health.status === 'healthy';
      service.lastHealthCheck = Date.now();
      
      if (!service.isHealthy) {
        service.failureCount++;
        console.warn(`⚠️ Service ${serviceName} unhealthy (failures: ${service.failureCount})`);
      } else {
        service.failureCount = 0;
      }
    });
    
    const healthyCount = serviceClients.filter(s => s.isHealthy).length;
    console.log(`💚 Health check: ${healthyCount}/${serviceClients.length} services healthy`);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}, 30000); // Toutes les 30 secondes

// Proxy principal avec circuit breaker
app.all('*', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Sélectionner service sain
    const selectedService = getNextHealthyService();
    
    console.log(`🔄 Routing ${req.method} ${req.path} → ${selectedService.url} (Circuit: ${selectedService.client.isOpen() ? 'OPEN' : 'CLOSED'})`);
    
    // Configuration de la requête
    const requestConfig = {
      method: req.method.toLowerCase(),
      headers: {
        ...req.headers,
        'X-Forwarded-For': req.ip,
        'X-Load-Balancer-Instance': selectedService.id,
        'X-Request-Start': startTime
      }
    };
    
    // Ajouter body pour POST/PUT/PATCH
    if (['post', 'put', 'patch'].includes(requestConfig.method)) {
      requestConfig.data = req.body;
    }
    
    // Exécuter avec retry et circuit breaker
    const result = await RetryPolicy.withBackoff(async () => {
      return await selectedService.client.get(req.path, requestConfig);
    }, 3, 1000);
    
    // Métriques
    const latency = Date.now() - startTime;
    
    // Headers de réponse
    res.header('X-Upstream-Service', selectedService.url);
    res.header('X-Response-Time', `${latency}ms`);
    res.header('X-Service-Instance', selectedService.id);
    res.header('X-Circuit-Breaker-State', selectedService.client.isOpen() ? 'open' : 'closed');
    
    // Envoyer réponse
    res.json(result);
    
    console.log(`✅ Request completed in ${latency}ms (service-${selectedService.id})`);
    
  } catch (error) {
    const latency = Date.now() - startTime;
    
    console.error(`❌ Load balancer error (${latency}ms):`, error.message);
    
    // Réponse d'erreur avec fallback
    res.status(503).json({
      error: 'Service temporairement indisponible',
      message: 'Tous les services sont en panne ou en circuit breaker ouvert',
      loadBalancer: 'compliant',
      timestamp: new Date().toISOString(),
      latency: `${latency}ms`,
      availableServices: serviceClients.map(s => ({
        id: s.id,
        url: s.url,
        healthy: s.isHealthy,
        circuitBreakerOpen: s.client.isOpen(),
        lastHealthCheck: new Date(s.lastHealthCheck).toISOString()
      }))
    });
  }
});

// Health check du load balancer
app.get('/health', async (req, res) => {
  const healthyServices = serviceClients.filter(s => s.isHealthy && !s.client.isOpen());
  const totalServices = serviceClients.length;
  
  const health = {
    service: 'load-balancer-compliant',
    status: healthyServices.length > 0 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      total: totalServices,
      healthy: healthyServices.length,
      percentage: Math.round((healthyServices.length / totalServices) * 100)
    },
    instances: serviceClients.map(s => ({
      id: s.id,
      url: s.url,
      healthy: s.isHealthy,
      circuitBreaker: {
        state: s.client.isOpen() ? 'open' : 'closed',
        stats: s.client.getStats()
      },
      failureCount: s.failureCount,
      lastHealthCheck: new Date(s.lastHealthCheck).toISOString()
    })),
    configuration: {
      algorithm: 'round-robin',
      circuitBreaker: 'enabled',
      healthCheckInterval: '30s',
      retryPolicy: 'exponential-backoff'
    }
  };
  
  res.json(health);
});

// Métriques Prometheus
app.get('/metrics', (req, res) => {
  const healthyServices = serviceClients.filter(s => s.isHealthy).length;
  const openCircuitBreakers = serviceClients.filter(s => s.client.isOpen()).length;
  
  const metrics = `
# HELP load_balancer_healthy_services Number of healthy backend services
# TYPE load_balancer_healthy_services gauge
load_balancer_healthy_services ${healthyServices}

# HELP load_balancer_total_services Total number of backend services  
# TYPE load_balancer_total_services gauge
load_balancer_total_services ${serviceClients.length}

# HELP load_balancer_circuit_breakers_open Number of open circuit breakers
# TYPE load_balancer_circuit_breakers_open gauge
load_balancer_circuit_breakers_open ${openCircuitBreakers}

# HELP load_balancer_uptime_seconds Load balancer uptime in seconds
# TYPE load_balancer_uptime_seconds counter
load_balancer_uptime_seconds ${Math.floor(process.uptime())}
`.trim();
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Démarrage
app.listen(port, () => {
  console.log(`✅ Load Balancer Conforme démarré sur le port ${port}`);
  console.log(`🔍 Health Check: http://localhost:${port}/health`);
  console.log(`📊 Metrics: http://localhost:${port}/metrics`);
  console.log(`🛡️ Circuit Breakers: Activés`);
  console.log(`⚖️ Algorithm: Round-robin avec services sains`);
  
  // Health check initial
  setTimeout(async () => {
    try {
      const results = await healthChecker.checkAll();
      console.log('🏁 Health check initial:', Object.keys(results).length, 'services vérifiés');
    } catch (error) {
      console.warn('⚠️ Health check initial failed:', error.message);
    }
  }, 5000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Load Balancer arrêt en cours...');
  process.exit(0);
});

module.exports = app;
