// Interface Repository pour les utilisateurs du microservice utilisateur
class UtilisateurRepository {
  async sauvegarder(utilisateur) {
    throw new Error('Method not implemented');
  }

  async trouverParId(id) {
    throw new Error('Method not implemented');
  }

  async trouverParCourriel(courriel) {
    throw new Error('Method not implemented');
  }

  async listerTous() {
    throw new Error('Method not implemented');
  }

  async supprimer(id) {
    throw new Error('Method not implemented');
  }

  async validerMotDePasse(courriel, motDePasse) {
    throw new Error('Method not implemented');
  }
}

module.exports = UtilisateurRepository;
