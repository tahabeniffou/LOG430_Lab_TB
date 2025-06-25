
const utilisateurService = require('../services/utilisateurService.js');

 module.exports =  {
  async lister(req, res, next) {
    try {
      const users = await utilisateurService.listerTous();
      res.json(users);
    } catch (err) { next(err); }
  },

  async recuperer(req, res, next) {
    try {
      const u = await utilisateurService.trouverParId(req.params.id);
      if (!u) return res.status(404).json({ message: 'Utilisateur non trouvé' });
      res.json(u);
    } catch (err) { next(err); }
  },

  async creer(req, res, next) {
    try {
      const nu = await utilisateurService.creer(req.body);
      res.status(201).json(nu);
    } catch (err) { next(err); }
  },

  async mettreAJour(req, res, next) {
    try {
      const updated = await utilisateurService.mettreAJour(req.params.id, req.body);
      res.json(updated);
    } catch (err) { next(err); }
  },

  async supprimer(req, res, next) {
    try {
      await utilisateurService.supprimer(req.params.id);
      res.status(204).end();
    } catch (err) { next(err); }
  }
};
