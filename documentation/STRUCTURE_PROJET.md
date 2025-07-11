# 📁 Structure du Projet - Système POS Microservices

## 🗂️ Organisation du Projet

```
LOG430_Lab_TB/
├── 📖 README.md                     # Vue d'ensemble et démarrage
├── 📦 package.json                  # Scripts et configuration
├── 🐳 Dockerfile                    # Conteneurisation
├── 📊 dashboard-standalone.html     # Dashboard monitoring
│
├── 📁 app/                          # SYSTÈME LEGACY
│   └── app.js                       # API monolithique (port 3030)
│
├── 📁 infrastructure/               # API GATEWAY
│   └── hybrid-router.js             # Router + Load Balancer (port 3000)
│
├── 📁 microservices/                # SERVICES MÉTIER
│   ├── produit-service/             # Gestion catalogue (port 3001)
│   ├── stock-service/               # Gestion inventaire (port 3002)  
│   ├── vente-service/               # Transactions POS (port 3004)
│   └── reporting-service/           # Analytics (port 3005)
│
├── 📁 tools/                        # SCRIPTS UTILITAIRES
│   ├── start-all-services.js        # Démarrage standard
│   ├── start-all-services-with-load-balancing.js  # Multi-instances
│   ├── test-load-balancing.js       # Tests load balancer
│   └── monitoring-dashboard.js      # Dashboard temps réel
│
├── 📁 tests/                        # TESTS ET VALIDATION
│   ├── k6-load-test.js              # Tests de charge
│   └── performance.test.js          # Tests performance
│
└── 📁 documentation/                # DOCUMENTATION
    ├── INDEX.md                     # Index général
    ├── RAPPORT_TECHNIQUE_COMPLET.md # Documentation technique
    └── guides/                      # Guides utilisateur
```

## 🎯 Points Clés

### Architecture Services
- **API Gateway (3000)** : Point d'entrée unique + load balancing
- **4 Microservices** : Produits, Stock, Ventes, Reporting
- **Système Legacy (3030)** : Support des anciennes consoles

### Scripts Essentiels
- `npm start` : Démarrage simple (1 instance par service)
- `npm run start:load-balancing` : Multi-instances avec load balancer
- `npm test` : Tests complets du système

### Monitoring
- Dashboard HTML standalone pour visualisation temps réel
- Métriques Prometheus intégrées dans chaque service
- Tests de charge K6 pour validation performance

## 🔧 Composants Techniques

### API Gateway (`infrastructure/hybrid-router.js`)
- **Routage intelligent** : Distribution des requêtes vers les microservices
- **Load balancing** : Round-robin sur plusieurs instances par service
- **Health checking** : Surveillance état des services
- **Métriques** : Exposition métriques Prometheus

### Microservices
Chaque service dispose de :
- **API REST** : Endpoints métier
- **Base SQLite** : Stockage local
- **Métriques** : Monitoring intégré
- **Docker** : Déploiement conteneurisé

### Outils de Test
- **K6** : Tests de charge et performance
- **Jest** : Tests unitaires et intégration
- **Scripts custom** : Validation load balancing

## 🚀 Démarrage Rapide

```bash
# Installation
npm install

# Démarrage standard
npm start

# Démarrage avec load balancing
npm run start:load-balancing

# Tests et validation
npm test
npm run test:load-balancing
```

## 📊 Monitoring et Observabilité

### Dashboard HTML
- Interface temps réel pour surveillance système
- Métriques : RPS, latence, erreurs, CPU, mémoire
- Graphiques interactifs avec Chart.js

### Métriques Prometheus
- `http_requests_total` : Compteur requêtes par service
- `http_request_duration_seconds` : Latence des requêtes
- `load_balancer_requests_total` : Distribution load balancer
- `nodejs_memory_usage_bytes` : Utilisation mémoire

---

*Architecture validée et testée pour un déploiement en production.*
