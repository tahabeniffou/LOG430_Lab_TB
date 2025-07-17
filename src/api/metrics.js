// Instrumentation Prometheus pour Express
const client = require('prom-client');
const express = require('express');
const router = express.Router({ mergeParams: true });

// Collecte par défaut sur le registre global
client.collectDefaultMetrics({ register: client.register });

// Compteur de requêtes HTTP (Counter)
let httpRequestCounter;
try {
  httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Nombre total de requêtes HTTP',
    labelNames: ['method', 'route', 'code'],
    registers: [client.register]
  });
} catch (e) {
  httpRequestCounter = client.register.getSingleMetric('http_requests_total');
}

// Histogramme de latence HTTP
let httpRequestDuration;
try {
  httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP en secondes',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 5],
    registers: [client.register]
  });
} catch (e) {
  httpRequestDuration = client.register.getSingleMetric('http_request_duration_seconds');
}

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') {
    return next();
  }
  const start = process.hrtime();
  res.on('finish', () => {
    let route = req.route && req.route.path ? req.baseUrl + req.route.path : req.baseUrl || req.path || 'unknown';
    try {
      httpRequestCounter.inc({
        method: req.method,
        route: route,
        code: res.statusCode
      });
      console.log(`[METRICS] Captured HTTP request: method=${req.method}, route=${route}, code=${res.statusCode}`);
    } catch (err) {
      console.error('[METRICS] Error incrementing Counter:', err);
    }
    // Ajout de la latence
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;
    try {
      httpRequestDuration.observe({
        method: req.method,
        route: route,
        code: res.statusCode
      }, duration);
    } catch (err) {
      console.error('[MÉTRIQUES] Erreur observe Histogram:', err);
    }
  });
  next();
}

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = { metricsMiddleware, metricsRouter: router };
