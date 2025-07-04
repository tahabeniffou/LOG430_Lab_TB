// Service applicatif simplifié pour les use cases principaux
const VenteService = require('../domain/vente/VenteService');
const SequelizeVenteRepository = require('../infrastructure/database/SequelizeVenteRepository');
const SequelizeProduitRepository = require('../infrastructure/database/SequelizeProduitRepository');
const SequelizeUtilisateurRepository = require('../infrastructure/database/SequelizeUtilisateurRepository');

class ApplicationService {
  constructor(db) {
    this.venteRepository = new SequelizeVenteRepository(db);
    this.produitRepository = new SequelizeProduitRepository(db);
    this.utilisateurRepository = new SequelizeUtilisateurRepository(db);
    this.venteService = new VenteService(this.venteRepository, this.produitRepository);
  }

  // Use Case: Créer une vente
  async creerVente(donneesVente) {
    return await this.venteService.creerVente(donneesVente);
  }

  // Use Case: Annuler une vente
  async annulerVente(venteId) {
    return await this.venteService.annulerVente(venteId);
  }

  // Use Case: Lister les produits
  async listerProduits(filtres = {}) {
    if (filtres.categorie) {
      return await this.produitRepository.listerParCategorie(filtres.categorie);
    }
    if (filtres.nom) {
      return await this.produitRepository.rechercherParNom(filtres.nom);
    }
    return await this.produitRepository.listerTous();
  }

  // Use Case: Consulter les ventes
  async consulterVentes(magasinId = null) {
    if (magasinId) {
      return await this.venteRepository.listerParMagasin(magasinId);
    }
    return await this.venteRepository.listerToutes();
  }

  // Use Case: Obtenir un produit spécifique
  async obtenirProduit(produitId) {
    return await this.produitRepository.trouverParId(produitId);
  }

  // Use Case: Obtenir le stock d'un produit (alias pour compatibilité)
  async obtenirStock(produitId) {
    const produit = await this.produitRepository.trouverParId(produitId);
    return produit ? produit.stock : 0;
  }

  // Use Case: Consulter une vente par son ID
  async consulterVente(venteId) {
    return await this.venteRepository.trouverParId(venteId);
  }
}

module.exports = ApplicationService;
