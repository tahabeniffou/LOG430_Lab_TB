const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const DemandeReappro = sequelize.define('DemandeReappro', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  produitId: { type: DataTypes.INTEGER, allowNull: false },
  magasinId: { type: DataTypes.INTEGER, allowNull: false },
  quantite: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'DemandeReappros'
});

// Les associations doivent être définies dans associations.js

module.exports = DemandeReappro;