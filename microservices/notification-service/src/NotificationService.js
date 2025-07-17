/**
 * Service de notification pour la saga chorégraphiée
 * Gère l'envoi de notifications aux clients selon le statut de validation
 */
class NotificationService {
    constructor(database, eventPublisher, logger) {
        this.database = database;
        this.eventPublisher = eventPublisher;
        this.logger = logger;
        
        // Templates de notification
        this.templates = {
            VALIDATION_SUCCESS: {
                subject: 'Réclamation validée - Référence #{reclamationId}',
                content: `Bonjour,

Votre réclamation #{reclamationId} a été validée avec succès.

Détails:
- Type: {type}
- Montant éligible: {amount}€
- Date de validation: {validatedAt}

Prochaines étapes:
Le traitement de votre réclamation va maintenant commencer. Vous recevrez une notification dès que le processus sera terminé.

Merci de votre confiance.

L'équipe de gestion des réclamations`
            },
            
            VALIDATION_REJECTED: {
                subject: 'Réclamation rejetée - Référence #{reclamationId}',
                content: `Bonjour,

Nous regrettons de vous informer que votre réclamation #{reclamationId} a été rejetée.

Motif du rejet: {rejectionReason}

Détails:
- Type: {type}
- Montant demandé: {amount}€
- Date d'examen: {rejectedAt}

Si vous pensez qu'il s'agit d'une erreur, vous pouvez contacter notre service client.

Cordialement,

L'équipe de gestion des réclamations`
            },
            
            PAYMENT_PROCESSED: {
                subject: 'Remboursement traité - Référence #{reclamationId}',
                content: `Bonjour,

Votre remboursement pour la réclamation #{reclamationId} a été traité avec succès.

Détails du remboursement:
- Montant: {amount}€
- Méthode de paiement: {paymentMethod}
- Date de traitement: {processedAt}
- Référence de transaction: {transactionId}

Le montant devrait apparaître sur votre compte sous 2-3 jours ouvrables.

Merci de votre confiance.

L'équipe de gestion des réclamations`
            },
            
            PAYMENT_FAILED: {
                subject: 'Problème de remboursement - Référence #{reclamationId}',
                content: `Bonjour,

Nous avons rencontré un problème lors du traitement de votre remboursement pour la réclamation #{reclamationId}.

Détails:
- Montant: {amount}€
- Motif de l'échec: {failureReason}
- Date de tentative: {attemptedAt}

Actions requises:
{actionRequired}

Notre équipe va vous contacter prochainement pour résoudre ce problème.

Nous nous excusons pour ce désagrément.

L'équipe de gestion des réclamations`
            }
        };
        
        // Configuration des canaux de notification
        this.channels = {
            EMAIL: {
                enabled: true,
                priority: 1,
                provider: 'smtp'
            },
            SMS: {
                enabled: true,
                priority: 2,
                provider: 'twilio'
            },
            PUSH: {
                enabled: true,
                priority: 3,
                provider: 'firebase'
            },
            IN_APP: {
                enabled: true,
                priority: 4,
                provider: 'websocket'
            }
        };
    }

    /**
     * Traite une réclamation validée
     */
    async handleReclamationValidated(eventData) {
        try {
            const { correlationId, reclamationId, validationResult } = eventData;
            
            this.logger.info(`Processing ReclamationValidated notification`, { 
                correlationId, 
                reclamationId 
            });

            // Création de la notification dans la base de données
            const notificationId = await this.database.createNotification({
                correlationId,
                reclamationId,
                type: 'VALIDATION_SUCCESS',
                status: 'PENDING',
                eventData,
                scheduledAt: new Date()
            });

            // Préparation et envoi de la notification
            const notification = await this.prepareNotification('VALIDATION_SUCCESS', eventData);
            const result = await this.sendNotification(notification);

            // Mise à jour du statut
            await this.database.updateNotificationStatus(
                notificationId, 
                result.success ? 'SENT' : 'FAILED',
                result
            );

            // Publication de l'événement de notification envoyée
            if (result.success) {
                await this.eventPublisher.publishNotificationSent({
                    correlationId,
                    reclamationId,
                    notificationId,
                    channel: result.channel,
                    timestamp: new Date().toISOString()
                });
                
                this.logger.info(`Validation notification sent successfully`, { 
                    correlationId, 
                    reclamationId,
                    channel: result.channel
                });
            } else {
                this.logger.error(`Failed to send validation notification`, { 
                    correlationId, 
                    reclamationId,
                    error: result.error
                });
            }

            return result;

        } catch (error) {
            this.logger.error(`Error handling ReclamationValidated notification:`, error);
            throw error;
        }
    }

    /**
     * Traite une réclamation rejetée
     */
    async handleReclamationRejected(eventData) {
        try {
            const { correlationId, reclamationId, rejectionReason } = eventData;
            
            this.logger.info(`Processing ReclamationRejected notification`, { 
                correlationId, 
                reclamationId,
                reason: rejectionReason
            });

            // Création de la notification dans la base de données
            const notificationId = await this.database.createNotification({
                correlationId,
                reclamationId,
                type: 'VALIDATION_REJECTED',
                status: 'PENDING',
                eventData,
                scheduledAt: new Date()
            });

            // Préparation et envoi de la notification
            const notification = await this.prepareNotification('VALIDATION_REJECTED', eventData);
            const result = await this.sendNotification(notification);

            // Mise à jour du statut
            await this.database.updateNotificationStatus(
                notificationId, 
                result.success ? 'SENT' : 'FAILED',
                result
            );

            // Publication de l'événement (même en cas de rejet)
            if (result.success) {
                await this.eventPublisher.publishNotificationSent({
                    correlationId,
                    reclamationId,
                    notificationId,
                    channel: result.channel,
                    type: 'REJECTION',
                    timestamp: new Date().toISOString()
                });
                
                this.logger.info(`Rejection notification sent successfully`, { 
                    correlationId, 
                    reclamationId,
                    channel: result.channel
                });
            }

            return result;

        } catch (error) {
            this.logger.error(`Error handling ReclamationRejected notification:`, error);
            throw error;
        }
    }

    /**
     * Traite un paiement traité
     */
    async handlePaymentProcessed(eventData) {
        try {
            const { correlationId, reclamationId, paymentDetails } = eventData;
            
            this.logger.info(`Processing PaymentProcessed notification`, { 
                correlationId, 
                reclamationId,
                amount: paymentDetails?.amount
            });

            // Création de la notification dans la base de données
            const notificationId = await this.database.createNotification({
                correlationId,
                reclamationId,
                type: 'PAYMENT_PROCESSED',
                status: 'PENDING',
                eventData,
                scheduledAt: new Date()
            });

            // Préparation et envoi de la notification
            const notification = await this.prepareNotification('PAYMENT_PROCESSED', eventData);
            const result = await this.sendNotification(notification);

            // Mise à jour du statut
            await this.database.updateNotificationStatus(
                notificationId, 
                result.success ? 'SENT' : 'FAILED',
                result
            );

            // Publication de l'événement de notification envoyée
            if (result.success) {
                await this.eventPublisher.publishNotificationSent({
                    correlationId,
                    reclamationId,
                    notificationId,
                    channel: result.channel,
                    type: 'PAYMENT_SUCCESS',
                    timestamp: new Date().toISOString()
                });
                
                this.logger.info(`Payment notification sent successfully`, { 
                    correlationId, 
                    reclamationId,
                    channel: result.channel
                });
            }

            return result;

        } catch (error) {
            this.logger.error(`Error handling PaymentProcessed notification:`, error);
            throw error;
        }
    }

    /**
     * Traite un échec de paiement
     */
    async handlePaymentFailed(eventData) {
        try {
            const { correlationId, reclamationId, failureReason } = eventData;
            
            this.logger.info(`Processing PaymentFailed notification`, { 
                correlationId, 
                reclamationId,
                reason: failureReason
            });

            // Création de la notification dans la base de données
            const notificationId = await this.database.createNotification({
                correlationId,
                reclamationId,
                type: 'PAYMENT_FAILED',
                status: 'PENDING',
                eventData,
                scheduledAt: new Date()
            });

            // Préparation et envoi de la notification
            const notification = await this.prepareNotification('PAYMENT_FAILED', eventData);
            const result = await this.sendNotification(notification);

            // Mise à jour du statut
            await this.database.updateNotificationStatus(
                notificationId, 
                result.success ? 'SENT' : 'FAILED',
                result
            );

            // Publication de l'événement de notification envoyée
            if (result.success) {
                await this.eventPublisher.publishNotificationSent({
                    correlationId,
                    reclamationId,
                    notificationId,
                    channel: result.channel,
                    type: 'PAYMENT_FAILURE',
                    timestamp: new Date().toISOString()
                });
                
                this.logger.info(`Payment failure notification sent successfully`, { 
                    correlationId, 
                    reclamationId,
                    channel: result.channel
                });
            }

            return result;

        } catch (error) {
            this.logger.error(`Error handling PaymentFailed notification:`, error);
            throw error;
        }
    }

    /**
     * Prépare une notification selon le template
     */
    async prepareNotification(type, eventData) {
        const template = this.templates[type];
        if (!template) {
            throw new Error(`Unknown notification template: ${type}`);
        }

        // Extraction des données du client
        const clientData = await this.getClientData(eventData.reclamationId);
        
        // Remplacement des variables dans le template
        const subject = this.replaceVariables(template.subject, eventData, clientData);
        const content = this.replaceVariables(template.content, eventData, clientData);

        return {
            type,
            recipient: clientData,
            subject,
            content,
            channels: this.getPreferredChannels(clientData),
            metadata: {
                correlationId: eventData.correlationId,
                reclamationId: eventData.reclamationId,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Remplace les variables dans un template
     */
    replaceVariables(template, eventData, clientData) {
        let result = template;
        
        // Variables de l'événement
        const variables = {
            reclamationId: eventData.reclamationId,
            type: eventData.type || 'N/A',
            amount: eventData.amount || eventData.validationResult?.eligibleAmount || 0,
            rejectionReason: eventData.rejectionReason || 'Critères non respectés',
            validatedAt: eventData.timestamp ? new Date(eventData.timestamp).toLocaleString('fr-FR') : 'N/A',
            rejectedAt: eventData.timestamp ? new Date(eventData.timestamp).toLocaleString('fr-FR') : 'N/A',
            processedAt: eventData.timestamp ? new Date(eventData.timestamp).toLocaleString('fr-FR') : 'N/A',
            attemptedAt: eventData.timestamp ? new Date(eventData.timestamp).toLocaleString('fr-FR') : 'N/A',
            paymentMethod: eventData.paymentDetails?.method || 'Virement bancaire',
            transactionId: eventData.paymentDetails?.transactionId || 'TXN-' + Date.now(),
            failureReason: eventData.failureReason || 'Erreur technique',
            actionRequired: this.getActionRequired(eventData.failureReason),
            clientName: clientData.name || 'Client'
        };

        // Remplacement des variables
        Object.entries(variables).forEach(([key, value]) => {
            const pattern = new RegExp(`{${key}}`, 'g');
            result = result.replace(pattern, value);
        });

        return result;
    }

    /**
     * Détermine l'action requise selon la raison d'échec
     */
    getActionRequired(failureReason) {
        const actions = {
            'INSUFFICIENT_FUNDS': 'Veuillez vérifier votre compte bancaire et nous contacter.',
            'INVALID_ACCOUNT': 'Veuillez mettre à jour vos informations bancaires.',
            'ACCOUNT_BLOCKED': 'Veuillez contacter votre banque pour débloquer votre compte.',
            'TECHNICAL_ERROR': 'Aucune action requise de votre part. Nous allons réessayer automatiquement.',
            'PAYMENT_PROVIDER_ERROR': 'Problème technique temporaire. Nous allons réessayer sous peu.'
        };
        
        return actions[failureReason] || 'Veuillez contacter notre service client pour plus d\'informations.';
    }

    /**
     * Récupère les données du client
     */
    async getClientData(reclamationId) {
        // Dans un vrai système, ceci ferait appel à une API ou base de données
        // Pour la simulation, on génère des données basiques
        return {
            id: `client-${reclamationId}`,
            name: 'Client Test',
            email: 'client@example.com',
            phone: '+33123456789',
            preferences: {
                channels: ['EMAIL', 'SMS'],
                language: 'fr',
                timezone: 'Europe/Paris'
            }
        };
    }

    /**
     * Détermine les canaux préférés pour un client
     */
    getPreferredChannels(clientData) {
        const preferences = clientData.preferences?.channels || ['EMAIL'];
        
        return preferences
            .filter(channel => this.channels[channel]?.enabled)
            .sort((a, b) => this.channels[a].priority - this.channels[b].priority);
    }

    /**
     * Envoie une notification
     */
    async sendNotification(notification) {
        try {
            const preferredChannels = notification.channels;
            
            // Tentative d'envoi sur le canal préféré
            for (const channel of preferredChannels) {
                try {
                    const result = await this.sendViaChannel(channel, notification);
                    if (result.success) {
                        return {
                            success: true,
                            channel,
                            messageId: result.messageId,
                            sentAt: new Date().toISOString()
                        };
                    }
                } catch (channelError) {
                    this.logger.warn(`Failed to send via ${channel}:`, channelError);
                    continue; // Essayer le canal suivant
                }
            }
            
            // Aucun canal n'a fonctionné
            return {
                success: false,
                error: 'All notification channels failed',
                attemptedChannels: preferredChannels
            };
            
        } catch (error) {
            this.logger.error('Error sending notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Envoie une notification via un canal spécifique
     */
    async sendViaChannel(channel, notification) {
        const provider = this.channels[channel].provider;
        
        switch (channel) {
            case 'EMAIL':
                return await this.sendEmail(notification);
            case 'SMS':
                return await this.sendSMS(notification);
            case 'PUSH':
                return await this.sendPushNotification(notification);
            case 'IN_APP':
                return await this.sendInAppNotification(notification);
            default:
                throw new Error(`Unsupported notification channel: ${channel}`);
        }
    }

    /**
     * Simulation d'envoi d'email
     */
    async sendEmail(notification) {
        // Simulation d'envoi (dans un vrai système, utiliser nodemailer ou service tiers)
        await new Promise(resolve => setTimeout(resolve, 100)); // Simule latence réseau
        
        // Simulation d'échec aléatoire (5%)
        if (Math.random() < 0.05) {
            throw new Error('SMTP server temporarily unavailable');
        }
        
        this.logger.info('Email sent successfully', {
            to: notification.recipient.email,
            subject: notification.subject
        });
        
        return {
            success: true,
            messageId: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
    }

    /**
     * Simulation d'envoi de SMS
     */
    async sendSMS(notification) {
        // Simulation d'envoi
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Simulation d'échec aléatoire (3%)
        if (Math.random() < 0.03) {
            throw new Error('SMS gateway error');
        }
        
        this.logger.info('SMS sent successfully', {
            to: notification.recipient.phone,
            content: notification.content.substring(0, 160) + '...'
        });
        
        return {
            success: true,
            messageId: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
    }

    /**
     * Simulation d'envoi de notification push
     */
    async sendPushNotification(notification) {
        // Simulation d'envoi
        await new Promise(resolve => setTimeout(resolve, 30));
        
        // Simulation d'échec aléatoire (2%)
        if (Math.random() < 0.02) {
            throw new Error('Push notification service unavailable');
        }
        
        this.logger.info('Push notification sent successfully', {
            to: notification.recipient.id,
            title: notification.subject
        });
        
        return {
            success: true,
            messageId: `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
    }

    /**
     * Simulation d'envoi de notification in-app
     */
    async sendInAppNotification(notification) {
        // Simulation d'envoi
        await new Promise(resolve => setTimeout(resolve, 10));
        
        this.logger.info('In-app notification sent successfully', {
            to: notification.recipient.id,
            type: notification.type
        });
        
        return {
            success: true,
            messageId: `inapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
    }

    /**
     * Récupère les statistiques des notifications
     */
    async getNotificationStats(correlationId) {
        return await this.database.getNotificationsByCorrelation(correlationId);
    }
}

module.exports = NotificationService;
