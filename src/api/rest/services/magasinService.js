const Magasin = require('../../../models/Magasin.js');

module.exports = {
  listerTous() {
    return Magasin.findAll();
  },
  trouverParId(id) {
    return Magasin.findByPk(id);
  },
  creer(data) {
    return Magasin.create(data);
  },
  mettreAJour(id, data) {
    return Magasin.update(data, { where: { id } });
  },
  supprimer(id) {
    return Magasin.destroy({ where: { id } });
  }
};
