# ADR-007: Stratégie Base de Données

## Statut
Accepté - 2024-12-15

## Contexte
Architecture microservices nécessite une stratégie de persistance :
- Isolation des données par service
- Performances des requêtes
- Cohérence des transactions
- Migration des données legacy

## Décision
**PostgreSQL** par microservice avec **base SQLite legacy**.

## Options considérées

### Base de données par microservice (PostgreSQL)
- **Avantages** : Isolation complète, scaling indépendant, choix technologique libre
- **Inconvénients** : Complexité opérationnelle, transactions distribuées
- **Adapté** : Architecture pure microservices

### Base de données partagée (PostgreSQL unique)
- **Avantages** : Simplicité transactions, cohérence forte, maintenance simple
- **Inconvénients** : Couplage base de données, goulot d'étranglement
- **Adapté** : Migration progressive

### Base de données hybride (PostgreSQL + SQLite)
- **Avantages** : Flexibilité, performance locale, migration douce
- **Inconvénients** : Hétérogénéité, synchronisation complexe
- **Adapté** : Phase de transition

### NoSQL (MongoDB/Redis)
- **Avantages** : Schéma flexible, performance écriture
- **Inconvénients** : Cohérence éventuelle, apprentissage équipe
- **Adapté** : Nouveaux domaines seulement

## Décision
**PostgreSQL par microservice** avec **SQLite pour legacy**.

## Justification

### Configuration par service

| Service | Base de Données | Justification |
|---------|----------------|---------------|
| **produit-service** | produit_db (PostgreSQL) | CRUD simple, catalogues |
| **stock-service** | stock_db (PostgreSQL) | Concurrence, mouvements |
| **vente-service** | vente_db (PostgreSQL) | Transactions ACID |
| **reporting-service** | reporting_db (PostgreSQL) | Agrégations complexes |
| **compte-service** | compte_db (PostgreSQL) | Sécurité, authentification |
| **panier-service** | panier_db (PostgreSQL) | Session utilisateur |
| **checkout-service** | checkout_db (PostgreSQL) | Processus de commande |
| **legacy-service** | SQLite | Migration données existantes |

### Stratégie de données

```sql
-- Exemple : produit-service
CREATE DATABASE produit_db;

-- Tables principales par bounded context
CREATE TABLE produits (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    categorie_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);
```

### Gestion des transactions distribuées

1. **Saga Pattern** : Orchestration via événements
2. **Compensation** : Rollback manuel si nécessaire
3. **Idempotence** : Retry safe operations
4. **Event Sourcing** : Audit trail complet

### Migration legacy

```javascript
// Script de migration SQLite → PostgreSQL
const migrateLegacyData = async () => {
  // 1. Extraction données SQLite
  const legacyData = await extractFromSQLite();
  
  // 2. Transformation selon bounded contexts
  const produits = transformForProduitService(legacyData);
  const stocks = transformForStockService(legacyData);
  const ventes = transformForVenteService(legacyData);
  
  // 3. Insertion dans PostgreSQL respectifs
  await insertIntoProduitDB(produits);
  await insertIntoStockDB(stocks);
  await insertIntoVenteDB(ventes);
};
```

## Implémentation

### Docker Compose Configuration

```yaml
# PostgreSQL par service
produit-db:
  image: postgres:15
  environment:
    POSTGRES_DB: produit_db
    POSTGRES_USER: produit_user
    POSTGRES_PASSWORD: produit_pass
  volumes:
    - produit_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"

stock-db:
  image: postgres:15
  environment:
    POSTGRES_DB: stock_db
    POSTGRES_USER: stock_user
    POSTGRES_PASSWORD: stock_pass
  volumes:
    - stock_data:/var/lib/postgresql/data
  ports:
    - "5433:5432"

# SQLite legacy
legacy-service:
  build: ./src
  volumes:
    - ./database.sqlite:/app/data/database.sqlite
  environment:
    - DATABASE_TYPE=sqlite
    - DATABASE_PATH=/app/data/database.sqlite
```

### Connexions et ORM

```javascript
// Sequelize configuration par service
const sequelize = new Sequelize(
  process.env.DB_NAME || 'produit_db',
  process.env.DB_USER || 'produit_user',
  process.env.DB_PASS || 'produit_pass',
  {
    host: process.env.DB_HOST || 'produit-db',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);
```

## Conséquences

### Avantages obtenus
- ✅ **Isolation** : Chaque service maître de ses données
- ✅ **Scaling** : Dimensionnement base selon besoins service
- ✅ **Technologie** : Liberté choix future (NoSQL si adapté)
- ✅ **Résilience** : Panne d'une base n'impacte qu'un service

### Défis acceptés
- ⚠️ **Complexité** : 8 bases à maintenir vs 1
- ⚠️ **Transactions** : Cohérence éventuelle à gérer
- ⚠️ **Migration** : Double stockage temporaire legacy/microservices
- ⚠️ **Monitoring** : Surveillance multiple bases

### Métriques de validation
- **Performance** : < 200ms réponse 95%ile
- **Disponibilité** : 99.9% SLA par service
- **Cohérence** : < 1% divergence entre services
- **Migration** : 100% données transférées sans perte

## Conformité

- ✅ **DDD** : Base par bounded context
- ✅ **Microservices** : Database per service pattern
- ✅ **ACID** : Transactions locales garanties
- ✅ **CAP** : Choix Consistency + Partition tolerance

---

**Références** :
- Database per service pattern - Martin Fowler
- Saga pattern pour transactions distribuées
- Event sourcing pattern pour audit
