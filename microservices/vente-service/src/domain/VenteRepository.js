// Interface Repository pour les ventes du microservice vente
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

  async listerParUtilisateur(utilisateurId) {
    throw new Error('Method not implemented');
  }

  async listerParStatut(statut) {
    throw new Error('Method not implemented');
  }
}

module.exports = VenteRepository;
