const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const promClient = require('prom-client');

const EventStore = require('./src/infrastructure/EventStore');
const MessageBroker = require('./src/infrastructure/MessageBroker');
const ReclamationService = require('./src/application/ReclamationService');

require('dotenv').config();

// Configuration du logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Métriques Prometheus
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const eventsPublishedTotal = new promClient.Counter({
    name: 'events_published_total',
    help: 'Total number of events published',
    labelNames: ['event_type']
});

const reclamationsTotal = new promClient.Counter({
    name: 'reclamations_total',
    help: 'Total number of reclamations',
    labelNames: ['status']
});

// Initialisation de l'application
const app = express();
const port = process.env.PORT || 8011;

// Variables globales pour les services
let eventStore, messageBroker, reclamationService;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de métriques
app.use((req, res, next) => {
    res.on('finish', () => {
        httpRequestsTotal.inc({
            method: req.method,
            route: req.route?.path || req.path,
            status_code: res.statusCode
        });
    });
    next();
});

// Initialisation des composants
async function initializeComponents() {
    try {
        logger.info('🚀 Initialisation des composants...');

        // Event Store avec la classe existante
        eventStore = new EventStore({
            connectionString: process.env.DATABASE_URL || process.env.EVENTSTORE_URL || 'postgresql://reclamation_user:reclamation_password@postgres-reclamation-saga:5432/reclamation_db',
            logger
        });
        await eventStore.connect();

        // Message Broker
        messageBroker = new MessageBroker(process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672/');
        await messageBroker.connect();

        // Service de réclamation
        reclamationService = new ReclamationService(eventStore, messageBroker);

        logger.info('✅ Tous les composants initialisés avec succès');
    } catch (error) {
        logger.error('❌ Erreur lors de l\'initialisation:', error);
        process.exit(1);
    }
}

// Routes de santé
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'reclamation-service',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.get('/ready', async (req, res) => {
    try {
        // Test simple de connexion
        const isHealthy = await eventStore.isHealthy();
        res.status(200).json({
            status: isHealthy ? 'ready' : 'not ready',
            components: {
                eventStore: isHealthy ? 'connected' : 'disconnected',
                messageBroker: 'connected'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message
        });
    }
});

// Route pour les métriques Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', promClient.register.contentType);
        res.end(await promClient.register.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
});

// Routes API Réclamations
app.get('/api/reclamations', async (req, res) => {
    try {
        const reclamations = await reclamationService.listerReclamations();
        res.json(reclamations);
    } catch (error) {
        logger.error('Erreur liste réclamations:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
});

app.post('/api/reclamations', async (req, res) => {
    try {
        const { titre, description, priorite = 'normale' } = req.body;
        
        if (!titre || !description) {
            return res.status(400).json({ error: 'Titre et description requis' });
        }

        const result = await reclamationService.creerReclamation({
            titre,
            description,
            priorite,
            clientId: req.body.clientId || 'client-test'
        });

        reclamationsTotal.inc({ status: 'created' });
        eventsPublishedTotal.inc({ event_type: 'ReclamationCreated' });

        res.status(201).json(result);
    } catch (error) {
        logger.error('Erreur création réclamation:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
});

app.get('/api/reclamations/:id', async (req, res) => {
    try {
        const reclamation = await reclamationService.obtenirReclamation(req.params.id);
        
        if (!reclamation) {
            return res.status(404).json({ error: 'Réclamation non trouvée' });
        }

        res.json(reclamation);
    } catch (error) {
        logger.error('Erreur récupération réclamation:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
});

app.put('/api/reclamations/:id/statut', async (req, res) => {
    try {
        const { statut } = req.body;
        
        if (!statut) {
            return res.status(400).json({ error: 'Statut requis' });
        }

        const result = await reclamationService.mettreAJourStatut(req.params.id, statut);
        
        reclamationsTotal.inc({ status: statut });
        eventsPublishedTotal.inc({ event_type: 'ReclamationStatusUpdated' });

        res.json(result);
    } catch (error) {
        logger.error('Erreur mise à jour statut:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
});

// Route pour obtenir les événements (pour les tests)
app.get('/api/events', async (req, res) => {
    try {
        // Utilise une méthode simple pour récupérer quelques événements récents
        const limit = parseInt(req.query.limit) || 10;
        // Pour l'instant, retourne un exemple
        const events = [
            {
                id: '1',
                eventType: 'ReclamationCreated',
                aggregateId: 'test-1',
                occurredAt: new Date(),
                eventData: { titre: 'Exemple événement' }
            }
        ];
        res.json(events);
    } catch (error) {
        logger.error('Erreur récupération événements:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
});

// Gestion des erreurs
app.use((error, req, res, next) => {
    logger.error('Erreur non gérée:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
    logger.info('🛑 Arrêt du service...');
    
    if (messageBroker) {
        await messageBroker.close();
    }
    
    if (eventStore) {
        await eventStore.disconnect();
    }
    
    process.exit(0);
});

// Démarrage du serveur
async function startServer() {
    await initializeComponents();
    
    app.listen(port, '0.0.0.0', () => {
        logger.info(`🎯 Service de réclamation démarré sur le port ${port}`);
        logger.info(`📊 Métriques disponibles sur http://localhost:${port}/metrics`);
        logger.info(`🏥 Health check sur http://localhost:${port}/health`);
    });
}

startServer().catch(error => {
    logger.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
});
