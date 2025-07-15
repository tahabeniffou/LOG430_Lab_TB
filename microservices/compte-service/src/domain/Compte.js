/**
 * @fileoverview Entité Compte - Domain Layer (DDD)
 * @description Représente un compte client avec ses règles métier
 */

class Compte {
    constructor({
        id = null,
        email,
        motDePasse,
        nom,
        prenom,
        telephone = null,
        adresse = null,
        dateCreation = new Date(),
        statut = 'ACTIF',
        typeCompte = 'CLIENT'
    }) {
        // Validation des règles métier
        this.validateEmail(email);
        this.validateMotDePasse(motDePasse);
        this.validateNom(nom);
        this.validatePrenom(prenom);

        this.id = id;
        this.email = email.toLowerCase().trim();
        this.motDePasse = motDePasse;
        this.nom = nom.trim();
        this.prenom = prenom.trim();
        this.telephone = telephone?.trim();
        this.adresse = adresse?.trim();
        this.dateCreation = dateCreation;
        this.statut = statut;
        this.typeCompte = typeCompte;
    }

    // Règles métier - Validation
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            throw new Error('Email requis');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Format email invalide');
        }
    }

    validateMotDePasse(motDePasse) {
        if (!motDePasse || typeof motDePasse !== 'string') {
            throw new Error('Mot de passe requis');
        }
        if (motDePasse.length < 6) {
            throw new Error('Mot de passe doit contenir au moins 6 caractères');
        }
    }

    validateNom(nom) {
        if (!nom || typeof nom !== 'string' || nom.trim().length < 2) {
            throw new Error('Nom requis (minimum 2 caractères)');
        }
    }

    validatePrenom(prenom) {
        if (!prenom || typeof prenom !== 'string' || prenom.trim().length < 2) {
            throw new Error('Prénom requis (minimum 2 caractères)');
        }
    }

    // Méthodes métier
    changerStatut(nouveauStatut) {
        const statutsValides = ['ACTIF', 'INACTIF', 'SUSPENDU'];
        if (!statutsValides.includes(nouveauStatut)) {
            throw new Error('Statut invalide');
        }
        this.statut = nouveauStatut;
    }

    mettreAJourProfil({ nom, prenom, telephone, adresse }) {
        if (nom) {
            this.validateNom(nom);
            this.nom = nom.trim();
        }
        if (prenom) {
            this.validatePrenom(prenom);
            this.prenom = prenom.trim();
        }
        if (telephone) {
            this.telephone = telephone.trim();
        }
        if (adresse) {
            this.adresse = adresse.trim();
        }
    }

    estActif() {
        return this.statut === 'ACTIF';
    }

    // Méthode pour sérialisation (sans mot de passe)
    toPublicObject() {
        return {
            id: this.id,
            email: this.email,
            nom: this.nom,
            prenom: this.prenom,
            telephone: this.telephone,
            adresse: this.adresse,
            dateCreation: this.dateCreation,
            statut: this.statut,
            typeCompte: this.typeCompte
        };
    }
}

module.exports = Compte;
