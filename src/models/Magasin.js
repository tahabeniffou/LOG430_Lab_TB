const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Magasin = sequelize.define('Magasin', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nom: { type: DataTypes.STRING, allowNull: false },
  adresse: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: 'Magasins'
});

module.exports = Magasin;