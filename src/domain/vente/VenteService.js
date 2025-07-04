// Service domaine pour les ventes
const Vente = require('./Vente');

class VenteService {
  constructor(venteRepository, produitRepository) {
    this.venteRepository = venteRepository;
    this.produitRepository = produitRepository;
  }

  async creerVente(donneesVente) {
    const { magasinId, utilisateurId, lignes } = donneesVente;

    // Validation métier
    if (!magasinId) throw new Error('Magasin requis');
    if (!lignes || lignes.length === 0) throw new Error('Au moins une ligne requise');

    // Créer la vente
    const vente = new Vente(null, magasinId, utilisateurId, 0);

    // Valider et ajouter chaque ligne
    for (const ligne of lignes) {
      const produit = await this.produitRepository.trouverParId(ligne.produitId);
      if (!produit) {
        throw new Error(`Produit ${ligne.produitId} non trouvé`);
      }
      
      if (produit.stock < ligne.quantite) {
        throw new Error(`Stock insuffisant pour ${produit.nom}`);
      }

      vente.ajouterLigne(ligne.produitId, ligne.quantite, produit.prix);
      
      // Décrémenter le stock
      await this.produitRepository.decrementerStock(ligne.produitId, ligne.quantite);
    }

    return await this.venteRepository.sauvegarder(vente);
  }

  async annulerVente(venteId) {
    const vente = await this.venteRepository.trouverParId(venteId);
    if (!vente) {
      throw new Error('Vente non trouvée');
    }

    vente.annuler();

    // Remettre le stock
    for (const ligne of vente.lignes) {
      await this.produitRepository.incrementerStock(ligne.produitId, ligne.quantite);
    }

    return await this.venteRepository.sauvegarder(vente);
  }
}

module.exports = VenteService;
