/**
 * @fileoverview Serveur principal Panier Service
 * @description Microservice de gestion du panier d'achat avec architecture DDD
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import des couches DDD
const PanierApplicationService = require('./src/application/PanierApplicationService');
const SequelizePanierRepository = require('./src/infrastructure/SequelizePanierRepository');
const { sequelize } = require('./src/infrastructure/database');
const createPanierRoutes = require('./src/api/routes');

// Import des métriques
const { promClient, register, httpRequestsTotal, httpRequestDuration } = require('./src/utils/metrics');

const app = express();
const PORT = process.env.PORT || 3006;
const INSTANCE_ID = process.env.INSTANCE_ID || 'panier-instance-default';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Panier Service Default';

// Variables globales
let panierApplicationService;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Headers d'instance
app.use((req, res, next) => {
    res.setHeader('X-Instance-ID', INSTANCE_ID);
    res.setHeader('X-Instance-Name', INSTANCE_NAME);
    next();
});

// Middleware métriques
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        
        httpRequestsTotal.inc({
            method: req.method,
            route: route,
            status: res.statusCode
        });
        
        httpRequestDuration.observe({
            method: req.method,
            route: route,
            status: res.statusCode
        }, duration);
    });
    
    next();
});

// Initialisation base de données
async function initializeDatabase() {
    try {
        console.log('🔗 Connexion à la base de données PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Connexion PostgreSQL établie.');
        
        await sequelize.sync({ alter: true });
        console.log('✅ Modèles synchronisés avec la base de données.');
        
        const panierRepository = new SequelizePanierRepository();
        panierApplicationService = new PanierApplicationService(panierRepository);
        
        await seedDatabase();
        console.log('✅ Service d\'application Panier initialisé.');
        
    } catch (error) {
        console.error('❌ Erreur base de données:', error.message);
        console.log('⚠️  Mode dégradé activé...');
        initMockService();
    }
}

// Données de test
async function seedDatabase() {
    try {
        const count = await sequelize.models.Panier.count();
        if (count === 0) {
            console.log('📝 Insertion de données de test...');
            
            // Créer quelques paniers de test
            await panierApplicationService.ajouterArticle(1, 1, 2); // Client 1, Produit 1, Qté 2
            await panierApplicationService.ajouterArticle(1, 2, 1); // Client 1, Produit 2, Qté 1
            await panierApplicationService.ajouterArticle(2, 1, 3); // Client 2, Produit 1, Qté 3
            
            console.log('✅ Données de test insérées.');
        }
    } catch (error) {
        console.error('⚠️  Erreur insertion données test:', error.message);
    }
}

// Mode dégradé
function initMockService() {
    const mockData = [
        {
            id: 1,
            clientId: 1,
            articles: [
                { produitId: 1, quantite: 2, prix: 10.99, nom: 'Produit Test 1' }
            ],
            total: 21.98,
            nombreArticles: 2,
            statut: 'ACTIF'
        }
    ];
    
    panierApplicationService = {
        listerPaniers: async () => ({
            success: true,
            data: mockData,
            count: mockData.length,
            message: 'Paniers récupérés (mode dégradé)'
        })
    };
    
    console.log('✅ Service panier en mode dégradé initialisé.');
}

// Configuration routes
function setupRoutes() {
    const apiRoutes = createPanierRoutes(panierApplicationService);
    app.use('/api/paniers', apiRoutes);
    console.log('✅ Routes API configurées');
}

// Route métriques
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

// Route de santé
app.get('/health', async (req, res) => {
    res.json({
        service: 'panier-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        instanceId: INSTANCE_ID,
        instanceName: INSTANCE_NAME,
        database: panierApplicationService ? 'connected' : 'memory',
        uptime: process.uptime()
    });
});

// Gestion d'arrêt propre
process.on('SIGTERM', async () => {
    console.log('⏹️  Signal SIGTERM reçu, arrêt du service...');
    if (sequelize) {
        await sequelize.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('⏹️  Signal SIGINT reçu, arrêt du service...');
    if (sequelize) {
        await sequelize.close();
    }
    process.exit(0);
});

// Démarrage serveur
async function startServer() {
    try {
        await initializeDatabase();
        setupRoutes();
        
        app.listen(PORT, () => {
            console.log(`🚀 Panier Service démarré:`);
            console.log(`   📡 Port: ${PORT}`);
            console.log(`   🏷️  Instance: ${INSTANCE_NAME} (${INSTANCE_ID})`);
            console.log(`   🔗 Health: http://localhost:${PORT}/health`);
            console.log(`   📊 Metrics: http://localhost:${PORT}/metrics`);
            console.log(`   🛒 API: http://localhost:${PORT}/api/paniers`);
        });
    } catch (error) {
        console.error('💥 Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

startServer();
