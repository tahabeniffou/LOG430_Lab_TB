// Entité LigneVente - Domaine métier du microservice vente
class LigneVente {
  constructor(id, produitId, quantite, prixUnitaire) {
    this.id = id;
    this.produitId = produitId;
    this.quantite = quantite;
    this.prixUnitaire = prixUnitaire;
    this.prixTotal = quantite * prixUnitaire;
  }

  calculerSousTotal() {
    return this.quantite * this.prixUnitaire;
  }

  mettreAJourQuantite(nouvelleQuantite) {
    if (nouvelleQuantite <= 0) {
      throw new Error('La quantité doit être positive');
    }
    this.quantite = nouvelleQuantite;
    this.prixTotal = this.calculerSousTotal();
  }

  valider() {
    if (!this.produitId) {
      throw new Error('ID du produit requis');
    }
    if (this.quantite <= 0) {
      throw new Error('La quantité doit être positive');
    }
    if (this.prixUnitaire < 0) {
      throw new Error('Le prix unitaire ne peut pas être négatif');
    }
  }
}

module.exports = LigneVente;
