/**
 * @fileoverview Routes API Checkout - Interface Layer
 * @description Routes RESTful pour la validation et gestion des commandes
 */

const express = require('express');
const Joi = require('joi');

// Schémas de validation Joi
const schemas = {
    validerCommande: Joi.object({
        clientId: Joi.number().integer().positive().required(),
        adresseLivraison: Joi.string().min(10).required(),
        methodePaiement: Joi.string().valid('CARTE', 'PAYPAL', 'VIREMENT', 'ESPECES').required(),
        numeroCartePartiel: Joi.string().optional() // Pour logging seulement
    }),

    mettreAJourStatut: Joi.object({
        statut: Joi.string().valid('EXPEDIEE', 'LIVREE', 'ANNULEE').required()
    })
};

function createCheckoutRoutes(checkoutApplicationService) {
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

    // POST /api/checkout/valider - Valider une commande depuis un panier
    router.post('/valider', validate(schemas.validerCommande), async (req, res) => {
        try {
            const { clientId, ...donneesPaiement } = req.body;
            const result = await checkoutApplicationService.validerCommande(clientId, donneesPaiement);
            const status = result.success ? 201 : 400;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la validation de la commande'
            });
        }
    });

    // GET /api/checkout/commandes - Lister toutes les commandes (admin)
    router.get('/commandes', async (req, res) => {
        try {
            const result = await checkoutApplicationService.listerToutesCommandes();
            const status = result.success ? 200 : 400;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la récupération des commandes'
            });
        }
    });

    // GET /api/checkout/commandes/:numeroCommande - Obtenir une commande par numéro
    router.get('/commandes/:numeroCommande', async (req, res) => {
        try {
            const { numeroCommande } = req.params;
            if (!numeroCommande) {
                return res.status(400).json({
                    success: false,
                    error: 'Numéro de commande requis',
                    message: 'Le numéro de commande est obligatoire'
                });
            }

            const result = await checkoutApplicationService.obtenirCommande(numeroCommande);
            const status = result.success ? 200 : 404;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la récupération de la commande'
            });
        }
    });

    // GET /api/checkout/client/:clientId/commandes - Lister les commandes d'un client
    router.get('/client/:clientId/commandes', async (req, res) => {
        try {
            const { clientId } = req.params;
            if (!clientId || isNaN(clientId)) {
                return res.status(400).json({
                    success: false,
                    error: 'ID client invalide',
                    message: 'L\'ID client doit être un nombre'
                });
            }

            const result = await checkoutApplicationService.listerCommandesClient(parseInt(clientId));
            const status = result.success ? 200 : 400;
            res.status(status).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Erreur serveur lors de la récupération des commandes du client'
            });
        }
    });

    // PATCH /api/checkout/commandes/:numeroCommande/statut - Mettre à jour le statut d'une commande
    router.patch('/commandes/:numeroCommande/statut', 
        validate(schemas.mettreAJourStatut), 
        async (req, res) => {
            try {
                const { numeroCommande } = req.params;
                const { statut } = req.body;

                if (!numeroCommande) {
                    return res.status(400).json({
                        success: false,
                        error: 'Numéro de commande requis',
                        message: 'Le numéro de commande est obligatoire'
                    });
                }

                const result = await checkoutApplicationService.mettreAJourStatut(numeroCommande, statut);
                const status = result.success ? 200 : 404;
                res.status(status).json(result);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    message: 'Erreur serveur lors de la mise à jour du statut'
                });
            }
        }
    );

    // GET /api/checkout/statuts - Obtenir la liste des statuts possibles
    router.get('/statuts', (req, res) => {
        res.json({
            success: true,
            data: {
                statuts: [
                    { code: 'EN_ATTENTE', nom: 'En attente', description: 'Commande créée mais non validée' },
                    { code: 'VALIDEE', nom: 'Validée', description: 'Commande validée mais non payée' },
                    { code: 'PAYEE', nom: 'Payée', description: 'Paiement confirmé' },
                    { code: 'EN_PREPARATION', nom: 'En préparation', description: 'Commande en cours de préparation' },
                    { code: 'EXPEDIEE', nom: 'Expédiée', description: 'Commande expédiée' },
                    { code: 'LIVREE', nom: 'Livrée', description: 'Commande livrée' },
                    { code: 'ANNULEE', nom: 'Annulée', description: 'Commande annulée' }
                ]
            },
            message: 'Statuts récupérés avec succès'
        });
    });

    return router;
}

module.exports = createCheckoutRoutes;
