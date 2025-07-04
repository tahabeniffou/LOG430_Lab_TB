// Implémentation Sequelize du repository Produit
const ProduitEntity = require('../../domain/produit/Produit');
const ProduitRepository = require('../../domain/produit/ProduitRepository');

class SequelizeProduitRepository extends ProduitRepository {
  constructor(db) {
    super();
    this.db = db;
    this.ProduitModel = db.Produit;
  }

  mapToEntity(m) {
    if (!m) return null;
    const modelJson = m.toJSON ? m.toJSON() : m;
    // On mappe quantiteStock du modèle Sequelize vers stock de l'entité
    // et on retourne un objet simple pour la sérialisation JSON.
    return {
      id: modelJson.id,
      nom: modelJson.nom,
      prix: modelJson.prix,
      stock: modelJson.quantiteStock, // mapping clé pour l'API/tests
      categorie: modelJson.categorie,
      magasinId: modelJson.magasinId,
      createdAt: modelJson.createdAt,
      updatedAt: modelJson.updatedAt
    };
  }

  async trouverParId(id) {
    const produitModel = await this.ProduitModel.findByPk(id);
    return produitModel ? this.mapToEntity(produitModel) : null;
  }

  async listerTous() {
    const produitsModel = await this.ProduitModel.findAll();
    return produitsModel.map(p => this.mapToEntity(p));
  }

  async sauvegarder(produit) {
    const produitData = {
      nom: produit.nom,
      description: produit.description,
      prix: produit.prix,
      quantiteStock: produit.quantiteStock
    };

    let produitModel;
    if (produit.id) {
      await this.ProduitModel.update(produitData, { where: { id: produit.id } });
      produitModel = await this.ProduitModel.findByPk(produit.id);
    } else {
      produitModel = await this.ProduitModel.create(produitData);
    }
    return this.mapToEntity(produitModel);
  }

  async decrementerStock(id, quantite) {
    const produitModel = await this.ProduitModel.findByPk(id);
    if (!produitModel) {
      throw new Error('Produit non trouvé');
    }
    if (produitModel.quantiteStock < quantite) {
      throw new Error('Stock insuffisant');
    }
    produitModel.quantiteStock -= quantite;
    await produitModel.save();
    return this.mapToEntity(produitModel);
  }

  async supprimer(id) {
    const produitModel = await this.ProduitModel.findByPk(id);
    if (produitModel) {
      await produitModel.destroy();
    }
  }
}

module.exports = SequelizeProduitRepository;
