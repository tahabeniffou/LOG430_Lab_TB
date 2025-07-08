const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import de la logique métier du microservice
const Magasin = require('./src/domain/Magasin');
const SequelizeMagasinRepository = require('./src/infrastructure/SequelizeMagasinRepository');
const { sequelize } = require('./src/infrastructure/database');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialisation de la base de données et du repository
let magasinRepository;

async function initializeDatabase() {
  try {
    // Test de connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès.');
    
    // Synchronisation des modèles
    await sequelize.sync({ alter: true });
    console.log('✅ Modèles synchronisés avec la base de données.');
    
    // Initialisation du repository
    magasinRepository = new SequelizeMagasinRepository();
    
    // Données de test si la base est vide
    await seedDatabase();
    
  } catch (error) {
    console.error('❌ Impossible de se connecter à la base de données:', error.message);
    process.exit(1);
  }
}

async function seedDatabase() {
  try {
    const magasins = await magasinRepository.listerTous();
    if (magasins.length === 0) {
      console.log('📝 Insertion de données de test...');
      
      const magasinsTest = [
        new Magasin(null, 'Magasin Centre-Ville', '123 Rue Principale, Montréal, QC H1A 1B1'),
        new Magasin(null, 'Magasin Banlieue Est', '456 Avenue des Érables, Longueuil, QC J4K 2L3'),
        new Magasin(null, 'Magasin Ouest', '789 Boulevard Saint-Laurent, Laval, QC H7G 3M4'),
      ];
      
      for (const magasin of magasinsTest) {
        await magasinRepository.sauvegarder(magasin);
      }
      
      console.log('✅ Données de test insérées avec succès.');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données de test:', error.message);
  }
}

// Routes API REST

// GET /api/magasins - Lister tous les magasins
app.get('/api/magasins', async (req, res) => {
  try {
    const { recherche, adresse } = req.query;
    
    let magasins;
    if (recherche) {
      magasins = await magasinRepository.rechercherParNom(recherche);
    } else if (adresse) {
      magasins = await magasinRepository.rechercherParAdresse(adresse);
    } else {
      magasins = await magasinRepository.listerTous();
    }
    
    res.json({
      success: true,
      data: magasins,
      message: 'Magasins récupérés avec succès',
      count: magasins.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des magasins',
      error: error.message
    });
  }
});

// GET /api/magasins/:id - Obtenir un magasin par ID
app.get('/api/magasins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const magasin = await magasinRepository.trouverParId(id);
    
    if (!magasin) {
      return res.status(404).json({
        success: false,
        message: 'Magasin non trouvé'
      });
    }

    res.json({
      success: true,
      data: magasin,
      message: 'Magasin récupéré avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du magasin',
      error: error.message
    });
  }
});

// POST /api/magasins - Créer un nouveau magasin
app.post('/api/magasins', async (req, res) => {
  try {
    const { nom, adresse } = req.body;
    
    if (!nom || !adresse) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et l\'adresse sont requis'
      });
    }

    const nouveauMagasin = new Magasin(null, nom, adresse);
    const magasinSauvegarde = await magasinRepository.sauvegarder(nouveauMagasin);

    res.status(201).json({
      success: true,
      data: magasinSauvegarde,
      message: 'Magasin créé avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la création du magasin',
      error: error.message
    });
  }
});

// PUT /api/magasins/:id - Mettre à jour un magasin
app.put('/api/magasins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, adresse } = req.body;
    
    const magasinExistant = await magasinRepository.trouverParId(id);
    if (!magasinExistant) {
      return res.status(404).json({
        success: false,
        message: 'Magasin non trouvé'
      });
    }

    if (nom) magasinExistant.nom = nom;
    if (adresse) magasinExistant.adresse = adresse;

    const magasinMisAJour = await magasinRepository.sauvegarder(magasinExistant);

    res.json({
      success: true,
      data: magasinMisAJour,
      message: 'Magasin mis à jour avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la mise à jour du magasin',
      error: error.message
    });
  }
});

// DELETE /api/magasins/:id - Supprimer un magasin
app.delete('/api/magasins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const magasinExistant = await magasinRepository.trouverParId(id);
    if (!magasinExistant) {
      return res.status(404).json({
        success: false,
        message: 'Magasin non trouvé'
      });
    }

    await magasinRepository.supprimer(id);

    res.json({
      success: true,
      message: 'Magasin supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du magasin',
      error: error.message
    });
  }
});

// POST /api/magasins/:id/utilisateurs - Ajouter un utilisateur à un magasin
app.post('/api/magasins/:id/utilisateurs', async (req, res) => {
  try {
    const { id } = req.params;
    const { utilisateur } = req.body;
    
    if (!utilisateur) {
      return res.status(400).json({
        success: false,
        message: 'Les données utilisateur sont requises'
      });
    }

    const magasin = await magasinRepository.trouverParId(id);
    if (!magasin) {
      return res.status(404).json({
        success: false,
        message: 'Magasin non trouvé'
      });
    }

    magasin.ajouterUtilisateur(utilisateur);
    const magasinMisAJour = await magasinRepository.sauvegarder(magasin);

    res.json({
      success: true,
      data: magasinMisAJour,
      message: 'Utilisateur ajouté au magasin avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout de l\'utilisateur au magasin',
      error: error.message
    });
  }
});

// GET /api/magasins/:id/utilisateurs - Obtenir les utilisateurs d'un magasin
app.get('/api/magasins/:id/utilisateurs', async (req, res) => {
  try {
    const { id } = req.params;
    
    const magasin = await magasinRepository.trouverParId(id);
    if (!magasin) {
      return res.status(404).json({
        success: false,
        message: 'Magasin non trouvé'
      });
    }

    const utilisateurs = magasin.obtenirUtilisateurs();

    res.json({
      success: true,
      data: utilisateurs,
      message: 'Utilisateurs du magasin récupérés avec succès',
      count: utilisateurs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs du magasin',
      error: error.message
    });
  }
});

// DELETE /api/magasins/:id/utilisateurs/:utilisateurId - Retirer un utilisateur d'un magasin
app.delete('/api/magasins/:id/utilisateurs/:utilisateurId', async (req, res) => {
  try {
    const { id, utilisateurId } = req.params;
    
    const magasin = await magasinRepository.trouverParId(id);
    if (!magasin) {
      return res.status(404).json({
        success: false,
        message: 'Magasin non trouvé'
      });
    }

    const retire = magasin.retirerUtilisateur(parseInt(utilisateurId));
    if (!retire) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé dans ce magasin'
      });
    }

    const magasinMisAJour = await magasinRepository.sauvegarder(magasin);

    res.json({
      success: true,
      data: magasinMisAJour,
      message: 'Utilisateur retiré du magasin avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du retrait de l\'utilisateur du magasin',
      error: error.message
    });
  }
});

// Route de santé
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      service: 'magasin-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      port: PORT,
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      service: 'magasin-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      port: PORT,
      database: 'disconnected',
      error: error.message
    });
  }
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestionnaire d'erreurs global
app.use((error, req, res, next) => {
  console.error('Erreur non gérée:', error);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
  });
});

// Initialisation et démarrage du serveur
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🏪 Magasin Service démarré sur le port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API Docs: http://localhost:${PORT}/api/magasins`);
      console.log(`🗄️ Base de données: ${process.env.DB_NAME}`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
  console.log('🛑 Arrêt du service demandé...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du service demandé...');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;
