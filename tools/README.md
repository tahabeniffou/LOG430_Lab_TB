# 🛠️ Outils et Utilitaires

Ce dossier contient les outils et utilitaires pour la gestion du système microservices.

## 📋 Outils Disponibles

| Outil | Description | Usage |
|-------|-------------|-------|
| `start-all-services.js` | Démarrage automatique de tous les services | `npm run start:all` |
| `test-system.js` | Tests de santé de tous les services | `npm run test:system` |
| `monitoring-dashboard.js` | Dashboard de monitoring temps réel | `npm run monitoring` |
| `start-monitoring.js` | **NOUVEAU** Grafana + Prometheus | `npm run monitoring:grafana` |

## 🚀 Utilisation

### Démarrage du Système Complet
```bash
npm run start:all
```
- Démarre tous les microservices en parallèle
- Démarre l'API Gateway
- Effectue des health checks automatiques
- Affiche les URLs de tous les services

### Tests de Santé Système
```bash
npm run test:system
```
- Vérifie la santé de tous les services
- Teste les APIs via l'API Gateway
- Teste les microservices directement

### Dashboard de Monitoring
```bash
npm run monitoring
```
- Lance un dashboard web sur le port 8080
- Affiche les métriques Prometheus en temps réel
- Visualise les performances des services
- Permet le monitoring continu

### 📊 Monitoring Avancé - Grafana (NOUVEAU)
```bash
npm run monitoring:grafana
```
- Démarre Prometheus + Grafana via Docker
- Dashboards préconfgurés pour analyse POS
- Accès: http://localhost:3000 (admin/admin123)
- Métriques temps réel : performance, business, santé

```bash
npm run monitoring:stop
```
- Arrête les services Grafana/Prometheus

## 📊 Fonctionnalités

### start-all-services.js
**Caractéristiques :**
- Démarrage en parallèle pour gagner du temps
- Health checks automatiques toutes les 30 secondes
- Gestion des erreurs et redémarrage automatique
- Affichage des métriques Prometheus
- Logs colorés et structurés

**Configuration des services :**
```javascript
const services = [
  { name: 'api-gateway', script: 'infrastructure/hybrid-router.js', port: 3000 },
  { name: 'produit-service', script: 'microservices/produit-service/server.js', port: 3001 },
  { name: 'stock-service', script: 'microservices/stock-service/server.js', port: 3002 },
  { name: 'vente-service', script: 'microservices/vente-service/server.js', port: 3004 },
  { name: 'reporting-service', script: 'microservices/reporting-service/server.js', port: 3005 }
];
```

### test-system.js
**Tests effectués :**
- Health checks HTTP sur tous les services
- Tests des APIs REST via l'API Gateway
- Tests directs des microservices
- Validation des données retournées
- Métriques de performance

**Exemple de sortie :**
```
✅ API Gateway: 200 - OK
✅ Produit Service: 200 - OK
✅ Stock Service: 200 - OK
✅ Vente Service: 200 - OK
✅ Reporting Service: 200 - OK
📊 Services en santé: 5/5
```

### monitoring-dashboard.js
**Métriques affichées :**
- Latence des requêtes HTTP
- Throughput par service
- Taux d'erreur
- Utilisation mémoire
- Statut des services

## 🔧 Configuration

### Variables d'Environnement
```bash
# Ports des services (optionnel)
API_GATEWAY_PORT=3000
PRODUIT_SERVICE_PORT=3001
STOCK_SERVICE_PORT=3002
VENTE_SERVICE_PORT=3004
REPORTING_SERVICE_PORT=3005

# Monitoring
PROMETHEUS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

### Personnalisation
Pour ajouter un nouveau service au démarrage automatique, modifier `start-all-services.js` :

```javascript
const services = [
  // Services existants...
  { 
    name: 'nouveau-service', 
    script: 'chemin/vers/nouveau-service.js', 
    port: 3006 
  }
];
```

## 🧪 Tests et Validation

### Test Rapide
```bash
# 1. Démarrer le système
npm run start:all

# 2. Attendre 30 secondes

# 3. Vérifier la santé
npm run test:system
```

### Test de Performance
```bash
# Tests de charge avec K6
npm run test:load
npm run test:load:advanced
```

## 📋 Troubleshooting

### Problèmes Courants

#### Services ne démarrent pas
```bash
# Vérifier les ports occupés
netstat -an | findstr :3000

# Libérer les ports
taskkill /f /im node.exe

# Redémarrer
npm run start:all
```

#### Dashboard monitoring inaccessible
```bash
# Vérifier le port 8080
curl http://localhost:8080

# Redémarrer le dashboard
npm run monitoring
```

#### Tests de santé échouent
```bash
# Vérifier les logs
npm run start:all

# Attendre le démarrage complet
sleep 60

# Retester
npm run test:system
```

## 📚 Documentation

Pour plus de détails :
- [Guide Complet](../documentation/GUIDE_COMPLET.md)
- [Architecture](../documentation/STRUCTURE_PROJET.md)
- [README Principal](../README.md)

---

**🔗 Retour à la racine** : [README.md](../README.md)

*Outils pour la gestion efficace du système microservices*
