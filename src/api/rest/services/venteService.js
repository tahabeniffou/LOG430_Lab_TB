const Produit = require('../../../models/Produit.js');
const Vente = require('../../../models/Vente.js');
const LigneVente = require('../../../models/LigneVente.js');

module.exports =  {
  listerTous() {
    return Produit.findAll();
  },

  trouverParId(id) {
    return Produit.findByPk(id);
  },

  creer(data) {
    return Produit.create(data);
  },

  async mettreAJour(id, data) {
    await Produit.update(data, { where: { id } });
    return Produit.findByPk(id);
  },

  supprimer(id) {
    return Produit.destroy({ where: { id } });
  },

  listerToutes() {
    return Vente.findAll({ include: [LigneVente] });
  },

  trouverParId(id) {
    return Vente.findByPk(id, { include: [LigneVente] });
  },

  async creer(data) {
    // Création d'une vente avec lignes de vente
    const vente = await Vente.create({
      magasinId: data.magasinId,
      utilisateurId: data.utilisateurId,
      total: data.lignes.reduce((sum, l) => sum + (l.quantite * (l.prix || 0)), 0),
      date: new Date()
    });
    for (const ligne of data.lignes) {
      await LigneVente.create({
        venteId: vente.id,
        produitId: ligne.produitId,
        quantite: ligne.quantite,
        sousTotal: ligne.quantite * (ligne.prix || 0),
        magasinId: data.magasinId
      });
      // Décrémenter le stock du produit
      await Produit.decrement('stock', { by: ligne.quantite, where: { id: ligne.produitId } });
    }
    return vente;
  },

  async mettreAJour(id, data) {
    await Vente.update(data, { where: { id } });
    return Vente.findByPk(id);
  },

  async supprimer(id) {
    await LigneVente.destroy({ where: { venteId: id } });
    return Vente.destroy({ where: { id } });
  },

  async annuler(id) {
    // Annule la vente et remet le stock
    const lignes = await LigneVente.findAll({ where: { venteId: id } });
    for (const ligne of lignes) {
      await Produit.increment('stock', { by: ligne.quantite, where: { id: ligne.produitId } });
    }
    await LigneVente.destroy({ where: { venteId: id } });
    await Vente.destroy({ where: { id } });
    return { message: 'Vente annulée' };
  }
};
