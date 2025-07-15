/**
 * @fileoverview Routes API Compte - Interface Layer
 * @description Routes RESTful pour la gestion des comptes clients
 */

const express = require('express');
const Joi = require('joi');

// Schémas de validation Joi
const schemas = {
    creerCompte: Joi.object({
        email: Joi.string().email().required(),
        motDePasse: Joi.string().min(6).required(),
        nom: Joi.string().min(2).required(),
        prenom: Joi.string().min(2).required(),
        telephone: Joi.string().optional(),
        adresse: Joi.string().optional()
    }),

    authentifier: Joi.object({
        email: Joi.string().email().required(),
        motDePasse: Joi.string().required()
    }),

    mettreAJourProfil: Joi.object({
        nom: Joi.string().min(2).optional(),
        prenom: Joi.string().min(2).optional(),
        telephone: Joi.string().optional(),
        adresse: Joi.string().optional()
    }),

    changerStatut: Joi.object({
        statut: Joi.string().valid('ACTIF', 'INACTIF', 'SUSPENDU').required()
    })
};

function createCompteRoutes(compteApplicationService) {
    const router = express.Router();

    // Middleware de validation
    const validate = (schema) => {
        return (req, res, next) => {
            const { error } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: error.details[0].message,
                    message: 'Données invalides'
                });
            }
            next();
        };
    };

    // POST /api/comptes - Créer un compte
    router.post('/', validate(schemas.creerCompte), async (req, res) => {
        try {
            const result = await compteApplicationService.creerCompte(req.body);
            const status = result.success ? 201 : 400;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la création du compte'
            });
        }
    });

    // POST /api/comptes/auth - Authentifier
    router.post('/auth', validate(schemas.authentifier), async (req, res) => {
        try {
            const { email, motDePasse } = req.body;
            const result = await compteApplicationService.authentifier(email, motDePasse);
            const status = result.success ? 200 : 401;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de l\'authentification'
            });
        }
    });

    // GET /api/comptes - Lister tous les comptes
    router.get('/', async (req, res) => {
        try {
            const result = await compteApplicationService.listerComptes();
            const status = result.success ? 200 : 400;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la récupération des comptes'
            });
        }
    });

    // GET /api/comptes/:id - Obtenir un compte par ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'ID invalide',
                    message: 'L\'ID doit être un nombre'
                });
            }

            const result = await compteApplicationService.obtenirCompte(parseInt(id));
            const status = result.success ? 200 : 404;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la récupération du compte'
            });
        }
    });

    // PUT /api/comptes/:id - Mettre à jour un profil
    router.put('/:id', validate(schemas.mettreAJourProfil), async (req, res) => {
        try {
            const { id } = req.params;
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'ID invalide',
                    message: 'L\'ID doit être un nombre'
                });
            }

            const result = await compteApplicationService.mettreAJourProfil(parseInt(id), req.body);
            const status = result.success ? 200 : 404;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la mise à jour du profil'
            });
        }
    });

    // PATCH /api/comptes/:id/statut - Changer le statut d'un compte
    router.patch('/:id/statut', validate(schemas.changerStatut), async (req, res) => {
        try {
            const { id } = req.params;
            const { statut } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'ID invalide',
                    message: 'L\'ID doit être un nombre'
                });
            }

            const result = await compteApplicationService.changerStatutCompte(parseInt(id), statut);
            const status = result.success ? 200 : 404;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors du changement de statut'
            });
        }
    });

    return router;
}

module.exports = createCompteRoutes;
