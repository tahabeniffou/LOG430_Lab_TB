/**
 * Service de paiement pour la saga chorégraphiée
 * Gère le traitement des remboursements pour les réclamations validées
 */
class PaymentService {
    constructor(database, eventPublisher, logger) {
        this.database = database;
        this.eventPublisher = eventPublisher;
        this.logger = logger;
        
        // Configuration des fournisseurs de paiement
        this.paymentProviders = {
            BANK_TRANSFER: {
                name: 'Bank Transfer',
                enabled: true,
                minAmount: 1,
                maxAmount: 10000,
                processingTime: '2-3 business days',
                feePercentage: 0,
                provider: 'internal'
            },
            PAYPAL: {
                name: 'PayPal',
                enabled: true,
                minAmount: 1,
                maxAmount: 5000,
                processingTime: 'Instant',
                feePercentage: 2.9,
                provider: 'paypal'
            },
            STRIPE: {
                name: 'Stripe',
                enabled: true,
                minAmount: 1,
                maxAmount: 15000,
                processingTime: '1-2 business days',
                feePercentage: 2.4,
                provider: 'stripe'
            },
            SEPA: {
                name: 'SEPA Transfer',
                enabled: true,
                minAmount: 1,
                maxAmount: 50000,
                processingTime: '1 business day',
                feePercentage: 0.1,
                provider: 'sepa'
            }
        };
        
        // Règles de validation des paiements
        this.paymentRules = {
            maxDailyAmount: 50000,
            maxSinglePayment: 15000,
            minPayment: 1,
            allowedCurrencies: ['EUR', 'USD'],
            requiresApproval: {
                threshold: 5000,
                departments: ['FINANCE', 'MANAGEMENT']
            }
        };
        
        // Simulation de comptes bloqués ou problématiques
        this.blockedAccounts = new Set([
            'blocked-account-123',
            'invalid-iban-456',
            'closed-account-789'
        ]);
    }

    /**
     * Traite une réclamation validée pour remboursement
     */
    async handleReclamationValidated(eventData) {
        try {
            const { correlationId, reclamationId, validationResult, amount } = eventData;
            
            this.logger.info(`Processing ReclamationValidated for payment`, { 
                correlationId, 
                reclamationId,
                amount 
            });

            // Création de l'enregistrement de paiement
            const paymentId = await this.database.createPayment({
                correlationId,
                reclamationId,
                amount,
                status: 'PENDING',
                eventData,
                scheduledAt: new Date()
            });

            // Validation des règles de paiement
            const validationCheck = this.validatePaymentEligibility(eventData);
            
            if (!validationCheck.isValid) {
                // Paiement non éligible
                await this.database.updatePaymentStatus(
                    paymentId, 
                    'REJECTED', 
                    validationCheck
                );

                await this.eventPublisher.publishPaymentFailed({
                    correlationId,
                    reclamationId,
                    paymentId,
                    failureReason: validationCheck.reason,
                    details: validationCheck,
                    timestamp: new Date().toISOString()
                });

                this.logger.warn(`Payment rejected for ${correlationId}: ${validationCheck.reason}`);
                return { success: false, reason: validationCheck.reason };
            }

            // Sélection du fournisseur de paiement
            const provider = this.selectPaymentProvider(amount, eventData);
            
            // Traitement du paiement
            const paymentResult = await this.processPayment(paymentId, provider, eventData);
            
            if (paymentResult.success) {
                // Paiement réussi
                await this.database.updatePaymentStatus(
                    paymentId, 
                    'COMPLETED', 
                    paymentResult
                );

                await this.eventPublisher.publishPaymentProcessed({
                    correlationId,
                    reclamationId,
                    paymentId,
                    transactionId: paymentResult.transactionId,
                    amount: paymentResult.amount,
                    provider: provider.name,
                    paymentMethod: provider.provider,
                    timestamp: new Date().toISOString()
                });

                this.logger.info(`Payment processed successfully for ${correlationId}`, {
                    paymentId,
                    transactionId: paymentResult.transactionId,
                    amount: paymentResult.amount
                });

                return { success: true, paymentId, transactionId: paymentResult.transactionId };
                
            } else {
                // Paiement échoué
                await this.database.updatePaymentStatus(
                    paymentId, 
                    'FAILED', 
                    paymentResult
                );

                await this.eventPublisher.publishPaymentFailed({
                    correlationId,
                    reclamationId,
                    paymentId,
                    failureReason: paymentResult.error,
                    details: paymentResult,
                    timestamp: new Date().toISOString()
                });

                this.logger.error(`Payment failed for ${correlationId}`, {
                    paymentId,
                    error: paymentResult.error,
                    details: paymentResult.details
                });

                return { success: false, reason: paymentResult.error, paymentId };
            }

        } catch (error) {
            this.logger.error(`Error handling ReclamationValidated for payment:`, error);
            
            // Publication d'un événement d'échec technique
            await this.eventPublisher.publishPaymentFailed({
                correlationId: eventData.correlationId,
                reclamationId: eventData.reclamationId,
                failureReason: 'Technical payment error',
                details: { error: error.message },
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    /**
     * Valide l'éligibilité d'un paiement
     */
    validatePaymentEligibility(eventData) {
        const { amount, reclamationId } = eventData;
        const errors = [];

        // Vérification du montant minimal
        if (amount < this.paymentRules.minPayment) {
            errors.push(`Amount below minimum payment threshold (${this.paymentRules.minPayment}€)`);
        }

        // Vérification du montant maximal
        if (amount > this.paymentRules.maxSinglePayment) {
            errors.push(`Amount exceeds maximum single payment (${this.paymentRules.maxSinglePayment}€)`);
        }

        // Vérification des comptes bloqués
        if (this.blockedAccounts.has(eventData.clientId)) {
            errors.push('Client account is blocked for payments');
        }

        // Simulation d'échec aléatoire pour les tests (2% de chance)
        if (Math.random() < 0.02) {
            errors.push('Random validation failure for testing purposes');
        }

        // Vérification spéciale pour certains types de réclamation
        if (eventData.type === 'PERFORMANCE_TEST') {
            // Pour les tests de performance, on simule un échec occasionnel
            if (amount > 500 && Math.random() < 0.1) {
                errors.push('High amount payment validation failed for performance test');
            }
        }

        return {
            isValid: errors.length === 0,
            reason: errors.length > 0 ? errors[0] : null,
            errors,
            validatedAt: new Date().toISOString(),
            rules: this.paymentRules
        };
    }

    /**
     * Sélectionne le fournisseur de paiement optimal
     */
    selectPaymentProvider(amount, eventData) {
        const availableProviders = Object.entries(this.paymentProviders)
            .filter(([key, provider]) => {
                return provider.enabled &&
                       amount >= provider.minAmount &&
                       amount <= provider.maxAmount;
            })
            .map(([key, provider]) => ({ key, ...provider }));

        if (availableProviders.length === 0) {
            throw new Error('No suitable payment provider found');
        }

        // Sélection basée sur le montant et les frais
        if (amount >= 5000) {
            // Pour les gros montants, privilégier les virements bancaires (moins de frais)
            return availableProviders.find(p => p.key === 'BANK_TRANSFER') || availableProviders[0];
        } else if (amount <= 100) {
            // Pour les petits montants, privilégier les solutions rapides
            return availableProviders.find(p => p.key === 'PAYPAL') || availableProviders[0];
        } else {
            // Pour les montants moyens, équilibrer coût et rapidité
            return availableProviders.find(p => p.key === 'STRIPE') || availableProviders[0];
        }
    }

    /**
     * Traite le paiement via le fournisseur sélectionné
     */
    async processPayment(paymentId, provider, eventData) {
        try {
            this.logger.info(`Processing payment via ${provider.name}`, {
                paymentId,
                provider: provider.key,
                amount: eventData.amount
            });

            // Simulation du délai de traitement selon le fournisseur
            const processingDelay = this.getProcessingDelay(provider.key);
            await new Promise(resolve => setTimeout(resolve, processingDelay));

            // Simulation des échecs selon le fournisseur
            const failureRate = this.getFailureRate(provider.key);
            if (Math.random() < failureRate) {
                return await this.simulatePaymentFailure(provider, eventData);
            }

            // Calcul des frais
            const fees = (eventData.amount * provider.feePercentage) / 100;
            const netAmount = eventData.amount - fees;

            // Génération de l'ID de transaction
            const transactionId = this.generateTransactionId(provider.key);

            // Simulation d'appel API au fournisseur
            const apiResult = await this.callPaymentProviderAPI(provider, eventData, transactionId);

            if (apiResult.success) {
                return {
                    success: true,
                    transactionId,
                    amount: netAmount,
                    fees,
                    provider: provider.name,
                    processingTime: provider.processingTime,
                    processedAt: new Date().toISOString(),
                    apiResponse: apiResult.response
                };
            } else {
                return {
                    success: false,
                    error: apiResult.error,
                    details: apiResult.details,
                    provider: provider.name,
                    attemptedAt: new Date().toISOString()
                };
            }

        } catch (error) {
            this.logger.error(`Payment processing error for ${paymentId}:`, error);
            return {
                success: false,
                error: 'Payment processing exception',
                details: error.message,
                provider: provider.name,
                attemptedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Simule un échec de paiement avec des raisons réalistes
     */
    async simulatePaymentFailure(provider, eventData) {
        const failureReasons = [
            'INSUFFICIENT_FUNDS',
            'INVALID_ACCOUNT',
            'ACCOUNT_BLOCKED',
            'TECHNICAL_ERROR',
            'PAYMENT_PROVIDER_ERROR',
            'DAILY_LIMIT_EXCEEDED',
            'AUTHENTICATION_FAILED'
        ];

        const reason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        
        return {
            success: false,
            error: reason,
            details: this.getFailureDetails(reason),
            provider: provider.name,
            attemptedAt: new Date().toISOString(),
            retryable: this.isRetryableError(reason)
        };
    }

    /**
     * Détermine les détails d'un échec selon la raison
     */
    getFailureDetails(reason) {
        const details = {
            'INSUFFICIENT_FUNDS': 'Insufficient funds in the account',
            'INVALID_ACCOUNT': 'Invalid account number or routing information',
            'ACCOUNT_BLOCKED': 'Account is blocked or suspended',
            'TECHNICAL_ERROR': 'Temporary technical issue with payment processing',
            'PAYMENT_PROVIDER_ERROR': 'Payment provider service unavailable',
            'DAILY_LIMIT_EXCEEDED': 'Daily transaction limit exceeded',
            'AUTHENTICATION_FAILED': 'Payment authentication failed'
        };

        return details[reason] || 'Unknown payment error';
    }

    /**
     * Détermine si une erreur est récupérable
     */
    isRetryableError(reason) {
        const retryableErrors = ['TECHNICAL_ERROR', 'PAYMENT_PROVIDER_ERROR'];
        return retryableErrors.includes(reason);
    }

    /**
     * Détermine le délai de traitement selon le fournisseur
     */
    getProcessingDelay(providerKey) {
        const delays = {
            'PAYPAL': 100,      // Très rapide
            'STRIPE': 200,      // Rapide
            'SEPA': 500,        // Moyen
            'BANK_TRANSFER': 1000 // Plus lent
        };
        
        return delays[providerKey] || 300;
    }

    /**
     * Détermine le taux d'échec selon le fournisseur
     */
    getFailureRate(providerKey) {
        const rates = {
            'PAYPAL': 0.02,        // 2% d'échec
            'STRIPE': 0.03,        // 3% d'échec
            'SEPA': 0.05,          // 5% d'échec
            'BANK_TRANSFER': 0.08  // 8% d'échec
        };
        
        return rates[providerKey] || 0.05;
    }

    /**
     * Génère un ID de transaction unique
     */
    generateTransactionId(providerKey) {
        const prefix = {
            'PAYPAL': 'PAY',
            'STRIPE': 'STR',
            'SEPA': 'SEP',
            'BANK_TRANSFER': 'BNK'
        };

        const providerPrefix = prefix[providerKey] || 'TXN';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        
        return `${providerPrefix}-${timestamp}-${random}`;
    }

    /**
     * Simule l'appel API au fournisseur de paiement
     */
    async callPaymentProviderAPI(provider, eventData, transactionId) {
        try {
            // Simulation d'appel HTTP au fournisseur
            this.logger.debug(`Calling ${provider.name} API`, {
                transactionId,
                amount: eventData.amount
            });

            // Simulation du délai réseau
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

            // Simulation de réponse réussie
            return {
                success: true,
                response: {
                    transactionId,
                    status: 'COMPLETED',
                    amount: eventData.amount,
                    currency: 'EUR',
                    processedAt: new Date().toISOString(),
                    fee: (eventData.amount * provider.feePercentage) / 100,
                    reference: `REF-${transactionId}`
                }
            };

        } catch (error) {
            return {
                success: false,
                error: 'API_CALL_FAILED',
                details: error.message
            };
        }
    }

    /**
     * Récupère les statistiques de paiement
     */
    async getPaymentStats(correlationId) {
        return await this.database.getPaymentsByCorrelation(correlationId);
    }

    /**
     * Récupère les informations d'un paiement
     */
    async getPaymentInfo(paymentId) {
        return await this.database.getPaymentById(paymentId);
    }

    /**
     * Tente un nouveau paiement pour les erreurs récupérables
     */
    async retryPayment(paymentId) {
        try {
            const payment = await this.database.getPaymentById(paymentId);
            
            if (!payment) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            if (payment.status !== 'FAILED') {
                throw new Error(`Payment ${paymentId} is not in failed state`);
            }

            // Vérifier si l'erreur est récupérable
            if (!this.isRetryableError(payment.last_error)) {
                throw new Error(`Payment error is not retryable: ${payment.last_error}`);
            }

            this.logger.info(`Retrying payment ${paymentId}`);

            // Réinitialiser le statut et retraiter
            await this.database.updatePaymentStatus(paymentId, 'PENDING', {
                retryAttempt: (payment.retry_count || 0) + 1,
                retriedAt: new Date().toISOString()
            });

            // Relancer le traitement
            return await this.handleReclamationValidated(payment.event_data);

        } catch (error) {
            this.logger.error(`Error retrying payment ${paymentId}:`, error);
            throw error;
        }
    }
}

module.exports = PaymentService;
