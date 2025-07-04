const BaseEntity = require('../shared/BaseEntity');

// Entité Vente - Domaine métier
class Vente extends BaseEntity {
  constructor(id, magasinId, utilisateurId, lignes, statut = 'en_cours', montantTotal = 0, createdAt, updatedAt) {
    super(id, createdAt, updatedAt);
    if (!magasinId || !utilisateurId) {
      throw new Error('ID du magasin et de l\'utilisateur sont requis');
    }
    this.magasinId = magasinId;
    this.utilisateurId = utilisateurId;
    this.lignes = lignes || []; // Garantir que lignes est toujours un tableau
    this.statut = statut; // 'en_cours', 'terminee', 'annulee'
    this.montantTotal = montantTotal;
    if (this.lignes.length > 0) {
      this._recalculerTotal();
    }
  }

  ajouterLigne(produit, quantite) {
    if (quantite <= 0) {
      throw new Error('La quantité doit être positive.');
    }
    // Idéalement, LigneVente serait sa propre classe
    this.lignes.push({ produitId: produit.id, quantite, prixUnitaire: produit.prix, prixTotal: produit.prix * quantite });
    this._recalculerTotal();
  }

  annuler() {
    if (this.statut === 'terminee') {
      throw new Error('Une vente terminée ne peut être annulée.');
    }
    this.statut = 'annulee';
  }

  _recalculerTotal() {
    this.montantTotal = this.lignes.reduce((sum, ligne) => sum + ligne.prixTotal, 0);
  }
}

module.exports = Vente;
