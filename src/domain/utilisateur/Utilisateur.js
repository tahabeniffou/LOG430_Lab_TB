const BaseEntity = require('../shared/BaseEntity');

class Utilisateur extends BaseEntity {
  constructor(id, nom, prenom, courriel, role, magasinId, motDePasse = null, nomUtilisateur = null) {
    super(id);
    this.nom = nom;
    this.prenom = prenom;
    this.courriel = courriel;
    this.role = role;
    this.magasinId = magasinId;
    this.motDePasse = motDePasse; // Ne doit être utilisé que pour la création/mise à jour
    this.nomUtilisateur = nomUtilisateur;
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
}

module.exports = Utilisateur;
