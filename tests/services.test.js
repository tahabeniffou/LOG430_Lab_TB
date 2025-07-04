// Tests complets pour tous les services et repositories
const db = require('../src/models');

// Repositories
const SequelizeProduitRepository = require('../src/infrastructure/database/SequelizeProduitRepository');
const SequelizeVenteRepository = require('../src/infrastructure/database/SequelizeVenteRepository');
const SequelizeUtilisateurRepository = require('../src/infrastructure/database/SequelizeUtilisateurRepository');

// Entités
const ProduitEntity = require('../src/domain/produit/Produit');
const VenteEntity = require('../src/domain/vente/Vente');
const UtilisateurEntity = require('../src/domain/utilisateur/Utilisateur');
const MagasinEntity = require('../src/domain/magasin/Magasin');

describe('Tests Complets - Services, Repositories et Entités', () => {
  let produitRepo, venteRepo, utilisateurRepo;

  beforeEach(async () => {
    await db.sequelize.sync({ force: true });

    // Initialisation des repositories pour chaque test
    produitRepo = new SequelizeProduitRepository(db);
    utilisateurRepo = new SequelizeUtilisateurRepository(db);
    venteRepo = new SequelizeVenteRepository(db);

    // Création des données de test
    await db.Magasin.create({ id: 1, nom: 'Magasin Test', adresse: '123 rue test' });
    await db.Produit.create({ id: 1, nom: 'Produit A', prix: 10, quantiteStock: 100, categorie: 'catA', magasinId: 1 });
    await db.Produit.create({ id: 2, nom: 'Produit B', prix: 20, quantiteStock: 50, categorie: 'catB', magasinId: 1 });
    await db.Utilisateur.create({ id: 1, nom: 'Doe', prenom: 'John', nomUtilisateur: 'admin', role: 'admin', magasinId: 1, motDePasse: 'password123', courriel: 'admin@test.com' });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('Entités du Domaine', () => {
    it('ProduitEntity - Gère le stock correctement', () => {
      const produit = new ProduitEntity(1, 'Test', 10, 20, 'cat');
      produit.decrementerStock(5);
      expect(produit.stock).toBe(15);
      expect(() => produit.decrementerStock(20)).toThrow(/Stock insuffisant/);
      produit.incrementerStock(10);
      expect(produit.stock).toBe(25);
    });

    it('VenteEntity - Calcule le total et gère les lignes de vente', () => {
      const vente = new VenteEntity(1, 1, 1);
      vente.ajouterLigne({ id: 1, prix: 10 }, 2);
      vente.ajouterLigne({ id: 2, prix: 5.5 }, 1);
      expect(vente.montantTotal).toBe(25.5);
      expect(vente.lignes).toHaveLength(2);
    });

    it('UtilisateurEntity - Construction', () => {
        const utilisateur = new UtilisateurEntity(1, 'Doe', 'John', 'john.doe@test.com', 'admin', 1, 'password');
        expect(utilisateur.nom).toBe('Doe');
        expect(utilisateur.estAdmin()).toBe(true);
    });

    it('MagasinEntity - Construction', () => {
        const magasin = new MagasinEntity(1, 'Magasin Central', '123 Rue Principale');
        expect(magasin.nom).toBe('Magasin Central');
    });
  });

  describe('Repositories - Opérations CRUD et Logique Métier', () => {
    describe('SequelizeProduitRepository', () => {
        it('trouverParId - Trouve un produit par son ID', async () => {
          const produit = await produitRepo.trouverParId(1);
          expect(produit).toBeDefined();
          expect(produit.id).toBe(1);
        });

        it('trouverParId - Retourne null pour un produit inexistant', async () => {
            const produit = await produitRepo.trouverParId(999);
            expect(produit).toBeNull();
        });

        it('listerTous - Liste tous les produits', async () => {
          const produits = await produitRepo.listerTous();
          expect(produits.length).toBeGreaterThanOrEqual(2);
        });

        it('decrementerStock - Décrémente le stock et gère les erreurs', async () => {
          await produitRepo.decrementerStock(1, 5);
          const produit = await produitRepo.trouverParId(1);
          expect(produit.stock).toBe(95); // 100 - 5

          await expect(produitRepo.decrementerStock(1, 100)).rejects.toThrow('Stock insuffisant');
        });
      });

      describe('SequelizeUtilisateurRepository', () => {
        it('trouverParNomUtilisateur - Trouve un utilisateur par son nom d\'utilisateur', async () => {
          const utilisateur = await utilisateurRepo.trouverParNomUtilisateur('admin');
          expect(utilisateur).toBeDefined();
          expect(utilisateur.nomUtilisateur).toBe('admin');
          expect(utilisateur.role).toBe('admin');
        });

        it('trouverParNomUtilisateur - Retourne null pour un utilisateur inexistant', async () => {
            const utilisateur = await utilisateurRepo.trouverParNomUtilisateur('nobody');
            expect(utilisateur).toBeNull();
        });

        it('validerMotDePasse - Valide le mot de passe', async () => {
          const estValide = await utilisateurRepo.validerMotDePasse('admin', 'password123');
          expect(estValide).toBe(true);

          const estInvalide = await utilisateurRepo.validerMotDePasse('admin', 'wrongpassword');
          expect(estInvalide).toBe(false);

          const utilisateurInexistant = await utilisateurRepo.validerMotDePasse('nobody', 'password');
          expect(utilisateurInexistant).toBe(false);
        });
      });

      describe('SequelizeVenteRepository', () => {
        it('sauvegarder - Sauvegarde une vente et ses lignes', async () => {
          const vente = new VenteEntity(null, 1, 1);
          const produit = await produitRepo.trouverParId(1);
          vente.ajouterLigne(produit, 2);
          const venteSauvee = await venteRepo.sauvegarder(vente);

          expect(venteSauvee.id).toBeDefined();
          expect(venteSauvee.montantTotal).toBe(20);
          
          const venteAvecLignes = await db.Vente.findByPk(venteSauvee.id, { include: ['lignesDeVente'] });
          expect(venteAvecLignes.lignesDeVente).toHaveLength(1);
          expect(venteAvecLignes.lignesDeVente[0].quantite).toBe(2);
        });

        it('listerToutes - Liste toutes les ventes', async () => {
            const vente = new VenteEntity(null, 1, 1);
            const produit = await produitRepo.trouverParId(1);
            vente.ajouterLigne(produit, 2);
            await venteRepo.sauvegarder(vente);
  
            const ventes = await venteRepo.listerToutes();
            expect(ventes).toHaveLength(1);
            expect(ventes[0].montantTotal).toBe(20);
        });
    });
  });

  describe('Associations Sequelize', () => {
      it('Vente inclut Magasin, Utilisateur et Lignes de Vente avec Produit', async () => {
        const vente = new VenteEntity(null, 1, 1);
        const produit = await produitRepo.trouverParId(1);
        vente.ajouterLigne(produit, 1);
        const venteSauvee = await venteRepo.sauvegarder(vente);

        const venteTrouvee = await db.Vente.findByPk(venteSauvee.id, {
            include: [
                { model: db.Magasin, as: 'magasin' },
                { model: db.Utilisateur, as: 'utilisateur' },
                { 
                    model: db.LigneVente, 
                    as: 'lignesDeVente',
                    include: [{ model: db.Produit, as: 'produit' }]
                }
            ]
        });

        expect(venteTrouvee.magasin).toBeDefined();
        expect(venteTrouvee.utilisateur).toBeDefined();
        expect(venteTrouvee.lignesDeVente).toHaveLength(1);
        expect(venteTrouvee.lignesDeVente[0].produit).toBeDefined();
        expect(venteTrouvee.lignesDeVente[0].produit.nom).toBe('Produit A');
    });
  });
});
