/**
 * @openapi
 * tags:
 *   - name: Ventes
 *     description: Gestion des ventes
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Vente:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         magasinId:
 *           type: integer
 *           example: 2
 *         date:
 *           type: string
 *           format: date-time
 *           example: '2025-06-25T09:20:13.123Z'
 *         montantTotal:
 *           type: number
 *           format: float
 *           example: 154.99
 *         caissierId:
 *           type: integer
 *           example: 4
 */

/**
 * @openapi
 * /ventes:
 *   get:
 *     tags:
 *       - Ventes
 *     summary: Récupère la liste des ventes
 *     parameters:
 *       - in: query
 *         name: magasinId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du magasin
 *     responses:
 *       200:
 *         description: Liste des ventes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vente'
 *       500:
 *         description: Erreur interne serveur
 *   post:
 *     tags:
 *       - Ventes
 *     summary: Crée une nouvelle vente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vente'
 *     responses:
 *       201:
 *         description: Vente créée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vente'
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur interne serveur
 */

/**
 * @openapi
 * /ventes/{id}:
 *   get:
 *     tags:
 *       - Ventes
 *     summary: Récupère une vente par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la vente
 *     responses:
 *       200:
 *         description: Vente trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vente'
 *       404:
 *         description: Vente non trouvée
 *       500:
 *         description: Erreur interne serveur
 *   put:
 *     tags:
 *       - Ventes
 *     summary: Met à jour une vente existante
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la vente à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vente'
 *     responses:
 *       200:
 *         description: Vente mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vente'
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Vente non trouvée
 *       500:
 *         description: Erreur interne serveur
 *   delete:
 *     tags:
 *       - Ventes
 *     summary: Supprime une vente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la vente à supprimer
 *     responses:
 *       204:
 *         description: Vente supprimée
 *       404:
 *         description: Vente non trouvée
 *       500:
 *         description: Erreur interne serveur
 */

const Router = require('express');
const venteController = require('../controllers/venteController.js');
const { invalidateCacheMiddleware } = require('../../cache/cacheMiddleware');
const { invalidationPatterns } = require('../../cache/cacheConfig');

const router = Router();

router
  .get('/', venteController.lister)
  .get('/:id', venteController.recuperer)
  .post('/', invalidateCacheMiddleware(invalidationPatterns.rapports.onVenteCreated), venteController.creer)
  .put('/:id', invalidateCacheMiddleware(invalidationPatterns.rapports.onVenteCreated), venteController.mettreAJour)
  .delete('/:id', invalidateCacheMiddleware(invalidationPatterns.rapports.onVenteCreated), venteController.supprimer)
  .post('/:id/annuler', invalidateCacheMiddleware(invalidationPatterns.rapports.onVenteCreated), venteController.annuler);

module.exports = router;
