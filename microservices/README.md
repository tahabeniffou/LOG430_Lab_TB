# 🧩 Microservices - Services Métier

Ce dossier contient tous les microservices du système, chacun responsable d'un domaine métier spécifique.

## 📋 Services Disponibles

| Service | Port | Responsabilité | Base de données |
|---------|------|---------------|-----------------|
| **Produit Service** | 3001 | Gestion catalogue produits | SQLite |
| **Stock Service** | 3002 | Gestion stocks temps réel | SQLite |
| **Vente Service** | 3004 | Traitement transactions | SQLite |
| **Reporting Service** | 3005 | Analytics et rapports | Agrégation |

## 🚀 Démarrage Rapide

### Démarrage Automatique (Recommandé)
```bash
# Depuis la racine du projet
npm run start:all
```

### Démarrage Manuel des Services
```bash
# Produit Service
cd produit-service && npm start

# Stock Service  
cd stock-service && npm start

# Vente Service
cd vente-service && npm start

# Reporting Service
cd reporting-service && npm start
```

## 🔧 Installation des Dépendances

```bash
# Installation automatique depuis la racine
npm run install:all

# Ou manuellement pour chaque service
cd produit-service && npm install
cd ../stock-service && npm install
cd ../vente-service && npm install
cd ../reporting-service && npm install
```

## 📊 Health Checks et Monitoring

Chaque service expose :
- **Health Check** : `GET /health`
- **Métriques Prometheus** : `GET /metrics`

### Vérification Rapide
```bash
# Depuis la racine
npm run test:system

# Health checks individuels
curl http://localhost:3001/health  # Produit
curl http://localhost:3002/health  # Stock
curl http://localhost:3004/health  # Vente
curl http://localhost:3005/health  # Reporting
```

## 🏗️ Architecture Technique

### Communication Inter-Services
- **API REST** : Communication HTTP entre services
- **API Gateway** : Point d'entrée unique (port 3000)
- **Circuit Breaker** : Résilience intégrée
- **Load Balancing** : Distribution automatique des requêtes

### Base de Données
- **Produit Service** : SQLite avec modèles Sequelize
- **Stock Service** : SQLite optimisé pour la concurrence
- **Vente Service** : SQLite avec transactions ACID
- **Reporting Service** : Agrégation des données des autres services

### Monitoring
- **Prometheus** : Métriques temps réel sur tous les services
- **Health Checks** : Surveillance automatique de la santé
- **Logging** : Logs structurés pour debugging

## 📚 Documentation Technique

### APIs REST
Chaque service expose une API REST documentée :

#### Produit Service (port 3001)
```
GET    /api/produits           # Liste des produits
GET    /api/produits/:id       # Détail produit
POST   /api/produits           # Créer produit
PUT    /api/produits/:id       # Modifier produit
DELETE /api/produits/:id       # Supprimer produit
```

#### Stock Service (port 3002)
```
GET    /stocks                 # État des stocks
PUT    /stocks/:produitId      # Mettre à jour stock
POST   /stocks/mouvement       # Enregistrer mouvement
GET    /stocks/alertes         # Stocks bas
```

#### Vente Service (port 3004)
```
GET    /ventes                 # Liste des ventes
POST   /ventes                 # Créer vente
GET    /ventes/:id             # Détail vente
GET    /ventes/stats           # Statistiques
```

#### Reporting Service (port 3005)
```
GET    /api/reports            # Liste des rapports
GET    /api/reports/ventes     # Rapport ventes
GET    /api/reports/stock      # Rapport stock
GET    /api/reports/kpi        # KPIs globaux
```

## 🔧 Développement

### Structure d'un Microservice
```
service-name/
├── package.json         # Dépendances NPM
├── server.js           # Point d'entrée principal
├── src/                # Code source
│   ├── controllers/    # Contrôleurs REST
│   ├── models/         # Modèles de données
│   ├── services/       # Logique métier
│   └── utils/          # Utilitaires
└── data/              # Base de données SQLite
```

### Ajout d'un Nouveau Service
1. Créer le dossier du service
2. Initialiser avec `npm init`
3. Installer les dépendances (`express`, `prom-client`, etc.)
4. Créer `server.js` avec les endpoints
5. Ajouter au script `start-all-services.js`
6. Configurer dans l'API Gateway

## 🧪 Tests

### Tests Unitaires
```bash
# Tests d'un service spécifique
cd produit-service && npm test

# Tests de tous les services
npm run test
```

### Tests d'Intégration
```bash
# Tests système complet
npm run test:system

# Tests de performance
npm run test:load
```

## 📋 Troubleshooting

### Problèmes Courants
- **Port occupé** : Vérifier que les ports 3001-3005 sont libres
- **Base de données** : SQLite se crée automatiquement
- **Dépendances** : Exécuter `npm install` dans chaque service

### Logs et Debugging
```bash
# Logs en temps réel
npm run start:all

# Mode debug
DEBUG=* npm run start:all
```

---

**🔗 Retour à la documentation principale** : [README.md](../README.md)

*Services microservices autonomes et scalables*
