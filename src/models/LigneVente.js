const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LigneVente extends Model {
    static associate(models) {
      LigneVente.belongsTo(models.Vente, { foreignKey: 'venteId', as: 'vente' });
      LigneVente.belongsTo(models.Produit, { foreignKey: 'produitId', as: 'produit' });
    }
  }

  LigneVente.init({
    quantite: DataTypes.INTEGER,
    prixUnitaire: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'LigneVente',
  });

  return LigneVente;
};