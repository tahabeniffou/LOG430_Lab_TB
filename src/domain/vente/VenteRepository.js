// Repository interface pour les ventes
class VenteRepository {
  async sauvegarder(vente) {
    throw new Error('Method not implemented');
  }

  async trouverParId(id) {
    throw new Error('Method not implemented');
  }

  async listerParMagasin(magasinId) {
    throw new Error('Method not implemented');
  }

  async listerToutes() {
    throw new Error('Method not implemented');
  }

  async supprimer(id) {
    throw new Error('Method not implemented');
  }
}

module.exports = VenteRepository;
