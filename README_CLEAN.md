# Architecture Hybride - LOG430 Lab TB

## 🏗️ Vue d'ensemble

Cette architecture hybride combine :
- **Système de base (Legacy)** pour les consoles POS et Maison Mère existantes
- **4 Microservices essentiels** : Produit, Vente, Stock, Reporting
- **Routeur intelligent** qui décide automatiquement vers quel système router

## 🎯 Routage Intelligent

| Console | Ressource | Destination |
|---------|-----------|-------------|
| **POS** | Produits, Ventes | → Système de base |
| **POS** | Stock temps réel | → Stock Microservice |
| **Maison Mère** | Produits, Ventes | → Système de base |
| **Maison Mère** | Rapports avancés | → Reporting Microservice |
| **API v2** | Tout | → Microservices |
| **API v1** | Tout | → Système de base |

## 🚀 Démarrage Rapide

```bash
# Démarrer l'architecture complète
./start-architecture-hybride.sh

# Ou manuellement
docker-compose up -d

# Vérifier le statut
docker-compose ps
```

## 🔗 Points d'Accès

- **Routeur Hybride** : http://localhost:9000
- **Système de Base** : http://localhost:3000
- **Kong Gateway** : http://localhost:8001
- **Load Balancer** : http://localhost:8000
- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3333 (admin/admin)

## 📋 Exemples d'Utilisation

### Console POS
```bash
# Produits (va vers legacy)
curl -H "X-Client-Type: pos" http://localhost:9000/pos/produits

# Stock temps réel (va vers microservice)
curl -H "X-Client-Type: pos" http://localhost:9000/pos/stock
```

### Console Maison Mère
```bash
# Produits (va vers legacy)
curl -H "X-Client-Type: maisonmere" http://localhost:9000/maisonmere/produits

# Rapports (va vers microservice)
curl -H "X-Client-Type: maisonmere" http://localhost:9000/maisonmere/reports
```

### API Moderne
```bash
# Microservices
curl http://localhost:9000/api/v2/produits
curl http://localhost:9000/api/v2/stocks
curl http://localhost:9000/api/v2/reports
```

## 🗄️ Base de Données

- **PostgreSQL** (Port 5433) : Microservice Produit
- **MySQL** (Port 3306) : Système de base + autres microservices
- **Redis** (Port 6379) : Cache partagé

## 🛑 Arrêt

```bash
docker-compose down
```

## 📖 Documentation

- `README_ARCHITECTURE_HYBRIDE.md` : Documentation détaillée
- `docs/Architecture_Hybride_Complete.puml` : Diagramme d'architecture
- `scripts/init-hybrid-db.sql` : Structure de base de données
