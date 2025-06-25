const express = require('express');
const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Magasins
 *     description: Endpoints pour la gestion des magasins
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Magasin:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nom:
 *           type: string
 *           example: Magasin Principal
 */

/**
 * @openapi
 * /magasins:
 *   get:
 *     tags:
 *       - Magasins
 *     summary: Récupérer la liste des magasins
 *     description: Retourne toutes les entités magasin enregistrées dans le système.
 *     responses:
 *       200:
 *         description: Liste des magasins
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Magasin'
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/', (req, res) => {
  res.json([
    { id: 1, nom: 'Magasin Principal' },
    { id: 2, nom: 'Dépôt Central' }
  ]);
});

module.exports = router;
