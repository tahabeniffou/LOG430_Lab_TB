const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Vente = sequelize.define('Vente', {
  total: DataTypes.FLOAT,
  date: DataTypes.DATE,
  magasinId: { type: DataTypes.INTEGER, allowNull: false },
  statut: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'annulee']]
    }
  }
});

module.exports = Vente;