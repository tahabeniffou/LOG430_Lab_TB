const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

/**
 * Event Publisher - Gestion de la publication d'événements via RabbitMQ
 * LAB 7 - Architecture Événementielle
 */
class EventPublisher {
    constructor({ rabbitmqUrl, logger, metrics }) {
        this.rabbitmqUrl = rabbitmqUrl;
        this.logger = logger;
        this.metrics = metrics;
        this.connection = null;
        this.channel = null;
        this.exchangeName = 'pos.events';
        this.isConnected = false;
    }

    async connect() {
        try {
            // Connexion à RabbitMQ
            this.connection = await amqp.connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            // Configuration de l'exchange principal
            await this.channel.assertExchange(this.exchangeName, 'topic', {
                durable: true,
                autoDelete: false
            });

            // Gestion des erreurs de connexion
            this.connection.on('error', (error) => {
                this.logger.error('RabbitMQ connection error', { error: error.message });
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                this.logger.warn('RabbitMQ connection closed');
                this.isConnected = false;
            });

            this.isConnected = true;
            this.logger.info('Event Publisher connected to RabbitMQ', {
                exchange: this.exchangeName
            });

        } catch (error) {
            this.logger.error('Failed to connect Event Publisher', {
                error: error.message,
                rabbitmqUrl: this.rabbitmqUrl?.replace(/\/\/.*@/, '//***:***@')
            });
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.isConnected = false;
            this.logger.info('Event Publisher disconnected');
        } catch (error) {
            this.logger.error('Error disconnecting Event Publisher', { error: error.message });
        }
    }

    async isHealthy() {
        return this.isConnected && this.connection && !this.connection.connection.closing;
    }

    /**
     * Publie un événement métier sur le bus d'événements
     */
    async publishEvent(eventType, eventData, routingKey = null, options = {}) {
        if (!this.isConnected || !this.channel) {
            throw new Error('Event Publisher not connected');
        }

        const startTime = Date.now();
        const correlationId = eventData.correlationId || uuidv4();

        try {
            // Construction du message d'événement
            const eventMessage = {
                eventId: uuidv4(),
                eventType,
                eventData,
                metadata: {
                    correlationId,
                    timestamp: new Date().toISOString(),
                    source: 'reclamation-service',
                    version: '1.0.0',
                    ...options.metadata
                }
            };

            // Détermination de la routing key
            const finalRoutingKey = routingKey || this.generateRoutingKey(eventType);

            // Options de publication
            const publishOptions = {
                persistent: true,
                messageId: eventMessage.eventId,
                correlationId,
                timestamp: Date.now(),
                headers: {
                    eventType,
                    source: 'reclamation-service'
                },
                ...options.publishOptions
            };

            // Publication de l'événement
            const published = this.channel.publish(
                this.exchangeName,
                finalRoutingKey,
                Buffer.from(JSON.stringify(eventMessage)),
                publishOptions
            );

            if (!published) {
                throw new Error('Failed to publish event to exchange');
            }

            // Métriques
            const duration = Date.now() - startTime;
            this.metrics.eventsPublishedTotal.inc({ 
                event_type: eventType, 
                status: 'success' 
            });
            this.metrics.eventProcessingDuration.observe(
                { event_type: eventType },
                duration / 1000
            );

            this.logger.info('Event published successfully', {
                eventId: eventMessage.eventId,
                eventType,
                routingKey: finalRoutingKey,
                correlationId,
                duration
            });

            return {
                eventId: eventMessage.eventId,
                published: true,
                routingKey: finalRoutingKey
            };

        } catch (error) {
            this.metrics.eventsPublishedTotal.inc({ 
                event_type: eventType, 
                status: 'error' 
            });

            this.logger.error('Failed to publish event', {
                error: error.message,
                eventType,
                correlationId
            });
            throw error;
        }
    }

    /**
     * Publie un événement de réclamation spécifique
     */
    async publishReclamationEvent(eventType, reclamationData, additionalData = {}) {
        const eventData = {
            reclamationId: reclamationData.id,
            clientId: reclamationData.clientId,
            type: reclamationData.type,
            priority: reclamationData.priority,
            status: reclamationData.status,
            ...additionalData,
            correlationId: reclamationData.correlationId || uuidv4()
        };

        const routingKey = `reclamation.${eventType.toLowerCase()}`;

        return await this.publishEvent(eventType, eventData, routingKey);
    }

    /**
     * Publie un événement de notification
     */
    async publishNotificationEvent(notificationType, recipientId, content, channel = 'email') {
        const eventData = {
            notificationId: uuidv4(),
            type: notificationType,
            recipientId,
            channel,
            content,
            priority: content.priority || 'normal'
        };

        const routingKey = `notification.${notificationType.toLowerCase()}`;

        return await this.publishEvent('NotificationRequested', eventData, routingKey);
    }

    /**
     * Publie un événement d'audit
     */
    async publishAuditEvent(action, resourceType, resourceId, userId, details = {}) {
        const eventData = {
            auditId: uuidv4(),
            action,
            resourceType,
            resourceId,
            userId,
            details,
            timestamp: new Date().toISOString()
        };

        const routingKey = `audit.${action.toLowerCase()}`;

        return await this.publishEvent('AuditEventRecorded', eventData, routingKey);
    }

    /**
     * Publie un événement d'analytics
     */
    async publishAnalyticsEvent(metricType, dimensions, value, tags = {}) {
        const eventData = {
            metricId: uuidv4(),
            metricType,
            dimensions,
            value,
            tags,
            timestamp: new Date().toISOString()
        };

        const routingKey = `analytics.${metricType.toLowerCase()}`;

        return await this.publishEvent('MetricRecorded', eventData, routingKey);
    }

    /**
     * Publie plusieurs événements en batch
     */
    async publishBatch(events) {
        const results = [];
        const errors = [];

        for (const event of events) {
            try {
                const result = await this.publishEvent(
                    event.eventType,
                    event.eventData,
                    event.routingKey,
                    event.options
                );
                results.push(result);
            } catch (error) {
                errors.push({
                    event,
                    error: error.message
                });
            }
        }

        return {
            published: results.length,
            failed: errors.length,
            results,
            errors
        };
    }

    /**
     * Génère une routing key basée sur le type d'événement
     */
    generateRoutingKey(eventType) {
        // Conversion CamelCase vers kebab-case
        const kebabCase = eventType
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .replace(/^-/, '');

        // Mapping des types d'événements vers des domaines
        const eventDomains = {
            'reclamation-creee': 'reclamation.created',
            'reclamation-affectee': 'reclamation.assigned',
            'reclamation-traitee': 'reclamation.resolved',
            'reclamation-close': 'reclamation.closed',
            'notification-requested': 'notification.requested',
            'audit-event-recorded': 'audit.recorded',
            'metric-recorded': 'analytics.metric'
        };

        return eventDomains[kebabCase] || `general.${kebabCase}`;
    }

    /**
     * Configuration d'un Dead Letter Queue pour les événements échoués
     */
    async setupDeadLetterQueue() {
        try {
            const dlqExchange = `${this.exchangeName}.dlq`;
            const dlqQueue = 'failed.events';

            await this.channel.assertExchange(dlqExchange, 'direct', { durable: true });
            await this.channel.assertQueue(dlqQueue, {
                durable: true,
                arguments: {
                    'x-message-ttl': 7 * 24 * 60 * 60 * 1000, // 7 jours
                }
            });
            await this.channel.bindQueue(dlqQueue, dlqExchange, 'failed');

            this.logger.info('Dead Letter Queue configured', {
                exchange: dlqExchange,
                queue: dlqQueue
            });
        } catch (error) {
            this.logger.error('Failed to setup Dead Letter Queue', { error: error.message });
        }
    }

    /**
     * Republication d'événements échoués
     */
    async republishFailedEvent(eventData, originalRoutingKey, retryCount = 0) {
        const maxRetries = 3;
        
        if (retryCount >= maxRetries) {
            // Envoyer vers Dead Letter Queue
            return await this.publishEvent(
                'EventFailed',
                { ...eventData, originalRoutingKey, retryCount },
                'failed.events'
            );
        }

        try {
            return await this.publishEvent(
                eventData.eventType,
                eventData.eventData,
                originalRoutingKey,
                {
                    metadata: {
                        retryCount: retryCount + 1,
                        originalTimestamp: eventData.metadata?.timestamp
                    }
                }
            );
        } catch (error) {
            this.logger.warn('Retry failed, attempting again', {
                eventType: eventData.eventType,
                retryCount: retryCount + 1,
                error: error.message
            });

            // Délai exponentiel avant retry
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            
            return await this.republishFailedEvent(eventData, originalRoutingKey, retryCount + 1);
        }
    }
}

module.exports = EventPublisher;
