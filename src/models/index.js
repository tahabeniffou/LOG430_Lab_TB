// src/models/index.js
const sequelize = require('./db');
const Magasin = require('./Magasin');
const Utilisateur = require('./Utilisateur');
const Vente = require('./Vente');
const LigneVente = require('./LigneVente');
const Produit = require('./Produit');

module.exports = {
  sequelize,
  Magasin,
  Utilisateur,
  Vente,
  LigneVente,
  Produit
};
