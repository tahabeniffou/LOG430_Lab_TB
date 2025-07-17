# Tests Automatisés d'Échec et Compensation - LAB 7

## 🎯 Tests de Robustesse pour Saga Chorégraphiée

Ce fichier documente les tests automatisés d'échec et les mécanismes de compensation pour valider la robustesse de la saga chorégraphiée.

## 🧪 Scénarios de Test d'Échec

### 1. Test d'Échec de Validation
```javascript
// Déclenche un échec de validation avec compensation automatique
const testValidationFailure = async () => {
    // Force l'échec avec description spéciale
    const reclamation = {
        titre: "Test Échec Validation",
        description: "FORCE_VALIDATION_FAILURE",
        priorite: "haute",
        type: "REMBOURSEMENT"
    };
    
    // Vérifications attendues:
    // ✅ ReclamationRejected publié
    // ✅ Saga marquée COMPENSATED
    // ✅ Pas de notification ni paiement
    // ✅ Durée < 5 secondes
};
```

### 2. Test d'Échec de Paiement avec Compensation
```javascript
// Test échec paiement avec rollback notification
const testPaymentFailureCompensation = async () => {
    const reclamation = {
        titre: "Test Échec Paiement", 
        description: "Montant 999.99€ - FORCE_PAYMENT_FAILURE",
        priorite: "haute",
        type: "REMBOURSEMENT"
    };
    
    // Vérifications attendues:
    // ✅ PaymentFailed publié
    // ✅ NotificationCancelled déclenché
    // ✅ ReclamationCancelled final
    // ✅ Compensation complète en < 10 secondes
};
```

### 3. Test de Timeout de Saga
```javascript
// Test de gestion des timeouts
const testSagaTimeout = async () => {
    // Configuration timeout 30 secondes
    // Service artificiellemment lent
    // Vérification compensation automatique
};
```

## 🔄 Mécanismes de Compensation Documentés

### Compensation de Validation
```
Échec Validation → ReclamationRejected → Saga COMPENSATED
- Aucune action supplémentaire requise
- Statut final: COMPENSATED
- Raison: VALIDATION_FAILED
```

### Compensation de Paiement
```
Échec Paiement → PaymentFailed → NotificationCancelled → ReclamationCancelled
- Annulation notification client
- Rollback statut réclamation
- Statut final: COMPENSATED  
- Raison: PAYMENT_FAILED
```

### Compensation de Notification (si ajoutée)
```
Échec Notification → NotificationFailed → (peut continuer ou compenser)
- Option: Retry notification
- Option: Compenser et annuler
```

## 📊 Métriques de Compensation

### Prometheus Metrics
```prometheus
# Compensations par raison
compensations_executed_total{reason="validation_failed|payment_failed|timeout"}

# Durée des compensations
compensation_duration_seconds{type="validation|payment|notification"}

# Taux de réussite des compensations
compensation_success_rate{service="validation|notification|payment"}
```

## 🚨 Tests d'Échec Automatisés

### Script de Test Principal
```bash
# Lancement des tests d'échec
npm run test:saga:failures

# Tests spécifiques
npm run test:validation:failure
npm run test:payment:failure  
npm run test:timeout:saga
```

### Configuration des Échecs
```javascript
const failureConfig = {
    validation: {
        failureRate: 0.05, // 5% d'échec
        triggers: ["FORCE_VALIDATION_FAILURE"]
    },
    payment: {
        failureRate: 0.07, // 7% d'échec  
        triggers: ["amount > 999", "FORCE_PAYMENT_FAILURE"]
    },
    timeout: {
        sagaTimeout: 30000, // 30 secondes
        serviceTimeout: 5000 // 5 secondes
    }
};
```

## ✅ Critères de Validation

### Tests Réussis Si:
- ✅ 100% des échecs déclenchent une compensation
- ✅ Aucune saga reste dans un état incohérent
- ✅ Compensation complète en < 15 secondes
- ✅ Événements de compensation idempotents
- ✅ Logs structurés de chaque compensation

### Métriques Attendues:
- **Taux de compensation**: 100%
- **Durée moyenne compensation**: < 5 secondes  
- **Cohérence événementielle**: 100%
- **Idempotence**: Aucun doublon d'événement

## 🎯 Robustesse Validée

Cette suite de tests garantit que la saga chorégraphiée gère correctement:
1. **Échecs de validation métier**
2. **Échecs de traitement paiement** 
3. **Timeouts de service**
4. **Compensation en cascade**
5. **Idempotence des événements**
6. **Cohérence transactionnelle**
