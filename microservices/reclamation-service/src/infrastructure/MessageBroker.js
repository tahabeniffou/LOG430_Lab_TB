/**
 * Message Broker pour RabbitMQ
 */
const amqp = require('amqplib');

class MessageBroker {
    constructor(url) {
        this.url = url;
        this.connection = null;
        this.channel = null;
    }

    async connect() {
        try {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
            
            // Créer l'échange pour les événements de réclamation
            await this.channel.assertExchange('reclamation.events', 'topic', { durable: true });
            
            console.log('✅ Message Broker connecté à RabbitMQ');
        } catch (error) {
            console.error('❌ Erreur de connexion au Message Broker:', error);
            throw error;
        }
    }

    async publish(routingKey, message) {
        if (!this.channel) {
            throw new Error('Message Broker non connecté');
        }

        try {
            const messageBuffer = Buffer.from(JSON.stringify(message));
            await this.channel.publish('reclamation.events', routingKey, messageBuffer, {
                persistent: true,
                timestamp: Date.now()
            });
            
            console.log(`📤 Message publié: ${routingKey}`);
        } catch (error) {
            console.error('❌ Erreur lors de la publication:', error);
            throw error;
        }
    }

    async consume(queue, routingKey, callback) {
        if (!this.channel) {
            throw new Error('Message Broker non connecté');
        }

        try {
            await this.channel.assertQueue(queue, { durable: true });
            await this.channel.bindQueue(queue, 'reclamation.events', routingKey);
            
            await this.channel.consume(queue, async (msg) => {
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        await callback(content);
                        this.channel.ack(msg);
                    } catch (error) {
                        console.error('❌ Erreur lors du traitement du message:', error);
                        this.channel.nack(msg, false, false);
                    }
                }
            });
            
            console.log(`📥 Consommateur configuré pour: ${queue} (${routingKey})`);
        } catch (error) {
            console.error('❌ Erreur lors de la configuration du consommateur:', error);
            throw error;
        }
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            console.log('✅ Message Broker fermé');
        } catch (error) {
            console.error('❌ Erreur lors de la fermeture:', error);
        }
    }
}

module.exports = MessageBroker;
