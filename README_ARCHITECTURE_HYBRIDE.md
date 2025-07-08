# Architecture Hybride - Système de Base + Microservices

## Vue d'ensemble

Cette architecture hybride permet la **coexistence** entre :
- **Système de base (Legacy)** : Application monolithique existante
- **4 Microservices essentiels** : Produit, Vente, Stock, Reporting
- **Routeur hybride intelligent** : Décide automatiquement vers quel système router les requêtes

## 🎯 Principe de Fonctionnement

### Routage Intelligent par Type de Client

| Type de Client | Routes | Comportement |
|----------------|--------|--------------|
| **Console POS** | `/pos/*` | Système de base + Stock microservice |
| **Console Maison Mère** | `/maisonmere/*` | Système de base + Reporting microservice |
| **API Moderne (v2)** | `/api/v2/*` | Tous les microservices |
| **API Legacy (v1)** | `/api/v1/*` | Système de base uniquement |

### Détection du Type de Client

1. **En-tête HTTP** : `X-Client-Type: pos|maisonmere|api|web`
2. **Chemin URL** : `/pos/`, `/maisonmere/`, `/api/v2/`, `/api/v1/`
3. **Par défaut** : API moderne (microservices)

## 🏗️ Architecture

```
                            ┌─────────────────┐
                            │   Kong Gateway  │
                            │     :8001       │
                            └─────────────────┘
                                      │
                            ┌─────────────────┐
                            │ Routeur Hybride │
                            │     :9000       │
                            └─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
          │ Système de Base │ │  Microservices  │ │ Load Balancer   │
          │    (Legacy)     │ │                 │ │    :8000        │
          │     :3000       │ │  ┌─────────────┐│ └─────────────────┘
          └─────────────────┘ │  │ Produit 1-3 ││
                              │  │:3001,5,6    ││
                              │  └─────────────┘│
                              │  ┌─────────────┐│
                              │  │ Vente :3004 ││
                              │  └─────────────┘│
                              │  ┌─────────────┐│
                              │  │ Stock :3007 ││
                              │  └─────────────┘│
                              │  ┌─────────────┐│
                              │  │Report :3008 ││
                              │  └─────────────┘│
                              └─────────────────┘
```

## 🗄️ Base de Données

### Architecture de Données Hybride

```
┌─────────────────────────────────────────────────────────────┐
│                     MySQL Principal                        │
│                       :3306                                 │
├─────────────────────────────────────────────────────────────┤
│ TABLES SYSTÈME DE BASE:          │ TABLES PARTAGÉES:       │
│ - magasins                       │ - ventes (legacy+micro) │
│ - utilisateurs                   │ - vente_details         │
│ - sessions                       │ - stocks (microservice) │
│                                  │ - mouvements_stock      │
├─────────────────────────────────────────────────────────────┤
│ TABLES MICROSERVICES:                                       │
│ - rapports_cache (reporting)                                │
│ - metriques_quotidiennes (reporting)                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Produits                       │
│                       :5433                                 │
├─────────────────────────────────────────────────────────────┤
│ TABLES MICROSERVICE PRODUIT:                               │
│ - produits (isolation complète)                            │
│ - categories_produits                                       │
│ - prix_historique                                           │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Démarrage Rapide

### 1. Démarrage de l'architecture complète

```bash
# Démarrer l'architecture hybride
./start-architecture-hybride.sh

# Vérifier le statut
docker-compose -f docker-compose.hybrid.yml ps
```

### 2. Vérification du routage

```bash
# Information sur le routage
curl http://localhost:9000/routing-info

# Health check du routeur
curl http://localhost:9000/health
```

## 📋 Exemples d'Utilisation

### Console POS

```bash
# Produits (va vers le système de base)
curl -H "X-Client-Type: pos" http://localhost:9000/pos/produits

# Stock temps réel (va vers le microservice)
curl -H "X-Client-Type: pos" http://localhost:9000/pos/stock

# Ventes (va vers le système de base)
curl -H "X-Client-Type: pos" http://localhost:9000/pos/ventes \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"produit_id": 1, "quantite": 2}'
```

### Console Maison Mère

```bash
# Produits (va vers le système de base)
curl -H "X-Client-Type: maisonmere" http://localhost:9000/maisonmere/produits

# Rapports avancés (va vers le microservice)
curl -H "X-Client-Type: maisonmere" http://localhost:9000/maisonmere/reports/sales

# Gestion des ventes (va vers le système de base)
curl -H "X-Client-Type: maisonmere" http://localhost:9000/maisonmere/ventes
```

### API Moderne (v2) - Microservices

```bash
# Tous les appels vont vers les microservices
curl http://localhost:9000/api/v2/produits
curl http://localhost:9000/api/v2/ventes
curl http://localhost:9000/api/v2/stocks
curl http://localhost:9000/api/v2/reports/sales

# Création d'un produit
curl -X POST http://localhost:9000/api/v2/produits \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Nouveau Produit",
    "prix": 29.99,
    "description": "Description du produit"
  }'
```

### API Legacy (v1) - Système de Base

```bash
# Tous les appels vont vers le système de base
curl http://localhost:9000/api/v1/produits
curl http://localhost:9000/api/v1/ventes
curl http://localhost:9000/api/v1/rapports
```

## 🔗 Accès Direct aux Services

### Via Kong Gateway

```bash
# Accès direct aux microservices via Kong
curl http://localhost:8001/direct/produits
curl http://localhost:8001/direct/ventes
curl http://localhost:8001/direct/stocks
curl http://localhost:8001/direct/reports

# Accès direct au système de base via Kong
curl http://localhost:8001/legacy/api/v1/produits
```

### Accès Direct sans Gateway

```bash
# Système de base
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/produits

# Microservices
curl http://localhost:3001/health  # Produit 1
curl http://localhost:3004/health  # Vente
curl http://localhost:3007/health  # Stock
curl http://localhost:3008/health  # Reporting

# Load Balancer
curl http://localhost:8000/health
```

## 🎛️ Configuration du Routage

### Modifier le Comportement de Routage

Éditez le fichier `hybrid-router.js` pour personnaliser :

```javascript
const ROUTING_CONFIG = {
  pos: {
    usesMicroservices: ['stock'], // Ajouter 'vente' pour utiliser le microservice vente
    defaultToLegacy: true
  },
  maisonmere: {
    usesMicroservices: ['reporting', 'stock'], // Ajouter d'autres microservices
    defaultToLegacy: true
  },
  // ...
};
```

### Variables d'Environnement

```bash
# URLs des services
LEGACY_SYSTEM_URL=http://legacy-system:3000
PRODUIT_SERVICE_URL=http://produit-service-1:3001
VENTE_SERVICE_URL=http://vente-service:3004
STOCK_SERVICE_URL=http://stock-service:3007
REPORTING_SERVICE_URL=http://reporting-service:3008
```

## 📊 Monitoring

### Prometheus

- **URL** : http://localhost:9090
- **Targets** : Tous les services (legacy + microservices)

### Grafana

- **URL** : http://localhost:3333
- **Login** : admin/admin
- **Dashboards** : Système de base + Microservices

### Kong Admin

- **URL** : http://localhost:8002
- **Métriques** : http://localhost:8001/metrics

## 🧪 Tests

### Test de Routage Automatisé

```bash
# Script de test complet
./test-architecture-hybride.sh

# Test manuel du routage
bash -c '
  echo "=== Test Console POS ==="
  curl -H "X-Client-Type: pos" http://localhost:9000/pos/produits
  echo -e "\n=== Test Maison Mère ==="
  curl -H "X-Client-Type: maisonmere" http://localhost:9000/maisonmere/reports
  echo -e "\n=== Test API v2 ==="
  curl http://localhost:9000/api/v2/produits
  echo -e "\n=== Test API v1 ==="
  curl http://localhost:9000/api/v1/produits
'
```

### Test de Performance

```bash
# Test de charge sur le routeur
for i in {1..50}; do
  curl -s http://localhost:9000/api/v2/produits &
  curl -s -H "X-Client-Type: pos" http://localhost:9000/pos/stock &
done
wait
```

## 🔧 Maintenance

### Redémarrage d'un Service

```bash
# Redémarrer un microservice
docker-compose -f docker-compose.hybrid.yml restart vente-service

# Redémarrer le système de base
docker-compose -f docker-compose.hybrid.yml restart legacy-system

# Redémarrer le routeur
docker-compose -f docker-compose.hybrid.yml restart hybrid-router
```

### Mise à l'Échelle

```bash
# Ajouter une instance du produit service
docker-compose -f docker-compose.hybrid.yml up -d --scale produit-service-1=2

# Scaling automatique via Kong upstreams configuré
```

### Logs

```bash
# Logs du routeur hybride
docker-compose -f docker-compose.hybrid.yml logs -f hybrid-router

# Logs du système de base
docker-compose -f docker-compose.hybrid.yml logs -f legacy-system

# Logs de tous les services
docker-compose -f docker-compose.hybrid.yml logs -f
```

## 🛑 Arrêt

```bash
# Arrêt propre
docker-compose -f docker-compose.hybrid.yml down

# Arrêt avec suppression des volumes
docker-compose -f docker-compose.hybrid.yml down -v

# Nettoyage complet
docker-compose -f docker-compose.hybrid.yml down -v --remove-orphans
docker system prune -f
```

## 🔍 Dépannage

### Problèmes Courants

1. **Service non accessible**
   ```bash
   docker-compose -f docker-compose.hybrid.yml ps
   docker-compose -f docker-compose.hybrid.yml logs [service-name]
   ```

2. **Routage incorrect**
   ```bash
   curl http://localhost:9000/routing-info
   ```

3. **Base de données non initialisée**
   ```bash
   docker-compose -f docker-compose.hybrid.yml restart mysql-main
   ```

4. **Port en conflit**
   - Modifier les ports dans `docker-compose.hybrid.yml`
   - Vérifier les ports utilisés : `netstat -tlnp`

## 📚 Documentation Additionnelle

- `README_ARCHITECTURE_SIMPLIFIEE.md` : Microservices seuls
- `docs/API_DOCUMENTATION_SIMPLIFIE.md` : APIs des microservices
- `docs/Architecture_Systeme_Microservices_Simplifie.puml` : Diagramme simplifié
- `scripts/init-hybrid-db.sql` : Structure de base de données

## 🎉 Avantages de l'Architecture Hybride

1. **Migration Progressive** : Transition graduelle vers les microservices
2. **Compatibilité** : Les consoles existantes continuent de fonctionner
3. **Flexibilité** : Choix du système selon le contexte
4. **Performance** : Optimisation par service selon les besoins
5. **Monitoring Unifié** : Vue globale de l'ensemble du système

Cette architecture hybride vous permet de **moderniser progressivement** votre système tout en **maintenant la compatibilité** avec les outils existants.
