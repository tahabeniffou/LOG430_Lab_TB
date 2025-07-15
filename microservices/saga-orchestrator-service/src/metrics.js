const client = require('prom-client');

// Default metrics collection
const collectDefaultMetrics = client.collectDefaultMetrics;

// Custom metrics for Saga orchestration
const sagaStartCounter = new client.Counter({
    name: 'saga_started_total',
    help: 'Total number of sagas started'
});

const sagaCompletionCounter = new client.Counter({
    name: 'saga_completed_total',
    help: 'Total number of sagas completed',
    labelNames: ['status'] // success, failed
});

const sagaFailureCounter = new client.Counter({
    name: 'saga_failures_total',
    help: 'Total number of saga failures'
});

const sagaStepDuration = new client.Histogram({
    name: 'saga_step_duration_seconds',
    help: 'Duration of saga step execution in seconds',
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

const sagaCompensationCounter = new client.Counter({
    name: 'saga_compensations_total',
    help: 'Total number of saga compensations executed'
});

const sagaActiveGauge = new client.Gauge({
    name: 'saga_active_total',
    help: 'Number of currently active sagas'
});

const sagaStepCounter = new client.Counter({
    name: 'saga_steps_total',
    help: 'Total number of saga steps executed',
    labelNames: ['step_name', 'status'] // step_name: VERIFY_PRODUCT, RESERVE_STOCK, etc.; status: STARTED, COMPLETED, FAILED
});

const serviceCallDuration = new client.Histogram({
    name: 'saga_service_call_duration_seconds',
    help: 'Duration of service calls from saga orchestrator',
    labelNames: ['service', 'operation'],
    buckets: [0.1, 0.3, 0.5, 1, 2, 5, 10]
});

const serviceCallCounter = new client.Counter({
    name: 'saga_service_calls_total',
    help: 'Total number of service calls from saga orchestrator',
    labelNames: ['service', 'operation', 'status'] // status: success, error
});

// Create a registry
const register = new client.Registry();

// Register metrics
register.registerMetric(sagaStartCounter);
register.registerMetric(sagaCompletionCounter);
register.registerMetric(sagaFailureCounter);
register.registerMetric(sagaStepDuration);
register.registerMetric(sagaCompensationCounter);
register.registerMetric(sagaActiveGauge);
register.registerMetric(sagaStepCounter);
register.registerMetric(serviceCallDuration);
register.registerMetric(serviceCallCounter);

// Function to setup metrics
function setupMetrics() {
    return {
        register,
        sagaStartCounter,
        sagaCompletionCounter,
        sagaFailureCounter,
        sagaStepDuration,
        sagaCompensationCounter,
        sagaActiveGauge,
        sagaStepCounter,
        serviceCallDuration,
        serviceCallCounter
    };
}

module.exports = {
    setupMetrics,
    collectDefaultMetrics,
    register
};
