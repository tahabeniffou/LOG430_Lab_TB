const BaseEntity = require('./BaseEntity');

// Entité Vente - Domaine métier du microservice vente
class Vente extends BaseEntity {
  constructor(id, magasinId, utilisateurId, lignes, statut = 'en_cours', montantTotal = 0, createdAt, updatedAt) {
    super(id);
    if (!magasinId || !utilisateurId) {
      throw new Error('ID du magasin et de l\'utilisateur sont requis');
    }
    this.magasinId = magasinId;
    this.utilisateurId = utilisateurId;
    this.lignes = lignes || []; // Garantir que lignes est toujours un tableau
    this.statut = statut; // 'en_cours', 'terminee', 'annulee'
    this.montantTotal = montantTotal;
    if (createdAt) this.createdAt = createdAt;
    if (updatedAt) this.updatedAt = updatedAt;
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
    this.updateTimestamp();
  }

  annuler() {
    if (this.statut === 'terminee') {
      throw new Error('Une vente terminée ne peut être annulée.');
    }
    this.statut = 'annulee';
    this.updateTimestamp();
  }

  terminer() {
    if (this.statut === 'annulee') {
      throw new Error('Une vente annulée ne peut être terminée.');
    }
    this.statut = 'terminee';
    this.updateTimestamp();
  }

  valider() {
    if (!this.magasinId || !this.utilisateurId) {
      throw new Error('ID du magasin et de l\'utilisateur sont requis');
    }
    if (!['en_cours', 'terminee', 'annulee'].includes(this.statut)) {
      throw new Error('Statut de vente invalide');
    }
    if (this.montantTotal < 0) {
      throw new Error('Le montant total ne peut pas être négatif');
    }
  }

  _recalculerTotal() {
    this.montantTotal = this.lignes.reduce((sum, ligne) => sum + ligne.prixTotal, 0);
  }
}

module.exports = Vente;
