const Vente  = require( '../../../models/Vente.js');
const LigneVente  = require( '../../../models/LigneVente.js');
const Produit = require('../../../models/Produit.js');
const Magasin  = require( '../../../models/Magasin.js');
const { Op } = require('sequelize');

module.exports =  {
  async generer(type, { start, end }) {
    if (type === 'ventes') {
      try {
        // Récupère toutes les ventes avec les lignes et produits associés
        const ventes = await Vente.findAll({
          include: [
            { model: Magasin },
            { model: LigneVente, include: [Produit] }
          ],
          where: start && end ? { date: { [Op.between]: [start, end] } } : undefined
        });
        // Regroupe par magasin
        const rapport = {};
        for (const v of ventes) {
          const m = v.Magasin;
          if (!m) continue;
          if (!rapport[m.id]) {
            rapport[m.id] = {
              magasin: { nom: m.nom, adresse: m.adresse },
              chiffreAffaires: 0,
              produits: {},
              stock: {}
            };
          }
          rapport[m.id].chiffreAffaires += v.total || 0;
          for (const lv of v.LigneVentes || []) {
            if (lv.Produit) {
              // Top produits
              if (!rapport[m.id].produits[lv.Produit.nom]) {
                rapport[m.id].produits[lv.Produit.nom] = 0;
              }
              rapport[m.id].produits[lv.Produit.nom] += lv.quantite;
              // Stock restant
              rapport[m.id].stock[lv.Produit.nom] = lv.Produit.stock;
            }
          }
        }
        // Mise en forme finale pour la console
        return Object.values(rapport).map(r => ({
          magasin: r.magasin,
          chiffreAffaires: r.chiffreAffaires,
          topProduits: Object.entries(r.produits)
            .map(([nom, quantite]) => ({ nom, quantite }))
            .sort((a, b) => b.quantite - a.quantite)
            .slice(0, 5),
          stock: Object.entries(r.stock).map(([nom, stock]) => ({ nom, stock }))
        }));
      } catch (err) {
        console.error('Erreur lors de la génération du rapport consolidé des ventes:', err);
        throw err;
      }
    }
    if (type === 'dashboard') {
      // ...logique dashboard déjà refondue...
      const ventes = await Vente.findAll({
        include: [
          { model: Magasin },
          { model: LigneVente, include: [Produit] }
        ]
      });
      const dashboard = {};
      for (const v of ventes) {
        const m = v.Magasin;
        if (!m) continue;
        if (!dashboard[m.id]) {
          dashboard[m.id] = {
            Magasin: { nom: m.nom, adresse: m.adresse },
            chiffreAffaires: 0,
            ruptures: [],
            surstocks: [],
            tendance: []
          };
        }
        dashboard[m.id].chiffreAffaires += v.total || 0;
        for (const lv of v.LigneVentes || []) {
          if (lv.Produit && lv.Produit.stock === 0 && !dashboard[m.id].ruptures.includes(lv.Produit.nom)) {
            dashboard[m.id].ruptures.push(lv.Produit.nom);
          }
          if (lv.Produit && lv.Produit.stock > 100 && !dashboard[m.id].surstocks.includes(lv.Produit.nom)) {
            dashboard[m.id].surstocks.push(lv.Produit.nom);
          }
        }
        const jour = v.date ? new Date(v.date).toLocaleDateString() : 'inconnu';
        let t = dashboard[m.id].tendance.find(x => x.jour === jour);
        if (!t) {
          t = { jour, total: 0 };
          dashboard[m.id].tendance.push(t);
        }
        t.total += v.total || 0;
      }
      return Object.values(dashboard);
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