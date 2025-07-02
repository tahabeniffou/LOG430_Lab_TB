const sequelize = require('./db');
require('./Magasin');
require('./Produit');
require('./Utilisateur');
require('./Vente');
require('./LigneVente');
require('./associations');

sequelize.sync({ force: false }).then(() => {
  console.log('Base de données synchronisée');
});