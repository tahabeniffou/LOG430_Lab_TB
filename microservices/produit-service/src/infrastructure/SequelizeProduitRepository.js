const ProduitRepository = require('../domain/ProduitRepository');
const Produit = require('../domain/Produit');
const { ProduitModel } = require('./database');

// Implémentation du repository avec Sequelize pour le microservice produit
class SequelizeProduitRepository extends ProduitRepository {
  async sauvegarder(produit) {
    try {
      produit.valider();
      
      const produitData = {
        nom: produit.nom,
        prix: produit.prix,
        stock: produit.stock,
        categorie: produit.categorie,
      };

      let savedProduit;
      if (produit.id) {
        // Mise à jour
        await ProduitModel.update(produitData, {
          where: { id: produit.id }
        });
        savedProduit = await ProduitModel.findByPk(produit.id);
      } else {
        // Création
        savedProduit = await ProduitModel.create(produitData);
      }

      return this._toDomainEntity(savedProduit);
    } catch (error) {
      throw new Error(`Erreur lors de la sauvegarde du produit: ${error.message}`);
    }
  }

  async trouverParId(id) {
    try {
      const produit = await ProduitModel.findByPk(id);
      return produit ? this._toDomainEntity(produit) : null;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche du produit par ID: ${error.message}`);
    }
  }

  async listerTous() {
    try {
      const produits = await ProduitModel.findAll({
        order: [['nom', 'ASC']],
      });
      return produits.map(p => this._toDomainEntity(p));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des produits: ${error.message}`);
    }
  }

  async trouverParCategorie(categorie) {
    try {
      const produits = await ProduitModel.findAll({
        where: { categorie },
        order: [['nom', 'ASC']],
      });
      return produits.map(p => this._toDomainEntity(p));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par catégorie: ${error.message}`);
    }
  }

  async supprimer(id) {
    try {
      const result = await ProduitModel.destroy({
        where: { id }
      });
      return result > 0;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression du produit: ${error.message}`);
    }
  }

  async rechercherParNom(nom) {
    try {
      const produits = await ProduitModel.findAll({
        where: {
          nom: {
            [require('sequelize').Op.like]: `%${nom}%`
          }
        },
        order: [['nom', 'ASC']],
      });
      return produits.map(p => this._toDomainEntity(p));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par nom: ${error.message}`);
    }
  }

  async listerEnRupture() {
    try {
      const produits = await ProduitModel.findAll({
        where: {
          stock: 0
        },
        order: [['nom', 'ASC']],
      });
      return produits.map(p => this._toDomainEntity(p));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche des produits en rupture: ${error.message}`);
    }
  }

  async listerStockFaible(seuil = 10) {
    try {
      const produits = await ProduitModel.findAll({
        where: {
          stock: {
            [require('sequelize').Op.lte]: seuil,
            [require('sequelize').Op.gt]: 0
          }
        },
        order: [['stock', 'ASC']],
      });
      return produits.map(p => this._toDomainEntity(p));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche des produits à stock faible: ${error.message}`);
    }
  }

  // Méthode privée pour convertir le modèle Sequelize vers l'entité métier
  _toDomainEntity(sequelizeModel) {
    if (!sequelizeModel) return null;
    
    return new Produit(
      sequelizeModel.id,
      sequelizeModel.nom,
      parseFloat(sequelizeModel.prix),
      sequelizeModel.stock,
      sequelizeModel.categorie,
      sequelizeModel.createdAt,
      sequelizeModel.updatedAt
    );
  }
}

module.exports = SequelizeProduitRepository;
