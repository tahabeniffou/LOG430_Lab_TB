// Interface Repository pour les magasins du microservice magasin
class MagasinRepository {
  async sauvegarder(magasin) {
    throw new Error('Method not implemented');
  }

  async trouverParId(id) {
    throw new Error('Method not implemented');
  }

  async listerTous() {
    throw new Error('Method not implemented');
  }

  async supprimer(id) {
    throw new Error('Method not implemented');
  }

  async rechercherParNom(nom) {
    throw new Error('Method not implemented');
  }

  async rechercherParAdresse(adresse) {
    throw new Error('Method not implemented');
  }
}

module.exports = MagasinRepository;
