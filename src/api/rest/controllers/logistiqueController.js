const Produit = require('../../../models/Produit');

module.exports = {
  async reappro(req, res, next) {
    try {
      const { magasinId, produitId, quantite } = req.body;
      if (!magasinId || !produitId || !quantite) {
        return res.status(400).json({ message: 'magasinId, produitId et quantite requis' });
      }
      // Simule un réapprovisionnement (ajoute du stock)
      await Produit.increment('stock', { by: quantite, where: { id: produitId, magasinId } });
      res.status(200).json({ message: 'Réapprovisionnement effectué' });
    } catch (err) { next(err); }
  }
};
