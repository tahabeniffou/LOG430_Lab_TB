const produitService = require('../services/produitService.js');

 module.exports = {
  async lister(req, res, next) {
    try {
      const { magasinId, nom } = req.query;
      const produits = await produitService.listerTous(magasinId, nom);
      res.json(produits);
    } catch (err) { next(err); }
  },

  async recuperer(req, res, next) {
    try {
      const p = await produitService.trouverParId(req.params.id);
      if (!p) return res.status(404).json({ message: 'Produit non trouvé' });
      res.json(p);
    } catch (err) { next(err); }
  },

  async creer(req, res, next) {
    try {
      const nouveau = await produitService.creer(req.body);
      res.status(201).json(nouveau);
    } catch (err) { next(err); }
  },

  async mettreAJour(req, res, next) {
    try {
      const updated = await produitService.mettreAJour(req.params.id, req.body);
      res.json(updated);
    } catch (err) { next(err); }
  },

  async supprimer(req, res, next) {
    try {
      await produitService.supprimer(req.params.id);
      res.status(204).end();
    } catch (err) { next(err); }
  },

  async stock(req, res, next) {
    try {
      const { magasinId } = req.query;
      if (!magasinId) return res.status(400).json({ message: 'magasinId requis' });
      const produits = await produitService.listerTous(magasinId);
      res.json(produits.map(p => ({ nom: p.nom, stock: p.stock })));
    } catch (err) { next(err); }
  },

  // Route de test pour générer une erreur 500
  erreur500(req, res, next) {
    next(new Error('Erreur 500 de test'));
  }
};
