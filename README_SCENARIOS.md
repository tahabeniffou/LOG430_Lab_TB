# Scénarios de test de charge et monitoring

Ce projet propose trois scénarios d'architecture pour tester et monitorer une application multi-API avec Docker Compose, Prometheus, Grafana, cAdvisor, node-exporter, Redis (cache), et Nginx (load balancer).

## Prérequis
- Docker et Docker Compose installés
- K6 installé (`npm install -g k6` ou via https://k6.io/docs/getting-started/installation/)

## IMPORTANT : Structure des fichiers
- Le fichier principal de l'API doit être `app.js` à la racine du projet.
- Le fichier `app/app.js` (dans le dossier `app/`) doit être supprimé pour éviter tout conflit.

## Scénarios disponibles

### 1. API seule (pas de cache, pas de load balancer)
- Fichier : `docker-compose.scenario1.yml`
- Test de charge : `tests/load/loadtest-single-api.js`
- Lancement :
  ```bash
  docker-compose -f docker-compose.scenario1.yml build --no-cache
  docker-compose -f docker-compose.scenario1.yml up
  # Dans un autre terminal :
  k6 run tests/load/loadtest-single-api.js
  ```
- Accès API : http://localhost:3001
- Accès Grafana : http://localhost:3030 (admin/admin)
- Accès Prometheus : http://localhost:9090

### 2. Multi-API + load balancer (pas de cache)
- Fichier : `docker-compose.scenario2.yml`
- Test de charge : `tests/load/loadtest-multi-api-lb.js`
- Lancement :
  ```bash
  docker-compose -f docker-compose.scenario2.yml up --build
  # Dans un autre terminal :
  k6 run tests/load/loadtest-multi-api-lb.js
  ```
- Accès API via Nginx : http://localhost:8000
- Accès Grafana : http://localhost:3030
- Accès Prometheus : http://localhost:9090

### 3. Multi-API + load balancer + cache Redis
- Fichier : `docker-compose.scenario3.yml`
- Test de charge : `tests/load/loadtest-multi-api-lb-redis.js`
- Lancement :
  ```bash
  docker-compose -f docker-compose.scenario3.yml up --build
  # Dans un autre terminal :
  k6 run tests/load/loadtest-multi-api-lb-redis.js
  ```
- Accès API via Nginx : http://localhost:8000
- Accès Grafana : http://localhost:3030
- Accès Prometheus : http://localhost:9090

## Conseils
- Attendre quelques minutes après le début du test pour voir les métriques dans Grafana.
- Utiliser les dashboards fournis (JSON) pour visualiser latence, RPS, taux d’erreur, saturation CPU/mémoire.
- Arrêter les containers d’un scénario avant d’en lancer un autre :
  ```bash
  docker-compose -f docker-compose.scenarioX.yml down
  ```

## Nettoyage
Pour réinitialiser les métriques Prometheus :
```bash
sudo rm -rf prometheus_data/
```

---

# Évolution vers Architecture Microservices (Lab 5)

## Contexte et Objectifs
Extension du Lab 4 vers une architecture orientée microservices pour un **système de gestion de magasins physiques avec maison mère**, en décomposant le système existant selon les domaines métier identifiés.

## Architecture Cible - Domaine Métier Réel

### Services Magasin (Opérations Locales)
1. **Service Ventes** - Gestion des transactions en magasin (caisses)
2. **Service Stock Local** - Gestion des stocks par magasin
3. **Service Utilisateurs** - Gestion des employés (vendeurs, managers)
4. **Service Magasins** - Configuration et données des magasins

### Services Maison Mère (Centralisation)
5. **Service Reporting** - Rapports consolidés et analytics
6. **Service Stock Central** - Vue globale des stocks tous magasins
7. **Service Réapprovisionnement** - Gestion des demandes et distributions

### Services Support
8. **Service Produits** - Catalogue centralisé des produits
9. **Service Authentification** - Gestion des sessions et autorisations

### API Gateway
- **Choix** : Kong / KrakenD / Spring Cloud Gateway
- **Fonctionnalités** : 
  - Routage par type d'utilisateur (magasin vs maison mère)
  - Load balancing entre magasins
  - Logging centralisé des opérations
  - Sécurité et autorisations par rôle
- **Point d'entrée unique** : http://localhost:8080

## Nouveaux Scénarios

### 4. Architecture Microservices sans API Gateway
- Fichier : `docker-compose.scenario4.yml`
- Test de charge : `tests/load/loadtest-microservices.js`
- Services séparés avec communication directe
- Simulation d'opérations multi-magasins

### 5. Architecture Microservices avec API Gateway
- Fichier : `docker-compose.scenario5.yml`
- Test de charge : `tests/load/loadtest-api-gateway.js`
- Routage intelligent selon le contexte (magasin/maison mère)

## Tests de Performance Comparatifs
```bash
# Tester l'ancienne vs nouvelle architecture
k6 run tests/load/loadtest-multi-api-lb-redis.js > results_monolith.txt
k6 run tests/load/loadtest-microservices.js > results_microservices.txt
k6 run tests/load/loadtest-api-gateway.js > results_api_gateway.txt
```

## Métriques Spécifiques au Domaine
- **Latence des transactions de vente** (critique pour les caisses)
- **Throughput des opérations stock** (temps réel important)
- **Performance des rapports maison mère** (analytics)
- **Disponibilité par magasin** (résilience locale)
- **Cohérence des données stock** (synchronisation)

## Prochaines Étapes
1. Découpage des services selon le domaine métier
2. Implémentation de la communication inter-services
3. Configuration de l'API Gateway avec routage par contexte
4. Tests de charge simulant opérations multi-magasins
5. Analyse de la résilience et cohérence des données
