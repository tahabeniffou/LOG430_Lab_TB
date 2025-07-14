const express = require('express');
const ReportingController = require('./controllers/ReportingController');

function createReportingRoutes() {
  const router = express.Router();
  const reportingController = new ReportingController();

  // Routes pour les rapports
  router.get('/reports', (req, res) => reportingController.listerRapports(req, res));
  router.get('/reports/ventes', (req, res) => reportingController.genererRapportVentes(req, res));
  router.get('/reports/stock', (req, res) => reportingController.genererRapportStock(req, res));
  router.get('/reports/mouvements', (req, res) => reportingController.genererRapportMouvements(req, res));
  router.get('/reports/finances', (req, res) => reportingController.genererRapportFinances(req, res));

  return router;
}

module.exports = createReportingRoutes;
