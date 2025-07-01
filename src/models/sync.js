const sequelize = require('./db');
require('./Magasin');
require('./Categorie');
require('./Produit');
require('./Utilisateur');
require('./Vente');
require('./LigneVente');
require('./Paiement');
require('./CentreLogistique');
require('./DemandeReappro');
require('./associations');

sequelize.sync({ force: false }).then(() => {
  console.log('Base de données synchronisée');
});