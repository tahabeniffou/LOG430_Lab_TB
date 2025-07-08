const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import de la logique métier du microservice
const Utilisateur = require('./src/domain/Utilisateur');
const SequelizeUtilisateurRepository = require('./src/infrastructure/SequelizeUtilisateurRepository');
const { sequelize } = require('./src/infrastructure/database');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialisation de la base de données et du repository
let utilisateurRepository;

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie pour utilisateur-service');
    
    await sequelize.sync({ force: false });
    console.log('✅ Tables synchronisées pour utilisateur-service');
    
    utilisateurRepository = new SequelizeUtilisateurRepository();
    
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    process.exit(1);
  }
}

// Routes API REST

// GET /api/utilisateurs - Lister tous les utilisateurs
app.get('/api/utilisateurs', async (req, res) => {
  try {
    const utilisateurs = await utilisateurRepository.listerTous();
    const utilisateursSanitized = utilisateurs.map(sanitizeUser);
    
    res.json({
      success: true,
      data: utilisateursSanitized,
      message: 'Utilisateurs récupérés avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: error.message
    });
  }
});

// GET /api/utilisateurs/:id - Obtenir un utilisateur par ID
app.get('/api/utilisateurs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const utilisateur = await utilisateurRepository.trouverParId(id);
    
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: sanitizeUser(utilisateur),
      message: 'Utilisateur récupéré avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: error.message
    });
  }
});

// GET /api/utilisateurs/email/:email - Obtenir un utilisateur par email
app.get('/api/utilisateurs/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const utilisateur = await utilisateurRepository.trouverParCourriel(email);
    
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: sanitizeUser(utilisateur),
      message: 'Utilisateur récupéré avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: error.message
    });
  }
});

// POST /api/utilisateurs - Créer un nouvel utilisateur
app.post('/api/utilisateurs', async (req, res) => {
  try {
    const { nom, prenom, courriel, role, magasinId, motDePasse, nomUtilisateur } = req.body;
    
    if (!nom || !prenom || !courriel || !role || !magasinId) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await utilisateurRepository.trouverParCourriel(courriel);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    const nouvelUtilisateur = new Utilisateur(null, nom, prenom, courriel, role, magasinId, motDePasse, nomUtilisateur);
    
    // Valider le rôle
    try {
      nouvelUtilisateur.validerRole();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const utilisateurSauvegarde = await utilisateurRepository.sauvegarder(nouvelUtilisateur);

    res.status(201).json({
      success: true,
      data: sanitizeUser(utilisateurSauvegarde),
      message: 'Utilisateur créé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur',
      error: error.message
    });
  }
});

// PUT /api/utilisateurs/:id - Mettre à jour un utilisateur
app.put('/api/utilisateurs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, courriel, role, magasinId, motDePasse, nomUtilisateur } = req.body;
    
    const utilisateurExistant = await utilisateurRepository.trouverParId(id);
    if (!utilisateurExistant) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour les champs
    if (nom) utilisateurExistant.nom = nom;
    if (prenom) utilisateurExistant.prenom = prenom;
    if (courriel) {
      // Vérifier si le nouvel email n'existe pas déjà (sauf pour cet utilisateur)
      const userWithEmail = await utilisateurRepository.trouverParCourriel(courriel);
      if (userWithEmail && userWithEmail.id !== utilisateurExistant.id) {
        return res.status(409).json({
          success: false,
          message: 'Un autre utilisateur avec cet email existe déjà'
        });
      }
      utilisateurExistant.courriel = courriel;
    }
    if (role) {
      utilisateurExistant.role = role;
      try {
        utilisateurExistant.validerRole();
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }
    if (magasinId) utilisateurExistant.magasinId = magasinId;
    if (motDePasse) utilisateurExistant.motDePasse = motDePasse;
    if (nomUtilisateur) utilisateurExistant.nomUtilisateur = nomUtilisateur;

    const utilisateurMisAJour = await utilisateurRepository.sauvegarder(utilisateurExistant);

    res.json({
      success: true,
      data: sanitizeUser(utilisateurMisAJour),
      message: 'Utilisateur mis à jour avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'utilisateur',
      error: error.message
    });
  }
});

// DELETE /api/utilisateurs/:id - Supprimer un utilisateur
app.delete('/api/utilisateurs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const utilisateurExistant = await utilisateurRepository.trouverParId(id);
    if (!utilisateurExistant) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    await utilisateurRepository.supprimer(id);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur',
      error: error.message
    });
  }
});

// POST /api/utilisateurs/auth/login - Authentification
app.post('/api/utilisateurs/auth/login', async (req, res) => {
  try {
    const { courriel, motDePasse } = req.body;
    
    if (!courriel || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    const utilisateur = await utilisateurRepository.trouverParCourriel(courriel);
    if (!utilisateur) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    const motDePasseValide = await utilisateurRepository.validerMotDePasse(courriel, motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    res.json({
      success: true,
      data: sanitizeUser(utilisateur),
      message: 'Authentification réussie'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'authentification',
      error: error.message
    });
  }
});

// GET /api/utilisateurs/magasin/:magasinId - Obtenir les utilisateurs d'un magasin
app.get('/api/utilisateurs/magasin/:magasinId', async (req, res) => {
  try {
    const { magasinId } = req.params;
    const tousUtilisateurs = await utilisateurRepository.listerTous();
    const utilisateursMagasin = tousUtilisateurs.filter(u => u.magasinId == magasinId);
    const utilisateursSanitized = utilisateursMagasin.map(sanitizeUser);

    res.json({
      success: true,
      data: utilisateursSanitized,
      message: `Utilisateurs du magasin ${magasinId} récupérés avec succès`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs du magasin',
      error: error.message
    });
  }
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    service: 'utilisateur-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`👤 Utilisateur Service démarré sur le port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API Docs: http://localhost:${PORT}/api/utilisateurs`);
  initializeDatabase();
});

module.exports = app;
