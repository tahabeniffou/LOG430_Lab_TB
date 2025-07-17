# Event Store et Replay - LAB 7

## 🗄️ Vue d'ensemble de l'Event Store

L'Event Store implémenté stocke tous les événements de saga de manière durable et fournit des capacités de replay pour la reconstruction d'état et l'audit.

## 📊 Structure de l'Event Store

### Schéma de Base de Données
```sql
CREATE TABLE event_store (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID UNIQUE NOT NULL,
    saga_id UUID,
    correlation_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    INDEX(saga_id),
    INDEX(correlation_id),
    INDEX(event_type),
    INDEX(created_at)
);
```

### Exemple d'Événement Stocké
```json
{
  "id": 1001,
  "event_id": "evt-550e8400-e29b-41d4-a716-446655440000",
  "saga_id": "saga-550e8400-e29b-41d4-a716-446655440000", 
  "correlation_id": "rec-550e8400-e29b-41d4-a716-446655440000",
  "event_type": "ReclamationCreated",
  "event_data": {
    "reclamationId": "rec-550e8400-e29b-41d4-a716-446655440000",
    "titre": "Produit défectueux",
    "amount": 99.99,
    "clientId": "client-123"
  },
  "metadata": {
    "service": "reclamation-service",
    "version": "1.0.0",
    "source_ip": "192.168.1.10",
    "user_agent": "api-client"
  },
  "created_at": "2025-07-16T18:30:00Z",
  "version": 1
}
```

## 🔄 Capacités de Replay

### 1. Replay par Saga
```javascript
// Endpoint: GET /event-store/replay/saga/{sagaId}
const replaySaga = async (sagaId) => {
    const events = await eventStore.getEventsBySaga(sagaId);
    return events.sort((a, b) => a.created_at - b.created_at);
};
```

### 2. Replay par Type d'Événement
```javascript
// Endpoint: GET /event-store/replay/events/{eventType}
const replayEventType = async (eventType, fromDate, toDate) => {
    return await eventStore.getEventsByType(eventType, fromDate, toDate);
};
```

### 3. Replay Temporel
```javascript
// Endpoint: GET /event-store/replay/timerange
const replayTimeRange = async (startTime, endTime) => {
    return await eventStore.getEventsInTimeRange(startTime, endTime);
};
```

## 🛠️ API de Reconstruction

### Reconstruction d'État de Saga
```javascript
// Endpoint: POST /event-store/reconstruct/saga/{sagaId}
const reconstructSagaState = async (sagaId) => {
    const events = await replaySaga(sagaId);
    
    let sagaState = {
        id: sagaId,
        status: 'STARTED',
        steps: [],
        createdAt: null,
        completedAt: null
    };
    
    events.forEach(event => {
        switch(event.event_type) {
            case 'ReclamationCreated':
                sagaState.createdAt = event.created_at;
                sagaState.steps.push('RECLAMATION_CREATED');
                break;
            case 'ReclamationValidated':
                sagaState.steps.push('RECLAMATION_VALIDATED');
                break;
            case 'PaymentProcessed':
                sagaState.steps.push('PAYMENT_PROCESSED');
                break;
            case 'ReclamationCompleted':
                sagaState.status = 'COMPLETED';
                sagaState.completedAt = event.created_at;
                sagaState.steps.push('RECLAMATION_COMPLETED');
                break;
            case 'ReclamationCancelled':
                sagaState.status = 'COMPENSATED';
                sagaState.completedAt = event.created_at;
                sagaState.steps.push('RECLAMATION_CANCELLED');
                break;
        }
    });
    
    return sagaState;
};
```

### Audit et Compliance
```javascript
// Endpoint: GET /event-store/audit/saga/{sagaId}
const auditSaga = async (sagaId) => {
    const events = await replaySaga(sagaId);
    
    return {
        sagaId,
        totalEvents: events.length,
        timeline: events.map(e => ({
            timestamp: e.created_at,
            event: e.event_type,
            service: e.metadata?.service,
            duration: calculateDuration(e)
        })),
        integrity: validateEventSequence(events),
        completeness: checkMandatoryEvents(events)
    };
};
```

## 📈 Métriques Event Store

### Métriques Prometheus
```javascript
const eventStoreMetrics = {
    eventsStored: new Counter({
        name: 'event_store_events_stored_total',
        help: 'Total events stored',
        labelNames: ['event_type', 'saga_id']
    }),
    
    replayRequests: new Counter({
        name: 'event_store_replay_requests_total', 
        help: 'Total replay requests',
        labelNames: ['replay_type']
    }),
    
    replayDuration: new Histogram({
        name: 'event_store_replay_duration_seconds',
        help: 'Replay operation duration',
        labelNames: ['replay_type']
    }),
    
    storageSize: new Gauge({
        name: 'event_store_size_bytes',
        help: 'Event store size in bytes'
    })
};
```

## 🔍 Tests de Replay

### Test de Reconstruction Complète
```javascript
describe('Event Store Replay', () => {
    it('should reconstruct saga state from events', async () => {
        // 1. Créer une saga complète
        const sagaId = await createTestSaga();
        
        // 2. Attendre la completion
        await waitForSagaCompletion(sagaId);
        
        // 3. Reconstruire l'état
        const reconstructed = await reconstructSagaState(sagaId);
        
        // 4. Valider la cohérence
        expect(reconstructed.status).toBe('COMPLETED');
        expect(reconstructed.steps).toContain('RECLAMATION_CREATED');
        expect(reconstructed.steps).toContain('PAYMENT_PROCESSED');
    });
    
    it('should replay events in correct order', async () => {
        const events = await replayTimeRange(startTime, endTime);
        
        // Valider l'ordre chronologique
        for(let i = 1; i < events.length; i++) {
            expect(events[i].created_at >= events[i-1].created_at).toBeTruthy();
        }
    });
});
```

## 🎯 Endpoints Event Store Disponibles

### APIs REST
```http
# Stockage d'événement
POST /event-store/events
Content-Type: application/json

# Replay par saga
GET /event-store/replay/saga/{sagaId}

# Replay par type
GET /event-store/replay/events/{eventType}?from={date}&to={date}

# Replay temporel
GET /event-store/replay/timerange?start={timestamp}&end={timestamp}

# Reconstruction d'état
POST /event-store/reconstruct/saga/{sagaId}

# Audit complet
GET /event-store/audit/saga/{sagaId}

# Métriques
GET /event-store/metrics

# Health check
GET /event-store/health
```

## ✅ Validation et Intégrité

### Contrôles d'Intégrité
- **Séquence d'événements**: Validation de l'ordre logique
- **Complétude**: Vérification des événements obligatoires
- **Duplication**: Détection des événements dupliqués
- **Cohérence temporelle**: Validation des timestamps

### Backup et Recovery
- **Backup quotidien**: Export JSON des événements
- **Recovery**: Restauration depuis backup
- **Archivage**: Déplacement des anciens événements

Cette implémentation fournit un Event Store robuste avec capacités complètes de replay et reconstruction pour audit et debugging des sagas.
