/**
 * @openapi
 * tags:
 *   - name: Utilisateurs
 *     description: Gestion des utilisateurs du système
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Utilisateur:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nom:
 *           type: string
 *           example: Dupont
 *         prenom:
 *           type: string
 *           example: Jean
 *         courriel:
 *           type: string
 *           example: jean.dupont@example.com
 *         magasinId:
 *           type: integer
 *           example: 1
 */

/**
 * @openapi
 * /utilisateurs:
 *   get:
 *     tags:
 *       - Utilisateurs
 *     summary: Récupère la liste des utilisateurs
 *     parameters:
 *       - in: query
 *         name: magasinId
 *         schema:
 *           type: integer
 *         description: ID du magasin pour filtrer les utilisateurs
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Utilisateur'
 *       500:
 *         description: Erreur interne serveur
 *   post:
 *     tags:
 *       - Utilisateurs
 *     summary: Crée un nouvel utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Utilisateur'
 *     responses:
 *       201:
 *         description: Utilisateur créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Utilisateur'
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur interne serveur
 */

/**
 * @openapi
 * /utilisateurs/{id}:
 *   get:
 *     tags:
 *       - Utilisateurs
 *     summary: Récupère un utilisateur par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Utilisateur'
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur interne serveur
 *   put:
 *     tags:
 *       - Utilisateurs
 *     summary: Met à jour un utilisateur existant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Utilisateur'
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Utilisateur'
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur interne serveur
 *   delete:
 *     tags:
 *       - Utilisateurs
 *     summary: Supprime un utilisateur
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur à supprimer
 *     responses:
 *       204:
 *         description: Utilisateur supprimé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur interne serveur
 */

const Router = require('express');
const utilisateurController = require('../controllers/utilisateurController.js');

const router = Router();

router
  .get('/',      utilisateurController.lister)
  .get('/:id',   utilisateurController.recuperer)
  .post('/',     utilisateurController.creer)
  .put('/:id',   utilisateurController.mettreAJour)
  .delete('/:id',utilisateurController.supprimer);

module.exports=  router;
