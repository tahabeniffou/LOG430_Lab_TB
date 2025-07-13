const { Model, DataTypes } = require('sequelize');

// ⚠️  MODÈLE DEPRECIÉ - MIGRÉ VERS MICROSERVICE
// Ce modèle est maintenu pour compatibilité legacy mais ne doit plus être utilisé
// Nouveau service : produit-service (port 3001)
// Utiliser : http://localhost:8000/api/v1/produits (via Load Balancer)

module.exports = (sequelize, DataTypes) => {
  class Produit extends Model {
    static associate(models) {
      Produit.hasMany(models.LigneVente, { foreignKey: 'produitId', as: 'lignesDeVente' });
      Produit.belongsTo(models.Magasin, { foreignKey: 'magasinId', as: 'magasin' });
      Produit.belongsTo(models.Categorie, { foreignKey: 'categorieId', as: 'categorie' });
    }
  }

  Produit.init({
    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    prix: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    quantiteStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    categorieId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Produit',
  });

  return Produit;
};