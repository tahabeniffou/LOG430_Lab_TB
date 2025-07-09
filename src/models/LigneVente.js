const { Model, DataTypes } = require('sequelize');

// ⚠️  MODÈLE DEPRECIÉ - MIGRÉ VERS MICROSERVICE
// Ce modèle est maintenu pour compatibilité legacy mais ne doit plus être utilisé
// Nouveau service : vente-service (port 3004) pour les lignes de vente
// Utiliser : http://localhost:8000/api/v1/ventes (via Load Balancer)

module.exports = (sequelize, DataTypes) => {
  class LigneVente extends Model {
    static associate(models) {
      LigneVente.belongsTo(models.Vente, { foreignKey: 'venteId', as: 'vente' });
      LigneVente.belongsTo(models.Produit, { foreignKey: 'produitId', as: 'produit' });
      LigneVente.belongsTo(models.Magasin, { foreignKey: 'magasinId', as: 'magasin' });
    }
  }

  LigneVente.init({
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    prixUnitaire: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    sousTotal: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    venteId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    produitId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'LigneVente',
  });

  return LigneVente;
};