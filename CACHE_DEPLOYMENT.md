# Guide de Déploiement - Système de Cache Redis

## Vue d'ensemble des améliorations

Ce déploiement ajoute un système de cache distribué basé sur Redis pour améliorer les performances des endpoints critiques de l'API.

### 🎯 Endpoints cachés

| Endpoint | TTL | Utilisation |
|----------|-----|-------------|
| `GET /produits?magasinId=X` | 5 min | Liste des produits par magasin |
| `GET /produits/stock?magasinId=X` | 3 min | Stock en temps réel |
| `GET /produits/:id` | 10 min | Détails d'un produit |
| `GET /rapports?type=ventes` | 15 min | Rapports de ventes (coûteux) |
| `GET /magasins` | 1 h | Liste des magasins |
| `GET /magasins/:id/utilisateurs` | 10 min | Personnel par magasin |

## 🚀 Déploiement

### Option 1 : Déploiement complet avec Docker Compose

```bash
# 1. Construire et démarrer tous les services (incluant Redis)
docker-compose up --build -d

# 2. Vérifier que Redis est démarré
docker ps | grep redis

# 3. Vérifier les logs du cache
docker logs api1 | grep -i redis
```

### Option 2 : Déploiement en développement

```bash
# 1. Installer Redis localement
sudo apt-get install redis-server
# ou
brew install redis  # sur macOS

# 2. Démarrer Redis
redis-server

# 3. Installer les dépendances
npm install

# 4. Démarrer l'application
npm start
```

### Option 3 : Redis externe (production)

Configurer la variable d'environnement :

```bash
export REDIS_URL=redis://your-redis-host:6379
# ou pour Redis avec authentification
export REDIS_URL=redis://username:password@your-redis-host:6379
```

## ✅ Vérification du déploiement

### 1. Vérifier le statut Redis

```bash
curl http://localhost:3000/api/v1/admin/cache/status
```

Réponse attendue :
```json
{
  "connected": true,
  "message": "Redis connecté"
}
```

### 2. Tester le cache avec un endpoint

```bash
# Premier appel (cache miss)
curl -H "Accept: application/json" \
     "http://localhost:3000/api/v1/produits?magasinId=1" \
     -w "\nTemps: %{time_total}s\nCache: %{header_x-cache}\n"

# Deuxième appel (cache hit)
curl -H "Accept: application/json" \
     "http://localhost:3000/api/v1/produits?magasinId=1" \
     -w "\nTemps: %{time_total}s\nCache: %{header_x-cache}\n"
```

### 3. Lancer les tests automatisés

```bash
# Tests fonctionnels du cache
npm run test:cache

# Benchmark de performance
npm run benchmark
```

## 📊 Monitoring

### Endpoints d'administration

```bash
# Statut de Redis
GET /api/v1/admin/cache/status

# Statistiques du cache
GET /api/v1/admin/cache/stats

# Lister les clés (avec pattern optionnel)
GET /api/v1/admin/cache/keys?pattern=produits:*

# Vider tout le cache
DELETE /api/v1/admin/cache/clear

# Vider un pattern spécifique
DELETE /api/v1/admin/cache/clear/produits:*
```

### Surveillance des performances

Les réponses incluent le header `X-Cache` :
- `HIT` : Données servies depuis le cache
- `MISS` : Données récupérées depuis la base
- `ERROR` : Erreur de cache, fallback utilisé

### Logs importants

```bash
# Vérifier les logs de connexion Redis
docker logs api1 | grep -E "(Redis|Cache)"

# Surveiller les hits/miss en temps réel
docker logs -f api1 | grep -E "(Cache HIT|Cache MISS)"
```

## 🔧 Configuration

### Variables d'environnement

```bash
# Configuration Redis
REDIS_URL=redis://localhost:6379

# Configuration générale (existante)
PORT=3000
NODE_ENV=production
DB_HOST=db
DB_NAME=posdb
DB_USER=posuser
DB_PASS=pospass
```

### Personnalisation des TTL

Modifier `src/api/cache/cacheConfig.js` pour ajuster les durées de cache :

```javascript
produits: {
  list: {
    ttl: 300, // 5 minutes -> ajuster selon les besoins
    // ...
  }
}
```

## 🛠️ Dépannage

### Redis non connecté

```bash
# Vérifier si Redis fonctionne
redis-cli ping
# Réponse attendue: PONG

# Redémarrer Redis (Docker)
docker restart redis

# Vérifier les logs Redis
docker logs redis
```

### Performance dégradée

```bash
# Vérifier la mémoire Redis
redis-cli info memory

# Nettoyer le cache si nécessaire
curl -X DELETE http://localhost:3000/api/v1/admin/cache/clear

# Surveiller les métriques
curl http://localhost:3000/api/v1/admin/cache/stats
```

### Problèmes de développement

```bash
# Démarrer sans cache (si Redis pose problème)
# L'application fonctionnera en mode dégradé
npm start  # Continuera même si Redis est indisponible

# Vérifier les erreurs de syntaxe
npm run lint
```

## 📈 Métriques attendues

### Améliorations de performance

Résultats typiques avec le cache activé :
- **Latence réduite de 80-95%** pour les hits de cache
- **Débit amélioré de 5-20x** pour les endpoints cachés
- **Réduction de la charge DB** de 60-90% sur les requêtes cachées

### Monitoring en production

```bash
# Statistiques Redis
curl -s http://localhost:3000/api/v1/admin/cache/stats | jq

# Exemple de réponse
{
  "totalKeys": 15,
  "prefixes": {
    "produits": 8,
    "magasins": 3,
    "rapports": 4
  }
}
```

## 🔄 Maintenance

### Nettoyage périodique

```bash
# Script de nettoyage hebdomadaire
curl -X DELETE http://localhost:3000/api/v1/admin/cache/clear

# Ou nettoyage sélectif
curl -X DELETE http://localhost:3000/api/v1/admin/cache/clear/rapports:*
```

### Mise à jour des données

```bash
# Après modification de produits, invalider le cache
curl -X DELETE http://localhost:3000/api/v1/admin/cache/clear/produits:*

# Après changement de structure, vider tout
curl -X DELETE http://localhost:3000/api/v1/admin/cache/clear
```

## ⚠️ Points d'attention

1. **Fallback gracieux** : L'application continue de fonctionner même si Redis est indisponible
2. **Cohérence des données** : L'invalidation automatique maintient la cohérence
3. **Monitoring** : Surveiller les taux de hit/miss pour optimiser les TTL
4. **Mémoire Redis** : Configurer la politique d'éviction en production
5. **Sécurité** : Protéger les endpoints d'administration en production

## 📞 Support

En cas de problème :
1. Vérifier les logs : `docker logs api1 | grep -i error`
2. Tester le statut : `curl http://localhost:3000/api/v1/admin/cache/status`
3. Vérifier Redis : `redis-cli ping`
4. Consulter la documentation : `docs/Cache_Documentation.md`
