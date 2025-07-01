const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const LigneVente = sequelize.define('LigneVente', {
  quantite: DataTypes.INTEGER,
  sousTotal: DataTypes.FLOAT,
  venteId: { type: DataTypes.INTEGER, allowNull: false },
  produitId: { type: DataTypes.INTEGER, allowNull: false },
  magasinId: { type: DataTypes.INTEGER, allowNull: true }
});

module.exports = LigneVente;