/**
 * Métriques Saga Choreography - Système de monitoring complet
 * LAB 7 - Architecture Événementielle
 */

const promClient = require('prom-client');

// Configuration du registre global
const register = promClient.register;

// === MÉTRIQUES SAGA GLOBALES ===

// 1. Saga démarrées
const sagaStartedTotal = new promClient.Counter({
    name: 'saga_started_total',
    help: 'Nombre total de sagas démarrées',
    labelNames: ['saga_type', 'service', 'correlation_id']
});

// 2. Saga réussies
const sagaCompletedTotal = new promClient.Counter({
    name: 'saga_completed_total', 
    help: 'Nombre total de sagas terminées avec succès',
    labelNames: ['saga_type', 'final_service', 'duration_bucket']
});

// 3. Saga échouées
const sagaFailedTotal = new promClient.Counter({
    name: 'saga_failed_total',
    help: 'Nombre total de sagas échouées',
    labelNames: ['saga_type', 'failed_at_service', 'failure_reason', 'retry_count']
});

// 4. Durée des sagas
const sagaDurationHistogram = new promClient.Histogram({
    name: 'saga_duration_seconds',
    help: 'Durée des sagas en secondes',
    labelNames: ['saga_type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120] // secondes
});

// 5. Étapes de saga en cours
const sagaStepsActive = new promClient.Gauge({
    name: 'saga_steps_active',
    help: 'Nombre d\'étapes de saga actuellement en cours',
    labelNames: ['service', 'step_type']
});

// === MÉTRIQUES ÉVÉNEMENTS ===

// 6. Événements publiés
const eventsPublishedTotal = new promClient.Counter({
    name: 'saga_events_published_total',
    help: 'Nombre total d\'événements publiés',
    labelNames: ['event_type', 'service', 'destination_exchange']
});

// 7. Événements consommés  
const eventsConsumedTotal = new promClient.Counter({
    name: 'saga_events_consumed_total',
    help: 'Nombre total d\'événements consommés',
    labelNames: ['event_type', 'service', 'processing_status']
});

// 8. Délai de traitement des événements
const eventProcessingDuration = new promClient.Histogram({
    name: 'saga_event_processing_duration_seconds',
    help: 'Durée de traitement des événements en secondes',
    labelNames: ['event_type', 'service'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
});

// === MÉTRIQUES MÉTIER PAR SERVICE ===

// 9. Validations saga
const sagaValidationsTotal = new promClient.Counter({
    name: 'saga_validations_total',
    help: 'Nombre total de validations saga',
    labelNames: ['validation_type', 'result', 'rule_applied']
});

// 10. Notifications saga
const sagaNotificationsTotal = new promClient.Counter({
    name: 'saga_notifications_total', 
    help: 'Nombre total de notifications saga',
    labelNames: ['channel', 'template', 'delivery_status']
});

// 11. Paiements saga
const sagaPaymentsTotal = new promClient.Counter({
    name: 'saga_payments_total',
    help: 'Nombre total de paiements saga',
    labelNames: ['provider', 'status', 'amount_bucket']
});

// 12. Réclamations saga
const sagaReclamationsTotal = new promClient.Counter({
    name: 'saga_reclamations_total',
    help: 'Nombre total de réclamations saga',
    labelNames: ['type', 'status', 'priority']
});

// === MÉTRIQUES TECHNIQUE ===

// 13. Messages RabbitMQ en attente
const rabbitmqQueueSize = new promClient.Gauge({
    name: 'saga_rabbitmq_queue_size',
    help: 'Taille des queues RabbitMQ pour la saga',
    labelNames: ['queue_name', 'service']
});

// 14. Connexions base de données
const databaseConnections = new promClient.Gauge({
    name: 'saga_database_connections_active',
    help: 'Nombre de connexions actives aux bases de données saga',
    labelNames: ['service', 'database_name']
});

// 15. Compensations exécutées
const compensationsExecuted = new promClient.Counter({
    name: 'saga_compensations_executed_total',
    help: 'Nombre total de compensations exécutées',
    labelNames: ['service', 'compensation_type', 'success']
});

// === ENREGISTREMENT DES MÉTRIQUES ===
[
    sagaStartedTotal,
    sagaCompletedTotal, 
    sagaFailedTotal,
    sagaDurationHistogram,
    sagaStepsActive,
    eventsPublishedTotal,
    eventsConsumedTotal,
    eventProcessingDuration,
    sagaValidationsTotal,
    sagaNotificationsTotal,
    sagaPaymentsTotal,
    sagaReclamationsTotal,
    rabbitmqQueueSize,
    databaseConnections,
    compensationsExecuted
].forEach(metric => register.registerMetric(metric));

// === HELPER FUNCTIONS ===

/**
 * Démarre une nouvelle saga avec tracking
 */
function startSaga(sagaType, service, correlationId) {
    sagaStartedTotal.inc({ saga_type: sagaType, service, correlation_id: correlationId });
    sagaStepsActive.inc({ service, step_type: 'initial' });
    return sagaDurationHistogram.startTimer({ saga_type: sagaType, status: 'running' });
}

/**
 * Termine une saga avec succès
 */
function completeSaga(sagaType, finalService, timer, duration) {
    const durationBucket = duration < 1 ? 'fast' : duration < 10 ? 'normal' : 'slow';
    sagaCompletedTotal.inc({ saga_type: sagaType, final_service: finalService, duration_bucket: durationBucket });
    timer({ status: 'completed' });
    sagaStepsActive.dec({ service: finalService, step_type: 'final' });
}

/**
 * Enregistre un échec de saga
 */
function failSaga(sagaType, failedService, reason, retryCount, timer) {
    sagaFailedTotal.inc({ 
        saga_type: sagaType, 
        failed_at_service: failedService, 
        failure_reason: reason,
        retry_count: retryCount.toString()
    });
    timer({ status: 'failed' });
    sagaStepsActive.dec({ service: failedService, step_type: 'error' });
}

/**
 * Enregistre la publication d'un événement
 */
function publishEvent(eventType, service, exchange) {
    eventsPublishedTotal.inc({ event_type: eventType, service, destination_exchange: exchange });
}

/**
 * Enregistre la consommation d'un événement  
 */
function consumeEvent(eventType, service, status) {
    eventsConsumedTotal.inc({ event_type: eventType, service, processing_status: status });
    return eventProcessingDuration.startTimer({ event_type: eventType, service });
}

module.exports = {
    register,
    // Métriques
    sagaStartedTotal,
    sagaCompletedTotal,
    sagaFailedTotal,
    sagaDurationHistogram,
    sagaStepsActive,
    eventsPublishedTotal,
    eventsConsumedTotal,
    eventProcessingDuration,
    sagaValidationsTotal,
    sagaNotificationsTotal,
    sagaPaymentsTotal,
    sagaReclamationsTotal,
    rabbitmqQueueSize,
    databaseConnections,
    compensationsExecuted,
    // Helper functions
    startSaga,
    completeSaga,
    failSaga,
    publishEvent,
    consumeEvent
};
