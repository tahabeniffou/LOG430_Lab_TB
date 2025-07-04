// Entité Magasin - Domaine métier
class Magasin {
  constructor(id, nom, adresse) {
    this.id = id;
    this.nom = nom;
    this.adresse = adresse;
    this.utilisateurs = [];
  }

  ajouterUtilisateur(utilisateur) {
    this.utilisateurs.push(utilisateur);
  }

  obtenirUtilisateurs() {
    return this.utilisateurs;
  }
}

module.exports = Magasin;
