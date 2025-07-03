const { VenteRepository, ProduitRepository } = require('../../infrastructure/repositories');
const LigneVenteRepository = require('../../infrastructure/repositories/LigneVenteRepositorySequelize');

class CreerVenteUseCase {
  constructor(venteRepository, ligneVenteRepository, produitRepository) {
    this.venteRepository = venteRepository;
    this.ligneVenteRepository = ligneVenteRepository;
    this.produitRepository = produitRepository;
  }

  async execute(venteData) {
    const { magasinId, lignesVente } = venteData;

    // Validation métier
    if (!magasinId) {
      throw new Error('Le magasin est obligatoire');
    }

    if (!lignesVente || lignesVente.length === 0) {
      throw new Error('Au moins une ligne de vente est requise');
    }

    // Calculer le total et valider les produits
    let total = 0;
    for (const ligne of lignesVente) {
      const produit = await this.produitRepository.trouverParId(ligne.produitId);
      if (!produit) {
        throw new Error(`Produit ${ligne.produitId} non trouvé`);
      }
      
      if (produit.stock < ligne.quantite) {
        throw new Error(`Stock insuffisant pour le produit ${produit.nom}`);
      }

      ligne.sousTotal = produit.prix * ligne.quantite;
      total += ligne.sousTotal;
    }

    // Créer la vente
    const vente = await this.venteRepository.creer({
      magasinId,
      total,
      date: new Date()
    });

    // Créer les lignes de vente et décrémenter le stock
    for (const ligne of lignesVente) {
      ligne.venteId = vente.id;
      ligne.magasinId = magasinId;
      await this.ligneVenteRepository.creer(ligne);
      await this.produitRepository.decrementerStock(ligne.produitId, ligne.quantite);
    }

    return this.venteRepository.trouverParId(vente.id);
  }
}

module.exports = new CreerVenteUseCase(
  VenteRepository, 
  new LigneVenteRepository(), 
  ProduitRepository
);
