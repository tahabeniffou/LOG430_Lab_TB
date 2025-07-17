const sequelize = require('./index');

// Importer tous les modèles
require('./Categorie');
require('./CentreLogistique');
require('./DemandeReappro');
require('./LigneVente');
require('./Magasin');
require('./Paiement');
require('./Produit');
require('./Utilisateur');
require('./Vente');

// Synchroniser tous les modèles
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true }); // alter: true met à jour la table sans supprimer les données
    console.log('✅ Base de données synchronisée avec succès.');
  } catch (error) {
    console.error('❌ Erreur de synchronisation de la base de données:', error);
  }
};

module.exports = syncDatabase;