
const venteService = require('../services/venteService.js');

 module.exports =  {
  async lister(req, res, next) {
    try {
      const ventes = await venteService.listerToutes();
      res.json(ventes);
    } catch (err) { next(err); }
  },

  async recuperer(req, res, next) {
    try {
      const v = await venteService.trouverParId(req.params.id);
      if (!v) return res.status(404).json({ message: 'Vente non trouvée' });
      res.json(v);
    } catch (err) { next(err); }
  },

  async creer(req, res, next) {
    try {
      const nv = await venteService.creer(req.body);
      res.status(201).json(nv);
    } catch (err) { next(err); }
  },

  async mettreAJour(req, res, next) {
    try {
      const updated = await venteService.mettreAJour(req.params.id, req.body);
      res.json(updated);
    } catch (err) { next(err); }
  },

  async supprimer(req, res, next) {
    try {
      await venteService.supprimer(req.params.id);
      res.status(204).end();
    } catch (err) { next(err); }
  }
};
