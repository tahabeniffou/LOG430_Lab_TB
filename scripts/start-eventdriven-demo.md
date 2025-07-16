# 🚀 Guide de Démarrage Rapide - LAB 7 Architecture Événementielle

## 📋 Prérequis
- Docker et Docker Compose installés
- Node.js 18+ pour les tests locaux
- Ports disponibles : 5672 (RabbitMQ), 15672 (RabbitMQ UI), 5433-5436 (PostgreSQL), 8011-8014 (Services)

## 🎯 Démarrage Express (5 minutes)

### 1. **Infrastructure Événementielle**
```bash
# Créer le réseau Docker si nécessaire
docker network create pos-network

# Démarrer l'infrastructure événementielle
docker-compose -f docker-compose-eventdriven.yml up -d rabbitmq postgres-eventstore

# Attendre que les services soient prêts (30 secondes)
```

### 2. **Vérification RabbitMQ**
- **URL Management** : http://localhost:15672
- **Credentials** : admin / admin123
- **Vérifier** : Exchanges `pos.events` et queues créées

### 3. **Démarrage des Services**
```bash
# Service Réclamations (Producteur)
cd microservices/reclamation-service
npm install
npm start

# Dans de nouveaux terminaux :
# Notification Service (Consommateur)
cd microservices/notification-service  
npm install
npm start

# Audit Service (Consommateur) 
cd microservices/audit-service
npm install
npm start

# Analytics Service (CQRS Read Models)
cd microservices/analytics-service
npm install
npm start
```

## 🧪 Tests Rapides

### **Test 1 : Création Réclamation (Event Sourcing)**
```bash
curl -X POST http://localhost:8011/api/v1/reclamations \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-123",
    "type": "PRODUIT_DEFECTUEUX", 
    "description": "Produit reçu endommagé",
    "priority": "HIGH"
  }'
```

### **Test 2 : Affectation Agent (Pub/Sub)**
```bash
curl -X PUT http://localhost:8011/api/v1/reclamations/{ID}/assign \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-456",
    "comment": "Prise en charge par service client"
  }'
```

### **Test 3 : Replay Événements (Event Sourcing)**
```bash
curl http://localhost:8011/api/v1/reclamations/{ID}/events
curl -X POST http://localhost:8011/api/v1/reclamations/{ID}/replay
```

### **Test 4 : CQRS Read Models**
```bash
# Vue agrégée (Analytics Service)
curl http://localhost:8014/api/v1/analytics/reclamations/summary
curl http://localhost:8014/api/v1/analytics/agents/performance
```

## 📊 Observabilité

### **Métriques Prometheus**
- **Reclamation Service** : http://localhost:8011/metrics
- **Notification Service** : http://localhost:8012/metrics
- **Audit Service** : http://localhost:8013/metrics
- **Analytics Service** : http://localhost:8014/metrics

### **RabbitMQ Monitoring**
- **Management UI** : http://localhost:15672
- **Queues** : reclamations.events, notifications.events, audit.events, analytics.events
- **Exchanges** : pos.events, reclamations.exchange

### **Event Store PostgreSQL**
```bash
# Connexion directe
docker exec -it postgres-eventstore psql -U eventstore_user -d eventstore

# Vérifier les événements
SELECT event_type, COUNT(*) FROM event_store GROUP BY event_type;
SELECT * FROM recent_events LIMIT 10;
```

## 🎭 Scénarios de Démonstration

### **Scénario Complet : Réclamation du Début à la Fin**
```bash
# 1. Créer réclamation
RECLAMATION_ID=$(curl -s -X POST http://localhost:8011/api/v1/reclamations \
  -H "Content-Type: application/json" \
  -d '{"clientId":"client-123","type":"PRODUIT_DEFECTUEUX","description":"Test","priority":"HIGH"}' \
  | jq -r '.id')

# 2. Affecter à un agent
curl -X PUT http://localhost:8011/api/v1/reclamations/$RECLAMATION_ID/assign \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent-456","comment":"Prise en charge"}'

# 3. Résoudre
curl -X PUT http://localhost:8011/api/v1/reclamations/$RECLAMATION_ID/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolution":"Produit remplacé","comment":"Client satisfait"}'

# 4. Clôturer
curl -X PUT http://localhost:8011/api/v1/reclamations/$RECLAMATION_ID/close \
  -H "Content-Type: application/json" \
  -d '{"satisfaction":5,"comment":"Excellente prise en charge"}'

# 5. Vérifier Event Store
curl http://localhost:8011/api/v1/reclamations/$RECLAMATION_ID/events
```

## 🔍 Points de Vérification

### ✅ **Event Sourcing**
- [ ] Événements stockés dans `event_store`
- [ ] Reconstruction d'état via replay
- [ ] Snapshots pour optimisation

### ✅ **Pub/Sub**
- [ ] Événements publiés sur RabbitMQ
- [ ] Consommateurs recevant les messages
- [ ] Routing par topic

### ✅ **CQRS**
- [ ] Séparation Command/Query
- [ ] Read Models optimisées
- [ ] Projections automatiques

### ✅ **Observabilité**
- [ ] Métriques Prometheus
- [ ] Logs structurés
- [ ] Tracing distribué

## 🚨 Troubleshooting

### **RabbitMQ ne démarre pas**
```bash
docker logs rabbitmq-broker
# Vérifier les ports 5672/15672 libres
```

### **Services ne se connectent pas**
```bash
# Vérifier le réseau Docker
docker network inspect pos-network

# Logs des services
docker logs reclamation-service
```

### **Event Store inaccessible**
```bash
# Vérifier PostgreSQL
docker logs postgres-eventstore
docker exec -it postgres-eventstore pg_isready
```

## 🎯 Résultats Attendus

Après ce démarrage, vous devriez avoir :
- **4 services** événementiels fonctionnels
- **RabbitMQ** avec topology configurée
- **Event Store** PostgreSQL opérationnel
- **Événements** circulant entre services
- **Métriques** collectées en temps réel

---

**⏱️ Temps total** : ~5-10 minutes pour un système événementiel complet !
**🎯 Objectif** : Démontrer les patterns Event Sourcing, CQRS et Pub/Sub en action
