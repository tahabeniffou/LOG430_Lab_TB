const axios = require('axios');
const Database = require('./database');
const logger = require('./logger');

class SagaOrchestrator {
    constructor() {
        this.db = new Database();
        this.serviceUrls = {
            produit: process.env.PRODUIT_SERVICE_URL || 'http://localhost:8003',
            stock: process.env.STOCK_SERVICE_URL || 'http://localhost:8005',
            vente: process.env.VENTE_SERVICE_URL || 'http://localhost:8006',
            compte: process.env.COMPTE_SERVICE_URL || 'http://localhost:8007'
        };
        this.timeout = 30000; // 30 seconds timeout
    }

    async executeOrderSaga(sagaId, orderData) {
        const { produitId, quantite, clientId, montant } = orderData;
        
        // Initialize saga state
        await this.db.createSaga(sagaId, 'ORDER', orderData);
        logger.info(`Saga ${sagaId} initiated`, { sagaId, orderData });
        
        try {
            // Étape 1: Réserver le stock
            await this.emitEvent(sagaId, 'StockReservationDemandee', { produitId, quantite });
            const stockResult = await this.reserveStock(produitId, quantite);
            if (!stockResult.success) {
                await this.emitEvent(sagaId, 'StockReservationEchouee', { error: stockResult.error });
                await this.db.updateSagaStatus(sagaId, 'FAILED');
                return { success: false, error: 'StockReservationEchouee: ' + stockResult.error };
            }
            await this.emitEvent(sagaId, 'StockReserve', stockResult.data);

            // Étape 2: Traiter le paiement
            await this.emitEvent(sagaId, 'PaiementDemande', { clientId, montant });
            const paymentResult = await this.processPayment(clientId, montant);
            if (!paymentResult.success) {
                await this.emitEvent(sagaId, 'PaiementEchoue', { error: paymentResult.error });
                // Compensation: Libérer le stock
                await this.releaseStock(produitId, quantite);
                await this.emitEvent(sagaId, 'StockLibere', { produitId, quantite });
                await this.db.updateSagaStatus(sagaId, 'COMPENSATED');
                return { success: false, error: 'PaiementEchoue: ' + paymentResult.error };
            }
            await this.emitEvent(sagaId, 'PaiementReussi', paymentResult.data);

            // Étape 3: Créer la vente
            await this.emitEvent(sagaId, 'VenteDemandee', { produitId, quantite, clientId, montant });
            const saleResult = await this.createSale(produitId, quantite, clientId, montant);
            if (!saleResult.success) {
                await this.emitEvent(sagaId, 'VenteEchouee', { error: saleResult.error });
                // Compensation: Rembourser et libérer le stock
                await this.refundPayment(clientId, montant);
                await this.releaseStock(produitId, quantite);
                await this.emitEvent(sagaId, 'PaiementRembourse', { clientId, montant });
                await this.emitEvent(sagaId, 'StockLibere', { produitId, quantite });
                await this.db.updateSagaStatus(sagaId, 'COMPENSATED');
                return { success: false, error: 'VenteEchouee: ' + saleResult.error };
            }
            await this.emitEvent(sagaId, 'VenteCreee', saleResult.data);

            // Saga terminée avec succès
            await this.emitEvent(sagaId, 'CommandeTerminee', { sagaId });
            await this.db.updateSagaStatus(sagaId, 'COMPLETED');
            
            return {
                success: true,
                data: {
                    sagaId,
                    stockReservation: stockResult.data,
                    payment: paymentResult.data,
                    sale: saleResult.data
                }
            };

        } catch (error) {
            logger.error(`Saga ${sagaId} unexpected error`, { sagaId, error: error.message });
            await this.emitEvent(sagaId, 'ErreurInattendue', { error: error.message });
            await this.db.updateSagaStatus(sagaId, 'FAILED');
            return { success: false, error: 'ErreurInattendue: ' + error.message };
        }
    }

    async verifyProduct(produitId) {
        // Cette méthode n'est plus nécessaire car on simplifie à 3 étapes
        // La vérification produit sera implicite dans la réservation de stock
        return { success: true, data: { produitId } };
    }

    async reserveStock(produitId, quantite) {
        try {
            logger.info('Calling stock service for reservation', { produitId, quantite });
            const response = await axios.post(`${this.serviceUrls.stock}/stock/reserve`, {
                produitId,
                quantite
            }, { timeout: this.timeout });
            
            logger.info('Stock reservation successful', { produitId, quantite, response: response.data });
            return { success: true, data: response.data };
        } catch (error) {
            logger.error('Stock reservation failed', { produitId, quantite, error: error.message });
            if (error.response?.status === 404) {
                return { success: false, error: 'Produit non trouvé' };
            } else if (error.response?.status === 400) {
                return { success: false, error: error.response.data.error || 'Stock insuffisant' };
            }
            return { success: false, error: error.response?.data?.error || 'Erreur service stock' };
        }
    }

    async releaseStock(produitId, quantite) {
        try {
            const response = await axios.post(`${this.serviceUrls.stock}/stock/release`, {
                produitId,
                quantite
            }, { timeout: this.timeout });
            
            return { success: true, data: response.data };
        } catch (error) {
            logger.error('Stock release failed', { produitId, quantite, error: error.message });
            return { success: false, error: error.response?.data?.error || error.message };
        }
    }

    async processPayment(clientId, montant) {
        try {
            const response = await axios.post(`${this.serviceUrls.compte}/compte/debit`, {
                clientId,
                montant
            }, { timeout: this.timeout });
            
            return { success: true, data: response.data };
        } catch (error) {
            logger.error('Payment processing failed', { clientId, montant, error: error.message });
            return { success: false, error: error.response?.data?.error || error.message };
        }
    }

    async refundPayment(clientId, montant) {
        try {
            const response = await axios.post(`${this.serviceUrls.compte}/compte/credit`, {
                clientId,
                montant
            }, { timeout: this.timeout });
            
            return { success: true, data: response.data };
        } catch (error) {
            logger.error('Payment refund failed', { clientId, montant, error: error.message });
            return { success: false, error: error.response?.data?.error || error.message };
        }
    }

    async createSale(produitId, quantite, clientId, montant) {
        try {
            const response = await axios.post(`${this.serviceUrls.vente}/ventes`, {
                produitId,
                quantite,
                clientId,
                montant,
                date: new Date().toISOString()
            }, { timeout: this.timeout });
            
            return { success: true, data: response.data };
        } catch (error) {
            logger.error('Sale creation failed', { produitId, quantite, clientId, montant, error: error.message });
            return { success: false, error: error.response?.data?.error || error.message };
        }
    }

    async updateSagaStep(sagaId, stepName, status, data = null) {
        try {
            await this.db.addSagaStep(sagaId, stepName, status, data);
            logger.info(`Saga ${sagaId} step updated`, { sagaId, stepName, status });
        } catch (error) {
            logger.error(`Failed to update saga step`, { sagaId, stepName, status, error: error.message });
        }
    }

    async getSagaStatus(sagaId) {
        try {
            return await this.db.getSaga(sagaId);
        } catch (error) {
            logger.error(`Failed to get saga status`, { sagaId, error: error.message });
            throw error;
        }
    }

    async listSagas() {
        try {
            return await this.db.listSagas();
        } catch (error) {
            logger.error(`Failed to list sagas`, { error: error.message });
            throw error;
        }
    }

    async compensateSaga(sagaId) {
        try {
            const saga = await this.db.getSaga(sagaId);
            if (!saga) {
                return { success: false, error: 'Saga not found' };
            }

            const steps = saga.steps || [];
            const completedSteps = steps.filter(step => step.status === 'COMPLETED');

            // Execute compensation in reverse order
            for (let i = completedSteps.length - 1; i >= 0; i--) {
                const step = completedSteps[i];
                await this.executeCompensation(sagaId, step);
            }

            await this.db.updateSagaStatus(sagaId, 'COMPENSATED');
            return { success: true };
        } catch (error) {
            logger.error(`Saga compensation failed`, { sagaId, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async executeCompensation(sagaId, step) {
        const { produitId, quantite, clientId, montant } = JSON.parse(step.data || '{}');
        
        switch (step.step_name) {
            case 'CREATE_SALE':
                // Delete sale record would go here
                logger.info(`Compensating CREATE_SALE for saga ${sagaId}`);
                break;
            case 'PROCESS_PAYMENT':
                await this.refundPayment(clientId, montant);
                await this.updateSagaStep(sagaId, 'COMPENSATE_PAYMENT', 'COMPLETED');
                break;
            case 'RESERVE_STOCK':
                await this.releaseStock(produitId, quantite);
                await this.updateSagaStep(sagaId, 'COMPENSATE_STOCK', 'COMPLETED');
                break;
        }
    }

    // Méthode pour émettre des événements clairs
    async emitEvent(sagaId, eventType, eventData) {
        const event = {
            sagaId,
            eventType,
            eventData,
            timestamp: new Date().toISOString()
        };
        
        logger.info(`Event emitted: ${eventType}`, event);
        
        // Sauvegarder l'événement dans la base de données
        await this.db.addSagaStep(sagaId, eventType, 'EVENT', event);
        
        return event;
    }

    // Méthode pour émettre des événements clairs
    async emitEvent(sagaId, eventType, eventData) {
        const event = {
            sagaId,
            eventType,
            eventData,
            timestamp: new Date().toISOString()
        };
        
        logger.info(`Event emitted: ${eventType}`, event);
        
        // Sauvegarder l'événement dans la base de données
        await this.db.addSagaStep(sagaId, eventType, 'EVENT', event);
        
        return event;
    }
}

module.exports = SagaOrchestrator;
