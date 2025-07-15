# ADR-010: Migration Legacy vers Microservices

## Statut
Accepté - 2024-12-15

## Contexte
Transformation système POS monolithique existant :
- Base de données SQLite avec données critiques
- API REST monolithique en production
- Migration sans interruption de service
- Validation données et cohérence métier

## Décision
**Strangler Fig Pattern** avec **Dual Write** et **Event Sourcing**.

## Options considérées

### Stratégies de migration

#### Big Bang Migration
- **Avantages** : Rapide, état final clair, moins de complexité temporaire
- **Inconvénients** : Risque élevé, downtime, rollback difficile
- **Adapté** : Petites applications non-critiques

#### Strangler Fig Pattern
- **Avantages** : Migration progressive, risque maîtrisé, rollback possible
- **Inconvénients** : Période transitoire complexe, double maintenance
- **Adapté** : Systèmes critiques en production

#### Database-First Migration
- **Avantages** : Données migrées en premier, services construits sur nouveau schéma
- **Inconvénients** : Interruption service, schema lock pendant migration
- **Adapté** : Applications avec downtime acceptable

#### API-First Migration
- **Avantages** : Interface stable, backend migré progressivement
- **Inconvénients** : Double écriture longue, synchronisation complexe
- **Adapté** : APIs publiques avec SLA stricts

### Gestion des données transitoires

#### Dual Write
- **Avantages** : Aucune perte données, validation continue
- **Inconvénients** : Complexité, risque inconsistance, performance
- **Adapté** : Migration progressive avec validation

#### Event Sourcing Migration
- **Avantages** : Audit trail complet, replay possible, rollback facile
- **Inconvénients** : Complexité événements, storage, learning curve
- **Adapté** : Systèmes critiques nécessitant traçabilité

#### Snapshot + CDC (Change Data Capture)
- **Avantages** : Migration temps réel, minimal impact performance
- **Inconvénients** : Outils spécialisés requis, complexité technique
- **Adapté** : Bases de données supportant CDC

## Décision
**Strangler Fig** + **Dual Write** avec **validation continue**.

## Justification

### Plan de migration progressive

```
Phase 1: Lecture parallèle (2 semaines)
┌─────────────┐     Read      ┌─────────────┐
│   Legacy    │ ◄─────────── │    New      │
│   System    │              │ Microservice│
└─────────────┘              └─────────────┘
      │                            ▲
      │ Write                      │ Read validation
      ▼                            │
┌─────────────┐              ┌─────────────┐
│  SQLite DB  │              │ PostgreSQL  │
└─────────────┘              └─────────────┘

Phase 2: Dual Write (4 semaines)
┌─────────────┐              ┌─────────────┐
│   Legacy    │ ◄──────────► │    New      │
│   System    │   Sync       │ Microservice│
└─────────────┘              └─────────────┘
      │                            │
      │ Write                      │ Write
      ▼                            ▼
┌─────────────┐              ┌─────────────┐
│  SQLite DB  │ ◄──────────► │ PostgreSQL  │
│  (Master)   │   Mirror     │ (Validation)│
└─────────────┘              └─────────────┘

Phase 3: Migration Write (2 semaines)
┌─────────────┐              ┌─────────────┐
│   Legacy    │              │    New      │
│  (Read-Only)│ ◄─────────── │ Microservice│
└─────────────┘              └─────────────┘
                                   │
                                   │ Write (Master)
                                   ▼
                             ┌─────────────┐
                             │ PostgreSQL  │
                             │  (Master)   │
                             └─────────────┘

Phase 4: Décommissioning (1 semaine)
                             ┌─────────────┐
                             │    New      │
                             │ Microservice│
                             └─────────────┘
                                   │
                                   │ Write/Read
                                   ▼
                             ┌─────────────┐
                             │ PostgreSQL  │
                             │  (Seul)     │
                             └─────────────┘
```

### Architecture de migration

```javascript
// Migration controller pour orchestration
class MigrationController {
  constructor() {
    this.phase = process.env.MIGRATION_PHASE || 'LEGACY_ONLY';
    this.legacyRepo = new LegacySQLiteRepository();
    this.newRepo = new PostgreSQLRepository();
    this.validator = new DataConsistencyValidator();
    this.metrics = new MigrationMetrics();
  }

  async writeData(entity, data) {
    switch (this.phase) {
      case 'LEGACY_ONLY':
        return await this.legacyRepo.save(entity, data);

      case 'DUAL_WRITE':
        return await this.dualWrite(entity, data);

      case 'NEW_PRIMARY':
        return await this.newPrimaryWrite(entity, data);

      case 'NEW_ONLY':
        return await this.newRepo.save(entity, data);

      default:
        throw new Error(`Phase migration inconnue: ${this.phase}`);
    }
  }

  async readData(entity, id) {
    switch (this.phase) {
      case 'LEGACY_ONLY':
        return await this.legacyRepo.findById(entity, id);

      case 'DUAL_WRITE':
      case 'NEW_PRIMARY':
        // Lecture depuis nouveau système avec fallback legacy
        try {
          const newData = await this.newRepo.findById(entity, id);
          
          // Validation croisée si activée
          if (process.env.CROSS_VALIDATION === 'true') {
            await this.crossValidate(entity, id, newData);
          }
          
          return newData;
        } catch (error) {
          this.metrics.fallbackToLegacy.inc({ entity });
          return await this.legacyRepo.findById(entity, id);
        }

      case 'NEW_ONLY':
        return await this.newRepo.findById(entity, id);
    }
  }

  async dualWrite(entity, data) {
    const legacyPromise = this.legacyRepo.save(entity, data);
    const newPromise = this.newRepo.save(entity, data);

    try {
      // Écriture legacy prioritaire
      const legacyResult = await legacyPromise;
      
      // Écriture nouveau système en parallèle
      const newResult = await newPromise;
      
      // Validation cohérence
      await this.validator.validateConsistency(entity, legacyResult, newResult);
      
      this.metrics.dualWriteSuccess.inc({ entity });
      return legacyResult; // Legacy reste maître
      
    } catch (error) {
      this.metrics.dualWriteFailure.inc({ entity, error: error.constructor.name });
      
      // Rollback si possible
      if (legacyResult && !newResult) {
        await this.compensate(entity, legacyResult);
      }
      
      throw error;
    }
  }
}
```

### Migration des données

```javascript
// Service de migration de données
class DataMigrationService {
  async migrateEntity(entityType) {
    const batchSize = 1000;
    let offset = 0;
    let migrated = 0;
    let errors = 0;

    logger.info(`Début migration ${entityType}`);

    while (true) {
      // 1. Extraction batch depuis legacy
      const legacyBatch = await this.legacyRepo.findBatch(entityType, offset, batchSize);
      
      if (legacyBatch.length === 0) break;

      // 2. Transformation selon nouveau modèle
      const transformedBatch = await this.transformBatch(entityType, legacyBatch);

      // 3. Validation données transformées
      const validatedBatch = await this.validateBatch(transformedBatch);

      // 4. Insertion dans nouveau système
      try {
        await this.newRepo.batchInsert(entityType, validatedBatch);
        migrated += validatedBatch.length;
        
        this.metrics.migrationProgress.set({ entity: entityType }, migrated);
        
      } catch (error) {
        errors += legacyBatch.length;
        logger.error(`Erreur migration batch ${entityType} offset ${offset}:`, error);
        
        // Sauvegarde batch en erreur pour reprocessing
        await this.saveBatchForRetry(entityType, legacyBatch, error);
      }

      offset += batchSize;
      
      // Throttling pour éviter surcharge
      await this.sleep(100);
    }

    logger.info(`Migration ${entityType} terminée: ${migrated} migrés, ${errors} erreurs`);
    return { migrated, errors };
  }

  async transformBatch(entityType, legacyBatch) {
    const transformers = {
      'produits': this.transformProduit.bind(this),
      'ventes': this.transformVente.bind(this),
      'stocks': this.transformStock.bind(this),
      'utilisateurs': this.transformUtilisateur.bind(this)
    };

    const transformer = transformers[entityType];
    if (!transformer) {
      throw new Error(`Pas de transformer pour ${entityType}`);
    }

    return Promise.all(legacyBatch.map(transformer));
  }

  async transformProduit(legacyProduit) {
    return {
      // Mapping champs legacy → nouveau
      id: legacyProduit.id,
      nom: legacyProduit.nom?.trim(),
      description: legacyProduit.description?.trim() || null,
      prix: parseFloat(legacyProduit.prix) || 0,
      
      // Nouveaux champs
      categorie_id: await this.mapCategorie(legacyProduit.categorie),
      sku: this.generateSKU(legacyProduit),
      actif: legacyProduit.actif !== false,
      
      // Audit
      created_at: legacyProduit.date_creation || new Date(),
      updated_at: new Date(),
      migrated_from: 'legacy_sqlite',
      migration_date: new Date()
    };
  }
}
```

### Validation et monitoring migration

```javascript
// Service de validation croisée
class DataConsistencyValidator {
  async validateConsistency(entity, legacyData, newData) {
    const validators = {
      'produits': this.validateProduit.bind(this),
      'ventes': this.validateVente.bind(this),
      'stocks': this.validateStock.bind(this)
    };

    const validator = validators[entity];
    if (!validator) return true;

    try {
      const isConsistent = await validator(legacyData, newData);
      
      if (!isConsistent) {
        await this.logInconsistency(entity, legacyData, newData);
        this.metrics.inconsistencyDetected.inc({ entity });
      }
      
      return isConsistent;
    } catch (error) {
      logger.error(`Erreur validation ${entity}:`, error);
      return false;
    }
  }

  async validateProduit(legacy, nouveau) {
    return (
      legacy.id === nouveau.id &&
      legacy.nom === nouveau.nom &&
      Math.abs(parseFloat(legacy.prix) - parseFloat(nouveau.prix)) < 0.01
    );
  }

  async logInconsistency(entity, legacy, nouveau) {
    const inconsistency = {
      entity,
      legacy_data: legacy,
      new_data: nouveau,
      timestamp: new Date(),
      differences: this.calculateDifferences(legacy, nouveau)
    };

    await this.saveInconsistency(inconsistency);
    logger.warn('Inconsistance détectée:', inconsistency);
  }
}
```

### Métriques de migration

```javascript
// Métriques Prometheus pour migration
const migrationMetrics = {
  migration_progress: new promClient.Gauge({
    name: 'migration_progress_total',
    help: 'Number of entities migrated',
    labelNames: ['entity']
  }),
  
  dual_write_latency: new promClient.Histogram({
    name: 'dual_write_latency_seconds',
    help: 'Latency of dual write operations',
    labelNames: ['entity', 'target'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  }),
  
  data_inconsistency: new promClient.Counter({
    name: 'data_inconsistency_total',
    help: 'Number of data inconsistencies detected',
    labelNames: ['entity', 'type']
  }),
  
  migration_phase: new promClient.Gauge({
    name: 'migration_phase',
    help: 'Current migration phase (0=legacy, 1=dual, 2=new_primary, 3=new_only)'
  })
};
```

### Dashboard migration Grafana

```json
{
  "dashboard": {
    "title": "Legacy Migration Progress",
    "panels": [
      {
        "title": "Migration Phase",
        "type": "stat",
        "targets": [
          {
            "expr": "migration_phase",
            "legendFormat": "Current Phase"
          }
        ]
      },
      {
        "title": "Migration Progress",
        "type": "graph",
        "targets": [
          {
            "expr": "migration_progress_total",
            "legendFormat": "{{entity}}"
          }
        ]
      },
      {
        "title": "Dual Write Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(dual_write_latency_seconds_sum[5m]) / rate(dual_write_latency_seconds_count[5m])",
            "legendFormat": "{{entity}} - {{target}}"
          }
        ]
      },
      {
        "title": "Data Inconsistencies",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(data_inconsistency_total[5m])",
            "legendFormat": "{{entity}} - {{type}}"
          }
        ]
      }
    ]
  }
}
```

## Implémentation par étapes

### Étape 1: Infrastructure (Semaine 1)
```bash
# Préparation environnement
docker-compose up -d postgres-produit postgres-stock postgres-vente
npm run setup:migration-tools
npm run setup:monitoring

# Tests infrastructure
npm run test:connectivity
npm run test:performance-baseline
```

### Étape 2: Migration lecture (Semaines 2-3)
```javascript
// Activation mode lecture parallèle
process.env.MIGRATION_PHASE = 'DUAL_READ';
process.env.CROSS_VALIDATION = 'true';

// Déploiement microservices avec fallback legacy
npm run deploy:read-parallel
npm run monitor:consistency
```

### Étape 3: Migration écriture (Semaines 4-7)
```javascript
// Activation dual write
process.env.MIGRATION_PHASE = 'DUAL_WRITE';

// Surveillance accrue
npm run monitor:dual-write
npm run alert:inconsistency
```

### Étape 4: Bascule complète (Semaines 8-9)
```javascript
// Nouveau système devient maître
process.env.MIGRATION_PHASE = 'NEW_PRIMARY';

// Validation finale
npm run validate:full-consistency
npm run test:performance-comparison
```

## Conséquences

### Avantages obtenus
- ✅ **Risque maîtrisé** : Migration progressive avec rollback possible
- ✅ **Zéro downtime** : Service continu pendant migration
- ✅ **Validation continue** : Détection inconsistances en temps réel
- ✅ **Observabilité** : Métriques complètes pour monitoring

### Défis acceptés
- ⚠️ **Complexité temporaire** : Dual write et validation pendant transition
- ⚠️ **Performance** : Impact écriture pendant phase dual write
- ⚠️ **Maintenance** : Double codebase pendant migration
- ⚠️ **Storage** : Duplication données temporaire

### Critères de succès
- **Migration complète** : 100% données migrées sans perte
- **Performance** : < 10% dégradation pendant dual write
- **Inconsistencies** : < 0.1% détectées et corrigées
- **Rollback time** : < 5min si nécessaire

## Conformité

- ✅ **Strangler Fig** : Pattern Martin Fowler appliqué
- ✅ **Zero Downtime** : Migration continue sans interruption
- ✅ **Data Integrity** : Validation ACID maintenue
- ✅ **Observability** : Métriques et alertes complètes

---

**Références** :
- Strangler Fig Pattern - Martin Fowler
- Database Refactoring - Scott Ambler
- Building Evolutionary Architectures - Neal Ford
- Monolith to Microservices - Sam Newman
