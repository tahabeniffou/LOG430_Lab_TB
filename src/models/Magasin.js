const { Model, DataTypes } = require('sequelize');
const sequelize = require('./index');

module.exports = (sequelize, DataTypes) => {
  class Magasin extends Model {
    static associate(models) {
      // Seule association legacy restante
      Magasin.hasMany(models.Utilisateur, { foreignKey: 'magasinId', as: 'utilisateurs' });
      // Note: Les autres associations (Vente, Produit, LigneVente) sont gérées par les microservices
    }
  }

  Magasin.init({
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    adresse: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'Magasin',
  });

  return Magasin;
};