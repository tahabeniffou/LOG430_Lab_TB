// Entité LigneVente - Domaine métier
class LigneVente {
  constructor(id, produitId, quantite, prixUnitaire) {
    this.id = id;
    this.produitId = produitId;
    this.quantite = quantite;
    this.prixUnitaire = prixUnitaire;
  }
}

module.exports = LigneVente;
