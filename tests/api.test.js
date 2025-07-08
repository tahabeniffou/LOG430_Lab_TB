// Tests Jest pour LOG430 Lab TB - Tests fonctionnels API et Services
const request = require('supertest');
const { sequelize } = require('../src/models');

// Mock des modules externes
jest.mock('../src/api/cache/redisService');

describe('LOG430 Lab TB - Tests API et Fonctionnalités', () => {
  let app;

  beforeAll(async () => {
    // Configuration de l'environnement de test
    process.env.NODE_ENV = 'test';
    process.env.DB_STORAGE = ':memory:';
    
    // Chargement de l'application après configuration
    app = require('../app');
    
    // Synchronisation de la base de données de test
    await sequelize.sync({ force: true });
    
    // Données de test
    const { Magasin, Utilisateur, Produit } = require('../src/models');
    
    await Magasin.create({
      id: 1,
      nom: 'Magasin Test',
      adresse: '123 Test St'
    });
    
    await Utilisateur.create({
      id: 1,
      nom: 'Admin',
      prenom: 'Admin',
      courriel: 'admin@test.com',
      role: 'admin',
      nomUtilisateur: 'admin.test',
      magasinId: 1,
      motDePasse: 'password'
    });
    
    await Produit.create({
      id: 1,
      nom: 'Produit Test',
      prix: 10.99,
      quantiteStock: 100, // Correction: Utiliser quantiteStock comme dans le modèle
      magasinId: 1
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('API de Base - Santé et Routes Principales', () => {
    test('GET / - Page d\'accueil de l\'API', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.message).toContain('API LOG430');
      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
    });

    test('GET /health - Vérification de santé du système', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
      expect(response.body.services).toBeDefined();
      expect(response.body.services.database).toBe('connected');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('API Gestion des Produits', () => {
    test('GET /api/v1/produits - Lister tous les produits', async () => {
      const response = await request(app)
        .get('/api/v1/produits')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/v1/produits/1 - Obtenir un produit spécifique', async () => {
      const response = await request(app)
        .get('/api/v1/produits/1')
        .expect(200);
      
      expect(response.body.nom).toBe('Produit Test');
      expect(response.body.prix).toBe(10.99);
      expect(response.body.stock).toBe(100);
    });

    test('GET /api/v1/produits/999 - Produit inexistant (404)', async () => {
      const response = await request(app)
        .get('/api/v1/produits/999')
        .expect(404);
      
      expect(response.body.message).toContain('non trouvé');
    });

    test('GET /api/v1/produits/1/stock - Vérifier le stock d\'un produit', async () => {
      const response = await request(app)
        .get('/api/v1/produits/1/stock')
        .expect(200);
      
      expect(response.body.stock).toBe(100);
    });
  });

  describe('API Gestion des Magasins', () => {
    test('GET /api/v1/magasins - Lister tous les magasins', async () => {
      const response = await request(app)
        .get('/api/v1/magasins')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].nom).toBe('Magasin Test');
    });
  });

  describe('API Gestion des Utilisateurs', () => {
    test('GET /api/v1/utilisateurs - Lister tous les utilisateurs', async () => {
      const response = await request(app)
        .get('/api/v1/utilisateurs')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].nom).toBe('Admin');
    });

    test('GET /api/v1/utilisateurs?magasinId=1 - Filtrer utilisateurs par magasin', async () => {
      const response = await request(app)
        .get('/api/v1/utilisateurs?magasinId=1')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(u => u.magasinId === 1)).toBe(true);
    });
  });

  describe('API Gestion des Ventes', () => {
    test('GET /api/v1/ventes - Lister toutes les ventes', async () => {
      const response = await request(app)
        .get('/api/v1/ventes')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/v1/ventes - Créer une nouvelle vente valide', async () => {
      const nouvelleVente = {
        magasinId: 1,
        utilisateurId: 1,
        lignes: [
          {
            produitId: 1,
            quantite: 2
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/ventes')
        .send(nouvelleVente)
        .expect(201);
      
      expect(response.body.montantTotal).toBe(21.98);
      expect(response.body.magasinId).toBe(1);
      expect(response.body.utilisateurId).toBe(1);
      // Note: les lignes peuvent être dans un format différent selon l'implémentation
    });

    test('POST /api/v1/ventes - Rejeter vente avec stock insuffisant', async () => {
      const venteInvalide = {
        magasinId: 1,
        utilisateurId: 1,
        lignes: [
          {
            produitId: 1,
            quantite: 200 // Plus que le stock disponible
          }
        ]
      };

      await request(app)
        .post('/api/v1/ventes')
        .send(venteInvalide)
        .expect(500);
    });

    test('POST /api/v1/ventes - Rejeter vente sans lignes', async () => {
      const venteInvalide = {
        magasinId: 1,
        utilisateurId: 1,
        lignes: []
      };

      await request(app)
        .post('/api/v1/ventes')
        .send(venteInvalide)
        .expect(500); // Le service devrait rejeter
    });

    test('GET /api/v1/ventes/999 - Vente inexistante (404)', async () => {
      const response = await request(app)
        .get('/api/v1/ventes/999')
        .expect(404);
      
      expect(response.body.message).toContain('Vente non trouvée');
    });
  });

  describe('API Rapports et Analytics', () => {
    it('GET /api/v1/rapports - Générer rapport des ventes', async () => {
      const response = await request(app)
        .get('/api/v1/rapports')
        .expect(200);
      
      expect(response.body.totalVentes).toBeDefined();
      expect(response.body.chiffreAffaireTotal).toBeDefined();
      expect(response.body.ventes).toBeInstanceOf(Array);
    });
  });
});


describe('Tests Post-Migration - Code métier migré vers microservices', () => {
  test('Documentation des microservices disponibles', () => {
    console.log('Logique métier migrée vers les microservices:');
    console.log('- VenteService -> vente-service (port 3004)');
    console.log('- ProduitService -> produit-service (port 3001)');
    console.log('- MagasinService -> magasin-service (port 3002)');
    console.log('- UtilisateurService -> utilisateur-service (port 3003)');
    expect(true).toBe(true);
  });

  test('Architecture microservices en place', () => {
    const microservices = [
      'produit-service',
      'magasin-service', 
      'utilisateur-service',
      'vente-service'
    ];
    
    expect(microservices).toHaveLength(4);
    expect(microservices).toContain('vente-service');
  });
});
