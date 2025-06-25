const rapportService = require('../services/rapportService.js');

 module.exports =  {
  async generer(req, res, next) {
    try {
      const { type, start, end } = req.query;
      const data = await rapportService.generer(type, { start, end });
      res.json(data);
    } catch (err) { next(err); }
  },

  async recuperer(req, res, next) {
    try {
      const rpt = await rapportService.trouverParId(req.params.id);
      if (!rpt) return res.status(404).json({ message: 'Rapport non trouvé' });
      res.json(rpt);
    } catch (err) { next(err); }
  }
};
