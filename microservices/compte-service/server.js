/**
 * @fileoverview Serveur principal Compte Service
 * @description Microservice de gestion des comptes clients avec architecture DDD
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import des couches DDD
const CompteApplicationService = require('./src/application/CompteApplicationService');
const SequelizeCompteRepository = require('./src/infrastructure/SequelizeCompteRepository');
const { sequelize } = require('./src/infrastructure/database');
const createCompteRoutes = require('./src/api/routes');

// Import des métriques
const { promClient, register, httpRequestsTotal, httpRequestDuration } = require('./src/utils/metrics');

const app = express();
const PORT = process.env.PORT || 3005;
const INSTANCE_ID = process.env.INSTANCE_ID || 'compte-instance-default';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Compte Service Default';

// Variables globales
let compteApplicationService;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware pour les headers d'instance
app.use((req, res, next) => {
    res.setHeader('X-Instance-ID', INSTANCE_ID);
    res.setHeader('X-Instance-Name', INSTANCE_NAME);
    next();
});

// Middleware pour les métriques
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

// Initialisation de la base de données
async function initializeDatabase() {
    try {
        console.log('🔗 Connexion à la base de données PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Connexion PostgreSQL établie.');
        
        // Synchronisation des modèles
        await sequelize.sync({ alter: true });
        console.log('✅ Modèles synchronisés avec la base de données.');
        
        // Initialisation du repository et service d'application
        const compteRepository = new SequelizeCompteRepository();
        compteApplicationService = new CompteApplicationService(compteRepository);
        
        // Données de test si la base est vide
        await seedDatabase();
        
        console.log('✅ Service d\'application Compte initialisé.');
        
    } catch (error) {
        console.error('❌ Erreur base de données:', error.message);
        console.log('⚠️  Mode dégradé activé - données en mémoire...');
        initMockService();
    }
}

// Données de test
async function seedDatabase() {
    try {
        const count = await sequelize.models.Compte.count();
        if (count === 0) {
            console.log('📝 Insertion de données de test...');
            
            const comptesTest = [
                {
                    email: 'admin@pos.com',
                    motDePasse: 'admin123',
                    nom: 'Admin',
                    prenom: 'Système',
                    typeCompte: 'ADMIN',
                    statut: 'ACTIF'
                },
                {
                    email: 'jean.dupont@email.com',
                    motDePasse: 'password123',
                    nom: 'Dupont',
                    prenom: 'Jean',
                    telephone: '514-123-4567',
                    adresse: '123 Rue Principale, Montréal',
                    typeCompte: 'CLIENT',
                    statut: 'ACTIF'
                },
                {
                    email: 'marie.martin@email.com',
                    motDePasse: 'password123',
                    nom: 'Martin',
                    prenom: 'Marie',
                    telephone: '514-987-6543',
                    typeCompte: 'CLIENT',
                    statut: 'ACTIF'
                }
            ];

            for (const donnees of comptesTest) {
                await compteApplicationService.creerCompte(donnees);
            }
            
            console.log('✅ Données de test insérées.');
        }
    } catch (error) {
        console.error('⚠️  Erreur insertion données test:', error.message);
    }
}

// Mode dégradé avec données mémoire
function initMockService() {
    // Implémentation basique en mémoire pour mode dégradé
    const mockData = [
        {
            id: 1,
            email: 'admin@pos.com',
            nom: 'Admin',
            prenom: 'Système',
            typeCompte: 'ADMIN',
            statut: 'ACTIF',
            dateCreation: new Date()
        },
        {
            id: 2,
            email: 'test@client.com',
            nom: 'Test',
            prenom: 'Client',
            typeCompte: 'CLIENT',
            statut: 'ACTIF',
            dateCreation: new Date()
        }
    ];
    
    compteApplicationService = {
        listerComptes: async () => ({
            success: true,
            data: mockData,
            count: mockData.length,
            message: 'Comptes récupérés (mode dégradé)'
        })
    };
    
    console.log('✅ Service compte en mode dégradé initialisé.');
}

// Configuration des routes
function setupRoutes() {
    const apiRoutes = createCompteRoutes(compteApplicationService);
    app.use('/api/comptes', apiRoutes);
    console.log('✅ Routes API configurées');
}

// Route métriques Prometheus
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
        service: 'compte-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        instanceId: INSTANCE_ID,
        instanceName: INSTANCE_NAME,
        database: compteApplicationService ? 'connected' : 'memory',
        uptime: process.uptime()
    });
});

// Gestion d'arrêt propre
process.on('SIGTERM', async () => {
    console.log('⏹️  Signal SIGTERM reçu, arrêt du service...');
    if (sequelize) {
        await sequelize.close();
        console.log('✅ Connexion à la base de données fermée.');
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('⏹️  Signal SIGINT reçu, arrêt du service...');
    if (sequelize) {
        await sequelize.close();
        console.log('✅ Connexion à la base de données fermée.');
    }
    process.exit(0);
});

// Démarrage du serveur
async function startServer() {
    try {
        await initializeDatabase();
        setupRoutes();
        
        app.listen(PORT, () => {
            console.log(`🚀 Compte Service démarré:`);
            console.log(`   📡 Port: ${PORT}`);
            console.log(`   🏷️  Instance: ${INSTANCE_NAME} (${INSTANCE_ID})`);
            console.log(`   🔗 Health: http://localhost:${PORT}/health`);
            console.log(`   📊 Metrics: http://localhost:${PORT}/metrics`);
            console.log(`   👤 API: http://localhost:${PORT}/api/comptes`);
        });
    } catch (error) {
        console.error('💥 Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

// Démarrage du service
startServer();
