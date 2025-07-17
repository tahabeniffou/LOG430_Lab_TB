const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

/**
 * Service de publication d'événements pour PaymentService
 * Gère la publication des événements de paiement vers RabbitMQ
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

            console.log('PaymentService EventPublisher connected to RabbitMQ');
            
        } catch (error) {
            console.error('Failed to connect EventPublisher to RabbitMQ:', error);
            throw error;
        }
    }

    /**
     * Publie un événement PaymentProcessed
     */
    async publishPaymentProcessed(eventData) {
        const event = {
            eventType: 'PaymentProcessed',
            correlationId: eventData.correlationId,
            timestamp: eventData.timestamp || new Date().toISOString(),
            payload: {
                reclamationId: eventData.reclamationId,
                paymentId: eventData.paymentId,
                transactionId: eventData.transactionId,
                amount: eventData.amount,
                provider: eventData.provider,
                paymentMethod: eventData.paymentMethod,
                processedAt: eventData.timestamp || new Date().toISOString()
            },
            metadata: {
                service: 'payment-service',
                version: '1.0.0',
                sagaId: eventData.sagaId
            }
        };

        await this.publishEvent('payment.processed', event);
        console.log(`Published PaymentProcessed event for correlation: ${eventData.correlationId}`);
        
        return event;
    }

    /**
     * Publie un événement PaymentFailed
     */
    async publishPaymentFailed(eventData) {
        const event = {
            eventType: 'PaymentFailed',
            correlationId: eventData.correlationId,
            timestamp: eventData.timestamp || new Date().toISOString(),
            payload: {
                reclamationId: eventData.reclamationId,
                paymentId: eventData.paymentId,
                failureReason: eventData.failureReason,
                amount: eventData.amount,
                details: eventData.details,
                failedAt: eventData.timestamp || new Date().toISOString(),
                retryable: eventData.retryable || false
            },
            metadata: {
                service: 'payment-service',
                version: '1.0.0',
                sagaId: eventData.sagaId
            }
        };

        await this.publishEvent('payment.failed', event);
        console.log(`Published PaymentFailed event for correlation: ${eventData.correlationId}`);
        
        return event;
    }

    /**
     * Publie un événement PaymentRetried
     */
    async publishPaymentRetried(eventData) {
        const event = {
            eventType: 'PaymentRetried',
            correlationId: eventData.correlationId,
            timestamp: eventData.timestamp || new Date().toISOString(),
            payload: {
                reclamationId: eventData.reclamationId,
                paymentId: eventData.paymentId,
                originalFailureReason: eventData.originalFailureReason,
                retryAttempt: eventData.retryAttempt,
                retriedAt: eventData.timestamp || new Date().toISOString()
            },
            metadata: {
                service: 'payment-service',
                version: '1.0.0',
                sagaId: eventData.sagaId
            }
        };

        await this.publishEvent('payment.retried', event);
        console.log(`Published PaymentRetried event for correlation: ${eventData.correlationId}`);
        
        return event;
    }

    /**
     * Publie un événement PaymentApprovalRequired
     */
    async publishPaymentApprovalRequired(eventData) {
        const event = {
            eventType: 'PaymentApprovalRequired',
            correlationId: eventData.correlationId,
            timestamp: eventData.timestamp || new Date().toISOString(),
            payload: {
                reclamationId: eventData.reclamationId,
                paymentId: eventData.paymentId,
                amount: eventData.amount,
                reason: eventData.reason,
                approvalLevel: eventData.approvalLevel,
                requestedAt: eventData.timestamp || new Date().toISOString()
            },
            metadata: {
                service: 'payment-service',
                version: '1.0.0',
                sagaId: eventData.sagaId
            }
        };

        await this.publishEvent('payment.approval.required', event);
        console.log(`Published PaymentApprovalRequired event for correlation: ${eventData.correlationId}`);
        
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
                    service: 'payment-service'
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
            console.log('PaymentService EventPublisher disconnected');
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
            console.log('Reconnecting PaymentService EventPublisher...');
            await this.connect();
        }
    }
}

module.exports = EventPublisher;
