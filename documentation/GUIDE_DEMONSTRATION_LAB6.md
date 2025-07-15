# 🎬 GUIDE DE DÉMONSTRATION LAB 6 - SAGA ORCHESTRATOR

## 🚀 ÉTAPES DE DÉMONSTRATION

### 1. **DÉMARRAGE DES SERVICES** (5 min)

#### A. Services de base
```bash
# Démarrer les bases de données et Kong
docker-compose up -d postgres-stock postgres-compte postgres-vente postgres-produit kong-db kong

# Attendre 30 secondes pour l'initialisation
```

#### B. Microservices
```bash
# Démarrer les microservices
docker-compose up -d stock-service-1 compte-service-1 vente-service-1 produit-service-1

# Attendre 30 secondes
```

#### C. Saga Orchestrator
```bash
# Démarrer le service Saga
docker-compose up -d saga-orchestrator-service

# Ou en mode dev pour voir les logs
cd microservices/saga-orchestrator-service
npm start
```

### 2. **VÉRIFICATION SANTÉ DES SERVICES** (2 min)

#### URLs à vérifier dans le navigateur :
- **Saga Orchestrator** : http://localhost:8010/health
- **Stock Service** : http://localhost:3002/health  
- **Compte Service** : http://localhost:3005/health
- **Vente Service** : http://localhost:3003/health
- **Kong Gateway** : http://localhost:8001 (admin)

#### Command line check :
```bash
node test-saga.js health
```

### 3. **DÉMONSTRATION SCÉNARIOS SAGA** (10 min)

#### A. **Saga SUCCESS** ✅
```bash
# Test automatique
node test-saga.js success

# Ou manuel avec curl
curl -X POST http://localhost:8010/saga/order \
  -H "Content-Type: application/json" \
  -d '{"produitId":"1","quantite":2,"clientId":"2","montant":50.00}'
```

**📸 CAPTURE 1** : Réponse success avec sagaId et résultat complet

#### B. **Saga FAILURE - Stock** ❌
```bash
# Test automatique  
node test-saga.js fail-stock

# Ou manuel
curl -X POST http://localhost:8010/saga/order \
  -H "Content-Type: application/json" \
  -d '{"produitId":"999","quantite":100,"clientId":"2","montant":50.00}'
```

**📸 CAPTURE 2** : Réponse d'échec avec message d'erreur stock

#### C. **Saga FAILURE - Payment** ❌ (avec compensation)
```bash
# Test automatique
node test-saga.js fail-payment

# Ou manuel  
curl -X POST http://localhost:8010/saga/order \
  -H "Content-Type: application/json" \
  -d '{"produitId":"1","quantite":2,"clientId":"2","montant":1500.00}'
```

**📸 CAPTURE 3** : Réponse d'échec avec compensation stock libéré

### 4. **MONITORING ET OBSERVABILITÉ** (5 min)

#### A. **Métriques Prometheus**
URL : http://localhost:8010/metrics

**📸 CAPTURE 4** : Métriques saga spécialisées :
- `saga_started_total`
- `saga_completed_total`
- `saga_failures_total` 
- `saga_step_duration_seconds`

#### B. **Liste des Sagas**
```bash
curl http://localhost:8010/saga/list
```

**📸 CAPTURE 5** : JSON avec historique des sagas exécutées

#### C. **Détail d'une Saga**
```bash
# Récupérer un sagaId de la liste précédente
curl http://localhost:8010/saga/{SAGA_ID}/status
```

**📸 CAPTURE 6** : Détail d'une saga avec tous ses steps et événements

### 5. **LOGS ET ÉVÉNEMENTS** (3 min)

#### A. **Logs du Saga Orchestrator**
```bash
# Si démarré avec Docker
docker-compose logs saga-orchestrator-service

# Si démarré en local
tail -f microservices/saga-orchestrator-service/logs/combined.log
```

**📸 CAPTURE 7** : Logs structurés avec événements clairs

#### B. **Événements Saga dans les logs**
Montrer les événements :
- `StockReservationDemandee`
- `StockReserve`
- `PaiementDemande` 
- `PaiementReussi`
- `VenteDemandee`
- `VenteCreee`
- `CommandeTerminee`

## 📸 CAPTURES D'ÉCRAN PRIORITAIRES

### **CAPTURE 1 - SUCCESS SAGA** ⭐
- URL : http://localhost:8010/saga/order (POST)
- Montrer : Response JSON avec status "completed"

### **CAPTURE 2 - FAILURE STOCK** ⭐  
- URL : http://localhost:8010/saga/order (POST)
- Montrer : Response JSON avec status "failed" et erreur stock

### **CAPTURE 3 - FAILURE PAYMENT + COMPENSATION** ⭐
- URL : http://localhost:8010/saga/order (POST)  
- Montrer : Response JSON avec compensation automatique

### **CAPTURE 4 - MÉTRIQUES PROMETHEUS** ⭐
- URL : http://localhost:8010/metrics
- Montrer : Métriques saga_ avec valeurs

### **CAPTURE 5 - SAGA STATUS DETAIL** ⭐
- URL : http://localhost:8010/saga/{ID}/status
- Montrer : JSON détaillé avec steps et événements

### **CAPTURE 6 - ARCHITECTURE (optionnel)**
- Diagramme depuis documentation/LAB6_SAGA_IMPLEMENTATION.md

## 🎯 POINTS CLÉS À MENTIONNER

### **Architecture**
- Pattern Saga Orchestrator vs Choreography
- Orchestration centralisée synchrone
- 3 étapes (< 4 maximum requis)

### **Gestion d'Erreurs**
- Compensation automatique en ordre inverse
- Événements clairs à chaque étape
- Aucune commande "bloquée"

### **Observabilité**  
- Métriques Prometheus spécialisées
- Logs structurés avec traçabilité
- États persistés en base SQLite

### **Conformité**
- API synchrone (pas de message queues)
- Contrôle centralisé
- Gestion explicite des erreurs
- Machine d'état claire

## ⏱️ TIMELINE DÉMONSTRATION (25 min total)

1. **Setup** (5 min) - Démarrage services
2. **Scénarios** (10 min) - 3 tests saga
3. **Monitoring** (5 min) - Métriques et logs  
4. **Architecture** (3 min) - Code et design
5. **Q&A** (2 min) - Questions

## 🔧 DÉPANNAGE RAPIDE

### Si Saga Orchestrator ne démarre pas :
```bash
cd microservices/saga-orchestrator-service
npm start
# Logs visibles directement
```

### Si services ne répondent pas :
```bash
docker-compose ps  # Vérifier status
docker-compose logs service-name  # Voir erreurs
```

### Si tests échouent :
```bash
# Test de connectivité de base
curl http://localhost:8010/health
curl http://localhost:3002/health
curl http://localhost:3005/health
```

**🎉 Bonne démonstration !**
