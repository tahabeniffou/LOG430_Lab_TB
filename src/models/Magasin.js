const { Model, DataTypes } = require('sequelize');
const sequelize = require('./index');

module.exports = (sequelize, DataTypes) => {
  class Magasin extends Model {
    static associate(models) {
      Magasin.hasMany(models.Utilisateur, { foreignKey: 'magasinId', as: 'utilisateurs' });
      Magasin.hasMany(models.Vente, { foreignKey: 'magasinId', as: 'ventes' });
      Magasin.hasMany(models.Produit, { foreignKey: 'magasinId', as: 'produits' });
      Magasin.hasMany(models.LigneVente, { foreignKey: 'magasinId', as: 'lignesDeVente' });
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