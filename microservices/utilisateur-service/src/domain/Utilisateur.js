const BaseEntity = require('./BaseEntity');

// Entité Utilisateur - Domaine métier du microservice utilisateur
class Utilisateur extends BaseEntity {
  constructor(id, nom, prenom, courriel, role, magasinId, motDePasse = null, nomUtilisateur = null, createdAt, updatedAt) {
    super(id);
    this.nom = nom;
    this.prenom = prenom;
    this.courriel = courriel;
    this.role = role;
    this.magasinId = magasinId;
    this.motDePasse = motDePasse; // Ne doit être utilisé que pour la création/mise à jour
    this.nomUtilisateur = nomUtilisateur;
    if (createdAt) this.createdAt = createdAt;
    if (updatedAt) this.updatedAt = updatedAt;
  }

  get nomComplet() {
    return `${this.prenom} ${this.nom}`;
  }

  validerRole() {
    const rolesValides = ['vendeur', 'manager', 'admin'];
    if (!rolesValides.includes(this.role)) {
      throw new Error(`Role invalide: ${this.role}`);
    }
  }

  estAdmin() {
    return this.role === 'admin';
  }

  estManager() {
    return this.role === 'manager';
  }

  estVendeur() {
    return this.role === 'vendeur';
  }

  valider() {
    if (!this.nom || this.nom.trim() === '') {
      throw new Error('Le nom est requis');
    }
    if (!this.prenom || this.prenom.trim() === '') {
      throw new Error('Le prénom est requis');
    }
    if (!this.courriel || !this.courriel.includes('@')) {
      throw new Error('Une adresse courriel valide est requise');
    }
    if (!this.role) {
      throw new Error('Le rôle est requis');
    }
    this.validerRole();
    if (!this.magasinId) {
      throw new Error('L\'ID du magasin est requis');
    }
  }

  changerRole(nouveauRole) {
    this.role = nouveauRole;
    this.validerRole();
    this.updateTimestamp();
  }

  changerMagasin(nouveauMagasinId) {
    this.magasinId = nouveauMagasinId;
    this.updateTimestamp();
  }
}

module.exports = Utilisateur;
