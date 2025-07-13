const { DataTypes, Sequelize } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

const DemandeReappro = sequelize.define('DemandeReappro', {
  quantiteDemandee: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  statut: {
    type: DataTypes.STRING,
    defaultValue: 'en_attente' // en_attente, traitee, refusee
  }
});

// Note: Les associations seront définies dans index.js pour éviter les imports circulaires

module.exports = DemandeReappro;
