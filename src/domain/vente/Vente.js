// Entité Vente - Domaine métier
class Vente {
  constructor(id, magasinId, utilisateurId, total, date = new Date()) {
    this.id = id;
    this.magasinId = magasinId;
    this.utilisateurId = utilisateurId;
    this.total = total;
    this.date = date;
    this.statut = 'active';
    this.lignes = [];
  }

  ajouterLigne(produitId, quantite, prix) {
    if (quantite <= 0) {
      throw new Error('La quantité doit être positive');
    }
    
    const sousTotal = quantite * prix;
    this.lignes.push({
      produitId,
      quantite,
      prix,
      sousTotal
    });
    
    this.recalculerTotal();
  }

  recalculerTotal() {
    this.total = this.lignes.reduce((sum, ligne) => sum + ligne.sousTotal, 0);
  }

  annuler() {
    if (this.statut === 'annulee') {
      throw new Error('Vente déjà annulée');
    }
    this.statut = 'annulee';
  }

  estActive() {
    return this.statut === 'active';
  }
}

module.exports = Vente;
