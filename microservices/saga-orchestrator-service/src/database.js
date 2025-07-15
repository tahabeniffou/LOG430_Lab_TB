const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'saga.db');
        this.db = null;
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                logger.error('Database connection failed', { error: err.message });
                throw err;
            }
            logger.info('Connected to SQLite database', { path: this.dbPath });
            this.createTables();
        });
    }

    createTables() {
        const sagaTableSQL = `
            CREATE TABLE IF NOT EXISTS sagas (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'STARTED',
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const sagaStepsTableSQL = `
            CREATE TABLE IF NOT EXISTS saga_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                saga_id TEXT NOT NULL,
                step_name TEXT NOT NULL,
                status TEXT NOT NULL,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (saga_id) REFERENCES sagas (id)
            )
        `;

        this.db.serialize(() => {
            this.db.run(sagaTableSQL, (err) => {
                if (err) {
                    logger.error('Failed to create sagas table', { error: err.message });
                } else {
                    logger.info('Sagas table ready');
                }
            });

            this.db.run(sagaStepsTableSQL, (err) => {
                if (err) {
                    logger.error('Failed to create saga_steps table', { error: err.message });
                } else {
                    logger.info('Saga steps table ready');
                }
            });
        });
    }

    async createSaga(sagaId, type, data) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO sagas (id, type, status, data)
                VALUES (?, ?, 'STARTED', ?)
            `;
            
            this.db.run(sql, [sagaId, type, JSON.stringify(data)], function(err) {
                if (err) {
                    logger.error('Failed to create saga', { sagaId, error: err.message });
                    reject(err);
                } else {
                    logger.info('Saga created', { sagaId, type });
                    resolve({ sagaId });
                }
            });
        });
    }

    async updateSagaStatus(sagaId, status) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE sagas 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            this.db.run(sql, [status, sagaId], function(err) {
                if (err) {
                    logger.error('Failed to update saga status', { sagaId, status, error: err.message });
                    reject(err);
                } else {
                    logger.info('Saga status updated', { sagaId, status });
                    resolve({ sagaId, status });
                }
            });
        });
    }

    async addSagaStep(sagaId, stepName, status, data = null) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO saga_steps (saga_id, step_name, status, data)
                VALUES (?, ?, ?, ?)
            `;
            
            this.db.run(sql, [sagaId, stepName, status, data ? JSON.stringify(data) : null], function(err) {
                if (err) {
                    logger.error('Failed to add saga step', { sagaId, stepName, status, error: err.message });
                    reject(err);
                } else {
                    logger.debug('Saga step added', { sagaId, stepName, status });
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    async getSaga(sagaId) {
        return new Promise((resolve, reject) => {
            const sagaSQL = `SELECT * FROM sagas WHERE id = ?`;
            const stepsSQL = `SELECT * FROM saga_steps WHERE saga_id = ? ORDER BY created_at`;
            
            this.db.get(sagaSQL, [sagaId], (err, saga) => {
                if (err) {
                    logger.error('Failed to get saga', { sagaId, error: err.message });
                    reject(err);
                    return;
                }
                
                if (!saga) {
                    resolve(null);
                    return;
                }
                
                this.db.all(stepsSQL, [sagaId], (err, steps) => {
                    if (err) {
                        logger.error('Failed to get saga steps', { sagaId, error: err.message });
                        reject(err);
                        return;
                    }
                    
                    saga.data = saga.data ? JSON.parse(saga.data) : null;
                    saga.steps = steps.map(step => ({
                        ...step,
                        data: step.data ? JSON.parse(step.data) : null
                    }));
                    
                    resolve(saga);
                });
            });
        });
    }

    async listSagas(limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT id, type, status, created_at, updated_at
                FROM sagas 
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            
            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    logger.error('Failed to list sagas', { error: err.message });
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getSagaStatistics() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    status,
                    COUNT(*) as count
                FROM sagas 
                GROUP BY status
            `;
            
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    logger.error('Failed to get saga statistics', { error: err.message });
                    reject(err);
                } else {
                    const stats = {};
                    rows.forEach(row => {
                        stats[row.status] = row.count;
                    });
                    resolve(stats);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    logger.error('Error closing database', { error: err.message });
                } else {
                    logger.info('Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;
