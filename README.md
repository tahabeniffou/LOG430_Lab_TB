# LOG430_Lab_TB – Système de Gestion de Magasin Distribué

## Présentation
Ce projet est une application Node.js distribuée permettant la gestion de magasins, produits, utilisateurs et ventes, avec des APIs RESTful, un système de cache, un load balancer, une observabilité avancée (Prometheus, Grafana) et des tests de charge automatisés.

---

## Table des matières
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Technologies utilisées](#technologies-utilisées)
- [Démarrage rapide](#démarrage-rapide)
- [Déploiement](#déploiement)
- [Utilisation des scripts & tests de charge](#utilisation-des-scripts--tests-de-charge)
- [Observabilité & Monitoring](#observabilité--monitoring)
- [Tests de charge](#tests-de-charge)
- [Structure du projet](#structure-du-projet)
- [Auteurs](#auteurs)

---

## Fonctionnalités
- Gestion des produits, utilisateurs, magasins et ventes via API REST.
- Système de cache (mémoire ou Redis) pour accélérer les lectures.
- Load balancing HTTP pour la haute disponibilité.
- Exposition de métriques Prometheus pour le monitoring.
- Dashboards Grafana pour la visualisation des performances.
- Tests de charge réalistes (k6).

---

## Architecture

### Vue d’ensemble
- **API Node.js** : Plusieurs instances, stateless, exposant les routes REST.
- **Load Balancer (Nginx)** : Répartit la charge entre les instances API.
- **Cache** : Optionnel, activable en mémoire ou Redis.
- **Base de données** : PostgreSQL (via Sequelize ORM).
- **Observabilité** : Prometheus (scraping des métriques), Grafana (visualisation).
- **Tests de charge** : Scripts k6 simulant des scénarios réels.

```
[Client] ⇄ [Load Balancer] ⇄ [API Node.js xN] ⇄ [PostgreSQL]
                                 ⇅
                              [Redis]
```

---

## Technologies utilisées
- **Node.js** (API, scripts)
- **Express.js** (serveur HTTP)
- **Sequelize** (ORM PostgreSQL)
- **Redis** (cache distribué)
- **Nginx** (load balancing)
- **Docker & Docker Compose** (déploiement)
- **Prometheus** (monitoring)
- **Grafana** (dashboards)
- **k6** (tests de charge)
- **Jest** (tests unitaires)

---

## Démarrage rapide

1. **Cloner le projet**
2. **Configurer les variables d’environnement** (voir `config/config.json`)
3. **Lancer l’infrastructure** :
   ```bash
   docker-compose up --build -d
   ```
4. **Accéder à l’API** :
   - API unique : http://localhost:3001
   - Load balancer : http://localhost:8000
5. **Accéder à Grafana** : http://localhost:3030 (admin/admin)

---

## Déploiement

Le projet est entièrement conteneurisé avec Docker Compose.

### Prérequis
- Docker et Docker Compose installés
- (Optionnel) k6 installé pour les tests de charge (`sudo apt install k6`)

### Lancer tous les services
```bash
docker-compose up --build -d
```

### Arrêter tous les services
```bash
docker-compose down
```

### (Re)générer la base de données
```bash
docker-compose exec api1 node src/models/sync.js
```

---

## Utilisation des scripts & tests de charge

### Scripts de test de charge k6
Les scripts sont dans `tests/load/` :
- `loadtest-single-api.js` : un seul API, sans cache, sans load balancer
- `loadtest-multi-api-lb.js` : plusieurs API, load balancer, sans cache
- `loadtest-multi-api-lb-redis.js` : plusieurs API, load balancer, cache Redis

### Script d’automatisation complet
Le script `scripts/run_load_tests.sh` automatise tout le processus :
- Modifie la configuration du cache selon le scénario
- (Re)démarre les bons services Docker
- Réinitialise les métriques Prometheus
- Lance le test de charge k6 adapté
- Met une pause pour observer les résultats sur Grafana

#### Lancer tous les tests de charge automatiquement
```bash
chmod +x scripts/run_load_tests.sh
./scripts/run_load_tests.sh
```

#### Lancer un test de charge manuellement
```bash
k6 run tests/load/loadtest-single-api.js
```

---

## Observabilité & Monitoring
- **Prometheus** scrape les métriques exposées par chaque API (`/metrics`).
- **Grafana** permet de visualiser :
  - Latence moyenne
  - Requêtes par seconde
  - Taux d’erreurs
  - Saturation CPU/mémoire
- Des dashboards prêts à l’emploi sont fournis ou à créer via l’interface Grafana.

---

## Tests de charge
Les scripts de charge sont dans `tests/load/` :
- `loadtest-single-api.js` : un seul API, sans cache, sans load balancer
- `loadtest-multi-api-lb.js` : plusieurs API, load balancer, sans cache
- `loadtest-multi-api-lb-redis.js` : plusieurs API, load balancer, cache Redis

**Lancer un test** :
```bash
k6 run tests/load/loadtest-single-api.js
```
Adapte l’URL cible selon la structure testée.

---

## Structure du projet
```
├── app.js
├── docker-compose.yml
├── Dockerfile
├── config/
│   ├── config.json
│   ├── nginx.conf
│   └── prometheus.yml
├── src/
│   ├── api/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   ├── interfaces/
│   └── models/
├── tests/
│   ├── load/
│   │   ├── loadtest-single-api.js
│   │   ├── loadtest-multi-api-lb.js
│   │   └── loadtest-multi-api-lb-redis.js
│   └── ...
├── scripts/
│   └── run_load_tests.sh
├── docs/
└── ...
```

---

## Auteurs
- Taha Beniffou, étudiant en LOG430 (Architecture logicielle), École de technologie logicielle

