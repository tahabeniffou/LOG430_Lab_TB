const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Produit extends Model {
    static associate(models) {
      Produit.hasMany(models.LigneVente, { foreignKey: 'produitId', as: 'lignesDeVente' });
    }
  }

  Produit.init({
    nom: DataTypes.STRING,
    description: DataTypes.TEXT,
    prix: DataTypes.FLOAT,
    quantiteStock: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Produit',
  });

  return Produit;
};