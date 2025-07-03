const { Produit } = require('../../domain/models');
const { Op } = require('sequelize');

class ProduitService {
  async listerTous(magasinId) {
    return await Produit.findAll({ where: { magasinId } });
  }

  async trouverParId(id) {
    return await Produit.findByPk(id);
  }

  async creer(data) {
    return await Produit.create(data);
  }

  async mettreAJour(id, data) {
    return await Produit.update(data, { where: { id } });
  }

  async supprimer(id) {
    return await Produit.destroy({ where: { id } });
  }

  async rechercherParNom(magasinId, nom) {
    return await Produit.findAll({
      where: {
        magasinId,
        nom: {
          [Op.iLike]: `%${nom}%`
        }
      }
    });
  }

  async getStock(magasinId) {
    return await Produit.findAll({
      where: { magasinId },
      attributes: ['id', 'nom', 'stock']
    });
  }

  async reapprovisionner(magasinId, produitId, quantite) {
    const produit = await this.trouverParId(produitId);
    if (!produit || produit.magasinId !== magasinId) {
      throw new Error('Produit non trouvé dans ce magasin');
    }
    return await produit.increment('stock', { by: quantite });
  }
}

module.exports = new ProduitService();
