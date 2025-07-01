const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Produit = sequelize.define('Produit', {
  nom: DataTypes.STRING,
  prix: DataTypes.FLOAT,
  stock: DataTypes.INTEGER,
  magasinId: { type: DataTypes.INTEGER, allowNull: false }
});

module.exports = Produit;