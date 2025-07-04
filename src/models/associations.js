const { sequelize, Magasin, Utilisateur, Vente, LigneVente, Produit } = require('./index');

// Relations Magasin-Utilisateur
Magasin.hasMany(Utilisateur, { foreignKey: 'magasinId' });
Utilisateur.belongsTo(Magasin, { foreignKey: 'magasinId' });

// Relations Magasin-Vente
Magasin.hasMany(Vente, { foreignKey: 'magasinId' });
Vente.belongsTo(Magasin, { foreignKey: 'magasinId' });

// Relations Utilisateur-Vente
Utilisateur.hasMany(Vente, { foreignKey: 'utilisateurId' });
Vente.belongsTo(Utilisateur, { foreignKey: 'utilisateurId' });

// Relations Vente-LigneVente
Vente.hasMany(LigneVente, { foreignKey: 'venteId' });
LigneVente.belongsTo(Vente, { foreignKey: 'venteId' });

// Relations Produit-LigneVente
Produit.hasMany(LigneVente, { foreignKey: 'produitId' });
LigneVente.belongsTo(Produit, { foreignKey: 'produitId' });

module.exports = {
  sequelize,
  Magasin,
  Utilisateur,
  Vente,
  LigneVente,
  Produit
};
