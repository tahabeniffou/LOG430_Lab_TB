const express = require('express');
const promClient = require('prom-client');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');

// Import des nouvelles classes
const NotificationDatabase = require('./src/NotificationDatabase');
const NotificationService = require('./src/NotificationService');
const EventPublisher = require('./src/EventPublisher');

class NotificationServiceApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8013;
        this.setupLogger();
        this.setupMetrics();
        this.setupMiddleware();
        this.setupRoutes();
        
        // Nouvelles instances
        this.database = new NotificationDatabase();
        this.eventPublisher = new EventPublisher();
        this.notificationService = new NotificationService(this.database, this.eventPublisher, this.logger);
        
        this.messageBroker = null;
        this.notificationStore = new Map(); // Simple in-memory store pour tracking
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
                new winston.transports.File({ filename: 'notification-service.log' })
            ]
        });
    }

    setupMetrics() {
        this.metrics = {
            notificationsSent: new promClient.Counter({
                name: 'notifications_sent_total',
                help: 'Total notifications sent',
                labelNames: ['channel', 'status']
            }),
            sagaNotifications: new promClient.Counter({
                name: 'saga_notifications_total',
                help: 'Total saga notifications',
                labelNames: ['event_type']
            }),
            notificationDuration: new promClient.Histogram({
                name: 'notification_duration_seconds',
                help: 'Notification processing duration',
                buckets: [0.1, 0.5, 1, 2, 5]
            }),
            compensations: new promClient.Counter({
                name: 'notification_compensations_total',
                help: 'Total notification compensations',
                labelNames: ['reason']
            }),
            httpRequests: new promClient.Counter({
                name: 'http_requests_total',
                help: 'Total HTTP requests',
                labelNames: ['method', 'route', 'status_code']
            })
        };

        promClient.register.registerMetric(this.metrics.notificationsSent);
        promClient.register.registerMetric(this.metrics.sagaNotifications);
        promClient.register.registerMetric(this.metrics.notificationDuration);
        promClient.register.registerMetric(this.metrics.compensations);
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
                service: 'notification-service',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        this.app.get('/metrics', async (req, res) => {
            this.metrics.httpRequests.inc({ method: 'GET', route: '/metrics', status_code: '200' });
            res.set('Content-Type', promClient.register.contentType);
            res.end(await promClient.register.metrics());
        });

        // API pour envoyer notification manuellement
        this.app.post('/notify', async (req, res) => {
            const timer = this.metrics.notificationDuration.startTimer();
            
            try {
                const { clientId, type, message, channel = 'EMAIL' } = req.body;
                const result = await this.sendNotification(clientId, type, message, channel);
                
                timer();
                this.metrics.httpRequests.inc({ method: 'POST', route: '/notify', status_code: '200' });
                
                res.json(result);
            } catch (error) {
                timer();
                this.metrics.httpRequests.inc({ method: 'POST', route: '/notify', status_code: '500' });
                this.logger.error('Notification error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // API pour voir les notifications envoyées
        this.app.get('/notifications', (req, res) => {
            this.metrics.httpRequests.inc({ method: 'GET', route: '/notifications', status_code: '200' });
            res.json({
                total: this.notificationStore.size,
                notifications: Array.from(this.notificationStore.values())
            });
        });
    }

    async sendNotification(clientId, type, message, channel = 'EMAIL') {
        this.logger.info('Sending notification', { clientId, type, channel });

        // Simulation d'envoi de notification
        const notificationId = uuidv4();
        const notification = {
            id: notificationId,
            clientId,
            type,
            message,
            channel,
            sentAt: new Date().toISOString(),
            status: 'PENDING'
        };

        // Simulation d'échec aléatoire (3% de chance)
        const shouldFail = Math.random() < 0.03;
        
        // Simulation du délai d'envoi
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));

        if (shouldFail) {
            notification.status = 'FAILED';
            notification.error = 'DELIVERY_FAILED';
            this.metrics.notificationsSent.inc({ channel, status: 'failed' });
        } else {
            notification.status = 'SENT';
            this.metrics.notificationsSent.inc({ channel, status: 'success' });
        }

        // Stockage pour tracking
        this.notificationStore.set(notificationId, notification);

        return notification;
    }

    async setupMessageBroker() {
        try {
            const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            this.connection = await amqp.connect(rabbitMQUrl);
            this.channel = await this.connection.createChannel();

            const exchange = 'reclamation.events';
            await this.channel.assertExchange(exchange, 'topic', { durable: true });

            // Queue pour ReclamationValidated
            const validatedQueue = 'notification.reclamation.validated';
            await this.channel.assertQueue(validatedQueue, { durable: true });
            await this.channel.bindQueue(validatedQueue, exchange, 'reclamation.validated');

            // Queue pour compensation (PaymentFailed)
            const compensationQueue = 'notification.payment.failed';
            await this.channel.assertQueue(compensationQueue, { durable: true });
            await this.channel.bindQueue(compensationQueue, exchange, 'payment.failed');

            this.logger.info('Message broker connected and configured');
            
            await this.consumeEvents();
            
        } catch (error) {
            this.logger.error('Failed to setup message broker:', error);
            throw error;
        }
    }

    async consumeEvents() {
        // Consommation ReclamationValidated
        await this.channel.consume('notification.reclamation.validated', async (msg) => {
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

        // Consommation PaymentFailed (pour compensation)
        await this.channel.consume('notification.payment.failed', async (msg) => {
            if (msg) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    await this.handlePaymentFailed(event);
                    this.channel.ack(msg);
                } catch (error) {
                    this.logger.error('Error processing PaymentFailed:', error);
                    this.channel.nack(msg, false, false);
                }
            }
        });

        this.logger.info('Started consuming notification events');
    }

    async handleReclamationValidated(event) {
        const timer = this.metrics.notificationDuration.startTimer();
        
        try {
            const { sagaId, correlationId, payload } = event;
            
            this.logger.info('Processing ReclamationValidated notification', { 
                sagaId, 
                correlationId,
                reclamationId: payload.reclamationId
            });

            // Utilisation du nouveau service de notification
            const result = await this.notificationService.handleReclamationValidated({
                sagaId,
                correlationId,
                reclamationId: payload.reclamationId,
                validationResult: payload.validationResult,
                amount: payload.eligibleAmount,
                timestamp: event.timestamp,
                type: payload.type || 'RECLAMATION'
            });

            if (result.success) {
                await this.publishClientNotified(sagaId, correlationId, result);
                this.metrics.sagaNotifications.inc({ event_type: 'client_notified' });
                this.logger.info('ReclamationValidated notification processed successfully', { 
                    sagaId, 
                    correlationId, 
                    channel: result.channel 
                });
            } else {
                await this.publishNotificationFailed(sagaId, correlationId, result);
                this.metrics.sagaNotifications.inc({ event_type: 'notification_failed' });
                this.logger.error('Failed to process ReclamationValidated notification', { 
                    sagaId, 
                    correlationId, 
                    error: result.error 
                });
            }

            timer();
            
        } catch (error) {
            timer();
            this.logger.error('Error in ReclamationValidated notification:', error);
            
            // Publier un événement d'échec de notification
            await this.publishNotificationFailed(event.sagaId, event.correlationId, {
                success: false,
                error: error.message
            });
            
            throw error;
        }
    }

    async handlePaymentFailed(event) {
        try {
            const { sagaId, correlationId, payload } = event;
            
            this.logger.info('Processing PaymentFailed compensation notification', { 
                sagaId, 
                correlationId 
            });

            // Utilisation du nouveau service de notification pour gérer l'échec de paiement
            const result = await this.notificationService.handlePaymentFailed({
                sagaId,
                correlationId,
                reclamationId: payload.reclamationId,
                failureReason: payload.failureReason,
                amount: payload.amount,
                timestamp: event.timestamp
            });

            if (result.success) {
                this.logger.info('PaymentFailed notification sent successfully', { 
                    sagaId, 
                    correlationId, 
                    channel: result.channel 
                });
                this.metrics.compensations.inc({ reason: 'payment_failed' });
            } else {
                this.logger.error('Failed to send PaymentFailed notification', { 
                    sagaId, 
                    correlationId, 
                    error: result.error 
                });
            }

        } catch (error) {
            this.logger.error('Error in PaymentFailed compensation notification:', error);
        }
    }

    async publishClientNotified(sagaId, correlationId, notification) {
        const event = {
            eventType: 'ClientNotified',
            sagaId,
            correlationId,
            timestamp: new Date().toISOString(),
            payload: {
                reclamationId: correlationId,
                clientId: notification.clientId,
                notificationChannel: notification.channel,
                notificationId: notification.id,
                sentAt: notification.sentAt
            },
            metadata: {
                service: 'notification-service',
                version: '1.0.0'
            }
        };

        await this.publishEvent('client.notified', event);
        this.logger.info('Published ClientNotified event', { sagaId, correlationId });
    }

    async publishNotificationFailed(sagaId, correlationId, notification) {
        const event = {
            eventType: 'NotificationFailed',
            sagaId,
            correlationId,
            timestamp: new Date().toISOString(),
            payload: {
                reclamationId: correlationId,
                clientId: notification.clientId,
                failureReason: notification.error || 'UNKNOWN_ERROR',
                retryable: true
            },
            metadata: {
                service: 'notification-service',
                version: '1.0.0'
            }
        };

        await this.publishEvent('notification.failed', event);
        this.logger.info('Published NotificationFailed event', { sagaId, correlationId });
    }

    async publishNotificationCancelled(sagaId, correlationId, compensationData) {
        const event = {
            eventType: 'NotificationCancelled',
            sagaId,
            correlationId,
            timestamp: new Date().toISOString(),
            payload: {
                reclamationId: correlationId,
                originalNotificationId: compensationData.originalNotificationId,
                cancellationReason: compensationData.cancellationReason,
                cancelledAt: new Date().toISOString()
            },
            metadata: {
                service: 'notification-service',
                version: '1.0.0',
                compensationEvent: true
            }
        };

        await this.publishEvent('notification.cancelled', event);
        this.logger.info('Published NotificationCancelled compensation event', { sagaId, correlationId });
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
                this.logger.info(`Notification Service started on port ${this.port}`);
                console.log(`📨 Notification Service running on http://localhost:${this.port}`);
                console.log(`📊 Health: http://localhost:${this.port}/health`);
                console.log(`📈 Metrics: http://localhost:${this.port}/metrics`);
            });
            
        } catch (error) {
            this.logger.error('Failed to start Notification Service:', error);
            process.exit(1);
        }
    }

    async stop() {
        this.logger.info('Stopping Notification Service...');
        
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
    const service = new NotificationServiceApp();
    
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

module.exports = NotificationServiceApp;
