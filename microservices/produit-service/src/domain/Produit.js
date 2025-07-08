const BaseEntity = require('./BaseEntity');

// Entité Produit - Domaine métier du microservice produit
class Produit extends BaseEntity {
  constructor(id, nom, prix, stock, categorie = 'General', createdAt, updatedAt) {
    super(id);
    this.nom = nom;
    this.prix = prix;
    this.stock = stock;
    this.categorie = categorie;
    if (createdAt) this.createdAt = createdAt;
    if (updatedAt) this.updatedAt = updatedAt;
  }

  peutVendre(quantite) {
    return this.stock >= quantite;
  }

  decrementerStock(quantite) {
    if (!this.peutVendre(quantite)) {
      throw new Error(`Stock insuffisant. Disponible: ${this.stock}, Demandé: ${quantite}`);
    }
    this.stock -= quantite;
    this.updateTimestamp();
  }

  incrementerStock(quantite) {
    if (quantite <= 0) {
      throw new Error('La quantité doit être positive');
    }
    this.stock += quantite;
    this.updateTimestamp();
  }

  estEnRupture() {
    return this.stock <= 0;
  }

  estEnSurstock(seuil = 100) {
    return this.stock > seuil;
  }

  valider() {
    if (!this.nom || this.nom.trim() === '') {
      throw new Error('Le nom du produit est requis');
    }
    if (this.prix < 0) {
      throw new Error('Le prix ne peut pas être négatif');
    }
    if (this.stock < 0) {
      throw new Error('Le stock ne peut pas être négatif');
    }
  }
}

module.exports = Produit;
