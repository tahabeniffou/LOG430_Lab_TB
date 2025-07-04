// Repository interface pour les magasins
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
}

module.exports = MagasinRepository;
