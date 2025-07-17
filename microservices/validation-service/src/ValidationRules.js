class ValidationRules {
    static validateReclamation(reclamationData) {
        const results = {
            isValid: true,
            errors: [],
            validationDetails: {}
        };

        // Règle 1: Validation du titre
        if (!reclamationData.titre || reclamationData.titre.length < 5) {
            results.isValid = false;
            results.errors.push('Titre trop court (minimum 5 caractères)');
        }
        results.validationDetails.titreValid = results.errors.length === 0;

        // Règle 2: Validation de la description
        if (!reclamationData.description || reclamationData.description.length < 10) {
            results.isValid = false;
            results.errors.push('Description trop courte (minimum 10 caractères)');
        }
        results.validationDetails.descriptionValid = !results.errors.some(e => e.includes('Description'));

        // Règle 3: Validation du montant
        if (reclamationData.amount && reclamationData.amount > 1000) {
            results.isValid = false;
            results.errors.push('Montant trop élevé (maximum 1000€)');
        }
        results.validationDetails.amountValid = !results.errors.some(e => e.includes('Montant'));

        // Règle 4: Validation du type
        const validTypes = ['REMBOURSEMENT', 'ECHANGE', 'REPARATION', 'PLAINTE'];
        if (!validTypes.includes(reclamationData.type)) {
            results.isValid = false;
            results.errors.push('Type de réclamation invalide');
        }
        results.validationDetails.typeValid = !results.errors.some(e => e.includes('Type'));

        // Règle 5: Validation de la priorité
        const validPriorities = ['basse', 'normale', 'haute', 'critique'];
        if (!validPriorities.includes(reclamationData.priorite)) {
            results.isValid = false;
            results.errors.push('Priorité invalide');
        }
        results.validationDetails.prioriteValid = !results.errors.some(e => e.includes('Priorité'));

        // Règle 6: Force d'échec pour tests
        if (reclamationData.description && reclamationData.description.includes('FORCE_VALIDATION_FAILURE')) {
            results.isValid = false;
            results.errors.push('Échec forcé pour test');
        }

        // Règle 7: Simulation d'échec aléatoire (5%)
        if (Math.random() < 0.05) {
            results.isValid = false;
            results.errors.push('Échec de validation aléatoire (simulation)');
        }

        return results;
    }

    static getValidationSummary(validationResult) {
        return {
            status: validationResult.isValid ? 'APPROVED' : 'REJECTED',
            errorCount: validationResult.errors.length,
            validationScore: this.calculateValidationScore(validationResult.validationDetails),
            details: validationResult.validationDetails
        };
    }

    static calculateValidationScore(details) {
        const totalRules = Object.keys(details).length;
        const passedRules = Object.values(details).filter(v => v === true).length;
        return totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0;
    }
}

module.exports = ValidationRules;
