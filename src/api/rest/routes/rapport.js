/**
 * @openapi
 * tags:
 *   - name: Rapports
 *     description: Génération et consultation des rapports métiers
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     RapportVentes:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         type:
 *           type: string
 *           example: ventes
 *         date:
 *           type: string
 *           format: date
 *           example: "2025-06-01"
 *         totalVentes:
 *           type: number
 *           format: float
 *           example: 4350.50
 *         nombreTransactions:
 *           type: integer
 *           example: 78
 *     RapportDashboard:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 2
 *         type:
 *           type: string
 *           example: dashboard
 *         periode:
 *           type: string
 *           example: "Juin 2025"
 *         kpis:
 *           type: object
 *           example: { "stockRestant": 34, "ventesHebdo": 540 }
 */

/**
 * @openapi
 * /rapports:
 *   get:
 *     tags:
 *       - Rapports
 *     summary: Génère ou récupère des rapports
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ventes, dashboard]
 *         required: true
 *         description: Type de rapport à générer (ventes ou dashboard)
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD, optionnel)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD, optionnel)
 *     responses:
 *       200:
 *         description: Rapport généré
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/RapportVentes'
 *                   - $ref: '#/components/schemas/RapportDashboard'
 *       400:
 *         description: Paramètres invalides
 *       404:
 *         description: Rapport non trouvé
 *       500:
 *         description: Erreur interne serveur
 */

/**
 * @openapi
 * /rapports/{id}:
 *   get:
 *     tags:
 *       - Rapports
 *     summary: Récupère un rapport par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du rapport
 *     responses:
 *       200:
 *         description: Rapport trouvé
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/RapportVentes'
 *                 - $ref: '#/components/schemas/RapportDashboard'
 *       404:
 *         description: Rapport non trouvé
 *       500:
 *         description: Erreur interne serveur
 */

const Router = require('express');
const rapportController = require('../controllers/rapportController.js');
const { cacheMiddleware } = require('../../cache/cacheMiddleware');
const { cacheConfig } = require('../../cache/cacheConfig');

const router = Router();

// GET /api/v1/rapports?type=ventes - avec cache
router.get('/', cacheMiddleware(cacheConfig.rapports.sales), rapportController.generer);

// (optionnel) GET par ID de rapport - avec cache
router.get('/:id', cacheMiddleware(cacheConfig.rapports.detail), rapportController.recuperer);

module.exports = router;
