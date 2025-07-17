const { Pool } = require('pg');
const winston = require('winston');

class ValidationDatabase {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://validation_user:validation_password@localhost:5438/validation_db'
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
            this.logger.info('Validation database initialized');
        } catch (error) {
            this.logger.error('Failed to initialize validation database:', error);
            throw error;
        }
    }

    async createTables() {
        const createValidationsTable = `
            CREATE TABLE IF NOT EXISTS validations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reclamation_id UUID NOT NULL,
                saga_id UUID NOT NULL,
                correlation_id UUID NOT NULL,
                status VARCHAR(50) NOT NULL,
                validation_rules JSONB,
                result JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_validations_saga_id ON validations(saga_id);
            CREATE INDEX IF NOT EXISTS idx_validations_reclamation_id ON validations(reclamation_id);
            CREATE INDEX IF NOT EXISTS idx_validations_status ON validations(status);
        `;

        await this.pool.query(createValidationsTable);
    }

    async saveValidation(validation) {
        const query = `
            INSERT INTO validations (reclamation_id, saga_id, correlation_id, status, validation_rules, result)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [
            validation.reclamationId,
            validation.sagaId,
            validation.correlationId,
            validation.status,
            JSON.stringify(validation.validationRules),
            JSON.stringify(validation.result)
        ]);

        return result.rows[0];
    }

    async getValidationBySaga(sagaId) {
        const query = 'SELECT * FROM validations WHERE saga_id = $1 ORDER BY created_at DESC LIMIT 1';
        const result = await this.pool.query(query, [sagaId]);
        return result.rows[0];
    }

    async updateValidationStatus(sagaId, status, result) {
        const query = `
            UPDATE validations 
            SET status = $1, result = $2, updated_at = NOW()
            WHERE saga_id = $3
            RETURNING *
        `;
        
        const queryResult = await this.pool.query(query, [status, JSON.stringify(result), sagaId]);
        return queryResult.rows[0];
    }
}

module.exports = ValidationDatabase;
