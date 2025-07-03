/**
 * @openapi
 * tags:
 *   - name: Produits
 *     description: Endpoints pour gérer les produits du magasin
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Produit:
 *       type: object
 *       required:
 *         - nom
 *         - prix
 *         - stock
 *         - magasinId
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nom:
 *           type: string
 *           example: "Bière IPA"
 *         prix:
 *           type: number
 *           format: float
 *           example: 4.99
 *         stock:
 *           type: integer
 *           example: 34
 *         magasinId:
 *           type: integer
 *           example: 1
 */

/**
 * @openapi
 * /produits:
 *   get:
 *     tags:
 *       - Produits
 *     summary: Récupère la liste des produits
 *     parameters:
 *       - in: query
 *         name: magasinId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du magasin (obligatoire)
 *       - in: query
 *         name: nom
 *         schema:
 *           type: string
 *         description: Filtre par nom de produit (partiel, optionnel)
 *     responses:
 *       200:
 *         description: Liste des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Produit'
 *       400:
 *         description: Paramètres invalides
 *       500:
 *         description: Erreur interne serveur
 *   post:
 *     tags:
 *       - Produits
 *     summary: Crée un nouveau produit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Produit'
 *     responses:
 *       201:
 *         description: Produit créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Produit'
 *       400:
 *         description: Paramètres invalides
 *       500:
 *         description: Erreur interne serveur
 */

/**
 * @openapi
 * /produits/{id}:
 *   get:
 *     tags:
 *       - Produits
 *     summary: Récupère un produit par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du produit à récupérer
 *     responses:
 *       200:
 *         description: Produit trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Produit'
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur interne serveur
 *   put:
 *     tags:
 *       - Produits
 *     summary: Met à jour un produit existant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du produit à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Produit'
 *     responses:
 *       200:
 *         description: Produit mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Produit'
 *       404:
 *         description: Produit non trouvé
 *       400:
 *         description: Paramètres invalides
 *       500:
 *         description: Erreur interne serveur
 *   delete:
 *     tags:
 *       - Produits
 *     summary: Supprime un produit par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du produit à supprimer
 *     responses:
 *       204:
 *         description: Produit supprimé (aucun contenu)
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur interne serveur
 */

const Router = require('express');
const produitController = require('../controllers/produitController.js');
const { cacheMiddleware, invalidateCacheMiddleware } = require('../../cache/cacheMiddleware');
const { cacheConfig, invalidationPatterns } = require('../../cache/cacheConfig');
const router = Router();

router
  .get('/', cacheMiddleware(cacheConfig.produits.list), produitController.lister)
  .get('/stock', cacheMiddleware(cacheConfig.produits.stock), produitController.stock)
  .get('/erreur500', produitController.erreur500)
  .get('/:id', cacheMiddleware(cacheConfig.produits.detail), produitController.recuperer)
  .post('/', invalidateCacheMiddleware(invalidationPatterns.produits.create), produitController.creer)
  .put('/:id', invalidateCacheMiddleware(invalidationPatterns.produits.update), produitController.mettreAJour)
  .delete('/:id', invalidateCacheMiddleware(invalidationPatterns.produits.delete), produitController.supprimer);

module.exports = router;

// Correction : placer '/stock' avant '/:id' pour éviter les collisions de routes
// (déjà correct dans l'ordre ci-dessus, mais on s'assure que '/stock' précède '/:id')
