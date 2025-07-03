# Système de Cache - Documentation

## Vue d'ensemble

Le système de cache implémenté utilise **Redis** comme solution de cache distribué pour améliorer les performances des endpoints critiques de l'API. Le système est conçu pour être robuste avec un fallback gracieux en cas de défaillance de Redis.

## Architecture du Cache

### Composants principaux

1. **RedisService** (`src/api/cache/redisService.js`)
   - Service singleton pour la gestion de la connexion Redis
   - Gestion des erreurs et reconnexion automatique
   - Interface standardisée pour les opérations de cache

2. **CacheMiddleware** (`src/api/cache/cacheMiddleware.js`)
   - Middleware Express pour l'interception des requêtes/réponses
   - Cache automatique des réponses de succès (status 200-299)
   - Headers `X-Cache` pour indiquer HIT/MISS/ERROR

3. **CacheConfig** (`src/api/cache/cacheConfig.js`)
   - Configuration centralisée des règles de cache
   - Définition des TTL et des clés de cache
   - Patterns d'invalidation par endpoint

## Endpoints avec Cache

### Endpoints critiques identifiés

| Endpoint | TTL | Raison |
|----------|-----|---------|
| `GET /produits?magasinId=X` | 5 min | Consulté fréquemment, données relativement stables |
| `GET /produits/stock?magasinId=X` | 3 min | Données critiques pour les ventes, TTL plus court |
| `GET /produits/:id` | 10 min | Détails de produit changent moins souvent |
| `GET /rapports?type=ventes` | 15 min | Génération coûteuse, données peu fréquentes |
| `GET /magasins` | 1 h | Données très stables |
| `GET /magasins/:id/utilisateurs` | 10 min | Personnel change peu souvent |

### Configuration des clés de cache

Les clés de cache suivent le pattern : `{prefix}:{context}:{params}`

Exemples :
- `produits:list:magasin:1`
- `produits:stock:magasin:1`
- `rapports:ventes:2024-01-01:2024-01-31`
- `magasins:list`

## Stratégies d'Invalidation

### Invalidation par opération

1. **Création de produit** → Invalide les listes et stock du magasin
2. **Modification de produit** → Invalide détail, listes et stocks
3. **Création de vente** → Invalide tous les rapports
4. **Modification d'utilisateur** → Invalide les listes d'utilisateurs

### Patterns d'invalidation

```javascript
// Exemples de patterns utilisés
produits:list:magasin:1*    // Toutes les listes de produits du magasin 1
rapports:*                  // Tous les rapports
magasins:1:*               // Toutes les données du magasin 1
```

## Configuration

### Variables d'environnement

```bash
REDIS_URL=redis://localhost:6379  # URL de connexion Redis
```

### Configuration Docker

Le service Redis est automatiquement déployé avec Docker Compose :

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

## Monitoring et Administration

### Endpoints d'administration

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/admin/cache/status` | GET | Statut de la connexion Redis |
| `/api/v1/admin/cache/stats` | GET | Statistiques du cache |
| `/api/v1/admin/cache/keys` | GET | Liste des clés (avec pattern optionnel) |
| `/api/v1/admin/cache/clear` | DELETE | Vide tout le cache |
| `/api/v1/admin/cache/clear/{pattern}` | DELETE | Vide les clés correspondant au pattern |

### Exemple de monitoring

```bash
# Vérifier le statut
curl http://localhost:3000/api/v1/admin/cache/status

# Voir les statistiques
curl http://localhost:3000/api/v1/admin/cache/stats

# Lister les clés des produits
curl "http://localhost:3000/api/v1/admin/cache/keys?pattern=produits:*"

# Vider le cache des rapports
curl -X DELETE http://localhost:3000/api/v1/admin/cache/clear/rapports:*
```

## Tests et Benchmarks

### Tests automatisés

```bash
# Tests fonctionnels du cache
npm run test:cache

# Benchmark de performance
npm run benchmark
```

### Résultats attendus

Les benchmarks montrent typiquement :
- **Amélioration de 5-20x** pour les endpoints en cache
- **Réduction de latence de 80-95%** pour les hits de cache
- **Amélioration notable en charge** (requêtes simultanées)

## Gestion des Erreurs

### Stratégie de fallback

Le système est conçu pour fonctionner même si Redis est indisponible :

1. **Connexion Redis échoue** → Continue sans cache
2. **Erreur lors de la lecture** → Passe à la base de données
3. **Erreur lors de l'écriture** → Logs l'erreur, continue
4. **Timeout Redis** → Fallback automatique

### Logs et monitoring

```javascript
// Exemples de logs
"Redis Client Connected"
"Cache HIT for key: produits:list:magasin:1"
"Cache MISS for key: produits:stock:magasin:2"
"Redis not connected, cache miss for key: rapports:ventes"
```

## Métriques de Performance

### Headers de réponse

Chaque réponse inclut un header `X-Cache` :
- `HIT` : Données servies depuis le cache
- `MISS` : Données récupérées depuis la base
- `ERROR` : Erreur de cache, fallback utilisé

### Métriques Prometheus

Le système s'intègre avec les métriques existantes :
- Temps de réponse par endpoint
- Taux de cache hit/miss
- Erreurs de cache

## Maintenance

### Nettoyage du cache

```bash
# En cas de problème, vider tout le cache
curl -X DELETE http://localhost:3000/api/v1/admin/cache/clear

# Redémarrer Redis (Docker)
docker restart redis
```

### Optimisation

1. **Monitorer les hit ratios** → Ajuster les TTL
2. **Analyser les patterns d'accès** → Optimiser les clés
3. **Surveiller la mémoire Redis** → Configurer la politique d'éviction

## Sécurité

### Bonnes pratiques

1. **Pas de données sensibles** dans les clés de cache
2. **Validation des patterns** d'invalidation
3. **Limitation des endpoints** d'administration
4. **Chiffrement en transit** (Redis TLS en production)

## Évolutions Futures

### Améliorations possibles

1. **Cache intelligent** basé sur les patterns d'utilisation
2. **Mise en cache proactive** (pre-warming)
3. **Compression des données** pour optimiser la mémoire
4. **Réplication Redis** pour la haute disponibilité
5. **Cache multi-niveaux** (mémoire + Redis)
