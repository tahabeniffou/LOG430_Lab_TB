/**
 * @fileoverview Routes API Panier - Interface Layer
 * @description Routes RESTful pour la gestion du panier d'achat
 */

const express = require('express');
const Joi = require('joi');

// Schémas de validation Joi
const schemas = {
    ajouterArticle: Joi.object({
        produitId: Joi.number().integer().positive().required(),
        quantite: Joi.number().integer().positive().required()
    }),

    modifierQuantite: Joi.object({
        quantite: Joi.number().integer().min(0).required()
    })
};

function createPanierRoutes(panierApplicationService) {
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

    // Middleware de validation des paramètres
    const validateClientId = (req, res, next) => {
        const { clientId } = req.params;
        if (!clientId || isNaN(clientId)) {
            return res.status(400).json({
                success: false,
                error: 'ID client invalide',
                message: 'L\'ID client doit être un nombre'
            });
        }
        req.clientId = parseInt(clientId);
        next();
    };

    // GET /api/paniers - Lister tous les paniers (admin)
    router.get('/', async (req, res) => {
        try {
            const result = await panierApplicationService.listerPaniers();
            const status = result.success ? 200 : 400;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la récupération des paniers'
            });
        }
    });

    // GET /api/paniers/client/:clientId - Obtenir le panier d'un client
    router.get('/client/:clientId', validateClientId, async (req, res) => {
        try {
            const result = await panierApplicationService.obtenirPanier(req.clientId);
            const status = result.success ? 200 : 404;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la récupération du panier'
            });
        }
    });

    // POST /api/paniers/client/:clientId/articles - Ajouter un article au panier
    router.post('/client/:clientId/articles', 
        validateClientId, 
        validate(schemas.ajouterArticle), 
        async (req, res) => {
            try {
                const { produitId, quantite } = req.body;
                const result = await panierApplicationService.ajouterArticle(
                    req.clientId, 
                    produitId, 
                    quantite
                );
                const status = result.success ? 200 : 400;
                res.status(status).json(result);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    message: 'Erreur serveur lors de l\'ajout de l\'article'
                });
            }
        }
    );

    // PUT /api/paniers/client/:clientId/articles/:produitId - Modifier quantité
    router.put('/client/:clientId/articles/:produitId', 
        validateClientId, 
        validate(schemas.modifierQuantite), 
        async (req, res) => {
            try {
                const { produitId } = req.params;
                const { quantite } = req.body;

                if (!produitId || isNaN(produitId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'ID produit invalide',
                        message: 'L\'ID produit doit être un nombre'
                    });
                }

                const result = await panierApplicationService.modifierQuantiteArticle(
                    req.clientId, 
                    parseInt(produitId), 
                    quantite
                );
                const status = result.success ? 200 : 404;
                res.status(status).json(result);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    message: 'Erreur serveur lors de la modification de la quantité'
                });
            }
        }
    );

    // DELETE /api/paniers/client/:clientId/articles/:produitId - Retirer un article
    router.delete('/client/:clientId/articles/:produitId', validateClientId, async (req, res) => {
        try {
            const { produitId } = req.params;

            if (!produitId || isNaN(produitId)) {
                return res.status(400).json({
                    success: false,
                    error: 'ID produit invalide',
                    message: 'L\'ID produit doit être un nombre'
                });
            }

            const result = await panierApplicationService.retirerArticle(
                req.clientId, 
                parseInt(produitId)
            );
            const status = result.success ? 200 : 404;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la suppression de l\'article'
            });
        }
    });

    // DELETE /api/paniers/client/:clientId - Vider le panier
    router.delete('/client/:clientId', validateClientId, async (req, res) => {
        try {
            const result = await panierApplicationService.viderPanier(req.clientId);
            const status = result.success ? 200 : 404;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors du vidage du panier'
            });
        }
    });

    return router;
}

module.exports = createPanierRoutes;
