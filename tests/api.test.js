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

describe('Tests Unitaires - Services du Domaine Métier', () => {
  describe('VenteService - Logique métier des ventes', () => {
    const VenteService = require('../src/domain/vente/VenteService');

    // Mocks pour les tests unitaires de service
    const mockVenteRepo = {
      sauvegarder: jest.fn(),
    };

    const mockProduitRepo = {
      trouverParId: jest.fn(),
      decrementerStock: jest.fn(),
    };

    let venteService;

    beforeEach(() => {
      // Réinitialiser les mocks avant chaque test pour éviter les fuites d'état
      jest.clearAllMocks();
      venteService = new VenteService(mockVenteRepo, mockProduitRepo);
    });

    test('Création vente réussie avec validation stock', async () => {
      const produitMock = { id: 1, nom: 'Test', prix: 10, stock: 50 };
      mockProduitRepo.trouverParId.mockResolvedValue(produitMock);
      mockVenteRepo.sauvegarder.mockImplementation(vente => Promise.resolve(vente));

      const donneesVente = {
        magasinId: 1,
        utilisateurId: 1,
        lignes: [{ produitId: 1, quantite: 2 }]
      };

      const vente = await venteService.creerVente(donneesVente);
      expect(vente).toBeDefined();
      expect(vente.montantTotal).toBe(20);
      expect(mockProduitRepo.decrementerStock).toHaveBeenCalledWith(1, 2);
    });

    it('Échec création vente - Produit inexistant', async () => {
      mockProduitRepo.trouverParId.mockResolvedValue(null); // Simuler produit non trouvé

      const donneesVente = {
        magasinId: 1,
        utilisateurId: 1,
        lignes: [{ produitId: 999, quantite: 1 }]
      };

      await expect(venteService.creerVente(donneesVente))
        .rejects.toThrow('Produit 999 non trouvé');
    });

    it('Échec création vente - Stock insuffisant', async () => {
      const produitMock = { id: 1, nom: 'Test', stock: 5 };
      mockProduitRepo.trouverParId.mockResolvedValue(produitMock); // Simuler produit avec stock faible

      const donneesVente = {
        magasinId: 1,
        utilisateurId: 1,
        lignes: [{ produitId: 1, quantite: 10 }]
      };
      await expect(venteService.creerVente(donneesVente))
        .rejects.toThrow('Stock insuffisant pour Test');
    });

    it('Validation obligatoire du magasin', async () => {
      await expect(venteService.creerVente({ utilisateurId: 1, lignes: [{ produitId: 1, quantite: 1 }] }))
        .rejects.toThrow('Magasin requis');
    });
  });

  describe('Entité Vente - Logique domaine', () => {
    const Vente = require('../src/domain/vente/Vente');

    test('Construction correcte d\'une vente', () => {
      const vente = new Vente(1, 1, 1);
      expect(vente.magasinId).toBe(1);
      expect(vente.utilisateurId).toBe(1);
      expect(vente.statut).toBe('en_cours'); // Statut par défaut
      expect(vente.lignes).toHaveLength(0);
      expect(vente.montantTotal).toBe(0);
    });

    it('Ajout ligne de vente et calcul automatique du total', () => {
      const vente = new Vente(1, 1, 1);
      const produit1 = { id: 1, nom: 'Produit 1', prix: 10.50 };
      const produit2 = { id: 2, nom: 'Produit 2', prix: 5.25 };
      vente.ajouterLigne(produit1, 2); // 21.00
      vente.ajouterLigne(produit2, 1); // 5.25
      expect(vente.lignes).toHaveLength(2);
      expect(vente.montantTotal).toBe(26.25);
    });

    it('Validation quantité positive', () => {
      const vente = new Vente(1, 1, 1);
      const produit = { id: 1, nom: 'Produit', prix: 10 };
      expect(() => vente.ajouterLigne(produit, 0))
        .toThrow('La quantité doit être positive.');
      expect(() => vente.ajouterLigne(produit, -1))
        .toThrow('La quantité doit être positive.');
    });

    it('Annulation d\'une vente active', () => {
      const vente = new Vente(1, 1, 1);
      vente.annuler();
      expect(vente.statut).toBe('annulee');
    });
  });

  describe('BaseEntity - Classe de base', () => {
    const BaseEntity = require('../src/domain/shared/BaseEntity');

    test('Construction avec dates automatiques', () => {
      const entity = new BaseEntity(1);
      
      expect(entity.id).toBe(1);
      expect(entity.dateCreation).toBeInstanceOf(Date);
      expect(entity.dateModification).toBeInstanceOf(Date);
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });

    test('Mise à jour automatique des timestamps', () => {
      const entity = new BaseEntity(1);
      const oldDate = entity.updatedAt;
      
      // Petite pause pour s'assurer que les dates sont différentes
      setTimeout(() => {
        entity.updateTimestamp();
        expect(entity.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
        expect(entity.dateModification.getTime()).toBeGreaterThan(oldDate.getTime());
      }, 1);
    });
  });
});

describe('Tests Unitaires - ApplicationService', () => {
  const ApplicationService = require('../src/application/ApplicationService');

  it('Construction du service applicatif', () => {
    const db = require('../src/models');
    const service = new ApplicationService(db);
    expect(service).toBeInstanceOf(ApplicationService);
    expect(service.venteService).toBeDefined();
  });
});

describe('Tests des Consoles HTTP', () => {
  // Tests simplifiés des consoles
  describe('Architecture et Fichiers des Consoles', () => {
    test('Les fichiers de consoles HTTP existent', () => {
      const fs = require('fs');
      const path = require('path');
      
      const posPath = path.join(__dirname, '../src/interfaces/console/PosConsoleHttp.js');
      const maisonMerePath = path.join(__dirname, '../src/interfaces/console/MaisonMereConsoleHttp.js');
      
      expect(fs.existsSync(posPath)).toBe(true);
      expect(fs.existsSync(maisonMerePath)).toBe(true);
    });

    test('Les consoles contiennent les URLs API correctes', () => {
      const fs = require('fs');
      const path = require('path');
      const posPath = path.join(__dirname, '../src/interfaces/console/PosConsoleHttp.js');
      const maisonMerePath = path.join(__dirname, '../src/interfaces/console/MaisonMereConsoleHttp.js');
      
      const posConsoleContent = fs.readFileSync(posPath, 'utf8');
      const maisonMereConsoleContent = fs.readFileSync(maisonMerePath, 'utf8');
      
      // Vérifier que les consoles utilisent HTTP et non des connexions directes
      expect(posConsoleContent).toContain('axios');
      expect(posConsoleContent).toContain('http://localhost:8000');
      expect(maisonMereConsoleContent).toContain('axios');
      expect(maisonMereConsoleContent).toContain('http://localhost:8000');
    });
  });
});
