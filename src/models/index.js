'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  // Configuration pour PostgreSQL en mode production avec DATABASE_URL
  const databaseUrl = process.env[config.use_env_variable];
  sequelize = new Sequelize(databaseUrl, {
    ...config,
    dialectOptions: {
      ssl: false // Désactiver SSL pour notre conteneur PostgreSQL local
    },
    logging: false // Désactiver les logs SQL en production
  });
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1 &&
      !['db.js', 'seed.js', 'sync.js', 'associations.js'].includes(file)
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Importer les modèles legacy (non gérés par les microservices)
const Magasin = require('./Magasin');
const Utilisateur = require('./Utilisateur');
const Categorie = require('./Categorie'); // Utilisé pour la synchronisation uniquement

// Note: Les modèles suivants sont maintenant gérés par les microservices :
// - Produit (produit-service)
// - Vente (vente-service) 
// - LigneVente (vente-service)
// - Paiement (vente-service)
// - DemandeReappro (stock-service)

// Synchroniser seulement les modèles legacy
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Base de données legacy synchronisée avec succès.');
    console.log('ℹ️  Les modèles Produit, Vente, LigneVente, Paiement et DemandeReappro sont gérés par les microservices.');
  } catch (error) {
    console.error('❌ Erreur de synchronisation de la base de données legacy:', error);
  }
};

module.exports = {
    sequelize,
    syncDatabase,
    // Modèles legacy uniquement
    Magasin,
    Utilisateur,
    Categorie
};
