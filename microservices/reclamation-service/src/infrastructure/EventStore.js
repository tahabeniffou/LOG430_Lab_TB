const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

/**
 * Event Store - Implémentation PostgreSQL pour Event Sourcing
 * LAB 7 - Architecture Événementielle
 */
class EventStore {
    constructor({ connectionString, logger }) {
        this.connectionString = connectionString;
        this.logger = logger;
        this.pool = null;
    }

    async connect() {
        try {
            this.pool = new Pool({
                connectionString: this.connectionString,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Test de connexion
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            this.logger.info('Event Store connected successfully');
        } catch (error) {
            this.logger.error('Failed to connect to Event Store', { 
                error: error.message,
                connectionString: this.connectionString?.replace(/\/\/.*@/, '//***:***@')
            });
            throw error;
        }
    }

    async init() {
        await this.connect();
        await this.initializeDatabase();
    }

    async initializeDatabase() {
        const client = await this.pool.connect();
        try {
            // Créer les tables si elles n'existent pas
            await client.query(`
                CREATE TABLE IF NOT EXISTS event_store (
                    id UUID PRIMARY KEY,
                    aggregate_id UUID NOT NULL,
                    aggregate_type VARCHAR(255) NOT NULL,
                    event_type VARCHAR(255) NOT NULL,
                    event_version INTEGER NOT NULL,
                    event_data JSONB NOT NULL,
                    event_metadata JSONB,
                    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(aggregate_id, event_version)
                );
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_event_store_aggregate 
                ON event_store(aggregate_id, event_version);
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_event_store_type 
                ON event_store(aggregate_type, event_type);
            `);

            // Fonction pour obtenir la version d'un agrégat
            await client.query(`
                CREATE OR REPLACE FUNCTION get_aggregate_version(agg_id UUID)
                RETURNS INTEGER AS $$
                BEGIN
                    RETURN COALESCE(
                        (SELECT MAX(event_version) FROM event_store WHERE aggregate_id = agg_id),
                        0
                    );
                END;
                $$ LANGUAGE plpgsql;
            `);

            this.logger.info('Event Store database initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Event Store database', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.logger.info('Event Store disconnected');
        }
    }

    async isHealthy() {
        try {
            if (!this.pool) return false;
            
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Enregistre un nouvel événement dans l'Event Store
     */
    async appendEvent(aggregateId, aggregateType, eventType, eventData, expectedVersion = null) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Vérifier la version actuelle de l'agrégat
            const currentVersionResult = await client.query(
                'SELECT get_aggregate_version($1) as version',
                [aggregateId]
            );
            const currentVersion = currentVersionResult.rows[0].version;

            // Vérification de concurrence optimiste
            if (expectedVersion !== null && currentVersion !== expectedVersion) {
                throw new Error(`Concurrency conflict: expected version ${expectedVersion}, but current is ${currentVersion}`);
            }

            const newVersion = currentVersion + 1;
            const eventId = uuidv4();

            // Insérer l'événement
            const insertResult = await client.query(`
                INSERT INTO event_store (
                    id, aggregate_id, aggregate_type, event_type, 
                    event_version, event_data, event_metadata, occurred_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                RETURNING id, occurred_at
            `, [
                eventId,
                aggregateId,
                aggregateType,
                eventType,
                newVersion,
                JSON.stringify(eventData),
                JSON.stringify({
                    correlationId: eventData.correlationId || uuidv4(),
                    userId: eventData.userId || 'system',
                    source: 'reclamation-service'
                })
            ]);

            await client.query('COMMIT');

            const event = {
                id: eventId,
                aggregateId,
                aggregateType,
                eventType,
                eventVersion: newVersion,
                eventData,
                occurredAt: insertResult.rows[0].occurred_at
            };

            this.logger.debug('Event appended to store', {
                eventId,
                aggregateId,
                eventType,
                version: newVersion
            });

            return event;

        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error('Failed to append event', {
                error: error.message,
                aggregateId,
                eventType
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Récupère tous les événements d'un agrégat
     */
    async getAggregateEvents(aggregateId, fromVersion = 0) {
        try {
            const result = await this.pool.query(
                'SELECT * FROM get_aggregate_events($1, $2)',
                [aggregateId, fromVersion]
            );

            return result.rows.map(row => ({
                id: row.id,
                eventType: row.event_type,
                eventVersion: row.event_version,
                eventData: row.event_data,
                eventMetadata: row.event_metadata,
                occurredAt: row.occurred_at
            }));
        } catch (error) {
            this.logger.error('Failed to get aggregate events', {
                error: error.message,
                aggregateId,
                fromVersion
            });
            throw error;
        }
    }

    /**
     * Récupère la version actuelle d'un agrégat
     */
    async getAggregateVersion(aggregateId) {
        try {
            const result = await this.pool.query(
                'SELECT get_aggregate_version($1) as version',
                [aggregateId]
            );
            return result.rows[0].version;
        } catch (error) {
            this.logger.error('Failed to get aggregate version', {
                error: error.message,
                aggregateId
            });
            throw error;
        }
    }

    /**
     * Récupère tous les événements depuis un ID donné (pour projections)
     */
    async getEventsSince(lastEventId = null, batchSize = 100) {
        try {
            let query, params;

            if (lastEventId) {
                query = `
                    SELECT id, aggregate_id, aggregate_type, event_type, 
                           event_version, event_data, event_metadata, occurred_at
                    FROM event_store 
                    WHERE occurred_at > (
                        SELECT occurred_at FROM event_store WHERE id = $1
                    )
                    ORDER BY occurred_at ASC 
                    LIMIT $2
                `;
                params = [lastEventId, batchSize];
            } else {
                query = `
                    SELECT id, aggregate_id, aggregate_type, event_type, 
                           event_version, event_data, event_metadata, occurred_at
                    FROM event_store 
                    ORDER BY occurred_at ASC 
                    LIMIT $1
                `;
                params = [batchSize];
            }

            const result = await this.pool.query(query, params);

            return result.rows.map(row => ({
                id: row.id,
                aggregateId: row.aggregate_id,
                aggregateType: row.aggregate_type,
                eventType: row.event_type,
                eventVersion: row.event_version,
                eventData: row.event_data,
                eventMetadata: row.event_metadata,
                occurredAt: row.occurred_at
            }));
        } catch (error) {
            this.logger.error('Failed to get events since', {
                error: error.message,
                lastEventId,
                batchSize
            });
            throw error;
        }
    }

    /**
     * Sauvegarde un snapshot d'agrégat pour optimiser la reconstruction
     */
    async saveSnapshot(aggregateId, aggregateType, aggregateVersion, snapshotData) {
        try {
            await this.pool.query(`
                INSERT INTO event_snapshots (aggregate_id, aggregate_type, aggregate_version, snapshot_data)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (aggregate_id) 
                DO UPDATE SET 
                    aggregate_version = $3,
                    snapshot_data = $4,
                    created_at = CURRENT_TIMESTAMP
            `, [aggregateId, aggregateType, aggregateVersion, JSON.stringify(snapshotData)]);

            this.logger.debug('Snapshot saved', {
                aggregateId,
                aggregateType,
                version: aggregateVersion
            });
        } catch (error) {
            this.logger.error('Failed to save snapshot', {
                error: error.message,
                aggregateId,
                aggregateType
            });
            throw error;
        }
    }

    /**
     * Récupère le dernier snapshot d'un agrégat
     */
    async getSnapshot(aggregateId) {
        try {
            const result = await this.pool.query(`
                SELECT aggregate_version, snapshot_data, created_at
                FROM event_snapshots 
                WHERE aggregate_id = $1
            `, [aggregateId]);

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                aggregateVersion: row.aggregate_version,
                snapshotData: row.snapshot_data,
                createdAt: row.created_at
            };
        } catch (error) {
            this.logger.error('Failed to get snapshot', {
                error: error.message,
                aggregateId
            });
            throw error;
        }
    }

    /**
     * Met à jour l'offset d'une projection
     */
    async updateProjectionOffset(projectionName, lastProcessedEventId) {
        try {
            await this.pool.query(`
                UPDATE projection_offsets 
                SET last_processed_event_id = $2, 
                    last_processed_at = CURRENT_TIMESTAMP
                WHERE projection_name = $1
            `, [projectionName, lastProcessedEventId]);

            this.logger.debug('Projection offset updated', {
                projectionName,
                lastProcessedEventId
            });
        } catch (error) {
            this.logger.error('Failed to update projection offset', {
                error: error.message,
                projectionName
            });
            throw error;
        }
    }

    /**
     * Récupère l'offset d'une projection
     */
    async getProjectionOffset(projectionName) {
        try {
            const result = await this.pool.query(
                'SELECT last_processed_event_id FROM projection_offsets WHERE projection_name = $1',
                [projectionName]
            );

            return result.rows.length > 0 ? result.rows[0].last_processed_event_id : null;
        } catch (error) {
            this.logger.error('Failed to get projection offset', {
                error: error.message,
                projectionName
            });
            throw error;
        }
    }

    /**
     * Statistiques de l'Event Store
     */
    async getStatistics() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(DISTINCT aggregate_id) as total_aggregates,
                    COUNT(DISTINCT event_type) as unique_event_types,
                    MIN(occurred_at) as first_event,
                    MAX(occurred_at) as last_event
                FROM event_store
            `);

            return result.rows[0];
        } catch (error) {
            this.logger.error('Failed to get statistics', { error: error.message });
            throw error;
        }
    }
}

module.exports = EventStore;
