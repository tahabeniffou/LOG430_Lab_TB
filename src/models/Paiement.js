const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const Vente = require('./Vente');

const Paiement = sequelize.define('Paiement', {
  montant: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  methode: {
    type: DataTypes.STRING, // ex: 'espece', 'carte'
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

Paiement.belongsTo(Vente);
Vente.hasOne(Paiement);

module.exports = Paiement;
