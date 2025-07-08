const BaseEntity = require('./BaseEntity');

// Entité Magasin - Domaine métier du microservice magasin
class Magasin extends BaseEntity {
  constructor(id, nom, adresse, createdAt, updatedAt) {
    super(id);
    this.nom = nom;
    this.adresse = adresse;
    this.utilisateurs = [];
    if (createdAt) this.createdAt = createdAt;
    if (updatedAt) this.updatedAt = updatedAt;
  }

  ajouterUtilisateur(utilisateur) {
    this.utilisateurs.push(utilisateur);
    this.updateTimestamp();
  }

  obtenirUtilisateurs() {
    return this.utilisateurs;
  }

  retirerUtilisateur(utilisateurId) {
    const index = this.utilisateurs.findIndex(u => u.id === utilisateurId);
    if (index !== -1) {
      this.utilisateurs.splice(index, 1);
      this.updateTimestamp();
      return true;
    }
    return false;
  }

  valider() {
    if (!this.nom || this.nom.trim() === '') {
      throw new Error('Le nom du magasin est requis');
    }
    if (!this.adresse || this.adresse.trim() === '') {
      throw new Error('L\'adresse du magasin est requise');
    }
  }

  compterUtilisateurs() {
    return this.utilisateurs.length;
  }
}

module.exports = Magasin;
