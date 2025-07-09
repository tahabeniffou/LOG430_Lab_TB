const BaseEntity = require('./BaseEntity');

// Entité Produit - Domaine métier du microservice produit
class Produit extends BaseEntity {
  constructor(id, nom, prix, categorie = 'General', description = '', createdAt, updatedAt) {
    super(id);
    this.nom = nom;
    this.prix = prix;
    this.categorie = categorie;
    this.description = description;
    // ❌ SUPPRIMÉ: this.stock - Responsabilité du Stock Service
    if (createdAt) this.createdAt = createdAt;
    if (updatedAt) this.updatedAt = updatedAt;
  }

  // ❌ SUPPRIMÉ: Toutes les méthodes liées au stock
  // Ces responsabilités appartiennent au Stock Service

  valider() {
    if (!this.nom || this.nom.trim() === '') {
      throw new Error('Le nom du produit est requis');
    }
    if (this.prix < 0) {
      throw new Error('Le prix ne peut pas être négatif');
    }
    if (!this.categorie || this.categorie.trim() === '') {
      this.categorie = 'General';
    }
    return true;
  }

  // Méthodes business du domaine Produit uniquement
  calculerPrixAvecTaxe(tauxTaxe = 0.20) {
    return this.prix * (1 + tauxTaxe);
  }

  estDansCategorie(categorieRecherchee) {
    return this.categorie.toLowerCase() === categorieRecherchee.toLowerCase();
  }

  formaterPourAffichage() {
    return {
      id: this.id,
      nom: this.nom,
      prix: `${this.prix.toFixed(2)}€`,
      categorie: this.categorie,
      description: this.description
    };
  }
}

module.exports = Produit;
