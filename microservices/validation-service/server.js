const express = require('express');
const promClient = require('prom-client');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');

// Import des modules locaux
const ValidationDatabase = require('./src/ValidationDatabase');
const ValidationRules = require('./src/ValidationRules');
const EventPublisher = require('./src/EventPublisher');

class ValidationService {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8012;
        this.setupLogger();
        this.setupMetrics();
        this.setupMiddleware();
        this.setupRoutes();
        
        // Services
        this.database = new ValidationDatabase();
        this.eventPublisher = new EventPublisher();
        this.messageBroker = null;
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'validation-service.log' })
            ]
        });
    }

    setupMetrics() {
        // Métriques Prometheus
        this.metrics = {
            validationsProcessed: new promClient.Counter({
                name: 'validations_processed_total',
                help: 'Total validations processed',
                labelNames: ['result']
            }),
            sagaValidations: new promClient.Counter({
                name: 'saga_validations_total',
                help: 'Total saga validations',
                labelNames: ['status']
            }),
            validationDuration: new promClient.Histogram({
                name: 'validation_duration_seconds',
                help: 'Validation processing duration',
                buckets: [0.1, 0.5, 1, 2, 5]
            }),
            httpRequests: new promClient.Counter({
                name: 'http_requests_total',
                help: 'Total HTTP requests',
                labelNames: ['method', 'route', 'status_code']
            })
        };

        // Registry global
        promClient.register.registerMetric(this.metrics.validationsProcessed);
        promClient.register.registerMetric(this.metrics.sagaValidations);
        promClient.register.registerMetric(this.metrics.validationDuration);
        promClient.register.registerMetric(this.metrics.httpRequests);
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`, {
                method: req.method,
                path: req.path,
                body: req.body
            });
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            this.metrics.httpRequests.inc({ method: 'GET', route: '/health', status_code: '200' });
            res.json({
                status: 'healthy',
                service: 'validation-service',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // Métriques Prometheus
        this.app.get('/metrics', async (req, res) => {
            this.metrics.httpRequests.inc({ method: 'GET', route: '/metrics', status_code: '200' });
            res.set('Content-Type', promClient.register.contentType);
            res.end(await promClient.register.metrics());
        });

        // API manuelle de validation (pour tests)
        this.app.post('/validate', async (req, res) => {
            const timer = this.metrics.validationDuration.startTimer();
            
            try {
                const { reclamationId, type, amount, clientId } = req.body;
                const result = await this.validateReclamation({ reclamationId, type, amount, clientId });
                
                timer();
                this.metrics.httpRequests.inc({ method: 'POST', route: '/validate', status_code: '200' });
                this.metrics.validationsProcessed.inc({ result: result.valid ? 'approved' : 'rejected' });
                
                res.json(result);
            } catch (error) {
                timer();
                this.metrics.httpRequests.inc({ method: 'POST', route: '/validate', status_code: '500' });
                this.logger.error('Validation error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    async validateReclamation(reclamation) {
        this.logger.info('Processing validation', { reclamation });

        // Règles de validation métier
        const validationRules = {
            // Montant maximum autorisé
            maxAmount: 1000,
            // Types de réclamation autorisés
            allowedTypes: ['SERVICE', 'PRODUIT', 'FACTURATION', 'LIVRAISON', 'REFUND', 'PERFORMANCE_TEST', 'ANALYSE'],
            // Clients bloqués (simulation)
            blockedClients: ['blocked-client-123']
        };

        const validationResult = {
            reclamationId: reclamation.reclamationId,
            valid: true,
            validatedBy: 'validation-service',
            validatedAt: new Date().toISOString(),
            eligibleAmount: reclamation.amount,
            validationDetails: {}
        };

        // Validation du montant
        if (reclamation.amount > validationRules.maxAmount) {
            validationResult.valid = false;
            validationResult.rejectionReason = 'AMOUNT_EXCEEDS_LIMIT';
            validationResult.validationDetails.amountLimit = validationRules.maxAmount;
        }

        // Validation du type
        if (!validationRules.allowedTypes.includes(reclamation.type)) {
            validationResult.valid = false;
            validationResult.rejectionReason = 'INVALID_RECLAMATION_TYPE';
            validationResult.validationDetails.allowedTypes = validationRules.allowedTypes;
        }

        // Validation du client
        if (validationRules.blockedClients.includes(reclamation.clientId)) {
            validationResult.valid = false;
            validationResult.rejectionReason = 'CLIENT_BLOCKED';
        }

        // Simulation d'échec aléatoire (5% de chance)
        if (Math.random() < 0.05) {
            validationResult.valid = false;
            validationResult.rejectionReason = 'RANDOM_BUSINESS_RULE_FAILURE';
        }

        // Simulation de délai de traitement
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

        return validationResult;
    }

    async setupMessageBroker() {
        try {
            const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            this.connection = await amqp.connect(rabbitMQUrl);
            this.channel = await this.connection.createChannel();

            const exchange = 'reclamation.events';
            await this.channel.assertExchange(exchange, 'topic', { durable: true });

            // Queue pour écouter les événements de réclamation créées
            const queueName = 'validation.reclamation.created';
            await this.channel.assertQueue(queueName, { durable: true });
            await this.channel.bindQueue(queueName, exchange, 'reclamation.created');

            this.logger.info('Message broker connected and configured');
            
            // Consommation des événements
            await this.consumeReclamationEvents();
            
        } catch (error) {
            this.logger.error('Failed to setup message broker:', error);
            throw error;
        }
    }

    async consumeReclamationEvents() {
        const queueName = 'validation.reclamation.created';
        
        await this.channel.consume(queueName, async (msg) => {
            if (msg) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    this.logger.info('Received ReclamationCreated event', { event });
                    
                    await this.handleReclamationCreated(event);
                    this.channel.ack(msg);
                    
                } catch (error) {
                    this.logger.error('Error processing ReclamationCreated event:', error);
                    this.channel.nack(msg, false, false); // Envoie en DLQ
                }
            }
        });

        this.logger.info('Started consuming ReclamationCreated events');
    }

    async handleReclamationCreated(event) {
        const timer = this.metrics.validationDuration.startTimer();
        
        try {
            const { sagaId, correlationId, payload } = event;
            
            this.logger.info('Processing saga validation', { 
                sagaId, 
                correlationId, 
                reclamationId: payload.reclamationId 
            });

            // Enregistrement de la validation dans la base de données
            const validationId = await this.database.createValidation({
                correlationId,
                reclamationId: payload.reclamationId || correlationId,
                status: 'IN_PROGRESS',
                data: payload,
                sagaId
            });

            // Application des règles de validation
            const validationResult = this.validationRules.validateReclamation(payload);
            
            if (validationResult.isValid) {
                // Validation réussie
                await this.database.updateValidationStatus(validationId, 'VALIDATED', validationResult);
                
                await this.eventPublisher.publishReclamationValidated({
                    sagaId,
                    correlationId,
                    reclamationId: payload.reclamationId || correlationId,
                    validationId,
                    validationResult,
                    timestamp: new Date().toISOString()
                });

                this.logger.info(`Saga validation completed successfully: ${correlationId}`);
                this.metrics.sagaValidations.inc({ status: 'validated' });
                this.metrics.validationsProcessed.inc({ result: 'approved' });
                
            } else {
                // Validation échouée
                await this.database.updateValidationStatus(validationId, 'REJECTED', validationResult);
                
                await this.eventPublisher.publishReclamationRejected({
                    sagaId,
                    correlationId,
                    reclamationId: payload.reclamationId || correlationId,
                    validationId,
                    rejectionReason: validationResult.errors.join(', '),
                    details: validationResult,
                    timestamp: new Date().toISOString()
                });

                this.logger.warn(`Saga validation rejected: ${correlationId} - ${validationResult.errors.join(', ')}`);
                this.metrics.sagaValidations.inc({ status: 'rejected' });
                this.metrics.validationsProcessed.inc({ result: 'rejected' });
            }

            timer();
            
        } catch (error) {
            timer();
            this.logger.error('Error in saga validation:', error);
            
            // Échec technique - publication d'un événement de rejet
            await this.eventPublisher.publishReclamationRejected({
                sagaId: event.sagaId,
                correlationId: event.correlationId,
                reclamationId: event.payload?.reclamationId || event.correlationId,
                rejectionReason: 'Technical validation error',
                details: { error: error.message },
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    async publishReclamationValidated(sagaId, correlationId, validationResult) {
        const event = {
            eventType: 'ReclamationValidated',
            sagaId,
            correlationId,
            timestamp: new Date().toISOString(),
            payload: {
                reclamationId: validationResult.reclamationId,
                validationResult: 'APPROVED',
                validatedBy: validationResult.validatedBy,
                eligibleAmount: validationResult.eligibleAmount,
                validatedAt: validationResult.validatedAt
            },
            metadata: {
                service: 'validation-service',
                version: '1.0.0'
            }
        };

        await this.publishEvent('reclamation.validated', event);
        this.logger.info('Published ReclamationValidated event', { sagaId, correlationId });
    }

    async publishReclamationRejected(sagaId, correlationId, validationResult) {
        const event = {
            eventType: 'ReclamationRejected',
            sagaId,
            correlationId,
            timestamp: new Date().toISOString(),
            payload: {
                reclamationId: validationResult.reclamationId,
                validationResult: 'REJECTED',
                rejectionReason: validationResult.rejectionReason,
                rejectedBy: validationResult.validatedBy,
                rejectedAt: validationResult.validatedAt,
                validationDetails: validationResult.validationDetails
            },
            metadata: {
                service: 'validation-service',
                version: '1.0.0'
            }
        };

        await this.publishEvent('reclamation.rejected', event);
        this.logger.info('Published ReclamationRejected event', { sagaId, correlationId });
    }

    async publishEvent(routingKey, event) {
        const exchange = 'reclamation.events';
        const message = Buffer.from(JSON.stringify(event));
        
        await this.channel.publish(exchange, routingKey, message, {
            persistent: true,
            timestamp: Date.now(),
            messageId: uuidv4()
        });
    }    async start() {
        try {
            // Initialisation de la base de données
            await this.database.init();
            
            // Connexion aux événements
            await this.eventPublisher.connect();
            
            // Configuration du message broker
            await this.setupMessageBroker();
            
            this.server = this.app.listen(this.port, () => {
                this.logger.info(`Validation Service started on port ${this.port}`);
                console.log(`🔍 Validation Service running on http://localhost:${this.port}`);
                console.log(`📊 Health: http://localhost:${this.port}/health`);
                console.log(`📈 Metrics: http://localhost:${this.port}/metrics`);
            });

        } catch (error) {
            this.logger.error('Failed to start Validation Service:', error);
            process.exit(1);
        }
    }

    async stop() {
        this.logger.info('Stopping Validation Service...');
        
        if (this.server) {
            this.server.close();
        }
        
        if (this.channel) {
            await this.channel.close();
        }
        
        if (this.connection) {
            await this.connection.close();
        }
    }
}

// Démarrage du service
if (require.main === module) {
    const service = new ValidationService();
    
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

module.exports = ValidationService;
