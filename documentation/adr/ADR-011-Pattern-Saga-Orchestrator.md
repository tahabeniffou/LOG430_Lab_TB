# ADR-011: Pattern Saga Orchestrator pour Transactions Distribuées

## Statut
**Accepté** - 2025-01-15

## Contexte

Dans un système de microservices comme TB-POS, les transactions distribuées impliquant plusieurs services (Stock, Compte, Vente) posent des défis de cohérence et de gestion d'erreur. Le système doit garantir que soit toutes les opérations réussissent, soit aucune ne soit appliquée (principe ACID au niveau distribué).

### Problématiques identifiées

1. **Cohérence transactionnelle** : Une commande implique réservation de stock, paiement et création de vente
2. **Gestion d'échec** : En cas d'échec d'une étape, les opérations précédentes doivent être annulées
3. **Observabilité** : Besoin de traçabilité des transactions distribuées
4. **Performance** : Éviter les blocages de ressources prolongés

### Contraintes du Lab 6

- Maximum 4 étapes par saga
- API synchrone obligatoire
- Contrôle centralisé dans l'orchestrateur
- Gestion explicite des erreurs
- Événements clairs et traçables
- Aucune commande "bloquée"

## Décision

Nous adoptons le **pattern Saga Orchestrator** avec les caractéristiques suivantes :

### Architecture Choisie

1. **Orchestrateur Central** (Saga Orchestrator Service)
   - Service dédié sur le port 8010
   - Coordonne toutes les transactions distribuées
   - Maintient l'état de chaque saga en base SQLite
   - Expose des métriques Prometheus spécialisées

2. **Saga "Commande" en 3 Étapes**
   ```
   1. Réservation Stock (Stock Service)
   2. Traitement Paiement (Compte Service)  
   3. Création Vente (Vente Service)
   ```

3. **Compensation Automatique**
   - Exécution en ordre inverse en cas d'échec
   - Libération stock + remboursement si nécessaire
   - Saga marquée comme "COMPENSATED"

4. **Événements Clairs**
   - `StockReserve`, `PaiementReussi`, `VenteCreee`
   - `StockReservationEchouee`, `PaiementEchoue`, `VenteEchouee`
   - Tous les événements horodatés et persistés

## Implémentation

### Services Modifiés

1. **Stock Service** : Nouveaux endpoints `/stock/reserve` et `/stock/release`
2. **Compte Service** : Nouveaux endpoints `/compte/debit` et `/compte/credit`
3. **Vente Service** : Nouvel endpoint `/ventes` pour création directe

### Nouveau Service

**Saga Orchestrator Service** avec :
- Base de données SQLite pour persistence d'état
- Métriques Prometheus spécialisées
- API REST pour initiation et monitoring
- Logging structuré avec Winston

### Intégration

- Ajout au docker-compose.yml
- Configuration Kong pour routage (optionnel)
- Intégration monitoring Grafana existant
- Scripts de test automatisés

## Alternatives Considérées

### 1. Saga Choreography
- **Avantages** : Décentralisé, moins de couplage
- **Inconvénients** : Complexité de debugging, pas de contrôle central
- **Rejet** : Contraint par l'exigence de contrôle centralisé

### 2. Transactions Distribuées 2PC
- **Avantages** : Garanties ACID strictes
- **Inconvénients** : Blocages, performance, complexité
- **Rejet** : Non adapté aux microservices, risque de blocage

### 3. Event Sourcing
- **Avantages** : Traçabilité complète, résilience
- **Inconvénients** : Complexité d'implémentation, apprentissage
- **Rejet** : Trop complexe pour le scope du lab

## Conséquences

### Positives

1. **Cohérence Garantie** : Toutes les opérations réussissent ou sont compensées
2. **Observabilité** : Traçabilité complète des transactions
3. **Résilience** : Gestion automatique des échecs et compensations
4. **Performance** : Pas de verrous distribués, transactions courtes
5. **Simplicité** : Logique centralisée, facile à déboguer
6. **Extensibilité** : Facile d'ajouter de nouvelles étapes ou sagas

### Négatives

1. **Point de Défaillance** : L'orchestrateur devient critique
2. **Couplage** : Les services doivent exposer des opérations compensatoires
3. **Latence** : Appels séquentiels entre services
4. **Complexité d'État** : Gestion des états intermédiaires

### Mitigations

1. **Résilience Orchestrateur** : Health checks, restart automatique, clustering futur
2. **Compensation Idempotente** : Opérations répétables sans effet de bord
3. **Timeouts** : Éviter les sagas infinies (30s par appel)
4. **Monitoring** : Alertes sur échecs répétés, métriques de performance

## Métriques de Succès

1. **Fiabilité** : Taux de succès des sagas > 95%
2. **Performance** : Durée moyenne transaction < 5 secondes
3. **Observabilité** : 100% des transactions traçables
4. **Récupération** : Compensation automatique en < 30 secondes

## Evolution

### Court terme (Lab 6)
- Implémentation saga "Commande" de base
- Tests des scénarios de succès et échec
- Intégration monitoring

### Moyen terme
- Support sagas parallèles (réservation multiple)
- Interface graphique monitoring
- Optimisations performance

### Long terme
- Sagas asynchrones avec message queues
- Saga distribuée multi-tenant
- Machine learning pour prédiction d'échecs

## Références

- [Pattern: Saga](https://microservices.io/patterns/data/saga.html)
- [Distributed Transactions Patterns](https://developers.redhat.com/articles/2021/09/21/distributed-transaction-patterns-microservices-compared)
- [Saga Orchestration vs Choreography](https://blog.couchbase.com/saga-pattern-implement-business-transactions-using-microservices-part/)

## Liens

- Implémentation : `microservices/saga-orchestrator-service/`
- Documentation : `documentation/LAB6_SAGA_IMPLEMENTATION.md`
- Tests : `test-saga.js`
- Configuration : Ajouts dans `docker-compose.yml`
