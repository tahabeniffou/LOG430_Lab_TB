const Produit = require('../../../models/Produit.js');

module.exports =  {
  listerTous(magasinId, nom) {
    const where = {};
    if (magasinId) where.magasinId = magasinId;
    if (nom) where.nom = nom;
    return Produit.findAll({ where });
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
  }
};
