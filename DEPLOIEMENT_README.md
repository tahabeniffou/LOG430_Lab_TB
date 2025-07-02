# Guide de Déploiement - LOG430 Lab TB API

## 📋 Résumé

Ce projet déploie avec succès une API Node.js avec Docker et Nginx comme reverse proxy/load balancer. L'API est conteneurisée et accessible via Nginx sur le port 80.

## 🏗️ Architecture

- **API Node.js** : Serveur Express conteneurisé (port 3000)
- **Nginx** : Reverse proxy et load balancer (port 80)
- **Docker Compose** : Orchestration des services

## 🚀 Démarrage Rapide

### Prérequis
- Docker et Docker Compose installés
- Node.js 20+ (pour les tests locaux)

### Lancement des services
```bash
# Démarrer l'API et Nginx
docker-compose -f docker-compose-simple.yml up -d

# Vérifier l'état des conteneurs
docker ps

# Arrêter les services
docker-compose -f docker-compose-simple.yml down
```

## 🧪 Tests

### Tests unitaires
```bash
npm test
```

### Tests des endpoints via Nginx
```bash
# Health check
curl http://localhost/api/health

# Endpoint racine
curl http://localhost/

# Endpoints API
curl http://localhost/api/v1/produits
curl http://localhost/api/v1/magasins
curl http://localhost/api/v1/utilisateurs
curl http://localhost/api/v1/ventes
```

## 📁 Fichiers de Configuration

### `docker-compose-simple.yml`
Configuration minimaliste avec deux services :
- `api` : Conteneur Node.js
- `nginx` : Reverse proxy

### `nginx-simple.conf`
Configuration Nginx avec :
- Reverse proxy vers l'API
- Headers CORS
- Health checks

### `Dockerfile`
Image optimisée :
- Base : Node.js 20 Alpine
- Production only
- Healthcheck intégré

### `server-test.js`
Serveur API de test avec endpoints statiques :
- `/` : Status général
- `/api/health` : Health check
- `/api/v1/*` : Endpoints CRUD simplifiés

## ✅ Endpoints Disponibles

| Endpoint | Description | Méthode |
|----------|-------------|---------|
| `/` | Status général de l'API | GET |
| `/api/health` | Health check avec timestamp | GET |
| `/api/v1/produits` | Liste des produits | GET |
| `/api/v1/magasins` | Liste des magasins | GET |
| `/api/v1/utilisateurs` | Liste des utilisateurs | GET |
| `/api/v1/ventes` | Liste des ventes | GET |

## 🔧 Configuration des Ports

- **Port 80** : Nginx (interface publique)
- **Port 3000** : API Node.js (accessible directement aussi)

## 📊 Statut du Déploiement

✅ **SUCCÈS** - Tous les composants fonctionnent correctement :

- [x] API Node.js opérationnelle
- [x] Conteneurisation Docker réussie
- [x] Reverse proxy Nginx configuré
- [x] Tous les endpoints accessibles
- [x] Tests unitaires passants
- [x] Health checks fonctionnels
- [x] Configuration CORS activée

## 🛠️ Commandes Utiles

```bash
# Logs des conteneurs
docker logs log430_lab_tb_api_1
docker logs log430_lab_tb_nginx_1

# Rebuild après modifications
docker-compose -f docker-compose-simple.yml up --build -d

# Tests de charge (si K6 installé)
k6 run k6_load_test.js

# Surveillance des ressources
docker stats
```

# Déploiement et utilisation du projet LOG430_Lab_TB

## 1. Structure du projet
- **Node.js** (API REST, consoles, seed)
- **PostgreSQL** (base de données)
- **Nginx** (load balancer)
- **Prometheus & Grafana** (monitoring)
- **k6** (test de charge)
- **Docker Compose** (orchestration)

## 2. Construction et lancement du système

### a) Lancer tout l’écosystème (API, DB, load balancer, monitoring)
```bash
docker compose -f docker-compose.loadbalancer.yml up --build -d
```

### b) Initialiser la base de données (seed)
```bash
docker compose -f docker-compose.loadbalancer.yml run --rm seed
```

## 3. Utilisation des consoles interactives

### a) Console magasin (POS)
```bash
docker compose -f docker-compose.loadbalancer.yml run --rm appconsole
```

### b) Console maison mère
```bash
docker compose -f docker-compose.loadbalancer.yml run --rm maisonmereconsole
```

## 4. Lancer les tests automatisés (unitaires et intégration)
```bash
npm test
```

## 5. Lancer un test de charge k6
Assure-toi que tout le système est démarré (API, Nginx, DB).

### a) Test de charge via le load balancer (NGINX)
```bash
k6 run k6_load_balancer.js
```

### b) Test de charge sur un seul conteneur API (sans load balancer)
1. Arrête tous les services :
   ```bash
   docker compose -f docker-compose.loadbalancer.yml down
   ```
2. Lance uniquement la base de données et un seul service API (exemple api1) :
   ```bash
   docker compose -f docker-compose.loadbalancer.yml up -d db api1
   ```
3. Lance le test :
   ```bash
   k6 run k6_single_api.js
   ```

## 6. Accéder à Grafana et Prometheus
- **Grafana** : http://localhost:3030 (admin/admin par défaut)
- **Prometheus** : http://localhost:9090

## 7. Commandes utiles Docker Compose
- Arrêter tous les services :
  ```bash
  docker compose -f docker-compose.loadbalancer.yml down
  ```
- Voir les logs d’un service (exemple pour api1) :
  ```bash
  docker compose -f docker-compose.loadbalancer.yml logs api1
  ```

## 8. Fonctionnalités couvertes
- Gestion des magasins, produits, utilisateurs, ventes, stock, réapprovisionnement
- Monitoring complet (requêtes, erreurs, temps de réponse)
- Test de charge massif et validation du load balancer
- Tests unitaires et d’intégration pour chaque service

## 9. Conseils
- Pour modifier la charge du test k6, édite `k6_load_test.js` (paramètre `vus`)
- Pour ajouter des dashboards Grafana, utilise les requêtes PromQL proposées dans les réponses précédentes

---

**Tout est prêt pour tester, monitorer et valider ton système !**
