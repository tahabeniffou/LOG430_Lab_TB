const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const promClient = require('prom-client');
const winston = require('winston');

// Configuration Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Configuration Winston pour logs structurés
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, sagaId, step, status, duration, ...meta }) => {
            const logEntry = {
                timestamp,
                level,
                message,
                ...(sagaId && { sagaId }),
                ...(step && { step }),
                ...(status && { status }),
                ...(duration && { duration }),
                ...meta
            };
            return JSON.stringify(logEntry);
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ timestamp, level, message, sagaId, step, status, duration }) => {
                    let logLine = `${timestamp} [${level}] ${message}`;
                    if (sagaId) logLine += ` | Saga: ${sagaId}`;
                    if (step) logLine += ` | Step: ${step}`;
                    if (status) logLine += ` | Status: ${status}`;
                    if (duration) logLine += ` | Duration: ${duration}ms`;
                    return logLine;
                })
            )
        }),
        new winston.transports.File({ 
            filename: 'logs/saga-orchestrator.log',
            format: winston.format.json()
        })
    ]
});

// Métriques Prometheus détaillées pour Saga Orchestrator
const sagaCounter = new promClient.Counter({
    name: 'saga_total',
    help: 'Total number of sagas executed',
    labelNames: ['status', 'type'],
    registers: [register]
});

const sagaDuration = new promClient.Histogram({
    name: 'saga_duration_seconds',
    help: 'Duration of saga execution in seconds',
    labelNames: ['status', 'type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [register]
});

const sagaStepDuration = new promClient.Histogram({
    name: 'saga_step_duration_seconds',
    help: 'Duration of individual saga steps in seconds',
    labelNames: ['step_name', 'status'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register]
});

const sagaStepCounter = new promClient.Counter({
    name: 'saga_step_total',
    help: 'Total number of saga steps executed',
    labelNames: ['step_name', 'status'],
    registers: [register]
});

const activeTransactionsGauge = new promClient.Gauge({
    name: 'saga_active_transactions',
    help: 'Number of currently active transactions',
    registers: [register]
});

const compensationCounter = new promClient.Counter({
    name: 'saga_compensations_total',
    help: 'Total number of compensations executed',
    labelNames: ['reason'],
    registers: [register]
});

const throughputGauge = new promClient.Gauge({
    name: 'saga_throughput_per_minute',
    help: 'Number of sagas processed per minute',
    registers: [register]
});

const businessEventCounter = new promClient.Counter({
    name: 'saga_business_events_total',
    help: 'Total number of business events generated',
    labelNames: ['event_type', 'service'],
    registers: [register]
});

const errorCounter = new promClient.Counter({
    name: 'saga_errors_total',
    help: 'Total number of errors by type',
    labelNames: ['error_type', 'step'],
    registers: [register]
});

const stateTransitionCounter = new promClient.Counter({
    name: 'saga_state_transitions_total',
    help: 'Total number of state transitions',
    labelNames: ['from_state', 'to_state'],
    registers: [register]
});

// Configuration
const SAGA_PORT = 8010;
const app = express();
app.use(express.json());

// Base de données SQLite
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run(`        CREATE TABLE IF NOT EXISTS sagas (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        total_amount REAL,
        article_id TEXT,
        quantity INTEGER,
        compte_id TEXT,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        duration_ms INTEGER,
        error_reason TEXT,
        compensation_reason TEXT,
        business_context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS saga_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saga_id TEXT,
        step_name TEXT,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration_ms INTEGER,
        error_message TEXT,
        business_data TEXT,
        FOREIGN KEY(saga_id) REFERENCES sagas(id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS business_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saga_id TEXT,
        event_type TEXT,
        service_name TEXT,
        event_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(saga_id) REFERENCES sagas(id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS state_transitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saga_id TEXT,
        from_state TEXT,
        to_state TEXT,
        transition_reason TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(saga_id) REFERENCES sagas(id)
    )`);
});

// Simuler les services avec latence variable et événements métiers
const stockService = {
    reserve: async (articleId, quantity) => {
        const latency = Math.random() * 200 + 50; // 50-250ms
        await new Promise(resolve => setTimeout(resolve, latency));
        
        // Simuler des échecs occasionnels (5%)
        if (Math.random() < 0.05) {
            const error = new Error('Stock insuffisant');
            error.type = 'BUSINESS_ERROR';
            throw error;
        }
        
        logger.info('Stock reservation successful', {
            service: 'stock-service',
            operation: 'reserve',
            articleId,
            quantity,
            duration: latency.toFixed(0)
        });
        
        businessEventCounter.inc({ event_type: 'stock_reserved', service: 'stock' });
        
        return { success: true, message: "Stock réservé", latency, articleId, quantity };
    },
    
    release: async (articleId, quantity) => {
        const latency = Math.random() * 100 + 25;
        await new Promise(resolve => setTimeout(resolve, latency));
        
        logger.info('Stock release successful', {
            service: 'stock-service',
            operation: 'release',
            articleId,
            quantity
        });
        
        businessEventCounter.inc({ event_type: 'stock_released', service: 'stock' });
        
        return { success: true, message: "Stock libéré" };
    }
};

const paymentService = {
    debit: async (compteId, amount) => {
        const latency = Math.random() * 300 + 100; // 100-400ms
        await new Promise(resolve => setTimeout(resolve, latency));
        
        // Simuler des échecs occasionnels (3%)
        if (Math.random() < 0.03) {
            const error = new Error('Fonds insuffisants');
            error.type = 'BUSINESS_ERROR';
            throw error;
        }
        
        logger.info('Payment debit successful', {
            service: 'payment-service',
            operation: 'debit',
            compteId,
            amount,
            duration: latency.toFixed(0)
        });
        
        businessEventCounter.inc({ event_type: 'payment_debited', service: 'payment' });
        
        return { success: true, message: "Paiement effectué", latency, compteId, amount };
    },
    
    credit: async (compteId, amount) => {
        const latency = Math.random() * 150 + 50;
        await new Promise(resolve => setTimeout(resolve, latency));
        
        logger.info('Payment credit successful', {
            service: 'payment-service',
            operation: 'credit',
            compteId,
            amount
        });
        
        businessEventCounter.inc({ event_type: 'payment_credited', service: 'payment' });
        
        return { success: true, message: "Remboursement effectué" };
    }
};

const saleService = {
    create: async (articleId, quantity, amount) => {
        const latency = Math.random() * 250 + 75; // 75-325ms
        await new Promise(resolve => setTimeout(resolve, latency));
        
        // Simuler des échecs occasionnels (2%)
        if (Math.random() < 0.02) {
            const error = new Error('Erreur système vente');
            error.type = 'SYSTEM_ERROR';
            throw error;
        }
        
        const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        logger.info('Sale creation successful', {
            service: 'sale-service',
            operation: 'create',
            saleId,
            articleId,
            quantity,
            amount,
            duration: latency.toFixed(0)
        });
        
        businessEventCounter.inc({ event_type: 'sale_created', service: 'sale' });
        
        return { success: true, saleId, latency, articleId, quantity, amount };
    },
    
    cancel: async (saleId) => {
        const latency = Math.random() * 100 + 25;
        await new Promise(resolve => setTimeout(resolve, latency));
        
        logger.info('Sale cancellation successful', {
            service: 'sale-service',
            operation: 'cancel',
            saleId
        });
        
        businessEventCounter.inc({ event_type: 'sale_cancelled', service: 'sale' });
        
        return { success: true, message: "Vente annulée" };
    }
};

// Classe Saga Orchestrator avec observabilité complète
class SagaOrchestrator {
    constructor() {
        this.activeTransactions = 0;
        this.sagaTimestamps = [];
        
        // Mise à jour du throughput toutes les 10 secondes
        setInterval(() => {
            this.updateThroughput();
        }, 10000);
    }
    
    updateThroughput() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Filtrer les sagas de la dernière minute
        this.sagaTimestamps = this.sagaTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
        
        throughputGauge.set(this.sagaTimestamps.length);
    }

    async logBusinessEvent(sagaId, eventType, serviceName, eventData) {
        const dataStr = JSON.stringify(eventData);
        
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`INSERT INTO business_events (saga_id, event_type, service_name, event_data) VALUES (?, ?, ?, ?)`);
            stmt.run([sagaId, eventType, serviceName, dataStr], (err) => err ? reject(err) : resolve());
            stmt.finalize();
        });
    }

    async logStateTransition(sagaId, fromState, toState, reason) {
        stateTransitionCounter.inc({ from_state: fromState, to_state: toState });
        
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`INSERT INTO state_transitions (saga_id, from_state, to_state, transition_reason) VALUES (?, ?, ?, ?)`);
            stmt.run([sagaId, fromState, toState, reason], (err) => err ? reject(err) : resolve());
            stmt.finalize();
        });
    }

    async executeSaga(sagaData) {
        const sagaId = `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const { articleId, quantity, compteId, totalAmount } = sagaData;
        
        const startTime = Date.now();
        this.activeTransactions++;
        activeTransactionsGauge.set(this.activeTransactions);
        
        // Log structuré du début de saga
        logger.info('Saga orchestration started', {
            sagaId,
            articleId,
            quantity,
            compteId,
            totalAmount,
            status: 'STARTING'
        });
        
        await this.logStateTransition(sagaId, 'INITIAL', 'PENDING', 'Saga initialization');
        await this.logBusinessEvent(sagaId, 'saga_started', 'orchestrator', { articleId, quantity, compteId, totalAmount });

        // Timer pour mesurer la durée
        const timer = sagaDuration.startTimer({ type: 'transaction' });
        
        // Enregistrer la saga
        await this.saveSaga(sagaId, sagaData, startTime);
        
        try {
            // Étape 1: Réserver le stock
            logger.info('Starting stock reservation step', { sagaId, step: 'STOCK_RESERVE' });
            const stockResult = await this.executeStep(sagaId, 'STOCK_RESERVE', async () => {
                return await stockService.reserve(articleId, quantity);
            });
            await this.logBusinessEvent(sagaId, 'stock_reserved', 'stock-service', stockResult);
            await this.logStateTransition(sagaId, 'PENDING', 'STOCK_RESERVED', 'Stock successfully reserved');

            // Étape 2: Effectuer le paiement
            logger.info('Starting payment debit step', { sagaId, step: 'PAYMENT_DEBIT' });
            const paymentResult = await this.executeStep(sagaId, 'PAYMENT_DEBIT', async () => {
                return await paymentService.debit(compteId, totalAmount);
            });
            await this.logBusinessEvent(sagaId, 'payment_debited', 'payment-service', paymentResult);
            await this.logStateTransition(sagaId, 'STOCK_RESERVED', 'PAYMENT_COMPLETED', 'Payment successfully processed');

            // Étape 3: Créer la vente
            logger.info('Starting sale creation step', { sagaId, step: 'SALE_CREATE' });
            const saleResult = await this.executeStep(sagaId, 'SALE_CREATE', async () => {
                return await saleService.create(articleId, quantity, totalAmount);
            });
            await this.logBusinessEvent(sagaId, 'sale_created', 'sale-service', saleResult);
            await this.logStateTransition(sagaId, 'PAYMENT_COMPLETED', 'COMPLETED', 'Sale successfully created');

            // Saga réussie
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            await this.updateSagaStatus(sagaId, 'COMPLETED', endTime, duration);
            
            // Métriques
            sagaCounter.inc({ status: 'completed', type: 'transaction' });
            timer({ status: 'completed' });
            this.sagaTimestamps.push(endTime);
            
            this.activeTransactions--;
            activeTransactionsGauge.set(this.activeTransactions);
            
            logger.info('Saga orchestration completed successfully', {
                sagaId,
                status: 'COMPLETED',
                duration,
                saleId: saleResult.saleId
            });
            
            return { success: true, sagaId, message: 'Saga complétée', duration, saleId: saleResult.saleId };

        } catch (error) {
            logger.error('Saga orchestration failed', {
                sagaId,
                error: error.message,
                errorType: error.type || 'UNKNOWN_ERROR',
                status: 'FAILED'
            });
            
            errorCounter.inc({ error_type: error.type || 'unknown', step: error.step || 'unknown' });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            await this.compensate(sagaId, sagaData, error.message);
            await this.updateSagaStatus(sagaId, 'COMPENSATED', endTime, duration, error.message);
            await this.logStateTransition(sagaId, 'FAILED', 'COMPENSATED', `Error: ${error.message}`);
            
            // Métriques
            sagaCounter.inc({ status: 'failed', type: 'transaction' });
            timer({ status: 'failed' });
            compensationCounter.inc({ reason: error.type || 'unknown' });
            
            this.activeTransactions--;
            activeTransactionsGauge.set(this.activeTransactions);
            
            return { success: false, sagaId, error: error.message, duration };
        }
    }
    
    async executeStep(sagaId, stepName, stepFunction) {
        const stepStartTime = Date.now();
        await this.logStep(sagaId, stepName, 'PENDING');
        
        const stepTimer = sagaStepDuration.startTimer({ step_name: stepName.toLowerCase() });
        
        try {
            const result = await stepFunction();
            const stepDuration = Date.now() - stepStartTime;
            
            await this.logStep(sagaId, stepName, 'COMPLETED', stepDuration);
            sagaStepCounter.inc({ step_name: stepName.toLowerCase(), status: 'completed' });
            stepTimer({ status: 'completed' });
            
            logger.info('Saga step completed', {
                sagaId,
                step: stepName,
                status: 'COMPLETED',
                duration: stepDuration
            });
            
            return result;
        } catch (error) {
            const stepDuration = Date.now() - stepStartTime;
            
            await this.logStep(sagaId, stepName, 'FAILED', stepDuration, error.message);
            sagaStepCounter.inc({ step_name: stepName.toLowerCase(), status: 'failed' });
            stepTimer({ status: 'failed' });
            
            logger.error('Saga step failed', {
                sagaId,
                step: stepName,
                status: 'FAILED',
                duration: stepDuration,
                error: error.message
            });
            
            error.step = stepName;
            throw error;
        }
    }

    async compensate(sagaId, sagaData, errorReason) {
        logger.warn('Starting saga compensation', {
            sagaId,
            reason: errorReason,
            status: 'COMPENSATING'
        });
        
        await this.logBusinessEvent(sagaId, 'compensation_started', 'orchestrator', { reason: errorReason });
        
        // Compensation en ordre inverse
        try {
            if (sagaData.saleId) {
                await saleService.cancel(sagaData.saleId);
                await this.logBusinessEvent(sagaId, 'sale_cancelled', 'sale-service', { saleId: sagaData.saleId });
            }
            await paymentService.credit(sagaData.compteId, sagaData.totalAmount);
            await this.logBusinessEvent(sagaId, 'payment_credited', 'payment-service', { compteId: sagaData.compteId, amount: sagaData.totalAmount });
            
            await stockService.release(sagaData.articleId, sagaData.quantity);
            await this.logBusinessEvent(sagaId, 'stock_released', 'stock-service', { articleId: sagaData.articleId, quantity: sagaData.quantity });
            
        } catch (compensationError) {
            logger.error('Compensation error occurred', {
                sagaId,
                compensationError: compensationError.message,
                originalError: errorReason
            });
        }
        
        await this.logBusinessEvent(sagaId, 'compensation_completed', 'orchestrator', { originalError: errorReason });
        
        logger.warn('Saga compensation completed', {
            sagaId,
            status: 'COMPENSATED'
        });
    }

    async saveSaga(sagaId, data, startTime) {
        const businessContext = JSON.stringify({
            transaction_type: 'sale',
            channel: 'api',
            timestamp: startTime
        });
        
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`INSERT INTO sagas (id, status, total_amount, article_id, quantity, compte_id, start_time, business_context) 
                                   VALUES (?, ?, ?, ?, ?, ?, datetime(?, 'unixepoch', 'localtime'), ?)`);
            stmt.run([sagaId, 'PENDING', data.totalAmount, data.articleId, data.quantity, data.compteId, startTime/1000, businessContext], 
                    (err) => err ? reject(err) : resolve());
            stmt.finalize();
        });
    }

    async logStep(sagaId, stepName, status, duration = null, errorMessage = null) {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`INSERT INTO saga_steps (saga_id, step_name, status, duration_ms, error_message) VALUES (?, ?, ?, ?, ?)`);
            stmt.run([sagaId, stepName, status, duration, errorMessage], (err) => err ? reject(err) : resolve());
            stmt.finalize();
        });
    }

    async updateSagaStatus(sagaId, status, endTime, duration, errorReason = null) {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`UPDATE sagas SET status = ?, end_time = datetime(?, 'unixepoch', 'localtime'), 
                                    duration_ms = ?, error_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
            stmt.run([status, endTime/1000, duration, errorReason, sagaId], (err) => err ? reject(err) : resolve());
            stmt.finalize();
        });
    }

    async getMetrics() {
        return new Promise((resolve, reject) => {
            db.all(`SELECT 
                COUNT(*) as total_sagas,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as successful_sagas,
                SUM(CASE WHEN status = 'COMPENSATED' THEN 1 ELSE 0 END) as failed_sagas,
                AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms ELSE NULL END) as avg_duration_ms,
                MIN(CASE WHEN duration_ms IS NOT NULL THEN duration_ms ELSE NULL END) as min_duration_ms,
                MAX(CASE WHEN duration_ms IS NOT NULL THEN duration_ms ELSE NULL END) as max_duration_ms
                FROM sagas`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const metrics = rows[0];
                    metrics.success_rate = metrics.total_sagas > 0 ? 
                        ((metrics.successful_sagas / metrics.total_sagas) * 100).toFixed(2) + '%' : '0%';
                    resolve(metrics);
                }
            });
        });
    }

    async getBusinessEvents(sagaId = null) {
        return new Promise((resolve, reject) => {
            const query = sagaId ? 
                'SELECT * FROM business_events WHERE saga_id = ? ORDER BY timestamp DESC LIMIT 50' :
                'SELECT * FROM business_events ORDER BY timestamp DESC LIMIT 100';
            const params = sagaId ? [sagaId] : [];
            
            db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getStateTransitions(sagaId = null) {
        return new Promise((resolve, reject) => {
            const query = sagaId ? 
                'SELECT * FROM state_transitions WHERE saga_id = ? ORDER BY timestamp DESC' :
                'SELECT * FROM state_transitions ORDER BY timestamp DESC LIMIT 100';
            const params = sagaId ? [sagaId] : [];
            
            db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

// Créer l'orchestrator
const orchestrator = new SagaOrchestrator();

// Routes API
app.post('/saga/start', async (req, res) => {
    try {
        const result = await orchestrator.executeSaga(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/saga/metrics', async (req, res) => {
    try {
        const metrics = await orchestrator.getMetrics();
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/saga/status', (req, res) => {
    db.all(`SELECT * FROM sagas ORDER BY created_at DESC LIMIT 20`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/saga/business-events', async (req, res) => {
    try {
        const sagaId = req.query.sagaId;
        const events = await orchestrator.getBusinessEvents(sagaId);
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/saga/state-transitions', async (req, res) => {
    try {
        const sagaId = req.query.sagaId;
        const transitions = await orchestrator.getStateTransitions(sagaId);
        res.json(transitions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/saga/steps/:sagaId', (req, res) => {
    const sagaId = req.params.sagaId;
    db.all(`SELECT * FROM saga_steps WHERE saga_id = ? ORDER BY timestamp ASC`, [sagaId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/saga/analytics', async (req, res) => {
    try {
        const [metrics, businessEvents, stateTransitions] = await Promise.all([
            orchestrator.getMetrics(),
            orchestrator.getBusinessEvents(),
            orchestrator.getStateTransitions()
        ]);
        
        res.json({
            metrics,
            recent_business_events: businessEvents.slice(0, 10),
            recent_state_transitions: stateTransitions.slice(0, 10),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Saga Orchestrator with Prometheus', 
        port: SAGA_PORT,
        timestamp: new Date().toISOString()
    });
});

// Endpoint pour les métriques Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
});

// Dashboard HTML avec métriques en temps réel
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Saga Orchestrator - Dashboard Lab 6</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .card { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
            .metric { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
            .metric-value { font-size: 2em; font-weight: bold; color: #4CAF50; }
            .button { background: linear-gradient(45deg, #4CAF50, #45a049); color: white; padding: 12px 24px; border: none; border-radius: 25px; cursor: pointer; margin: 5px; transition: all 0.3s; }
            .button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            .danger { background: linear-gradient(45deg, #f44336, #da190b); }
            .log { background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; font-family: 'Courier New', monospace; max-height: 400px; overflow-y: auto; }
            .form-group { margin: 15px 0; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, select { width: 100%; padding: 10px; border: none; border-radius: 8px; background: rgba(255,255,255,0.2); color: white; }
            input::placeholder { color: rgba(255,255,255,0.7); }
            .progress-bar { background: rgba(255,255,255,0.2); border-radius: 10px; overflow: hidden; height: 20px; margin: 10px 0; }
            .progress-fill { background: linear-gradient(45deg, #4CAF50, #45a049); height: 100%; transition: width 0.3s; }
            .chart-container { height: 200px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 10px 0; padding: 20px; }
            .emoji { font-size: 2em; margin-right: 10px; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Saga Orchestrator Dashboard - Lab 6 TB-POS</h1>
                <p>Monitoring en temps réel avec métriques Prometheus</p>
            </div>
            
            <div class="dashboard">
                <div class="card">
                    <h3>📊 Métriques en Temps Réel</h3>
                    <div id="metrics">
                        <div class="metric">
                            <span>Total Sagas</span>
                            <span id="totalSagas" class="metric-value">0</span>
                        </div>
                        <div class="metric">
                            <span>Succès</span>
                            <span id="successSagas" class="metric-value">0</span>
                        </div>
                        <div class="metric">
                            <span>Échecs</span>
                            <span id="failedSagas" class="metric-value" style="color: #f44336;">0</span>
                        </div>
                        <div class="metric">
                            <span>Taux de Succès</span>
                            <span id="successRate" class="metric-value">0%</span>
                        </div>
                        <div class="progress-bar">
                            <div id="successProgress" class="progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3>⚡ Performance</h3>
                    <div class="metric">
                        <span>Durée Moyenne</span>
                        <span id="avgDuration" class="metric-value">0ms</span>
                    </div>
                    <div class="metric">
                        <span>Durée Min</span>
                        <span id="minDuration" style="color: #4CAF50;">0ms</span>
                    </div>
                    <div class="metric">
                        <span>Durée Max</span>
                        <span id="maxDuration" style="color: #ff9800;">0ms</span>
                    </div>
                    <div class="chart-container">
                        <canvas id="performanceChart"></canvas>
                    </div>
                </div>

                <div class="card">
                    <h3>🧪 Test de Transaction</h3>
                    <div class="form-group">
                        <label>Article ID:</label>
                        <input type="text" id="articleId" value="LOAD_TEST_001" placeholder="ID de l'article" />
                    </div>
                    <div class="form-group">
                        <label>Quantité:</label>
                        <input type="number" id="quantity" value="1" placeholder="Quantité" />
                    </div>
                    <div class="form-group">
                        <label>Compte ID:</label>
                        <input type="text" id="compteId" value="LOAD_COMPTE_001" placeholder="ID du compte" />
                    </div>
                    <div class="form-group">
                        <label>Montant Total (€):</label>
                        <input type="number" step="0.01" id="totalAmount" value="50.00" placeholder="Montant" />
                    </div>
                    <button class="button" onclick="startSaga()">🚀 Saga Simple</button>
                    <button class="button" onclick="startLoadTest()">⚡ Test de Charge</button>
                    <button class="button danger" onclick="stressTest()">🔥 Test de Stress</button>
                </div>

                <div class="card">
                    <h3>📝 Journal des Opérations</h3>
                    <div class="log" id="log">
                        📋 Prêt pour les tests...<br>
                    </div>
                    <button class="button" onclick="clearLog()">🗑️ Effacer</button>
                    <button class="button" onclick="exportMetrics()">📊 Export Prometheus</button>
                </div>
            </div>
        </div>

        <script>
            let performanceChart;
            let performanceData = [];

            function initChart() {
                const ctx = document.getElementById('performanceChart').getContext('2d');
                performanceChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Durée (ms)',
                            data: [],
                            borderColor: '#4CAF50',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { labels: { color: 'white' } } },
                        scales: {
                            x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            y: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                        }
                    }
                });
            }

            function log(message) {
                const logDiv = document.getElementById('log');
                const timestamp = new Date().toLocaleTimeString();
                logDiv.innerHTML += timestamp + ' - ' + message + '<br>';
                logDiv.scrollTop = logDiv.scrollHeight;
            }

            function clearLog() {
                document.getElementById('log').innerHTML = '📋 Log effacé...<br>';
            }

            async function startSaga() {
                const data = {
                    articleId: document.getElementById('articleId').value,
                    quantity: parseInt(document.getElementById('quantity').value),
                    compteId: document.getElementById('compteId').value,
                    totalAmount: parseFloat(document.getElementById('totalAmount').value)
                };

                log('🚀 Démarrage saga simple...');
                
                try {
                    const response = await fetch('/saga/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        log('✅ Saga ' + result.sagaId + ' complétée! (' + result.duration + 'ms)');
                        updatePerformanceChart(result.duration);
                    } else {
                        log('❌ Saga ' + result.sagaId + ' échouée: ' + result.error);
                    }
                    
                    loadMetrics();
                } catch (error) {
                    log('❌ Erreur: ' + error.message);
                }
            }

            async function startLoadTest() {
                log('⚡ Démarrage test de charge (10 sagas en parallèle)...');
                
                const promises = [];
                const startTime = Date.now();
                
                for (let i = 0; i < 10; i++) {
                    const data = {
                        articleId: 'LOAD_' + (i + 1).toString().padStart(3, '0'),
                        quantity: Math.floor(Math.random() * 5) + 1,
                        compteId: 'LOAD_COMPTE_' + (i + 1).toString().padStart(3, '0'),
                        totalAmount: (Math.random() * 200 + 50).toFixed(2)
                    };
                    
                    promises.push(fetch('/saga/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    }).then(r => r.json()));
                }
                
                try {
                    const results = await Promise.all(promises);
                    const endTime = Date.now();
                    const totalTime = endTime - startTime;
                    
                    const successful = results.filter(r => r.success).length;
                    const failed = results.filter(r => !r.success).length;
                    
                    log('⚡ Test de charge terminé en ' + totalTime + 'ms');
                    log('✅ Réussies: ' + successful + ', ❌ Échouées: ' + failed);
                    log('📊 Throughput: ' + (10000 / totalTime * 1000).toFixed(2) + ' sagas/sec');
                    
                    loadMetrics();
                } catch (error) {
                    log('❌ Erreur test de charge: ' + error.message);
                }
            }

            async function stressTest() {
                log('🔥 Démarrage test de stress (50 sagas en rafales)...');
                
                let completed = 0;
                const total = 50;
                const batchSize = 5;
                
                for (let batch = 0; batch < total / batchSize; batch++) {
                    const promises = [];
                    
                    for (let i = 0; i < batchSize; i++) {
                        const data = {
                            articleId: 'STRESS_' + (batch * batchSize + i + 1).toString().padStart(3, '0'),
                            quantity: Math.floor(Math.random() * 10) + 1,
                            compteId: 'STRESS_COMPTE_' + (batch * batchSize + i + 1).toString().padStart(3, '0'),
                            totalAmount: (Math.random() * 500 + 100).toFixed(2)
                        };
                        
                        promises.push(fetch('/saga/start', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        }).then(r => r.json()));
                    }
                    
                    await Promise.all(promises);
                    completed += batchSize;
                    log('🔥 Batch ' + (batch + 1) + '/10 terminé (' + completed + '/' + total + ')');
                    
                    // Petite pause entre les batches
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                log('🔥 Test de stress terminé!');
                loadMetrics();
            }

            async function loadMetrics() {
                try {
                    const response = await fetch('/saga/metrics');
                    const metrics = await response.json();
                    
                    document.getElementById('totalSagas').textContent = metrics.total_sagas || 0;
                    document.getElementById('successSagas').textContent = metrics.successful_sagas || 0;
                    document.getElementById('failedSagas').textContent = metrics.failed_sagas || 0;
                    document.getElementById('successRate').textContent = metrics.success_rate || '0%';
                    document.getElementById('avgDuration').textContent = metrics.avg_duration_ms ? Math.round(metrics.avg_duration_ms) + 'ms' : '0ms';
                    document.getElementById('minDuration').textContent = metrics.min_duration_ms ? Math.round(metrics.min_duration_ms) + 'ms' : '0ms';
                    document.getElementById('maxDuration').textContent = metrics.max_duration_ms ? Math.round(metrics.max_duration_ms) + 'ms' : '0ms';
                    
                    const successPercentage = metrics.total_sagas > 0 ? (metrics.successful_sagas / metrics.total_sagas) * 100 : 0;
                    document.getElementById('successProgress').style.width = successPercentage + '%';
                    
                } catch (error) {
                    log('❌ Erreur chargement métriques: ' + error.message);
                }
            }

            function updatePerformanceChart(duration) {
                const now = new Date().toLocaleTimeString();
                performanceData.push({ time: now, duration: duration });
                
                if (performanceData.length > 20) {
                    performanceData.shift();
                }
                
                performanceChart.data.labels = performanceData.map(d => d.time);
                performanceChart.data.datasets[0].data = performanceData.map(d => d.duration);
                performanceChart.update();
            }

            async function exportMetrics() {
                try {
                    const response = await fetch('/metrics');
                    const metricsText = await response.text();
                    
                    const blob = new Blob([metricsText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'saga-metrics-' + new Date().toISOString().slice(0,19) + '.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    log('📊 Métriques Prometheus exportées');
                } catch (error) {
                    log('❌ Erreur export: ' + error.message);
                }
            }

            // Initialisation
            initChart();
            loadMetrics();
            
            // Auto-refresh des métriques toutes les 5 secondes
            setInterval(loadMetrics, 5000);
        </script>
    </body>
    </html>
    `);
});

// Démarrer le serveur
const server = app.listen(SAGA_PORT, () => {
    console.log('🚀=====================================🚀');
    console.log('  SAGA ORCHESTRATOR avec PROMETHEUS');
    console.log('🚀=====================================🚀');
    console.log(`📡 Serveur démarré sur le port ${SAGA_PORT}`);
    console.log(`🌐 Dashboard: http://localhost:${SAGA_PORT}`);
    console.log(`📊 Métriques Prometheus: http://localhost:${SAGA_PORT}/metrics`);
    console.log(`💚 Health check: http://localhost:${SAGA_PORT}/health`);
    console.log('🚀=====================================🚀\n');
});

process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du serveur Saga Orchestrator...');
    server.close(() => {
        db.close();
        process.exit(0);
    });
});
