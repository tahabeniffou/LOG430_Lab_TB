const { Pool } = require('pg');
const winston = require('winston');

class PaymentDatabase {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://payment_user:payment_password@localhost:5440/payment_db'
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
            this.logger.info('Payment database initialized');
        } catch (error) {
            this.logger.error('Failed to initialize payment database:', error);
            throw error;
        }
    }

    async createTables() {
        const createPaymentsTable = `
            CREATE TABLE IF NOT EXISTS payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reclamation_id UUID NOT NULL,
                saga_id UUID NOT NULL,
                correlation_id UUID NOT NULL,
                client_id VARCHAR(100) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER',
                status VARCHAR(50) NOT NULL,
                transaction_id VARCHAR(100),
                bank_response JSONB,
                processed_at TIMESTAMP WITH TIME ZONE,
                failed_at TIMESTAMP WITH TIME ZONE,
                failure_reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_payments_saga_id ON payments(saga_id);
            CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
            CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
            CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
        `;

        await this.pool.query(createPaymentsTable);
    }

    async savePayment(payment) {
        const query = `
            INSERT INTO payments (reclamation_id, saga_id, correlation_id, client_id, amount, payment_method, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [
            payment.reclamationId,
            payment.sagaId,
            payment.correlationId,
            payment.clientId,
            payment.amount,
            payment.paymentMethod,
            payment.status
        ]);

        return result.rows[0];
    }

    async updatePaymentStatus(sagaId, status, transactionId = null, bankResponse = null, failureReason = null) {
        const query = `
            UPDATE payments 
            SET status = $1, 
                transaction_id = COALESCE($2, transaction_id),
                bank_response = COALESCE($3, bank_response),
                failure_reason = COALESCE($4, failure_reason),
                processed_at = CASE WHEN $1 = 'PROCESSED' THEN NOW() ELSE processed_at END,
                failed_at = CASE WHEN $1 = 'FAILED' THEN NOW() ELSE failed_at END
            WHERE saga_id = $5
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [
            status, 
            transactionId, 
            bankResponse ? JSON.stringify(bankResponse) : null,
            failureReason,
            sagaId
        ]);
        return result.rows[0];
    }

    async getPaymentBySaga(sagaId) {
        const query = 'SELECT * FROM payments WHERE saga_id = $1 ORDER BY created_at DESC LIMIT 1';
        const result = await this.pool.query(query, [sagaId]);
        return result.rows[0];
    }
}

module.exports = PaymentDatabase;
