const Vente  = require( '../../../models/Vente.js');
const LigneVente  = require( '../../../models/LigneVente.js');
const Produit = require('../../../models/Produit.js');
const Magasin  = require( '../../../models/Magasin.js');

 module.exports =  {
  async generer(type, { start, end }) {
    if (type === 'ventes') {
      return Vente.findAll({
        include: [
          { model: Magasin },
          { model: LigneVente, include: [Produit] }
        ],
        where: start && end ? { date: { $between: [start, end] } } : undefined
      });
    }
    if (type === 'dashboard') {
      // Implémentez la logique dashboard
      return Vente.findAll();
    }
    throw new Error('Type de rapport invalide');
  },

  trouverParId(id) {
    return Vente.findByPk(id, {
      include: [
        { model: Magasin },
        { model: LigneVente, include: [Produit] }
      ]
    });
  }
};