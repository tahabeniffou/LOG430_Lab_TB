#LOG430 - POS Distribué

Ce projet simule une solution distribuée de point de vente (POS) avec plusieurs rôles :
- Magasins qui gèrent les ventes via une console
- Une maison mère qui supervise l’ensemble du réseau
- Une couche API pour les échanges
- Une base de données PostgreSQL centrale

Développé dans le cadre du cours **LOG430 – Architecture logicielle distribuée** à l'ÉTS.


> 🧠 Certaines décisions architecturales, la rédaction documentaire et l’implémentation technique ont été assistées par **ChatGPT** pour accélérer le développement et améliorer la qualité du code.

---

##Objectifs

- Gérer des ventes en magasin avec une interface console
- Consolider les ventes par la maison mère
- Gérer les stocks et demandes de réapprovisionnement
- Fournir un backend API REST en Node.js

---

## Technologies utilisées

- Node.js + Express
- Sequelize (PostgreSQL)
- Inquirer (console interactive)
- Jest (tests)
- Docker + Docker Compose
- GitHub Actions (CI)

---

## Prérequis

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

---

## Lancement du projet

### 1. Lancer les services de base (API + BD)

```bash
docker compose up --build api db
```

- La base de données PostgreSQL est exposée sur le port `5432`
- L’API est accessible sur : [http://localhost:3000](http://localhost:3000)

### 2. Lancer la console POS (magasin)

```bash
docker exec -it pos-app node src/appConsole.js
```

### 3. Lancer la console Maison Mère

```bash
docker exec -it maison-mere node src/maisonMereConsole.js
```

---

## Tests

Lancer les tests unitaires (depuis `pos-app`) :

```bash
docker compose run pos-app npm test
```

---

## Fonctionnalités

### POS (magasin)

- Recherche de produits
- Création de ventes avec plusieurs articles
- Paiement
- Gestion de stock local
- Envoi de demandes de réapprovisionnement

### Maison Mère

- Génération de rapports consolidés
- Classement des produits les plus vendus
- Visualisation des stocks des magasins

### Logistique (API)

- Traitement des demandes de réapprovisionnement
- Stock du centre de distribution
- Exposition des données via l’API REST

---

## Load Balancer, Scaling et Résilience

### 1. Démarrer le Load Balancer et plusieurs instances API

Pour lancer le load balancer NGINX et 4 instances API :

```bash
docker compose -f docker-compose.loadbalancer.yml up --build
```

- Le load balancer NGINX sera accessible sur [http://localhost:8080](http://localhost:8080)
- Les API sont accessibles en direct sur les ports 3001, 3002, 3003, 3004 (pour debug)

Pour ajuster le nombre d’instances, commente/décommente les services `api1`, `api2`, `api3`, `api4` dans `docker-compose.loadbalancer.yml` et dans `nginx.conf` (section `upstream`).

### 2. Stratégies de répartition de charge

Dans `nginx.conf`, section `upstream api_backend` :
- Par défaut : Round Robin (ne rien décommenter)
- Pour Least Connections : décommente `least_conn;`
- Pour IP Hash : décommente `ip_hash;`

Exemple :
```nginx
upstream api_backend {
  server api1:3000;
  server api2:3000;
  server api3:3000;
  server api4:3000;
  # least_conn;
  # ip_hash;
}
```

Redémarre NGINX après modification :
```bash
docker compose -f docker-compose.loadbalancer.yml restart nginx
```

### 3. Tests de charge et collecte des métriques

- Lance les tests de charge avec k6 :
```bash
k6 run k6_load_test.js
```
- Observe les métriques dans Grafana ([http://localhost:3000](http://localhost:3000), user/pass : admin/admin)
- Dashboard : `docs/grafana_dashboard_k6_prometheus.json`
- Métriques : latence, requêtes/s, erreurs 500/s, saturation CPU/mémoire

### 4. Tolérance aux pannes

Pendant un test de charge, arrête une instance API :
```bash
docker stop api2
```
Observe la continuité du service, la redirection automatique par NGINX, et l’impact sur le taux d’erreurs dans Grafana.

### 5. Présentation des résultats

- Pour chaque configuration (N=1,2,3,4), note : latence moyenne, requêtes/s, taux d’erreurs, saturation CPU/mémoire.
- Présente un graphique comparatif (axe X : nombre d’instances, axe Y : métrique).
- Compare les stratégies de load balancing (Round Robin, Least Conn, IP Hash) et documente les différences observées sous charge.

---

## Guide pratique : Load Balancer et Résilience

### Lancer le load balancer et N instances API

1. Modifie le nombre d’instances dans `docker-compose.loadbalancer.yml` (ajoute ou commente les services `api1`, `api2`, `api3`, `api4` selon le besoin).
2. Modifie la section `upstream` de `nginx.conf` pour refléter les instances actives.
3. Lance l’ensemble avec :
```bash
docker compose -f docker-compose.loadbalancer.yml up --build
```
- Accès au load balancer : http://localhost:8080

### Modifier la stratégie de répartition

Dans `nginx.conf`, section `upstream api_backend` :
- Par défaut : Round Robin (ne rien décommenter)
- Pour Least Connections : décommente `least_conn;`
- Pour IP Hash : décommente `ip_hash;`

Après modification, redémarre NGINX :
```bash
docker compose -f docker-compose.loadbalancer.yml restart nginx
```

### Réaliser les tests de charge et observer les métriques

1. Lance un test de charge :
```bash
k6 run k6_load_test.js
```
2. Ouvre Grafana : http://localhost:3000 (admin/admin)
3. Charge le dashboard `docs/grafana_dashboard_k6_prometheus.json` si besoin.
4. Observe : latence, requêtes/s, erreurs 500/s, saturation CPU/mémoire.

### Tester la résilience en arrêtant une instance API

Pendant un test de charge, arrête une instance API (exemple) :
```bash
docker stop api2
```
Observe dans Grafana :
- La continuité du service
- La redirection automatique par NGINX
- L’impact sur le taux d’erreurs

---

## Auteur

Projet réalisé par **Taha Beniffou** – LOG430, École de technologie supérieure (ÉTS).
