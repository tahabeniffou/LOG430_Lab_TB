# ⚖️ Guide Load Balancing - Système POS

Ce guide détaille l'implémentation et l'utilisation du load balancing dans le système POS microservices.

## 🎯 Vue d'Ensemble

Le load balancing est intégré directement dans l'API Gateway (`hybrid-router.js`) et utilise un algorithme **Round-Robin** pour distribuer les requêtes entre plusieurs instances de chaque microservice.

## 🏗️ Architecture

### Configuration Multi-Instances

Chaque microservice peut être déployé en **3 instances** sur des ports différents :

```javascript
// Configuration dans hybrid-router.js
const SERVICES = {
  microservices: {
    produit: {
      instances: [
        'http://localhost:3001',  // Instance 1
        'http://localhost:3011',  // Instance 2  
        'http://localhost:3021'   // Instance 3
      ],
      currentIndex: 0
    },
    // ... autres services
  }
}
```

### Algorithme Round-Robin

```javascript
function getServiceInstance(serviceName) {
  const service = SERVICES.microservices[serviceName];
  const selectedInstance = service.instances[service.currentIndex];
  service.currentIndex = (service.currentIndex + 1) % service.instances.length;
  return selectedInstance;
}
```

## 🚀 Utilisation

### Démarrage Complet avec Load Balancing

```bash
# Démarre 12 microservices + 1 API Gateway (13 processus total)
npm run start:load-balancing
```

Cette commande lance :
- **3 instances** du service Produit (ports 3001, 3011, 3021)
- **3 instances** du service Stock (ports 3002, 3012, 3022)
- **3 instances** du service Vente (ports 3003, 3013, 3023)
- **3 instances** du service Reporting (ports 3004, 3014, 3024)
- **1 instance** de l'API Gateway (port 3000)

### Test de Distribution

```bash
# Lance une série de tests pour valider la distribution
npm run test:load-balancing
```

Le script de test :
1. Vérifie le statut du load balancer
2. Envoie plusieurs requêtes à chaque endpoint
3. Analyse la distribution dans les métriques
4. Affiche les recommandations

## 📊 Monitoring et Métriques

### Endpoints de Statut

```bash
# Statut général du système
curl http://localhost:3000/health

# Statut spécifique du load balancer
curl http://localhost:3000/load-balancer/status

# Métriques Prometheus
curl http://localhost:3000/metrics
```

### Métriques Disponibles

Le load balancer expose plusieurs métriques Prometheus :

#### `load_balancer_requests_total`
Compteur total des requêtes distribuées par service et instance.

```
# HELP load_balancer_requests_total Total requests distributed by load balancer
# TYPE load_balancer_requests_total counter
load_balancer_requests_total{service="produit",instance_url="http://localhost:3001",status="success"} 15
load_balancer_requests_total{service="produit",instance_url="http://localhost:3011",status="success"} 14
load_balancer_requests_total{service="produit",instance_url="http://localhost:3021",status="success"} 13
```

#### `service_instance_health`
Gauge de santé des instances individuelles.

```
# HELP service_instance_health Health status of service instances (1=healthy, 0=unhealthy)
# TYPE service_instance_health gauge
service_instance_health{service="produit",instance_url="http://localhost:3001"} 1
service_instance_health{service="produit",instance_url="http://localhost:3011"} 1
service_instance_health{service="produit",instance_url="http://localhost:3021"} 0
```

## 🔍 Vérification de la Distribution

### Test Manuel avec Curl

```bash
# Effectuer plusieurs requêtes et observer les logs
for i in {1..6}; do
  echo "Requête $i:"
  curl -s http://localhost:3000/api/v2/produits | head -1
  sleep 0.5
done
```

### Logs du Load Balancer

Dans les logs de l'API Gateway, vous verrez :

```
⚖️ Load Balancer: produit -> http://localhost:3001 (index: 0)
⚖️ Load Balancer: produit -> http://localhost:3011 (index: 1)
⚖️ Load Balancer: produit -> http://localhost:3021 (index: 2)
⚖️ Load Balancer: produit -> http://localhost:3001 (index: 0)
```

## 🛡️ Gestion des Pannes

### Comportement Actuel

- **Détection** : Les erreurs HTTP sont capturées
- **Métriques** : Les échecs sont comptabilisés séparément
- **Continuité** : Le round-robin continue même si une instance échoue

### Exemple de Panne

```javascript
// Si l'instance :3011 est down
⚖️ Load Balancer: produit -> http://localhost:3001 (index: 0) ✅
⚖️ Load Balancer: produit -> http://localhost:3011 (index: 1) ❌ 
⚖️ Load Balancer: produit -> http://localhost:3021 (index: 2) ✅
⚖️ Load Balancer: produit -> http://localhost:3001 (index: 0) ✅
```

## 📈 Améliorations Possibles

### Health Check Actif

```javascript
// Exemple d'implémentation
async function healthCheckInstances() {
  for (const [serviceName, service] of Object.entries(SERVICES.microservices)) {
    for (const instance of service.instances) {
      try {
        await axios.get(`${instance}/health`, { timeout: 1000 });
        instanceHealthGauge.labels(serviceName, instance).set(1);
      } catch (error) {
        instanceHealthGauge.labels(serviceName, instance).set(0);
        // Retirer temporairement l'instance du pool
      }
    }
  }
}
```

### Circuit Breaker

```javascript
// Exemple de circuit breaker par instance
const circuitBreakers = new Map();

function shouldUseInstance(instance) {
  const breaker = circuitBreakers.get(instance);
  return !breaker || breaker.state !== 'OPEN';
}
```

### Algorithmes Alternatifs

#### Weighted Round-Robin
```javascript
// Pondération par capacité
const weights = { ':3001': 3, ':3011': 2, ':3021': 1 };
```

#### Least Connections
```javascript
// Suivre les connexions actives par instance
const activeConnections = new Map();
```

## 🧪 Scénarios de Test

### Test de Charge Distribuée

```javascript
// Test K6 pour valider la distribution
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const response = http.get('http://localhost:3000/api/v2/produits');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'load balanced': (r) => r.headers['X-Instance-Port'] !== undefined,
  });
}
```

### Test de Résilience

```bash
# Simuler une panne en stoppant une instance
# Puis vérifier que le service continue de fonctionner
kill $(lsof -ti:3011)  # Stopper l'instance 2
npm run test:load-balancing  # Vérifier que ça marche toujours
```

## 💡 Bonnes Pratiques

### Configuration en Production

1. **Variables d'environnement** pour les URLs d'instances
2. **Health checks** automatiques toutes les 30 secondes
3. **Circuit breakers** avec timeout de récupération
4. **Métriques** exportées vers Grafana
5. **Alertes** sur déséquilibre de charge

### Exemple de Configuration Prod

```bash
# Variables d'environnement
export PRODUIT_SERVICE_URL_1="http://produit-1:3001"
export PRODUIT_SERVICE_URL_2="http://produit-2:3001"
export PRODUIT_SERVICE_URL_3="http://produit-3:3001"

# Démarrage
npm run start:load-balancing
```

## 🔗 Références

- **Code source** : `infrastructure/hybrid-router.js`
- **Script de démarrage** : `tools/start-all-services-with-load-balancing.js`
- **Tests** : `tools/test-load-balancing.js`
- **Métriques** : http://localhost:3000/metrics
- **Dashboard** : http://localhost:3000/load-balancer/status

---

Le load balancing améliore significativement la **résilience**, la **performance** et la **scalabilité** du système POS en permettant une distribution intelligente de la charge entre les instances.
