const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Utilisateur = sequelize.define('Utilisateur', {
  nom: { type: DataTypes.STRING, allowNull: false },
  prenom: DataTypes.STRING,
  courriel: DataTypes.STRING,
  magasinId: { type: DataTypes.INTEGER, allowNull: true }
});

module.exports = Utilisateur;