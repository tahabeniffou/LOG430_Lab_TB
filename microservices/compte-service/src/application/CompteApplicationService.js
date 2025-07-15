/**
 * @fileoverview Service Application Compte - Application Layer (DDD)
 * @description Orchestration des cas d'usage métier pour les comptes
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Compte = require('../domain/Compte');

class CompteApplicationService {
    constructor(compteRepository) {
        this.compteRepository = compteRepository;
        this.saltRounds = 10;
        this.jwtSecret = process.env.JWT_SECRET || 'secret-key-dev';
    }

    // Cas d'usage : Créer un compte
    async creerCompte(donnees) {
        try {
            // Vérifier si l'email existe déjà
            const compteExistant = await this.compteRepository.rechercherParEmail(donnees.email);
            if (compteExistant) {
                throw new Error('Un compte avec cet email existe déjà');
            }

            // Hasher le mot de passe
            const motDePasseHashe = await bcrypt.hash(donnees.motDePasse, this.saltRounds);

            // Créer l'entité Compte avec validation métier
            const compte = new Compte({
                ...donnees,
                motDePasse: motDePasseHashe
            });

            // Persister
            const compteCreer = await this.compteRepository.sauvegarder(compte);
            
            return {
                success: true,
                data: compteCreer.toPublicObject(),
                message: 'Compte créé avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la création du compte'
            };
        }
    }

    // Cas d'usage : Authentifier un compte
    async authentifier(email, motDePasse) {
        try {
            const compte = await this.compteRepository.rechercherParEmail(email);
            if (!compte) {
                throw new Error('Email ou mot de passe incorrect');
            }

            if (!compte.estActif()) {
                throw new Error('Compte inactif ou suspendu');
            }

            const motDePasseValide = await bcrypt.compare(motDePasse, compte.motDePasse);
            if (!motDePasseValide) {
                throw new Error('Email ou mot de passe incorrect');
            }

            // Générer JWT
            const token = jwt.sign(
                { 
                    id: compte.id, 
                    email: compte.email,
                    typeCompte: compte.typeCompte 
                },
                this.jwtSecret,
                { expiresIn: '24h' }
            );

            return {
                success: true,
                data: {
                    compte: compte.toPublicObject(),
                    token: token
                },
                message: 'Authentification réussie'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur d\'authentification'
            };
        }
    }

    // Cas d'usage : Obtenir un compte par ID
    async obtenirCompte(id) {
        try {
            const compte = await this.compteRepository.rechercherParId(id);
            if (!compte) {
                throw new Error('Compte non trouvé');
            }

            return {
                success: true,
                data: compte.toPublicObject(),
                message: 'Compte récupéré avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la récupération du compte'
            };
        }
    }

    // Cas d'usage : Mettre à jour un profil
    async mettreAJourProfil(id, donnees) {
        try {
            const compte = await this.compteRepository.rechercherParId(id);
            if (!compte) {
                throw new Error('Compte non trouvé');
            }

            // Appliquer les règles métier
            compte.mettreAJourProfil(donnees);

            // Persister
            const compteMisAJour = await this.compteRepository.sauvegarder(compte);

            return {
                success: true,
                data: compteMisAJour.toPublicObject(),
                message: 'Profil mis à jour avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la mise à jour du profil'
            };
        }
    }

    // Cas d'usage : Lister tous les comptes (admin)
    async listerComptes() {
        try {
            const comptes = await this.compteRepository.listerTous();
            
            return {
                success: true,
                data: comptes.map(compte => compte.toPublicObject()),
                count: comptes.length,
                message: 'Comptes récupérés avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la récupération des comptes'
            };
        }
    }

    // Cas d'usage : Changer le statut d'un compte
    async changerStatutCompte(id, nouveauStatut) {
        try {
            const compte = await this.compteRepository.rechercherParId(id);
            if (!compte) {
                throw new Error('Compte non trouvé');
            }

            compte.changerStatut(nouveauStatut);
            const compteMisAJour = await this.compteRepository.sauvegarder(compte);

            return {
                success: true,
                data: compteMisAJour.toPublicObject(),
                message: `Statut du compte changé vers ${nouveauStatut}`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors du changement de statut'
            };
        }
    }
}

module.exports = CompteApplicationService;
