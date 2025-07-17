const amqp = require('amqplib');
const winston = require('winston');

class EventPublisher {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.exchange = 'reclamation.events';
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [new winston.transports.Console()]
        });
    }

    async connect() {
        try {
            const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            this.connection = await amqp.connect(rabbitMQUrl);
            this.channel = await this.connection.createChannel();
            
            await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
            
            this.logger.info('EventPublisher connected to RabbitMQ');
        } catch (error) {
            this.logger.error('Failed to connect EventPublisher:', error);
            throw error;
        }
    }

    async publishValidationResult(sagaId, correlationId, isValid, validationData, reclamationData) {
        try {
            const eventType = isValid ? 'ReclamationValidated' : 'ReclamationRejected';
            const routingKey = isValid ? 'reclamation.validated' : 'reclamation.rejected';
            
            const event = {
                eventType,
                eventId: this.generateEventId(),
                sagaId,
                correlationId,
                timestamp: new Date().toISOString(),
                payload: {
                    reclamationId: correlationId,
                    validationResult: isValid ? 'APPROVED' : 'REJECTED',
                    validationScore: validationData.validationScore,
                    validationDetails: validationData.details,
                    errors: validationData.errors || [],
                    validatedBy: 'validation-service',
                    originalReclamation: reclamationData
                },
                metadata: {
                    service: 'validation-service',
                    version: '1.0.0',
                    validationRules: Object.keys(validationData.details).length
                }
            };

            const message = Buffer.from(JSON.stringify(event));
            await this.channel.publish(this.exchange, routingKey, message, {
                persistent: true,
                timestamp: Date.now(),
                messageId: event.eventId
            });

            this.logger.info(`Published ${eventType} event`, {
                sagaId,
                correlationId,
                routingKey,
                isValid
            });

            return event;
        } catch (error) {
            this.logger.error('Failed to publish validation result:', error);
            throw error;
        }
    }

    generateEventId() {
        return 'evt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    async disconnect() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.logger.info('EventPublisher disconnected');
        } catch (error) {
            this.logger.error('Error disconnecting EventPublisher:', error);
        }
    }
}

module.exports = EventPublisher;
