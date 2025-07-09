const { Model, DataTypes } = require('sequelize');

// ⚠️  MODÈLE DEPRECIÉ - MIGRÉ VERS MICROSERVICE
// Ce modèle est maintenu pour compatibilité legacy mais ne doit plus être utilisé
// Nouveau service : vente-service (port 3004)
// Utiliser : http://localhost:8000/api/v1/ventes (via Load Balancer)

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
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    montantTotal: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    utilisateurId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Vente',
  });

  return Vente;
};