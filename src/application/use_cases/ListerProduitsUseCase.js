// src/application/use_cases/ListerProduitsUseCase.js
// Cas d'utilisation pour lister les produits, filtré par magasin si nécessaire
// Ce cas d'utilisation respecte le principe de responsabilité unique (SRP)

const { ProduitRepository } = require('../../infrastructure/repositories');

/**
 * Classe qui représente le cas d'utilisation "Lister les produits"
 * Un cas d'utilisation encapsule une opération métier spécifique
 */
class ListerProduitsUseCase {
  /**
   * Constructeur qui reçoit les dépendances nécessaires
   * @param {Object} produitRepository - Repository pour accéder aux produits
   */
  constructor(produitRepository) {
    this.produitRepository = produitRepository;
  }

  /**
   * Exécute le cas d'utilisation
   * @param {number|null} magasinId - ID du magasin pour filtrer les produits (optionnel)
   * @returns {Promise<Array>} Liste des produits
   */
  async execute(magasinId = null) {
    // Si un ID de magasin est fourni, filtre les produits par magasin
    if (magasinId) {
      return this.produitRepository.listerParMagasin(magasinId);
    }
    // Sinon, retourne tous les produits
    return this.produitRepository.lister();
  }
}

// Exporter une instance du use case
module.exports = new ListerProduitsUseCase(ProduitRepository);
