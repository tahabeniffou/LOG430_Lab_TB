const { Pool } = require('pg');
const winston = require('winston');

class NotificationDatabase {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://notification_user:notification_password@localhost:5439/notification_db'
        });
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [new winston.transports.Console()]
        });
    }

    async init() {
        try {
            await this.createTables();
            this.logger.info('Notification database initialized');
        } catch (error) {
            this.logger.error('Failed to initialize notification database:', error);
            throw error;
        }
    }

    async createTables() {
        const createNotificationsTable = `
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reclamation_id UUID NOT NULL,
                saga_id UUID NOT NULL,
                correlation_id UUID NOT NULL,
                client_id VARCHAR(100) NOT NULL,
                notification_type VARCHAR(50) NOT NULL,
                channel VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
                status VARCHAR(50) NOT NULL,
                content JSONB,
                sent_at TIMESTAMP WITH TIME ZONE,
                cancelled_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_notifications_saga_id ON notifications(saga_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications(client_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
        `;

        await this.pool.query(createNotificationsTable);
    }

    async saveNotification(notification) {
        const query = `
            INSERT INTO notifications (reclamation_id, saga_id, correlation_id, client_id, notification_type, channel, status, content)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [
            notification.reclamationId,
            notification.sagaId,
            notification.correlationId,
            notification.clientId,
            notification.notificationType,
            notification.channel,
            notification.status,
            JSON.stringify(notification.content)
        ]);

        return result.rows[0];
    }

    async updateNotificationStatus(sagaId, status, timestamp = null) {
        const query = `
            UPDATE notifications 
            SET status = $1, ${status === 'SENT' ? 'sent_at' : 'cancelled_at'} = COALESCE($2, NOW())
            WHERE saga_id = $3
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [status, timestamp, sagaId]);
        return result.rows[0];
    }

    async getNotificationBySaga(sagaId) {
        const query = 'SELECT * FROM notifications WHERE saga_id = $1 ORDER BY created_at DESC LIMIT 1';
        const result = await this.pool.query(query, [sagaId]);
        return result.rows[0];
    }
}

module.exports = NotificationDatabase;
