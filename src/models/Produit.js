const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Produit extends Model {
    static associate(models) {
      Produit.hasMany(models.LigneVente, { foreignKey: 'produitId', as: 'lignesDeVente' });
      Produit.belongsTo(models.Magasin, { foreignKey: 'magasinId', as: 'magasin' });
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
    }
  }, {
    sequelize,
    modelName: 'Produit',
  });

  return Produit;
};