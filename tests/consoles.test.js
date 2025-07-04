// Tests complets et simplifiés des consoles HTTP
const axios = require('axios');
const inquirer = require('inquirer');

// Mock d'axios
jest.mock('axios');
const mockedAxios = axios;

// Mock d'inquirer
jest.mock('inquirer');
const mockedInquirer = inquirer;

describe('Tests des Consoles HTTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Silence les console.log des consoles
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'clear').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('PosConsoleHttp - Console Point de Vente', () => {
    let PosConsoleHttp;

    beforeEach(() => {
      PosConsoleHttp = require('../src/interfaces/console/PosConsoleHttp');
    });

    test('Construction et initialisation', () => {
      const console = new PosConsoleHttp();
      
      expect(console).toBeDefined();
      expect(console.apiBaseUrl).toBe('http://localhost:8000/api/v1');
      expect(console.magasinActuel).toBeNull();
      expect(console.utilisateurActuel).toBeNull();
    });

    test('Construction avec URL personnalisée', () => {
      const console = new PosConsoleHttp('http://custom:9000');
      expect(console.apiBaseUrl).toBe('http://custom:9000/api/v1');
    });

    test('Vérification de connectivité - Succès', async () => {
      const console = new PosConsoleHttp();
      mockedAxios.get.mockResolvedValue({ data: { status: 'OK' } });
      
      const result = await console.verifierConnectivite();
      
      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/health');
    });

    test('Vérification de connectivité - Échec', async () => {
      const console = new PosConsoleHttp();
      mockedAxios.get.mockResolvedValue({ data: { status: 'ERROR' } });
      
      await expect(console.verifierConnectivite()).rejects.toThrow('Système non disponible');
    });

    test('Lister produits via API', async () => {
      const console = new PosConsoleHttp();
      const produitsMock = [
        { id: 1, nom: 'Produit 1', prix: 10.99, stock: 50 },
        { id: 2, nom: 'Produit 2', prix: 15.99, stock: 30 }
      ];
      
      mockedAxios.get.mockResolvedValue({ data: produitsMock });
      
      const result = await console.listerProduits();
      
      expect(result).toEqual(produitsMock);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/produits');
    });

    test('Créer vente via API', async () => {
      const console = new PosConsoleHttp();
      const venteMock = { id: 1, total: 25.98, magasinId: 1, utilisateurId: 1 };
      const donneesVente = {
        magasinId: 1,
        utilisateurId: 1,
        lignes: [{ produitId: 1, quantite: 2 }]
      };
      
      mockedAxios.post.mockResolvedValue({ data: venteMock });
      
      const result = await console.creerVente(donneesVente);
      
      expect(result).toEqual(venteMock);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ventes',
        donneesVente
      );
    });

    test('Sélection magasin avec données valides', async () => {
      const console = new PosConsoleHttp();
      const magasinsMock = [
        { id: 1, nom: 'Magasin A', adresse: '123 Rue A' },
        { id: 2, nom: 'Magasin B', adresse: '456 Rue B' }
      ];
      
      mockedAxios.get.mockResolvedValue({ data: magasinsMock });
      mockedInquirer.prompt.mockResolvedValue({ magasin: magasinsMock[0] });
      
      await console.selectionnerMagasin();
      
      expect(console.magasinActuel).toEqual(magasinsMock[0]);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/magasins');
    });

    test('Gestion erreur - Aucun magasin disponible', async () => {
      const console = new PosConsoleHttp();
      mockedAxios.get.mockResolvedValue({ data: [] });
      
      await expect(console.selectionnerMagasin()).rejects.toThrow('Aucun magasin disponible');
    });
  });

  describe('MaisonMereConsoleHttp - Console Maison Mère', () => {
    let MaisonMereConsoleHttp;

    beforeEach(() => {
      MaisonMereConsoleHttp = require('../src/interfaces/console/MaisonMereConsoleHttp');
    });

    test('Construction et initialisation', () => {
      const console = new MaisonMereConsoleHttp();
      
      expect(console).toBeDefined();
      expect(console.apiBaseUrl).toBe('http://localhost:8000/api/v1');
      expect(console.utilisateurActuel).toBeNull();
    });

    test('Construction avec URL personnalisée', () => {
      const console = new MaisonMereConsoleHttp('http://custom:9000');
      expect(console.apiBaseUrl).toBe('http://custom:9000/api/v1');
    });

    test('Vérification de connectivité - Succès', async () => {
      const console = new MaisonMereConsoleHttp();
      mockedAxios.get.mockResolvedValue({ data: { status: 'OK' } });
      
      const result = await console.verifierConnectivite();
      
      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/health');
    });

    test('Générer rapports via API', async () => {
      const console = new MaisonMereConsoleHttp();
      const rapportMock = {
        ventesParMagasin: [{ magasinId: 1, totalVentes: 1000 }],
        totalGeneral: 1000,
        produitsPlusVendus: [{ produitId: 1, quantite: 50 }]
      };
      
      mockedAxios.get.mockResolvedValue({ data: rapportMock });
      
      const result = await console.genererRapports();
      
      expect(result).toEqual(rapportMock);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/rapports');
    });

    test('Gestion des utilisateurs via API', async () => {
      const console = new MaisonMereConsoleHttp();
      const utilisateursMock = [
        { id: 1, nom: 'Doe', prenom: 'John', role: 'vendeur' }
      ];
      
      mockedAxios.get.mockResolvedValue({ data: utilisateursMock });
      
      const result = await console.listerUtilisateurs();
      
      expect(result).toEqual(utilisateursMock);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/utilisateurs');
    });

    test('Gestion des magasins via API', async () => {
      const console = new MaisonMereConsoleHttp();
      const magasinsMock = [
        { id: 1, nom: 'Magasin A', adresse: '123 Rue A' }
      ];
      
      mockedAxios.get.mockResolvedValue({ data: magasinsMock });
      
      const result = await console.listerMagasins();
      
      expect(result).toEqual(magasinsMock);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/magasins');
    });

    test('Authentification admin avec données valides', async () => {
      const console = new MaisonMereConsoleHttp();
      const adminsMock = [
        { id: 1, nom: 'Admin', prenom: 'Super', role: 'admin', motDePasse: 'admin123' },
        { id: 2, nom: 'Director', prenom: 'Big', role: 'directeur', motDePasse: 'dir123' }
      ];
      
      mockedAxios.get.mockResolvedValue({ data: adminsMock });
      mockedInquirer.prompt
        .mockResolvedValueOnce({ utilisateur: adminsMock[0] })
        .mockResolvedValueOnce({ motDePasse: 'admin123' });
      
      await console.authentifierAdmin();
      
      expect(console.utilisateurActuel).toEqual(adminsMock[0]);
    });

    test('Authentification admin - Aucun admin disponible', async () => {
      const console = new MaisonMereConsoleHttp();
      mockedAxios.get.mockResolvedValue({ data: [] });
      
      await expect(console.authentifierAdmin()).rejects.toThrow('Aucun administrateur disponible');
    });
  });

  describe('Tests d\'intégration - Workflow des consoles', () => {
    test('Workflow complet POS - Connexion, sélection et vente', async () => {
      const PosConsoleHttp = require('../src/interfaces/console/PosConsoleHttp');
      const console = new PosConsoleHttp();
      
      // Mock des données
      const magasinsMock = [{ id: 1, nom: 'Magasin Test', adresse: '123 Test St' }];
      const utilisateursMock = [{ id: 1, nom: 'Vendeur', role: 'vendeur', motDePasse: 'pass123' }];
      const produitsMock = [{ id: 1, nom: 'Produit Test', prix: 10.99, stock: 100 }];
      const venteMock = { id: 1, total: 21.98 };
      
      // Mock de la connectivité
      mockedAxios.get.mockResolvedValueOnce({ data: { status: 'OK' } });
      
      // Mock sélection magasin
      mockedAxios.get.mockResolvedValueOnce({ data: magasinsMock });
      mockedInquirer.prompt.mockResolvedValueOnce({ magasin: magasinsMock[0] });
      
      // Mock liste produits
      mockedAxios.get.mockResolvedValueOnce({ data: produitsMock });
      
      // Mock création vente
      mockedAxios.post.mockResolvedValueOnce({ data: venteMock });
      
      // Test du workflow
      await console.verifierConnectivite();
      await console.selectionnerMagasin();
      
      const produits = await console.listerProduits();
      const vente = await console.creerVente({
        magasinId: 1,
        utilisateurId: 1,
        lignes: [{ produitId: 1, quantite: 2 }]
      });
      
      expect(console.magasinActuel).toEqual(magasinsMock[0]);
      expect(produits).toEqual(produitsMock);
      expect(vente).toEqual(venteMock);
    });

    test('Workflow complet Maison Mère - Connexion et rapport', async () => {
      const MaisonMereConsoleHttp = require('../src/interfaces/console/MaisonMereConsoleHttp');
      const console = new MaisonMereConsoleHttp();
      
      // Mock des données
      const adminsMock = [{ id: 1, nom: 'Admin', role: 'admin', motDePasse: 'admin123' }];
      const rapportMock = { totalGeneral: 5000, ventesParMagasin: [] };
      const utilisateursMock = [{ id: 2, nom: 'User', role: 'vendeur' }];
      
      // Mock des appels
      mockedAxios.get
        .mockResolvedValueOnce({ data: { status: 'OK' } }) // health check
        .mockResolvedValueOnce({ data: adminsMock }) // liste admins
        .mockResolvedValueOnce({ data: rapportMock }) // rapport
        .mockResolvedValueOnce({ data: utilisateursMock }); // utilisateurs
      
      mockedInquirer.prompt
        .mockResolvedValueOnce({ utilisateur: adminsMock[0] })
        .mockResolvedValueOnce({ motDePasse: 'admin123' });
      
      // Test du workflow
      await console.verifierConnectivite();
      await console.authentifierAdmin();
      const rapport = await console.genererRapports();
      const utilisateurs = await console.listerUtilisateurs();
      
      expect(console.utilisateurActuel).toEqual(adminsMock[0]);
      expect(rapport).toEqual(rapportMock);
      expect(utilisateurs).toEqual(utilisateursMock);
    });

    test('Gestion des erreurs de connectivité', async () => {
      const PosConsoleHttp = require('../src/interfaces/console/PosConsoleHttp');
      const console = new PosConsoleHttp();
      
      mockedAxios.get.mockRejectedValue(new Error('Connexion refusée'));
      
      await expect(console.verifierConnectivite()).rejects.toThrow('Connexion refusée');
    });

    test('Gestion des erreurs API', async () => {
      const MaisonMereConsoleHttp = require('../src/interfaces/console/MaisonMereConsoleHttp');
      const console = new MaisonMereConsoleHttp();
      
      mockedAxios.get.mockRejectedValue(new Error('API non disponible'));
      
      await expect(console.listerUtilisateurs()).rejects.toThrow('API non disponible');
    });
  });

  describe('Tests de robustesse et edge cases', () => {
    test('POS Console - Gestion des réponses API vides', async () => {
      const PosConsoleHttp = require('../src/interfaces/console/PosConsoleHttp');
      const console = new PosConsoleHttp();
      
      mockedAxios.get.mockResolvedValue({ data: [] });
      
      await expect(console.selectionnerMagasin()).rejects.toThrow('Aucun magasin disponible');
    });

    test('Maison Mère Console - Filtrage des admins', async () => {
      const MaisonMereConsoleHttp = require('../src/interfaces/console/MaisonMereConsoleHttp');
      const console = new MaisonMereConsoleHttp();
      
      const utilisateursMock = [
        { id: 1, nom: 'User1', role: 'vendeur' },
        { id: 2, nom: 'Admin1', role: 'admin' },
        { id: 3, nom: 'Director1', role: 'directeur' }
      ];
      
      mockedAxios.get.mockResolvedValue({ data: utilisateursMock });
      mockedInquirer.prompt
        .mockResolvedValueOnce({ utilisateur: utilisateursMock[1] })
        .mockResolvedValueOnce({ motDePasse: 'admin123' });
      
      await console.authentifierAdmin();
      
      expect(console.utilisateurActuel.role).toBe('admin');
    });

    test('Validation des URLs API', () => {
      const PosConsoleHttp = require('../src/interfaces/console/PosConsoleHttp');
      const MaisonMereConsoleHttp = require('../src/interfaces/console/MaisonMereConsoleHttp');
      
      const posConsole = new PosConsoleHttp('https://prod.example.com:8443');
      const maisonMereConsole = new MaisonMereConsoleHttp('https://admin.example.com');
      
      expect(posConsole.apiBaseUrl).toBe('https://prod.example.com:8443/api/v1');
      expect(maisonMereConsole.apiBaseUrl).toBe('https://admin.example.com/api/v1');
    });
  });
});
