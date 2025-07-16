const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const promClient = require('prom-client');

const EventStore = require('./src/infrastructure/EventStore');
const MessageBroker = require('./src/infrastructure/MessageBroker');
const ReclamationService = require('./src/application/ReclamationService');

require('dotenv').config();

// Configuration du logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: 'logs/reclamation-service.log',
            format: winston.format.json()
        })
    ]
});

// Métriques Prometheus
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const eventsPublishedTotal = new promClient.Counter({
    name: 'events_published_total',
    help: 'Total number of events published',
    labelNames: ['event_type', 'status']
});

const eventProcessingDuration = new promClient.Histogram({
    name: 'event_processing_duration_seconds',
    help: 'Duration of event processing',
    labelNames: ['event_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const reclamationsTotal = new promClient.Counter({
    name: 'reclamations_total',
    help: 'Total number of reclamations',
    labelNames: ['type', 'priority', 'status']
});

const register = promClient.register;

// Initialisation de l'application
const app = express();
const port = process.env.PORT || 8011;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de métriques
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        httpRequestsTotal.inc({
            method: req.method,
            route: req.route?.path || req.path,
            status_code: res.statusCode
        });
    });
    
    next();
});

// Initialisation des composants
let eventStore, eventPublisher, reclamationService, reclamationController;

async function initializeComponents() {
    try {
        // Event Store
        eventStore = new EventStore({
            connectionString: process.env.EVENTSTORE_URL,
            logger
        });
        await eventStore.connect();

        // Event Publisher
        eventPublisher = new EventPublisher({
            rabbitmqUrl: process.env.RABBITMQ_URL,
            logger,
            metrics: { eventsPublishedTotal, eventProcessingDuration }
        });
        await eventPublisher.connect();

        // Application Service
        reclamationService = new ReclamationService({
            eventStore,
            eventPublisher,
            logger,
            metrics: { reclamationsTotal }
        });

        // Controller
        reclamationController = new ReclamationController({
            reclamationService,
            logger
        });

        logger.info('All components initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize components', { error: error.message });
        process.exit(1);
    }
}

// Routes de santé
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'reclamation-service',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

app.get('/ready', async (req, res) => {
    try {
        // Vérification des connexions
        const eventStoreHealthy = await eventStore.isHealthy();
        const publisherHealthy = await eventPublisher.isHealthy();

        if (eventStoreHealthy && publisherHealthy) {
            res.status(200).json({
                status: 'ready',
                dependencies: {
                    eventStore: 'healthy',
                    eventPublisher: 'healthy'
                }
            });
        } else {
            res.status(503).json({
                status: 'not ready',
                dependencies: {
                    eventStore: eventStoreHealthy ? 'healthy' : 'unhealthy',
                    eventPublisher: publisherHealthy ? 'healthy' : 'unhealthy'
                }
            });
        }
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message
        });
    }
});

// Métriques Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Routes API Réclamations
app.use('/api/v1/reclamations', async (req, res, next) => {
    if (!reclamationController) {
        return res.status(503).json({ 
            error: 'Service not ready', 
            message: 'Components still initializing' 
        });
    }
    next();
});

// API REST pour les réclamations
app.post('/api/v1/reclamations', reclamationController.createReclamation.bind(reclamationController));
app.get('/api/v1/reclamations/:id', reclamationController.getReclamation.bind(reclamationController));
app.get('/api/v1/reclamations', reclamationController.listReclamations.bind(reclamationController));
app.put('/api/v1/reclamations/:id/assign', reclamationController.assignReclamation.bind(reclamationController));
app.put('/api/v1/reclamations/:id/resolve', reclamationController.resolveReclamation.bind(reclamationController));
app.put('/api/v1/reclamations/:id/close', reclamationController.closeReclamation.bind(reclamationController));

// Route pour replay d'événements (Event Sourcing)
app.get('/api/v1/reclamations/:id/events', reclamationController.getReclamationEvents.bind(reclamationController));
app.post('/api/v1/reclamations/:id/replay', reclamationController.replayReclamation.bind(reclamationController));

// Gestion des erreurs globales
app.use((error, req, res, next) => {
    logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
    });

    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    if (eventPublisher) {
        await eventPublisher.disconnect();
    }
    
    if (eventStore) {
        await eventStore.disconnect();
    }
    
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    process.exit(1);
});

// Démarrage du serveur
async function startServer() {
    await initializeComponents();
    
    app.listen(port, () => {
        logger.info(`Reclamation Service running on port ${port}`, {
            environment: process.env.NODE_ENV || 'development',
            eventStoreUrl: process.env.EVENTSTORE_URL ? '***configured***' : 'not configured',
            rabbitmqUrl: process.env.RABBITMQ_URL ? '***configured***' : 'not configured'
        });
    });
}

startServer().catch(error => {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
});

module.exports = app;
