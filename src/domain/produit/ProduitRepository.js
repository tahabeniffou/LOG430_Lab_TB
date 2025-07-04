// Repository interface pour les produits
class ProduitRepository {
  async sauvegarder(produit) {
    throw new Error('Method not implemented');
  }

  async trouverParId(id) {
    throw new Error('Method not implemented');
  }

  async listerTous() {
    throw new Error('Method not implemented');
  }

  async listerParCategorie(categorie) {
    throw new Error('Method not implemented');
  }

  async rechercherParNom(nom) {
    throw new Error('Method not implemented');
  }
}

module.exports = ProduitRepository;
