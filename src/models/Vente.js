const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Vente extends Model {
    static associate(models) {
      Vente.belongsTo(models.Magasin, { foreignKey: 'magasinId', as: 'magasin' });
      Vente.belongsTo(models.Utilisateur, { foreignKey: 'utilisateurId', as: 'utilisateur' });
      Vente.hasMany(models.LigneVente, { as: 'lignesDeVente', foreignKey: 'venteId' });
    }
  }

  Vente.init({
    dateVente: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    montantTotal: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Vente',
  });

  return Vente;
};