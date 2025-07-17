const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const promClient = require('prom-client');
const amqp = require('amqplib');

const EventStore = require('./src/infrastructure/EventStore');
const MessageBroker = require('./src/infrastructure/MessageBroker');
const ReclamationService = require('./src/application/ReclamationService');

require('dotenv').config();

class SagaReclamationService {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8011;
        this.setupLogger();
        this.setupMetrics();
        this.setupMiddleware();
        
        // Services
        this.eventStore = null;
        this.messageBroker = null;
        this.reclamationService = null;
        this.sagaStore = new Map(); // Store pour tracking des sagas
        
        this.setupRoutes();
    }

    setupLogger() {
        this.logger = winston.createLogger({
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
                })
            ]
        });
    }

    setupMetrics() {
        const collectDefaultMetrics = promClient.collectDefaultMetrics;
        collectDefaultMetrics({ timeout: 5000 });

        this.metrics = {
            httpRequestsTotal: new promClient.Counter({
                name: 'http_requests_total',
                help: 'Total number of HTTP requests',
                labelNames: ['method', 'route', 'status_code']
            }),
            eventsPublishedTotal: new promClient.Counter({
                name: 'events_published_total',
                help: 'Total number of events published',
                labelNames: ['event_type']
            }),
            reclamationsTotal: new promClient.Counter({
                name: 'reclamations_total',
                help: 'Total number of reclamations',
                labelNames: ['status']
            }),
            // Nouvelles métriques pour la saga
            sagasStarted: new promClient.Counter({
                name: 'sagas_started_total',
                help: 'Total number of sagas started',
                labelNames: ['saga_type']
            }),
            sagasCompleted: new promClient.Counter({
                name: 'sagas_completed_total',
                help: 'Total number of sagas completed',
                labelNames: ['saga_type', 'result']
            }),
            sagaDuration: new promClient.Histogram({
                name: 'saga_duration_seconds',
                help: 'Duration of saga execution',
                labelNames: ['saga_type'],
                buckets: [1, 5, 10, 30, 60, 120]
            }),
            compensationsExecuted: new promClient.Counter({
                name: 'compensations_executed_total',
                help: 'Total number of compensations executed',
                labelNames: ['reason']
            })
        };

        // Enregistrement des métriques
        Object.values(this.metrics).forEach(metric => {
            promClient.register.registerMetric(metric);
        });
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(morgan('combined'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Middleware de logging des requêtes
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`, {
                method: req.method,
                path: req.path,
                body: req.method === 'POST' ? req.body : undefined
            });
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            this.metrics.httpRequestsTotal.inc({ method: 'GET', route: '/health', status_code: '200' });
            res.json({
                status: 'healthy',
                service: 'reclamation-service-saga',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                saga_support: true
            });
        });

        // Métriques Prometheus
        this.app.get('/metrics', async (req, res) => {
            this.metrics.httpRequestsTotal.inc({ method: 'GET', route: '/metrics', status_code: '200' });
            res.set('Content-Type', promClient.register.contentType);
            res.end(await promClient.register.metrics());
        });

        // API de création de réclamation avec saga
        this.app.post('/api/reclamations', async (req, res) => {
            try {
                const sagaId = uuidv4();
                const correlationId = uuidv4();
                
                // Validation des données
                const { titre, description, priorite, clientId, type } = req.body;
                if (!titre || !description) {
                    this.metrics.httpRequestsTotal.inc({ method: 'POST', route: '/api/reclamations', status_code: '400' });
                    return res.status(400).json({ error: 'Titre et description requis' });
                }

                // Création de la réclamation
                const reclamation = await this.reclamationService.creerReclamation({
                    titre,
                    description,
                    priorite: priorite || 'normale',
                    clientId: clientId || `client-${Date.now()}`,
                    type: type || 'GENERAL'
                });

                // Initialisation de la saga
                const saga = {
                    id: sagaId,
                    correlationId: correlationId,
                    reclamationId: reclamation.id,
                    status: 'STARTED',
                    startedAt: new Date().toISOString(),
                    steps: ['RECLAMATION_CREATED'],
                    currentStep: 'RECLAMATION_CREATED'
                };

                this.sagaStore.set(sagaId, saga);

                // Publication de l'événement avec informations saga
                const sagaEvent = {
                    eventType: 'ReclamationCreated',
                    sagaId: sagaId,
                    correlationId: correlationId,
                    timestamp: new Date().toISOString(),
                    payload: {
                        reclamationId: reclamation.id,
                        titre: reclamation.titre,
                        description: reclamation.description,
                        priorite: reclamation.priorite,
                        clientId: reclamation.clientId,
                        type: reclamation.type,
                        amount: this.extractAmountFromDescription(description) // Simulation
                    },
                    metadata: {
                        service: 'reclamation-service',
                        version: '1.0.0',
                        sagaInitiated: true
                    }
                };

                await this.publishSagaEvent('reclamation.created', sagaEvent);

                // Métriques
                this.metrics.httpRequestsTotal.inc({ method: 'POST', route: '/api/reclamations', status_code: '201' });
                this.metrics.reclamationsTotal.inc({ status: 'created' });
                this.metrics.sagasStarted.inc({ saga_type: 'reclamation_processing' });
                this.metrics.eventsPublishedTotal.inc({ event_type: 'ReclamationCreated' });

                this.logger.info('Saga started for reclamation', { 
                    sagaId, 
                    correlationId, 
                    reclamationId: reclamation.id 
                });

                res.status(201).json({ 
                    reclamation,
                    saga: {
                        id: sagaId,
                        correlationId: correlationId,
                        status: 'STARTED'
                    }
                });

            } catch (error) {
                this.logger.error('Erreur création réclamation saga:', error);
                this.metrics.httpRequestsTotal.inc({ method: 'POST', route: '/api/reclamations', status_code: '500' });
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        });

        // API pour consulter l'état des sagas
        this.app.get('/api/sagas', (req, res) => {
            this.metrics.httpRequestsTotal.inc({ method: 'GET', route: '/api/sagas', status_code: '200' });
            res.json({
                total: this.sagaStore.size,
                sagas: Array.from(this.sagaStore.values())
            });
        });

        // API pour consulter une saga spécifique
        this.app.get('/api/sagas/:sagaId', (req, res) => {
            const saga = this.sagaStore.get(req.params.sagaId);
            if (saga) {
                this.metrics.httpRequestsTotal.inc({ method: 'GET', route: '/api/sagas/:sagaId', status_code: '200' });
                res.json(saga);
            } else {
                this.metrics.httpRequestsTotal.inc({ method: 'GET', route: '/api/sagas/:sagaId', status_code: '404' });
                res.status(404).json({ error: 'Saga non trouvée' });
            }
        });
    }

    extractAmountFromDescription(description) {
        // Extraction simple du montant depuis la description
        // En production, ce serait un champ séparé
        const amountMatch = description.match(/(\d+(?:\.\d{2})?)\s*€?/);
        if (amountMatch) {
            return parseFloat(amountMatch[1]);
        }
        // Montants par défaut pour simulation
        return Math.floor(Math.random() * 200) + 10;
    }

    async setupMessageBroker() {
        try {
            const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            this.connection = await amqp.connect(rabbitMQUrl);
            this.channel = await this.connection.createChannel();

            const exchange = 'reclamation.events';
            await this.channel.assertExchange(exchange, 'topic', { durable: true });

            // Queues pour consommer les événements de saga
            await this.setupSagaConsumers();

            this.logger.info('Message broker connected for saga');
            
        } catch (error) {
            this.logger.error('Failed to setup message broker:', error);
            throw error;
        }
    }

    async setupSagaConsumers() {
        // Queue pour PaymentProcessed (saga success)
        const paymentProcessedQueue = 'reclamation.payment.processed';
        await this.channel.assertQueue(paymentProcessedQueue, { durable: true });
        await this.channel.bindQueue(paymentProcessedQueue, 'reclamation.events', 'payment.processed');

        // Queue pour événements de compensation
        const compensationQueue = 'reclamation.compensation';
        await this.channel.assertQueue(compensationQueue, { durable: true });
        await this.channel.bindQueue(compensationQueue, 'reclamation.events', 'notification.cancelled');
        await this.channel.bindQueue(compensationQueue, 'reclamation.events', 'reclamation.rejected');

        // Consommation PaymentProcessed
        await this.channel.consume(paymentProcessedQueue, async (msg) => {
            if (msg) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    await this.handlePaymentProcessed(event);
                    this.channel.ack(msg);
                } catch (error) {
                    this.logger.error('Error processing PaymentProcessed:', error);
                    this.channel.nack(msg, false, false);
                }
            }
        });

        // Consommation événements de compensation
        await this.channel.consume(compensationQueue, async (msg) => {
            if (msg) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    await this.handleCompensationEvent(event);
                    this.channel.ack(msg);
                } catch (error) {
                    this.logger.error('Error processing compensation event:', error);
                    this.channel.nack(msg, false, false);
                }
            }
        });

        this.logger.info('Saga consumers setup complete');
    }

    async handlePaymentProcessed(event) {
        try {
            const { sagaId, correlationId, payload } = event;
            
            this.logger.info('Processing PaymentProcessed for saga completion', { 
                sagaId, 
                correlationId 
            });

            // Mise à jour de la saga
            const saga = this.sagaStore.get(sagaId);
            if (saga) {
                const sagaDuration = (new Date() - new Date(saga.startedAt)) / 1000;
                
                saga.status = 'COMPLETED';
                saga.completedAt = new Date().toISOString();
                saga.steps.push('PAYMENT_PROCESSED', 'RECLAMATION_COMPLETED');
                saga.currentStep = 'RECLAMATION_COMPLETED';
                saga.duration = sagaDuration;

                // Publication de l'événement final
                const completedEvent = {
                    eventType: 'ReclamationCompleted',
                    sagaId,
                    correlationId,
                    timestamp: new Date().toISOString(),
                    payload: {
                        reclamationId: correlationId,
                        completedAt: saga.completedAt,
                        totalDuration: sagaDuration,
                        finalStatus: 'COMPLETED_WITH_PAYMENT'
                    },
                    metadata: {
                        service: 'reclamation-service',
                        version: '1.0.0',
                        sagaCompleted: true
                    }
                };

                await this.publishSagaEvent('reclamation.completed', completedEvent);

                // Métriques
                this.metrics.sagasCompleted.inc({ saga_type: 'reclamation_processing', result: 'success' });
                this.metrics.sagaDuration.observe({ saga_type: 'reclamation_processing' }, sagaDuration);

                this.logger.info('Saga completed successfully', { 
                    sagaId, 
                    correlationId, 
                    duration: sagaDuration 
                });
            }

        } catch (error) {
            this.logger.error('Error handling PaymentProcessed:', error);
            throw error;
        }
    }

    async handleCompensationEvent(event) {
        try {
            const { sagaId, correlationId, eventType, payload } = event;
            
            this.logger.info('Processing compensation event', { 
                sagaId, 
                correlationId, 
                eventType 
            });

            const saga = this.sagaStore.get(sagaId);
            if (saga) {
                const sagaDuration = (new Date() - new Date(saga.startedAt)) / 1000;
                
                saga.status = 'COMPENSATED';
                saga.compensatedAt = new Date().toISOString();
                saga.compensationReason = payload.cancellationReason || payload.rejectionReason || 'UNKNOWN';
                saga.steps.push(`COMPENSATION_${eventType.toUpperCase()}`);
                saga.currentStep = 'COMPENSATED';
                saga.duration = sagaDuration;

                // Publication de l'événement de compensation
                const cancelledEvent = {
                    eventType: 'ReclamationCancelled',
                    sagaId,
                    correlationId,
                    timestamp: new Date().toISOString(),
                    payload: {
                        reclamationId: correlationId,
                        cancelledAt: saga.compensatedAt,
                        cancellationReason: saga.compensationReason,
                        compensatedSteps: saga.steps
                    },
                    metadata: {
                        service: 'reclamation-service',
                        version: '1.0.0',
                        compensationEvent: true
                    }
                };

                await this.publishSagaEvent('reclamation.cancelled', cancelledEvent);

                // Métriques
                this.metrics.sagasCompleted.inc({ saga_type: 'reclamation_processing', result: 'compensated' });
                this.metrics.sagaDuration.observe({ saga_type: 'reclamation_processing' }, sagaDuration);
                this.metrics.compensationsExecuted.inc({ reason: saga.compensationReason });

                this.logger.info('Saga compensated', { 
                    sagaId, 
                    correlationId, 
                    reason: saga.compensationReason,
                    duration: sagaDuration 
                });
            }

        } catch (error) {
            this.logger.error('Error handling compensation event:', error);
            throw error;
        }
    }

    async publishSagaEvent(routingKey, event) {
        const exchange = 'reclamation.events';
        const message = Buffer.from(JSON.stringify(event));
        
        await this.channel.publish(exchange, routingKey, message, {
            persistent: true,
            timestamp: Date.now(),
            messageId: uuidv4()
        });

        this.logger.info('Published saga event', { 
            routingKey, 
            eventType: event.eventType,
            sagaId: event.sagaId 
        });
    }

    async start() {
        try {
            // Initialisation des services avec configuration
            this.eventStore = new EventStore({
                connectionString: process.env.EVENTSTORE_URL || 'postgresql://postgres:postgres@postgres-reclamation:5432/reclamation_saga',
                logger: this.logger
            });
            await this.eventStore.init();

            this.messageBroker = new MessageBroker();
            await this.messageBroker.connect();

            this.reclamationService = new ReclamationService(this.eventStore, this.messageBroker);

            // Setup du message broker pour la saga
            await this.setupMessageBroker();

            this.server = this.app.listen(this.port, () => {
                this.logger.info(`Saga Reclamation Service started on port ${this.port}`);
                console.log(`🚀 Saga Reclamation Service running on http://localhost:${this.port}`);
                console.log(`📊 Health: http://localhost:${this.port}/health`);
                console.log(`📈 Metrics: http://localhost:${this.port}/metrics`);
                console.log(`🎭 Sagas: http://localhost:${this.port}/api/sagas`);
            });

        } catch (error) {
            this.logger.error('Failed to start Saga Reclamation Service:', error);
            process.exit(1);
        }
    }

    async stop() {
        this.logger.info('Stopping Saga Reclamation Service...');
        
        if (this.server) {
            this.server.close();
        }
        
        if (this.channel) {
            await this.channel.close();
        }
        
        if (this.connection) {
            await this.connection.close();
        }

        if (this.messageBroker) {
            await this.messageBroker.disconnect();
        }
    }
}

if (require.main === module) {
    const service = new SagaReclamationService();
    
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
        await service.stop();
        process.exit(0);
    });
    
    service.start().catch(error => {
        console.error('Failed to start service:', error);
        process.exit(1);
    });
}

module.exports = SagaReclamationService;
