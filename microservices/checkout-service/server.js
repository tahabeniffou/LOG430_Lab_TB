/**
 * @fileoverview Serveur principal Checkout Service
 * @description Microservice de validation et gestion des commandes avec architecture DDD
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import des couches DDD
const CheckoutApplicationService = require('./src/application/CheckoutApplicationService');
const SequelizeCommandeRepository = require('./src/infrastructure/SequelizeCommandeRepository');
const { sequelize } = require('./src/infrastructure/database');
const createCheckoutRoutes = require('./src/api/routes');

// Import des métriques
const { promClient, register, httpRequestsTotal, httpRequestDuration } = require('./src/utils/metrics');

const app = express();
const PORT = process.env.PORT || 3007;
const INSTANCE_ID = process.env.INSTANCE_ID || 'checkout-instance-default';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Checkout Service Default';

// Variables globales
let checkoutApplicationService;

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
        
        const commandeRepository = new SequelizeCommandeRepository();
        checkoutApplicationService = new CheckoutApplicationService(commandeRepository);
        
        await seedDatabase();
        console.log('✅ Service d\'application Checkout initialisé.');
        
    } catch (error) {
        console.error('❌ Erreur base de données:', error.message);
        console.log('⚠️  Mode dégradé activé...');
        initMockService();
    }
}

// Données de test
async function seedDatabase() {
    try {
        const count = await sequelize.models.Commande.count();
        if (count === 0) {
            console.log('📝 Insertion de données de test...');
            
            // Simuler quelques commandes de test
            const commande1 = await checkoutApplicationService.validerCommande(1, {
                adresseLivraison: '123 Rue Test, Montréal, QC H1A 1A1',
                methodePaiement: 'CARTE'
            });

            const commande2 = await checkoutApplicationService.validerCommande(2, {
                adresseLivraison: '456 Avenue Exemple, Québec, QC G1A 1A1',
                methodePaiement: 'PAYPAL'
            });
            
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
            numeroCommande: 'CMD-TEST-001',
            clientId: 1,
            articles: [
                { produitId: 1, nom: 'Produit Test', quantite: 2, prix: 10.99 }
            ],
            total: 25.27,
            statut: 'LIVREE',
            dateCreation: new Date()
        }
    ];
    
    checkoutApplicationService = {
        listerToutesCommandes: async () => ({
            success: true,
            data: mockData,
            count: mockData.length,
            message: 'Commandes récupérées (mode dégradé)'
        })
    };
    
    console.log('✅ Service checkout en mode dégradé initialisé.');
}

// Configuration routes
function setupRoutes() {
    const apiRoutes = createCheckoutRoutes(checkoutApplicationService);
    app.use('/api/checkout', apiRoutes);
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
        service: 'checkout-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        instanceId: INSTANCE_ID,
        instanceName: INSTANCE_NAME,
        database: checkoutApplicationService ? 'connected' : 'memory',
        uptime: process.uptime(),
        externalServices: {
            panierService: process.env.PANIER_SERVICE_URL || 'http://localhost:8000/api/paniers',
            stockService: process.env.STOCK_SERVICE_URL || 'http://localhost:8000/api/stocks',
            venteService: process.env.VENTE_SERVICE_URL || 'http://localhost:8000/api/ventes'
        }
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
            console.log(`🚀 Checkout Service démarré:`);
            console.log(`   📡 Port: ${PORT}`);
            console.log(`   🏷️  Instance: ${INSTANCE_NAME} (${INSTANCE_ID})`);
            console.log(`   🔗 Health: http://localhost:${PORT}/health`);
            console.log(`   📊 Metrics: http://localhost:${PORT}/metrics`);
            console.log(`   💳 API: http://localhost:${PORT}/api/checkout`);
        });
    } catch (error) {
        console.error('💥 Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

startServer();
