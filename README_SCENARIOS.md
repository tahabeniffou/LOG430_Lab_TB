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

Pour toute question, voir les fichiers de configuration ou contacter l’équipe pédagogique.
