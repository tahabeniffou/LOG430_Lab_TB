const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

/**
 * Service de publication d'événements pour NotificationService
 * Gère la publication des événements de notification vers RabbitMQ
 */
class EventPublisher {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.exchange = 'reclamation.events';
    }

    /**
     * Établit la connexion avec RabbitMQ
     */
    async connect() {
        try {
            const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            this.connection = await amqp.connect(rabbitMQUrl);
            this.channel = await this.connection.createChannel();

            // Configuration de l'exchange
            await this.channel.assertExchange(this.exchange, 'topic', { 
                durable: true 
            });

            console.log('NotificationService EventPublisher connected to RabbitMQ');
            
        } catch (error) {
            console.error('Failed to connect EventPublisher to RabbitMQ:', error);
            throw error;
        }
    }

    /**
     * Publie un événement NotificationSent
     */
    async publishNotificationSent(eventData) {
        const event = {
            eventType: 'NotificationSent',
            correlationId: eventData.correlationId,
            timestamp: eventData.timestamp || new Date().toISOString(),
            payload: {
                reclamationId: eventData.reclamationId,
                notificationId: eventData.notificationId,
                channel: eventData.channel,
                type: eventData.type,
                sentAt: eventData.timestamp || new Date().toISOString()
            },
            metadata: {
                service: 'notification-service',
                version: '1.0.0',
                sagaId: eventData.sagaId
            }
        };

        await this.publishEvent('notification.sent', event);
        console.log(`Published NotificationSent event for correlation: ${eventData.correlationId}`);
        
        return event;
    }

    /**
     * Publie un événement NotificationFailed
     */
    async publishNotificationFailed(eventData) {
        const event = {
            eventType: 'NotificationFailed',
            correlationId: eventData.correlationId,
            timestamp: eventData.timestamp || new Date().toISOString(),
            payload: {
                reclamationId: eventData.reclamationId,
                notificationId: eventData.notificationId,
                failureReason: eventData.failureReason,
                channel: eventData.channel,
                details: eventData.details,
                failedAt: eventData.timestamp || new Date().toISOString()
            },
            metadata: {
                service: 'notification-service',
                version: '1.0.0',
                sagaId: eventData.sagaId
            }
        };

        await this.publishEvent('notification.failed', event);
        console.log(`Published NotificationFailed event for correlation: ${eventData.correlationId}`);
        
        return event;
    }

    /**
     * Publie un événement NotificationRetry
     */
    async publishNotificationRetry(eventData) {
        const event = {
            eventType: 'NotificationRetry',
            correlationId: eventData.correlationId,
            timestamp: eventData.timestamp || new Date().toISOString(),
            payload: {
                reclamationId: eventData.reclamationId,
                notificationId: eventData.notificationId,
                originalFailureReason: eventData.originalFailureReason,
                retryAttempt: eventData.retryAttempt,
                retriedAt: eventData.timestamp || new Date().toISOString()
            },
            metadata: {
                service: 'notification-service',
                version: '1.0.0',
                sagaId: eventData.sagaId
            }
        };

        await this.publishEvent('notification.retry', event);
        console.log(`Published NotificationRetry event for correlation: ${eventData.correlationId}`);
        
        return event;
    }

    /**
     * Méthode générique de publication d'événements
     */
    async publishEvent(routingKey, event) {
        if (!this.channel) {
            throw new Error('EventPublisher not connected. Call connect() first.');
        }

        try {
            const message = Buffer.from(JSON.stringify(event));
            
            const options = {
                persistent: true,
                timestamp: Date.now(),
                messageId: uuidv4(),
                headers: {
                    eventType: event.eventType,
                    correlationId: event.correlationId,
                    service: 'notification-service'
                }
            };

            const published = await this.channel.publish(
                this.exchange,
                routingKey,
                message,
                options
            );

            if (!published) {
                throw new Error('Failed to publish event to exchange');
            }

            return true;

        } catch (error) {
            console.error(`Error publishing event to ${routingKey}:`, error);
            throw error;
        }
    }

    /**
     * Ferme la connexion
     */
    async disconnect() {
        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
            console.log('NotificationService EventPublisher disconnected');
        } catch (error) {
            console.error('Error disconnecting EventPublisher:', error);
        }
    }

    /**
     * Vérifie l'état de la connexion
     */
    isConnected() {
        return this.connection && this.channel && !this.connection.connection.destroyed;
    }

    /**
     * Reconnexion automatique en cas de perte de connexion
     */
    async ensureConnection() {
        if (!this.isConnected()) {
            console.log('Reconnecting NotificationService EventPublisher...');
            await this.connect();
        }
    }
}

module.exports = EventPublisher;
