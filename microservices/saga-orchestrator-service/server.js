const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const SagaOrchestrator = require('./src/sagaOrchestrator');
const { setupMetrics, collectDefaultMetrics } = require('./src/metrics');
const logger = require('./src/logger');

const app = express();
const PORT = process.env.PORT || 8010;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Setup metrics
const { register, sagaStartCounter, sagaCompletionCounter, sagaFailureCounter, sagaStepDuration } = setupMetrics();
collectDefaultMetrics(register);

// Initialize Saga Orchestrator
const orchestrator = new SagaOrchestrator();

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        service: 'saga-orchestrator-service',
        timestamp: new Date().toISOString()
    });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Start Order Saga endpoint
app.post('/saga/order', async (req, res) => {
    const sagaId = uuidv4();
    const { produitId, quantite, clientId, montant } = req.body;

    // Validation
    if (!produitId || !quantite || !clientId || !montant) {
        return res.status(400).json({
            error: 'Missing required fields: produitId, quantite, clientId, montant'
        });
    }

    try {
        logger.info(`Starting order saga ${sagaId}`, { 
            sagaId, 
            produitId, 
            quantite, 
            clientId, 
            montant 
        });

        sagaStartCounter.inc();
        const startTime = Date.now();

        const result = await orchestrator.executeOrderSaga(sagaId, {
            produitId,
            quantite,
            clientId,
            montant
        });

        const duration = Date.now() - startTime;
        sagaStepDuration.observe(duration / 1000);

        if (result.success) {
            sagaCompletionCounter.inc({ status: 'success' });
            logger.info(`Order saga ${sagaId} completed successfully`, { sagaId, result });
            res.status(200).json({
                sagaId,
                status: 'completed',
                result: result.data
            });
        } else {
            sagaCompletionCounter.inc({ status: 'failed' });
            logger.error(`Order saga ${sagaId} failed`, { sagaId, error: result.error });
            res.status(500).json({
                sagaId,
                status: 'failed',
                error: result.error
            });
        }
    } catch (error) {
        sagaFailureCounter.inc();
        logger.error(`Order saga ${sagaId} error`, { sagaId, error: error.message });
        res.status(500).json({
            sagaId,
            status: 'error',
            error: error.message
        });
    }
});

// Get Saga Status endpoint
app.get('/saga/:sagaId/status', async (req, res) => {
    const { sagaId } = req.params;

    try {
        const status = await orchestrator.getSagaStatus(sagaId);
        if (status) {
            res.status(200).json(status);
        } else {
            res.status(404).json({
                error: `Saga ${sagaId} not found`
            });
        }
    } catch (error) {
        logger.error(`Error getting saga status for ${sagaId}`, { sagaId, error: error.message });
        res.status(500).json({
            error: error.message
        });
    }
});

// List all Sagas endpoint
app.get('/saga/list', async (req, res) => {
    try {
        const sagas = await orchestrator.listSagas();
        res.status(200).json(sagas);
    } catch (error) {
        logger.error('Error listing sagas', { error: error.message });
        res.status(500).json({
            error: error.message
        });
    }
});

// Compensation endpoint (for manual intervention)
app.post('/saga/:sagaId/compensate', async (req, res) => {
    const { sagaId } = req.params;

    try {
        logger.info(`Manual compensation requested for saga ${sagaId}`, { sagaId });
        const result = await orchestrator.compensateSaga(sagaId);
        
        if (result.success) {
            res.status(200).json({
                sagaId,
                status: 'compensated',
                message: 'Saga compensation completed successfully'
            });
        } else {
            res.status(500).json({
                sagaId,
                status: 'compensation_failed',
                error: result.error
            });
        }
    } catch (error) {
        logger.error(`Error compensating saga ${sagaId}`, { sagaId, error: error.message });
        res.status(500).json({
            error: error.message
        });
    }
});

// Global error handler
app.use((error, req, res, next) => {
    logger.error('Unhandled error', { error: error.message, stack: error.stack });
    res.status(500).json({
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    logger.info(`Saga Orchestrator Service running on port ${PORT}`);
    console.log(`Saga Orchestrator Service running on port ${PORT}`);
});

module.exports = app;
