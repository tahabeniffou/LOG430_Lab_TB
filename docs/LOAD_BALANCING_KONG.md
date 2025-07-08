# 🔄 Load Balancing avec Kong API Gateway - Documentation Technique

## 🎯 Vue d'Ensemble

Cette implémentation configure un scénario de load balancing via Kong API Gateway avec **3 instances** du service de gestion des produits (stock), utilisant l'algorithme **round-robin** pour distribuer la charge uniformément.

## 🏗️ Architecture Load Balancing

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐
│     Client      │───▶│   Kong Gateway   │───▶│     Upstream Pool       │
│                 │    │   (Port 8000)    │    │   produit-service-      │
└─────────────────┘    └──────────────────┘    │       upstream          │
                              │                 └─────────────────────────┘
                              ▼                              │
                       ┌──────────────────┐                 ▼
                       │   Kong Admin     │    ┌─────────────────────────┐
                       │   (Port 8001)    │    │   Instance 1 (3001)    │
                       └──────────────────┘    │   Instance 2 (3005)    │
                                               │   Instance 3 (3006)    │
                                               └─────────────────────────┘
```

## 🔧 Configuration Technique

### 1. **Upstream Configuration**
```bash
# Création de l'upstream
curl -X POST http://localhost:8001/upstreams \
    --data "name=produit-service-upstream" \
    --data "algorithm=round-robin" \
    --data "healthchecks.passive.healthy.successes=3" \
    --data "healthchecks.passive.unhealthy.http_failures=3"
```

**Paramètres clés :**
- **Algorithm** : `round-robin` (distribution équitable)
- **Health Checks** : Surveillance automatique de la santé des instances
- **Passive Health Checks** : Détection automatique des pannes

### 2. **Targets (Instances)**
```bash
# Ajout des 3 instances
curl -X POST http://localhost:8001/upstreams/produit-service-upstream/targets \
    --data "target=host.docker.internal:3001" --data "weight=100"

curl -X POST http://localhost:8001/upstreams/produit-service-upstream/targets \
    --data "target=host.docker.internal:3005" --data "weight=100"

curl -X POST http://localhost:8001/upstreams/produit-service-upstream/targets \
    --data "target=host.docker.internal:3006" --data "weight=100"
```

**Configuration :**
- **3 instances** identiques du produit-service
- **Poids égal** (100) pour distribution équitable
- **Ports différents** : 3001, 3005, 3006
- **Base de données partagée** pour cohérence des données

### 3. **Service Kong**
```bash
# Création du service pointant vers l'upstream
curl -X POST http://localhost:8001/services \
    --data "name=produit-service-lb" \
    --data "host=produit-service-upstream" \
    --data "port=80" \
    --data "protocol=http"
```

### 4. **Routes Kong**
```bash
# Route pour l'API load-balancée
curl -X POST http://localhost:8001/services/produit-service-lb/routes \
    --data "name=produit-service-lb-route" \
    --data "paths[]=/api/produits-lb"

# Route pour health check load-balancé
curl -X POST http://localhost:8001/services/produit-service-lb/routes \
    --data "name=produit-health-lb-route" \
    --data "paths[]=/health-lb"
```

## 🎛️ Points d'Accès Load Balancing

| Endpoint | URL | Comportement |
|----------|-----|--------------|
| **API Produits LB** | `http://localhost:8000/api/produits-lb` | Distribue entre les 3 instances |
| **Health Check LB** | `http://localhost:8000/health-lb` | Vérifie la santé avec rotation |
| **Accès Direct Instance 1** | `http://localhost:3001/health` | Accès direct sans LB |
| **Accès Direct Instance 2** | `http://localhost:3005/health` | Accès direct sans LB |
| **Accès Direct Instance 3** | `http://localhost:3006/health` | Accès direct sans LB |

## 📊 Algorithme Round-Robin

### **Comportement Attendu**
Le load balancer Kong distribue les requêtes selon l'algorithme round-robin :

```
Requête 1 → Instance 1 (port 3001)
Requête 2 → Instance 2 (port 3005)  
Requête 3 → Instance 3 (port 3006)
Requête 4 → Instance 1 (port 3001)  [Cycle recommence]
Requête 5 → Instance 2 (port 3005)
...
```

### **Distribution Théorique**
Avec 3 instances de poids égal :
- **Instance 1** : ~33.33% des requêtes
- **Instance 2** : ~33.33% des requêtes  
- **Instance 3** : ~33.33% des requêtes

## 🔍 Identification des Instances

### **Headers Ajoutés**
Chaque instance ajoute des headers personnalisés :

```http
X-Instance-ID: produit-instance-1
X-Instance-Name: Produit Service Instance 1
X-Load-Balanced: true
X-Gateway-Load-Balancer: Kong
```

### **Réponse Health Check**
```json
{
  "service": "produit-service",
  "status": "healthy", 
  "timestamp": "2025-07-08T10:30:00.000Z",
  "port": 3001,
  "instanceId": "produit-instance-1",
  "instanceName": "Produit Service Instance 1",
  "database": "connected",
  "uptime": 1234.567
}
```

## 🚀 Démarrage et Utilisation

### **1. Démarrage Complet**
```bash
# Démarrer l'architecture avec load balancing
./scripts/start-loadbalancing-architecture.sh
```

**Processus automatisé :**
1. Démarrage de Kong API Gateway
2. Création de 3 instances du produit-service
3. Configuration automatique du load balancing
4. Démarrage des autres microservices

### **2. Configuration Load Balancing**
```bash
# Configuration manuelle (optionnel)
./scripts/setup-kong-loadbalancing.sh
```

### **3. Tests de Distribution**
```bash
# Tests automatisés de load balancing
./scripts/test-loadbalancing.sh

# Tests de charge avec différents outils
./scripts/run-load-tests.sh
```

## 🧪 Tests de Validation

### **Test 1 : Distribution Basique**
```bash
# 10 requêtes pour observer la rotation
for i in {1..10}; do
  curl -H "Accept: application/json" http://localhost:8000/health-lb | jq '.instanceId'
done
```

**Résultat attendu :**
```
"produit-instance-1"
"produit-instance-2" 
"produit-instance-3"
"produit-instance-1"
"produit-instance-2"
...
```

### **Test 2 : Vérification des Headers**
```bash
# Vérifier les headers de load balancing
curl -I http://localhost:8000/health-lb
```

**Headers attendus :**
```http
X-Instance-ID: produit-instance-X
X-Load-Balanced: true
X-Gateway-Load-Balancer: Kong
```

### **Test 3 : Test de Charge**
```bash
# Test avec k6 (si installé)
k6 run tests/load/k6-distribution-simple.js

# Test avec Apache Bench
ab -n 100 -c 10 http://localhost:8000/health-lb

# Test avec wrk
wrk -t2 -c10 -d30s http://localhost:8000/health-lb
```

## 📈 Monitoring et Métriques

### **État de l'Upstream**
```bash
# Vérifier l'upstream et ses targets
curl http://localhost:8001/upstreams/produit-service-upstream | jq .

# Santé des targets
curl http://localhost:8001/upstreams/produit-service-upstream/health | jq .
```

### **Métriques par Target**
```bash
# Statistiques détaillées
curl http://localhost:8001/upstreams/produit-service-upstream/targets | jq '.data[] | {target, weight, health}'
```

### **Logs Kong**
```bash
# Surveiller les logs de load balancing
docker logs kong-gateway -f | grep "produit-service-upstream"
```

## 🛠️ Gestion Avancée

### **Ajouter une Instance**
```bash
# Démarrer une nouvelle instance (port 3007)
docker run -d --name produit-service-4 \
  -p 3007:3007 \
  -e PORT=3007 \
  -e INSTANCE_ID=produit-instance-4 \
  produit-service

# L'ajouter au load balancer
curl -X POST http://localhost:8001/upstreams/produit-service-upstream/targets \
    --data "target=host.docker.internal:3007" \
    --data "weight=100"
```

### **Retirer une Instance**
```bash
# Marquer comme unhealthy (retrait gracieux)
curl -X POST http://localhost:8001/upstreams/produit-service-upstream/targets/TARGET_ID/unhealthy

# Supprimer définitivement
curl -X DELETE http://localhost:8001/upstreams/produit-service-upstream/targets/TARGET_ID
```

### **Modifier les Poids**
```bash
# Donner plus de poids à une instance performante
curl -X PATCH http://localhost:8001/upstreams/produit-service-upstream/targets/TARGET_ID \
    --data "weight=200"
```

## 🔧 Configuration Docker

### **docker-compose.loadbalancing.yml**
```yaml
version: '3.8'
services:
  # Base de données partagée
  postgres-produit-lb:
    image: postgres:13
    environment:
      POSTGRES_DB: produit_service_lb
      POSTGRES_USER: admin  
      POSTGRES_PASSWORD: password123
    ports:
      - "5433:5432"

  # Instance 1 (port 3001)
  produit-service-1:
    build: ./microservices/produit-service
    environment:
      PORT: 3001
      INSTANCE_ID: produit-instance-1
      INSTANCE_NAME: "Produit Service Instance 1"
      DB_HOST: postgres-produit-lb
    ports:
      - "3001:3001"

  # Instance 2 (port 3005)  
  produit-service-2:
    build: ./microservices/produit-service
    environment:
      PORT: 3005
      INSTANCE_ID: produit-instance-2
      INSTANCE_NAME: "Produit Service Instance 2"
      DB_HOST: postgres-produit-lb
    ports:
      - "3005:3005"

  # Instance 3 (port 3006)
  produit-service-3:
    build: ./microservices/produit-service
    environment:
      PORT: 3006
      INSTANCE_ID: produit-instance-3 
      INSTANCE_NAME: "Produit Service Instance 3"
      DB_HOST: postgres-produit-lb
    ports:
      - "3006:3006"
```

## 🚨 Gestion des Pannes

### **Détection Automatique**
Kong surveille automatiquement la santé des instances :

- **Health Checks Actifs** : Requêtes `/health` toutes les 30s
- **Health Checks Passifs** : Détection des erreurs 5xx
- **Circuit Breaker** : Retrait automatique des instances défaillantes

### **Test de Panne**
```bash
# Simuler une panne (arrêter une instance)
docker stop produit-service-2

# Vérifier la redistribution (les requêtes vont vers instances 1 et 3)
for i in {1..10}; do
  curl http://localhost:8000/health-lb | jq '.instanceId'
done

# Redémarrer l'instance
docker start produit-service-2
```

### **Comportement de Failover**
```
Avant panne : 33% / 33% / 33% (3 instances)
Pendant panne : 50% / 0% / 50% (2 instances actives)  
Après récupération : 33% / 33% / 33% (3 instances)
```

## 📊 Outils de Test Recommandés

### **1. k6 (Moderne, JavaScript)**
```bash
# Installation
./scripts/install-k6.sh

# Test simple de distribution
k6 run tests/load/k6-distribution-simple.js

# Test de charge avancé
k6 run tests/load/k6-loadbalancing-test.js
```

### **2. Apache Bench (Simple, intégré)**
```bash
# Installation Ubuntu
sudo apt-get install apache2-utils

# Test basique
ab -n 100 -c 10 http://localhost:8000/health-lb
```

### **3. wrk (Performance, C)**
```bash
# Installation Ubuntu
sudo apt-get install wrk

# Test de performance
wrk -t2 -c10 -d30s --latency http://localhost:8000/health-lb
```

### **4. curl (Simple, observation)**
```bash
# Observation manuelle de la rotation
watch -n 1 'curl -s http://localhost:8000/health-lb | jq .instanceId'
```

## 🎯 Avantages de cette Implémentation

1. **✅ Distribution Équitable** - Round-robin garantit une répartition uniforme
2. **✅ Haute Disponibilité** - Panne d'une instance = continuité de service  
3. **✅ Scaling Horizontal** - Ajout/retrait d'instances à chaud
4. **✅ Health Monitoring** - Surveillance automatique de la santé
5. **✅ Transparence** - Les clients ne voient qu'un seul endpoint
6. **✅ Observabilité** - Headers et logs pour debugging
7. **✅ Flexibilité** - Modification des poids et algorithmes

## 🔮 Extensions Possibles

- **Algorithmes Avancés** : `least-connections`, `ip-hash`, `weighted`
- **Sticky Sessions** : Affinité de session avec cookies
- **Cross-Zone Load Balancing** : Distribution géographique
- **Auto-Scaling** : Intégration avec Kubernetes HPA
- **Load Balancing L7** : Routage basé sur le contenu HTTP
- **SSL Termination** : Gestion HTTPS centralisée

Cette implémentation fournit une base solide pour un load balancing robuste et scalable ! 🚀
