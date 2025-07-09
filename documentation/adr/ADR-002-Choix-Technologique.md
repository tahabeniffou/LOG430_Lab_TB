# ADR-002: Choix Technologique - Node.js et SQLite

## Statut
**ACCEPTÉ** - Décembre 2024

## Contexte
La migration vers microservices nécessite des choix technologiques cohérents pour :
- **Runtime** : Langage et plateforme d'exécution
- **Base de données** : Stockage par service
- **Communication** : Protocoles inter-services
- **Observabilité** : Monitoring et métriques

## Décision

### Stack Technique Retenue

#### Runtime et Frameworks
- **Node.js 18+** avec Express.js pour tous les services
- **Justification** :
  - Performance élevée pour I/O intensives
  - Écosystème npm riche
  - Équipe déjà familière avec JavaScript
  - Déploiement Docker simplifié

#### Base de Données
- **SQLite 3** par microservice
- **Justification** :
  - Autonomie complète de chaque service
  - Pas de SPOF (Single Point of Failure)
  - Performance locale excellente
  - Simplicité de déploiement et backup
  - Pas de coût d'infrastructure DB

#### Communication Inter-Services
- **HTTP/REST** via API Gateway
- **JSON** comme format d'échange
- **Justification** :
  - Standard industriel bien maîtrisé
  - Outillage et debugging matures
  - Compatible avec tous les clients (web, mobile, etc.)

#### Observabilité
- **Prometheus** pour métriques
- **prom-client** pour instrumentation Node.js
- **Justification** :
  - Standard CNCF pour monitoring
  - Intégration native avec Grafana
  - Métriques pull-based fiables

## Alternatives Considérées

### Runtime
| Alternative | Avantages | Inconvénients | Décision |
|-------------|-----------|---------------|----------|
| **Java/Spring** | Enterprise, robuste | Overhead mémoire, complexité | ❌ Rejeté |
| **Python/FastAPI** | Productive, moderne | Performance moindre | ❌ Rejeté |
| **Go** | Performance, simplicité | Courbe apprentissage équipe | ❌ Rejeté |
| **Node.js** | Performance I/O, familiarité | Mono-thread CPU intensif | ✅ **Choisi** |

### Base de Données
| Alternative | Avantages | Inconvénients | Décision |
|-------------|-----------|---------------|----------|
| **PostgreSQL partagé** | ACID, fonctionnalités | SPOF, couplage données | ❌ Rejeté |
| **MongoDB par service** | NoSQL, scaling | Consistance éventuelle | ❌ Rejeté |
| **MySQL par service** | SQL standard | Infrastructure complexe | ❌ Rejeté |
| **SQLite par service** | Autonomie, simplicité | Limite concurrent users | ✅ **Choisi** |

## Configuration Détaillée

### Structure des Services
```javascript
// Structure type d'un microservice
src/
├── controllers/     // Logique HTTP
├── models/          // Modèles Sequelize
├── routes/          // Définition des endpoints
├── middleware/      // Validation, auth, metrics
├── database/        // Configuration SQLite
└── server.js        // Point d'entrée
```

### Standards de Communication
```javascript
// Format de réponse standardisé
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2024-12-01T10:00:00Z",
  "service": "produit-service"
}
```

### Métriques Standardisées
```javascript
// Métriques obligatoires par service
- http_requests_total
- http_request_duration_seconds
- database_operations_total
- nodejs_memory_usage_bytes
```

## Contraintes et Limitations

### SQLite
- **Limite** : ~1000 connexions concurrentes
- **Mitigation** : Connection pooling, cache Redis si nécessaire
- **Acceptable** : Charge actuelle < 100 req/sec par service

### Node.js
- **Limite** : CPU intensif bloque event loop
- **Mitigation** : Worker threads pour calculs lourds
- **Acceptable** : Cas d'usage principalement I/O

## Critères de Succès
- [ ] Temps de démarrage service < 3 secondes
- [ ] Mémoire par service < 100MB en idle
- [ ] Latence DB < 1ms (P95)
- [ ] Packaging Docker < 200MB par service

## Migration Path
1. **Phase 1** : Services avec SQLite en mode lecture
2. **Phase 2** : Synchronisation données legacy → SQLite
3. **Phase 3** : Écriture directe dans SQLite
4. **Phase 4** : Décommissioning legacy pour domaines migrés

---
*Auteur : Tech Lead*  
*Réviseurs : Équipe de développement, DevOps*
