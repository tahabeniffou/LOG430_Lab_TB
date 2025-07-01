const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const CentreLogistique = sequelize.define('CentreLogistique', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nom: { type: DataTypes.STRING, allowNull: false },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  ProduitId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'CentreLogistiques' // <-- Ajoute cette ligne pour forcer le nom de la table
});

module.exports = CentreLogistique;