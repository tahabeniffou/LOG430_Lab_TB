// Implémentation Sequelize du repository Produit
const ProduitRepository = require('../../domain/produit/ProduitRepository');
const Produit = require('../../domain/produit/Produit');
const ProduitModel = require('../../models/Produit');
const { Op } = require('sequelize');

class SequelizeProduitRepository extends ProduitRepository {
  async sauvegarder(produit) {
    const produitData = {
      nom: produit.nom,
      prix: produit.prix,
      stock: produit.stock,
      categorie: produit.categorie
    };

    let produitModel;
    if (produit.id) {
      await ProduitModel.update(produitData, { where: { id: produit.id } });
      produitModel = await ProduitModel.findByPk(produit.id);
    } else {
      produitModel = await ProduitModel.create(produitData);
    }

    return this.mapToEntity(produitModel);
  }

  async trouverParId(id) {
    const produitModel = await ProduitModel.findByPk(id);
    return produitModel ? this.mapToEntity(produitModel) : null;
  }

  async listerTous() {
    const produitsModel = await ProduitModel.findAll();
    return produitsModel.map(p => this.mapToEntity(p));
  }

  async listerParCategorie(categorie) {
    const produitsModel = await ProduitModel.findAll({
      where: { categorie }
    });
    return produitsModel.map(p => this.mapToEntity(p));
  }

  async rechercherParNom(nom) {
    const produitsModel = await ProduitModel.findAll({
      where: {
        nom: {
          [Op.iLike]: `%${nom}%`
        }
      }
    });
    return produitsModel.map(p => this.mapToEntity(p));
  }

  async decrementerStock(id, quantite) {
    const produitModel = await ProduitModel.findByPk(id);
    if (!produitModel) {
      throw new Error('Produit non trouvé');
    }

    const produit = this.mapToEntity(produitModel);
    produit.decrementerStock(quantite);
    
    await ProduitModel.update(
      { stock: produit.stock }, 
      { where: { id } }
    );
  }

  async incrementerStock(id, quantite) {
    const produitModel = await ProduitModel.findByPk(id);
    if (!produitModel) {
      throw new Error('Produit non trouvé');
    }

    const produit = this.mapToEntity(produitModel);
    produit.incrementerStock(quantite);
    
    await ProduitModel.update(
      { stock: produit.stock }, 
      { where: { id } }
    );
  }

  mapToEntity(produitModel) {
    return new Produit(
      produitModel.id,
      produitModel.nom,
      produitModel.prix,
      produitModel.stock,
      produitModel.categorie
    );
  }
}

module.exports = SequelizeProduitRepository;
