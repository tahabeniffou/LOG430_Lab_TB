# CQRS et Read Models - LAB 7

## 🎯 Vue d'ensemble CQRS

L'architecture CQRS (Command Query Responsibility Segregation) sépare clairement les commandes (écriture) des requêtes (lecture) avec des modèles optimisés pour chaque usage.

## 📝 Séparation Command/Query

### Commands (Écriture)
```javascript
// Command: Créer une réclamation
class CreateReclamationCommand {
    constructor(titre, description, priorite, clientId, type) {
        this.commandId = uuidv4();
        this.commandType = 'CreateReclamation';
        this.timestamp = new Date().toISOString();
        this.payload = { titre, description, priorite, clientId, type };
    }
}

// Command Handler
class ReclamationCommandHandler {
    async handle(command) {
        // 1. Validation métier
        this.validateCommand(command);
        
        // 2. Création de l'agrégat
        const reclamation = Reclamation.create(command.payload);
        
        // 3. Sauvegarde dans Event Store
        await this.eventStore.save(reclamation.getUncommittedEvents());
        
        // 4. Publication d'événements
        await this.publishEvents(reclamation.getUncommittedEvents());
        
        return reclamation.id;
    }
}
```

### Queries (Lecture)
```javascript
// Query: Consulter les réclamations
class GetReclamationsQuery {
    constructor(filters = {}) {
        this.queryId = uuidv4();
        this.queryType = 'GetReclamations';
        this.filters = filters; // { status, clientId, dateRange, etc. }
        this.pagination = filters.pagination || { page: 1, limit: 20 };
    }
}

// Query Handler
class ReclamationQueryHandler {
    async handle(query) {
        // Lecture depuis les read models optimisés
        return await this.reclamationReadModel.findByFilters(query.filters);
    }
}
```

## 🗄️ Read Models Optimisés

### 1. Read Model: Vue Réclamations
```sql
-- Table optimisée pour les requêtes de réclamations
CREATE TABLE reclamations_read_model (
    id UUID PRIMARY KEY,
    titre VARCHAR(255),
    description TEXT,
    statut VARCHAR(50),
    priorite VARCHAR(20),
    client_id VARCHAR(100),
    type VARCHAR(50),
    montant DECIMAL(10,2),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    saga_id UUID,
    saga_status VARCHAR(50),
    
    -- Index pour performance
    INDEX idx_statut (statut),
    INDEX idx_client (client_id),
    INDEX idx_priorite (priorite),
    INDEX idx_saga_status (saga_status),
    INDEX idx_created_at (created_at)
);
```

### 2. Read Model: Dashboard Métriques
```sql
-- Vue pour tableaux de bord
CREATE TABLE dashboard_metrics_read_model (
    id BIGSERIAL PRIMARY KEY,
    metric_date DATE,
    total_reclamations INTEGER,
    reclamations_resolues INTEGER,
    reclamations_en_cours INTEGER,
    taux_resolution DECIMAL(5,2),
    montant_total_traite DECIMAL(12,2),
    duree_moyenne_resolution INTERVAL,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Read Model: Audit Saga
```sql
-- Vue pour audit des sagas
CREATE TABLE saga_audit_read_model (
    saga_id UUID PRIMARY KEY,
    reclamation_id UUID,
    statut VARCHAR(50),
    etapes_completees TEXT[], -- Array des étapes
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duree_totale INTERVAL,
    raison_echec TEXT,
    compensation_executee BOOLEAN DEFAULT FALSE,
    
    INDEX idx_statut (statut),
    INDEX idx_duree (duree_totale),
    INDEX idx_started_at (started_at)
);
```

## 🔄 Projections Fonctionnelles

### Projection Handler pour Réclamations
```javascript
class ReclamationProjectionHandler {
    
    // Gestion des événements pour mise à jour des read models
    async on(event) {
        switch(event.eventType) {
            case 'ReclamationCreated':
                await this.handleReclamationCreated(event);
                break;
            case 'ReclamationValidated':
                await this.handleReclamationValidated(event);
                break;
            case 'PaymentProcessed':
                await this.handlePaymentProcessed(event);
                break;
            case 'ReclamationCompleted':
                await this.handleReclamationCompleted(event);
                break;
            case 'ReclamationCancelled':
                await this.handleReclamationCancelled(event);
                break;
        }
    }
    
    async handleReclamationCreated(event) {
        const { payload, sagaId, correlationId } = event;
        
        await this.db.query(`
            INSERT INTO reclamations_read_model 
            (id, titre, description, statut, priorite, client_id, type, montant, saga_id, saga_status, created_at)
            VALUES ($1, $2, $3, 'EN_COURS', $4, $5, $6, $7, $8, 'STARTED', NOW())
        `, [
            correlationId,
            payload.titre,
            payload.description, 
            payload.priorite,
            payload.clientId,
            payload.type,
            payload.amount,
            sagaId
        ]);
        
        // Mise à jour métriques dashboard
        await this.updateDashboardMetrics();
    }
    
    async handleReclamationCompleted(event) {
        const { correlationId, sagaId } = event;
        
        // Mise à jour statut réclamation
        await this.db.query(`
            UPDATE reclamations_read_model 
            SET statut = 'RESOLUE', saga_status = 'COMPLETED', updated_at = NOW()
            WHERE id = $1
        `, [correlationId]);
        
        // Mise à jour audit saga
        await this.db.query(`
            UPDATE saga_audit_read_model 
            SET statut = 'COMPLETED', completed_at = NOW(),
                duree_totale = completed_at - started_at
            WHERE saga_id = $1
        `, [sagaId]);
        
        await this.updateDashboardMetrics();
    }
    
    async updateDashboardMetrics() {
        const today = new Date().toISOString().split('T')[0];
        
        const metrics = await this.db.query(`
            SELECT 
                COUNT(*) as total_reclamations,
                COUNT(*) FILTER (WHERE statut = 'RESOLUE') as reclamations_resolues,
                COUNT(*) FILTER (WHERE statut = 'EN_COURS') as reclamations_en_cours,
                ROUND(
                    COUNT(*) FILTER (WHERE statut = 'RESOLUE')::DECIMAL / 
                    NULLIF(COUNT(*), 0) * 100, 2
                ) as taux_resolution,
                SUM(montant) FILTER (WHERE statut = 'RESOLUE') as montant_total_traite
            FROM reclamations_read_model 
            WHERE DATE(created_at) = $1
        `, [today]);
        
        await this.db.query(`
            INSERT INTO dashboard_metrics_read_model 
            (metric_date, total_reclamations, reclamations_resolues, reclamations_en_cours, 
             taux_resolution, montant_total_traite, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (metric_date) 
            DO UPDATE SET 
                total_reclamations = EXCLUDED.total_reclamations,
                reclamations_resolues = EXCLUDED.reclamations_resolues,
                reclamations_en_cours = EXCLUDED.reclamations_en_cours,
                taux_resolution = EXCLUDED.taux_resolution,
                montant_total_traite = EXCLUDED.montant_total_traite,
                updated_at = NOW()
        `, [today, ...Object.values(metrics.rows[0])]);
    }
}
```

## 📊 APIs Query Optimisées

### API Réclamations
```javascript
// GET /api/query/reclamations
app.get('/api/query/reclamations', async (req, res) => {
    const { statut, clientId, priorite, page = 1, limit = 20 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (statut) {
        whereClause += ` AND statut = $${params.length + 1}`;
        params.push(statut);
    }
    
    if (clientId) {
        whereClause += ` AND client_id = $${params.length + 1}`;
        params.push(clientId);
    }
    
    if (priorite) {
        whereClause += ` AND priorite = $${params.length + 1}`;
        params.push(priorite);
    }
    
    const offset = (page - 1) * limit;
    
    const result = await db.query(`
        SELECT id, titre, description, statut, priorite, client_id, type, 
               montant, saga_status, created_at, updated_at
        FROM reclamations_read_model 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    res.json({
        data: result.rows,
        pagination: { page, limit, total: result.rowCount }
    });
});
```

### API Dashboard
```javascript
// GET /api/query/dashboard/metrics
app.get('/api/query/dashboard/metrics', async (req, res) => {
    const { dateRange = '7d' } = req.query;
    
    const result = await db.query(`
        SELECT 
            metric_date,
            total_reclamations,
            reclamations_resolues,
            reclamations_en_cours,
            taux_resolution,
            montant_total_traite,
            duree_moyenne_resolution
        FROM dashboard_metrics_read_model 
        WHERE metric_date >= NOW() - INTERVAL $1
        ORDER BY metric_date DESC
    `, [dateRange]);
    
    res.json(result.rows);
});
```

### API Audit Saga
```javascript
// GET /api/query/sagas/audit
app.get('/api/query/sagas/audit', async (req, res) => {
    const { statut, dateRange } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (statut) {
        whereClause += ` AND statut = $${params.length + 1}`;
        params.push(statut);
    }
    
    if (dateRange) {
        whereClause += ` AND started_at >= NOW() - INTERVAL $${params.length + 1}`;
        params.push(dateRange);
    }
    
    const result = await db.query(`
        SELECT saga_id, reclamation_id, statut, etapes_completees,
               started_at, completed_at, duree_totale, raison_echec,
               compensation_executee
        FROM saga_audit_read_model 
        ${whereClause}
        ORDER BY started_at DESC
    `, params);
    
    res.json(result.rows);
});
```

## 🔄 Synchronisation et Cohérence

### Gestion de la Cohérence Éventuelle
```javascript
class ReadModelSynchronizer {
    
    async ensureConsistency() {
        // Vérification périodique de la cohérence
        const inconsistencies = await this.detectInconsistencies();
        
        for (const inconsistency of inconsistencies) {
            await this.reconcileInconsistency(inconsistency);
        }
    }
    
    async detectInconsistencies() {
        // Comparaison entre Event Store et Read Models
        const eventStoreSagas = await this.eventStore.getAllSagas();
        const readModelSagas = await this.readModel.getAllSagas();
        
        return eventStoreSagas.filter(saga => {
            const readModelSaga = readModelSagas.find(rm => rm.saga_id === saga.id);
            return !readModelSaga || readModelSaga.statut !== saga.status;
        });
    }
    
    async reconcileInconsistency(inconsistency) {
        // Reconstruction du read model depuis les événements
        const events = await this.eventStore.getEventsBySaga(inconsistency.id);
        await this.projectionHandler.rebuild(inconsistency.id, events);
    }
}
```

## ✅ Avantages de l'Architecture CQRS

### Performance
- **Lectures optimisées**: Requêtes rapides sur read models dénormalisés
- **Écritures isolées**: Pas d'impact des lectures sur les performances d'écriture
- **Scalabilité**: Scale indépendamment lecture et écriture

### Flexibilité
- **Modèles spécialisés**: Chaque read model optimisé pour son usage
- **Évolution indépendante**: Commands et queries évoluent séparément
- **Vues multiples**: Plusieurs vues des mêmes données

### Observabilité
- **Audit complet**: Traçabilité de toutes les commandes
- **Métriques détaillées**: Tableaux de bord en temps réel
- **Debugging facilité**: Séparation claire des responsabilités

Cette architecture CQRS fournit une séparation claire entre commandes et requêtes avec des projections fonctionnelles pour optimiser les performances de lecture.
