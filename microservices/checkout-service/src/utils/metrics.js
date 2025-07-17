const promClient = require('prom-client');

// Création du registre
const register = new promClient.Registry();

// Configuration du collecteur par défaut
promClient.collectDefaultMetrics({
    register: register,
    prefix: 'checkout_service_'
});

// Métriques personnalisées
const httpRequestsTotal = new promClient.Counter({
    name: 'checkout_service_http_requests_total',
    help: 'Total HTTP requests for checkout service',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
    name: 'checkout_service_http_request_duration_seconds',
    help: 'Duration of HTTP requests for checkout service',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
});

module.exports = {
    promClient,
    register,
    httpRequestsTotal,
    httpRequestDuration
};
