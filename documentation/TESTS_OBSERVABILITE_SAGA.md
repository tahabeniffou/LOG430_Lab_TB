# TESTS ET OBSERVABILITÉ DE LA SAGA CHORÉGRAPHIÉE

## Vue d'ensemble

Cette documentation décrit les tests et l'observabilité mis en place pour valider la saga chorégraphiée implémentée dans le cadre du LAB 7 - Partie 2.

## Architecture des Tests

### 1. Types de Tests Implémentés

#### Tests Fonctionnels
- **Saga de Succès Complet**: Validation du flux nominal avec tous les services
- **Échec de Validation**: Test de compensation après échec de validation métier
- **Échec de Paiement**: Test de compensation après échec de traitement du paiement
- **Sagas Concurrentes**: Test de performance avec plusieurs sagas simultanées

#### Tests de Résilience
- **Timeout de Saga**: Validation des timeouts et gestion des échecs
- **Compensation en Cascade**: Vérification des mécanismes de rollback
- **Cohérence Événementielle**: Validation de l'ordre et de la cohérence des événements

### 2. Scénarios de Test Détaillés

#### Scénario 1: Flux de Succès Nominal
```
Réclamation Créée → Validation Réussie → Notification Envoyée → Paiement Traité → Réclamation Complétée
```

**Critères de Validation:**
- ✅ Tous les événements sont publiés dans l'ordre
- ✅ Saga marquée comme COMPLETED
- ✅ Durée totale < 30 secondes
- ✅ Pas d'événements de compensation

#### Scénario 2: Échec de Validation
```
Réclamation Créée → Validation Échouée → Compensation → Réclamation Annulée
```

**Critères de Validation:**
- ✅ Événement ReclamationRejected publié
- ✅ Saga marquée comme COMPENSATED
- ✅ Raison de compensation enregistrée
- ✅ Pas de notification ni paiement

#### Scénario 3: Échec de Paiement avec Compensation
```
Réclamation Créée → Validation Réussie → Notification Envoyée → Paiement Échoué → Compensation → Réclamation Annulée
```

**Critères de Validation:**
- ✅ Événement PaymentFailed publié
- ✅ Événement NotificationCancelled publié
- ✅ Saga marquée comme COMPENSATED
- ✅ Historique complet des étapes disponible

#### Scénario 4: Sagas Concurrentes
```
5 Sagas lancées simultanément avec traitement parallèle
```

**Critères de Validation:**
- ✅ Toutes les sagas sont créées
- ✅ Pas d'interférence entre sagas
- ✅ Chaque saga maintient son état indépendamment
- ✅ Performance acceptable (< 45 secondes pour toutes)

## Métriques d'Observabilité

### 1. Métriques Prometheus Implémentées

#### Métriques de Saga
```prometheus
# Nombre total de sagas démarrées
sagas_started_total{saga_type="reclamation_processing"}

# Nombre total de sagas terminées (succès/échec)
sagas_completed_total{saga_type="reclamation_processing", result="success|compensated"}

# Durée d'exécution des sagas
saga_duration_seconds{saga_type="reclamation_processing"}

# Nombre total de compensations exécutées
compensations_executed_total{reason="validation_failed|payment_failed|timeout"}
```

#### Métriques par Service
```prometheus
# Événements publiés par type
events_published_total{event_type="ReclamationCreated|ReclamationValidated|..."}

# Requêtes HTTP par service
http_requests_total{method="POST|GET", route="/api/reclamations", status_code="200|500"}

# Événements traités avec succès/échec
events_processed_total{service="validation|notification|payment", result="success|failure"}
```

### 2. Dashboards Grafana

#### Dashboard Principal: "Saga Choreography Overview"
- **Panel 1**: Sagas créées vs terminées (graphique temporel)
- **Panel 2**: Taux de succès des sagas (gauge)
- **Panel 3**: Durée moyenne des sagas (stat)
- **Panel 4**: Distribution des compensations par raison (pie chart)

#### Dashboard Détaillé: "Saga Services Monitoring"
- **Panel 1**: Throughput par service (graphique multi-séries)
- **Panel 2**: Latence par service (heatmap)
- **Panel 3**: Taux d'erreur par service (graphique temporel)
- **Panel 4**: État des queues RabbitMQ (table)

### 3. Alerting Rules

#### Alertes Critiques
```yaml
# Taux d'échec de saga élevé
- alert: HighSagaFailureRate
  expr: rate(sagas_completed_total{result="compensated"}[5m]) / rate(sagas_completed_total[5m]) > 0.1
  for: 2m
  
# Saga bloquée (timeout)
- alert: SagaTimeout
  expr: saga_duration_seconds > 60
  for: 1m

# Service indisponible
- alert: ServiceDown
  expr: up{job=~"validation-service|notification-service|payment-service"} == 0
  for: 30s
```

## Scripts de Test

### 1. Test Suite Automatisée

#### Lancement des Tests
```bash
# Tests complets de saga
npm run test:saga

# Tests de performance
npm run test:saga:performance

# Tests de résilience
npm run test:saga:resilience
```

#### Configuration des Tests
```javascript
const testConfig = {
    concurrentSagas: 5,
    timeoutSaga: 30000,
    maxRetries: 3,
    services: {
        reclamation: 'http://localhost:8011',
        validation: 'http://localhost:8012',
        notification: 'http://localhost:8013',
        payment: 'http://localhost:8014'
    }
};
```

### 2. Validation des Résultats

#### Critères de Succès Global
- ✅ 100% des tests fonctionnels passent
- ✅ Taux de succès des sagas > 90% (hors échecs simulés)
- ✅ Durée moyenne des sagas < 15 secondes
- ✅ Aucune perte d'événement
- ✅ Compensation correcte en cas d'échec

#### Rapports de Test
```javascript
{
    "summary": {
        "total_tests": 4,
        "passed": 4,
        "failed": 0,
        "success_rate": "100%"
    },
    "sagas": {
        "total_executed": 11,
        "completed": 7,
        "compensated": 4,
        "average_duration": "12.3s"
    },
    "performance": {
        "concurrent_handling": "✅ Passed",
        "event_ordering": "✅ Maintained",
        "compensation_speed": "✅ < 5s"
    }
}
```

## Déploiement et Exécution

### 1. Lancement de l'Environnement de Test

#### Docker Compose pour Saga
```bash
# Démarrage des services saga
docker-compose -f docker-compose-saga.yml up -d

# Vérification de l'état des services
docker-compose -f docker-compose-saga.yml ps

# Consultation des logs
docker-compose -f docker-compose-saga.yml logs -f
```

#### Vérification des Services
```bash
# Health checks
curl http://localhost:8011/health  # Reclamation Service
curl http://localhost:8012/health  # Validation Service
curl http://localhost:8013/health  # Notification Service
curl http://localhost:8014/health  # Payment Service

# Métriques Prometheus
curl http://localhost:8011/metrics
```

### 2. Exécution des Tests

#### Tests Manuels
```bash
# Test de création de réclamation avec saga
curl -X POST http://localhost:8011/api/reclamations \
  -H "Content-Type: application/json" \
  -d '{
    "titre": "Test Saga",
    "description": "Test avec montant 100.00€",
    "priorite": "haute",
    "type": "REMBOURSEMENT"
  }'

# Suivi de l'état de la saga
curl http://localhost:8011/api/sagas/{sagaId}
```

#### Tests Automatisés
```bash
# Lancement de la suite de tests
node tests/saga-choreography-test.js

# Tests avec rapport détaillé
npm run test:saga -- --verbose --report
```

## Monitoring en Production

### 1. Surveillance Continue

#### Métriques Clés à Surveiller
- **Throughput**: Nombre de sagas par minute
- **Latence**: Durée moyenne des sagas
- **Taux d'erreur**: Pourcentage de compensations
- **Disponibilité**: Uptime des services

#### Seuils d'Alerte
```yaml
Throughput: < 10 sagas/min (alerte)
Latence: > 30s (warning), > 60s (critical)
Taux d'erreur: > 5% (warning), > 10% (critical)
Disponibilité: < 99% (critical)
```

### 2. Diagnostic et Troubleshooting

#### Logs Structurés
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "service": "validation-service",
  "sagaId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "ReclamationValidated",
  "duration": 1250,
  "metadata": {
    "reclamationId": "rec-123",
    "validationRules": ["amount", "client", "eligibility"]
  }
}
```

#### Outils de Debug
- **Jaeger**: Tracing distribué des sagas
- **RabbitMQ Management**: État des queues et échanges
- **Grafana**: Visualisation temps réel
- **Logs Aggregation**: ELK Stack pour correlation

## Conclusion

L'implémentation de tests et d'observabilité pour la saga chorégraphiée assure:

1. **Validation Fonctionnelle**: Tous les scénarios sont testés automatiquement
2. **Monitoring Temps Réel**: Visibilité complète sur les performances
3. **Détection Proactive**: Alertes sur les anomalies
4. **Troubleshooting Efficace**: Logs et métriques pour diagnostic rapide

Cette approche garantit la fiabilité et la maintenabilité de l'architecture event-driven avec saga chorégraphiée.
