// Entité Produit - Domaine métier
class Produit {
  constructor(id, nom, prix, stock, categorie = 'General') {
    this.id = id;
    this.nom = nom;
    this.prix = prix;
    this.stock = stock;
    this.categorie = categorie;
  }

  peutVendre(quantite) {
    return this.stock >= quantite;
  }

  decrementerStock(quantite) {
    if (!this.peutVendre(quantite)) {
      throw new Error(`Stock insuffisant. Disponible: ${this.stock}, Demandé: ${quantite}`);
    }
    this.stock -= quantite;
  }

  incrementerStock(quantite) {
    if (quantite <= 0) {
      throw new Error('La quantité doit être positive');
    }
    this.stock += quantite;
  }

  estEnRupture() {
    return this.stock <= 0;
  }

  estEnSurstock(seuil = 100) {
    return this.stock > seuil;
  }
}

module.exports = Produit;
