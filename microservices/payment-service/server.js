const express = require('express');
const promClient = require('prom-client');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');

// Import des nouvelles classes
const PaymentDatabase = require('./src/PaymentDatabase');
const PaymentService = require('./src/PaymentService');
const EventPublisher = require('./src/EventPublisher');

class PaymentServiceApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8014;
        this.setupLogger();
        this.setupMetrics();
        this.setupMiddleware();
        this.setupRoutes();
        
        // Nouvelles instances
        this.database = new PaymentDatabase();
        this.eventPublisher = new EventPublisher();
        this.paymentService = new PaymentService(this.database, this.eventPublisher, this.logger);
        
        this.messageBroker = null;
        this.paymentStore = new Map(); // Store pour tracking des paiements
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
                new winston.transports.File({ filename: 'payment-service.log' })
            ]
        });
    }

    setupMetrics() {
        this.metrics = {
            paymentsProcessed: new promClient.Counter({
                name: 'payments_processed_total',
                help: 'Total payments processed',
                labelNames: ['status', 'method']
            }),
            sagaPayments: new promClient.Counter({
                name: 'saga_payments_total',
                help: 'Total saga payments',
                labelNames: ['result']
            }),
            paymentDuration: new promClient.Histogram({
                name: 'payment_duration_seconds',
                help: 'Payment processing duration',
                buckets: [0.5, 1, 2, 5, 10]
            }),
            paymentAmount: new promClient.Histogram({
                name: 'payment_amount_euros',
                help: 'Payment amounts processed',
                buckets: [10, 50, 100, 500, 1000]
            }),
            httpRequests: new promClient.Counter({
                name: 'http_requests_total',
                help: 'Total HTTP requests',
                labelNames: ['method', 'route', 'status_code']
            })
        };

        promClient.register.registerMetric(this.metrics.paymentsProcessed);
        promClient.register.registerMetric(this.metrics.sagaPayments);
        promClient.register.registerMetric(this.metrics.paymentDuration);
        promClient.register.registerMetric(this.metrics.paymentAmount);
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
        this.app.get('/health', (req, res) => {
            this.metrics.httpRequests.inc({ method: 'GET', route: '/health', status_code: '200' });
            res.json({
                status: 'healthy',
                service: 'payment-service',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        this.app.get('/metrics', async (req, res) => {
            this.metrics.httpRequests.inc({ method: 'GET', route: '/metrics', status_code: '200' });
            res.set('Content-Type', promClient.register.contentType);
            res.end(await promClient.register.metrics());
        });

        // API pour traiter un paiement manuellement
        this.app.post('/process', async (req, res) => {
            const timer = this.metrics.paymentDuration.startTimer();
            
            try {
                const { reclamationId, amount, method = 'BANK_TRANSFER' } = req.body;
                const result = await this.processPayment(reclamationId, amount, method);
                
                timer();
                this.metrics.httpRequests.inc({ method: 'POST', route: '/process', status_code: '200' });
                
                res.json(result);
            } catch (error) {
                timer();
                this.metrics.httpRequests.inc({ method: 'POST', route: '/process', status_code: '500' });
                this.logger.error('Payment processing error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // API pour voir les paiements traités
        this.app.get('/payments', (req, res) => {
            this.metrics.httpRequests.inc({ method: 'GET', route: '/payments', status_code: '200' });
            res.json({
                total: this.paymentStore.size,
                payments: Array.from(this.paymentStore.values())
            });
        });
    }

    async processPayment(reclamationId, amount, method = 'BANK_TRANSFER') {
        this.logger.info('Processing payment', { reclamationId, amount, method });

        const paymentId = uuidv4();
        const payment = {
            id: paymentId,
            reclamationId,
            amount,
            method,
            processedAt: new Date().toISOString(),
            status: 'PROCESSING'
        };

        // Simulation des règles de paiement
        const paymentRules = {
            maxAmount: 1000,
            minAmount: 0.01,
            // Simulation de comptes avec fonds insuffisants
            insufficientFundsClients: ['low-funds-client-123'],
            // Simulation d'échec réseau (2% de chance)
            networkFailureRate: 0.02
        };

        // Simulation du délai de traitement bancaire
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

        // Validation du montant
        if (amount > paymentRules.maxAmount) {
            payment.status = 'FAILED';
            payment.failureReason = 'AMOUNT_EXCEEDS_LIMIT';
            payment.retryable = false;
        } else if (amount < paymentRules.minAmount) {
            payment.status = 'FAILED';
            payment.failureReason = 'AMOUNT_TOO_LOW';
            payment.retryable = false;
        }
        // Simulation d'échec réseau
        else if (Math.random() < paymentRules.networkFailureRate) {
            payment.status = 'FAILED';
            payment.failureReason = 'NETWORK_ERROR';
            payment.retryable = true;
        }
        // Simulation fonds insuffisants
        else if (paymentRules.insufficientFundsClients.some(client => 
                 reclamationId.includes(client))) {
            payment.status = 'FAILED';
            payment.failureReason = 'INSUFFICIENT_FUNDS';
            payment.retryable = false;
        }
        // Simulation d'échec aléatoire (7% de chance pour tester compensations)
        else if (Math.random() < 0.07) {
            payment.status = 'FAILED';
            payment.failureReason = 'BANK_PROCESSING_ERROR';
            payment.retryable = true;
        }
        // Succès
        else {
            payment.status = 'COMPLETED';
            payment.transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            payment.completedAt = new Date().toISOString();
        }

        // Métriques
        this.metrics.paymentsProcessed.inc({ 
            status: payment.status.toLowerCase(), 
            method: method.toLowerCase() 
        });
        
        if (payment.status === 'COMPLETED') {
            this.metrics.paymentAmount.observe(amount);
        }

        // Stockage
        this.paymentStore.set(paymentId, payment);

        return payment;
    }

    async setupMessageBroker() {
        try {
            const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            this.connection = await amqp.connect(rabbitMQUrl);
            this.channel = await this.connection.createChannel();

            const exchange = 'reclamation.events';
            await this.channel.assertExchange(exchange, 'topic', { durable: true });

            // Queue pour ReclamationValidated
            const validatedQueue = 'payment.reclamation.validated';
            await this.channel.assertQueue(validatedQueue, { durable: true });
            await this.channel.bindQueue(validatedQueue, exchange, 'reclamation.validated');

            this.logger.info('Message broker connected and configured');
            
            await this.consumeEvents();
            
        } catch (error) {
            this.logger.error('Failed to setup message broker:', error);
            throw error;
        }
    }

    async consumeEvents() {
        // Consommation ReclamationValidated
        await this.channel.consume('payment.reclamation.validated', async (msg) => {
            if (msg) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    await this.handleReclamationValidated(event);
                    this.channel.ack(msg);
                } catch (error) {
                    this.logger.error('Error processing ReclamationValidated:', error);
                    this.channel.nack(msg, false, false);
                }
            }
        });

        this.logger.info('Started consuming payment events');
    }

    async handleReclamationValidated(event) {
        const timer = this.metrics.paymentDuration.startTimer();
        
        try {
            const { sagaId, correlationId, payload } = event;
            
            this.logger.info('Processing ReclamationValidated for payment', { 
                sagaId, 
                correlationId,
                reclamationId: payload.reclamationId
            });

            // Utilisation du nouveau service de paiement
            const result = await this.paymentService.handleReclamationValidated({
                sagaId,
                correlationId,
                reclamationId: payload.reclamationId,
                validationResult: payload.validationResult,
                amount: payload.eligibleAmount || this.extractAmountFromCorrelationId(correlationId),
                clientId: payload.clientId,
                type: payload.type,
                timestamp: event.timestamp
            });

            if (result.success) {
                this.logger.info('Payment processed successfully', { 
                    sagaId, 
                    correlationId, 
                    paymentId: result.paymentId,
                    transactionId: result.transactionId 
                });
                this.metrics.sagaPayments.inc({ status: 'completed' });
            } else {
                this.logger.error('Payment processing failed', { 
                    sagaId, 
                    correlationId, 
                    reason: result.reason,
                    paymentId: result.paymentId 
                });
                this.metrics.sagaPayments.inc({ status: 'failed' });
            }

            timer();
            
        } catch (error) {
            timer();
            this.logger.error('Error in ReclamationValidated payment processing:', error);
            
            // Publier un événement d'échec de paiement
            await this.publishPaymentFailed(event.sagaId, event.correlationId, {
                success: false,
                error: error.message
            });
            
            throw error;
        }
    }

    extractAmountFromCorrelationId(correlationId) {
        // Simulation - en vrai on récupérerait depuis EventStore
        // Pour les tests, on utilise des montants variés
        const amounts = [25.99, 49.99, 99.99, 149.99, 199.99];
        const hash = correlationId.split('-').reduce((acc, part) => acc + part.length, 0);
        return amounts[hash % amounts.length];
    }

    async publishPaymentProcessed(sagaId, correlationId, payment) {
        const event = {
            eventType: 'PaymentProcessed',
            sagaId,
            correlationId,
            timestamp: new Date().toISOString(),
            payload: {
                reclamationId: correlationId,
                paymentId: payment.id,
                amount: payment.amount,
                method: payment.method,
                status: payment.status,
                transactionId: payment.transactionId,
                completedAt: payment.completedAt
            },
            metadata: {
                service: 'payment-service',
                version: '1.0.0'
            }
        };

        await this.publishEvent('payment.processed', event);
        this.logger.info('Published PaymentProcessed event', { sagaId, correlationId });
    }

    async publishPaymentFailed(sagaId, correlationId, payment) {
        const event = {
            eventType: 'PaymentFailed',
            sagaId,
            correlationId,
            timestamp: new Date().toISOString(),
            payload: {
                reclamationId: correlationId,
                paymentId: payment.id,
                amount: payment.amount,
                failureReason: payment.failureReason,
                retryable: payment.retryable || false,
                compensationRequired: true,
                failedAt: payment.processedAt
            },
            metadata: {
                service: 'payment-service',
                version: '1.0.0'
            }
        };

        await this.publishEvent('payment.failed', event);
        this.logger.info('Published PaymentFailed event', { sagaId, correlationId });
    }

    async publishEvent(routingKey, event) {
        const exchange = 'reclamation.events';
        const message = Buffer.from(JSON.stringify(event));
        
        await this.channel.publish(exchange, routingKey, message, {
            persistent: true,
            timestamp: Date.now(),
            messageId: uuidv4()
        });
    }

    async start() {
        try {
            // Initialisation de la base de données
            await this.database.init();
            
            // Connexion à l'event publisher
            await this.eventPublisher.connect();
            
            // Configuration du message broker
            await this.setupMessageBroker();
            
            this.server = this.app.listen(this.port, () => {
                this.logger.info(`Payment Service started on port ${this.port}`);
                console.log(`💳 Payment Service running on http://localhost:${this.port}`);
                console.log(`📊 Health: http://localhost:${this.port}/health`);
                console.log(`📈 Metrics: http://localhost:${this.port}/metrics`);
            });
            
        } catch (error) {
            this.logger.error('Failed to start Payment Service:', error);
            process.exit(1);
        }
    }

    async stop() {
        this.logger.info('Stopping Payment Service...');
        
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

if (require.main === module) {
    const service = new PaymentServiceApp();
    
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

module.exports = PaymentServiceApp;
