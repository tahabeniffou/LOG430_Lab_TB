/**
 * @fileoverview Utilitaires métriques Prometheus
 */

const promClient = require('prom-client');

// Registre des métriques
const register = new promClient.Registry();

// Métriques par défaut
promClient.collectDefaultMetrics({ register });

// Métriques personnalisées
const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register]
});

const compteOperationsTotal = new promClient.Counter({
    name: 'compte_operations_total',
    help: 'Total number of compte operations',
    labelNames: ['operation', 'status'],
    registers: [register]
});

module.exports = {
    promClient,
    register,
    httpRequestsTotal,
    httpRequestDuration,
    compteOperationsTotal
};
