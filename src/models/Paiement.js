const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Paiement = sequelize.define('Paiement', {
  moyen: DataTypes.STRING,
  montant: DataTypes.FLOAT,
  date: DataTypes.DATE,
  venteId: { type: DataTypes.INTEGER, allowNull: false }
});

module.exports = Paiement;