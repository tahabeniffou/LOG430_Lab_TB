# 🚀 Guide de déploiement Docker - LOG430 POS

Ce guide explique comment déployer et utiliser le système POS via Docker.

## 📋 Prérequis

- [Docker](https://www.docker.com/get-started) installé
- [Docker Compose](https://docs.docker.com/compose/install/) installé
- 4 GB de RAM disponible
- Ports 3000 et 5432 libres

## ⚡ Démarrage rapide

### Sur Linux/macOS :
```bash
# Rendre le script exécutable
chmod +x start-pos.sh

# Démarrer le système complet
./start-pos.sh start
```

### Sur Windows (PowerShell) :
```powershell
# Démarrer le système complet
.\start-pos.ps1 start
```

## 🛠️ Commandes disponibles

### Scripts de lancement :

| Commande | Linux/macOS | Windows PowerShell | Description |
|----------|-------------|-------------------|-------------|
| Démarrer | `./start-pos.sh start` | `.\start-pos.ps1 start` | Lance DB + API |
| Arrêter | `./start-pos.sh stop` | `.\start-pos.ps1 stop` | Arrête tous les services |
| Console POS | `./start-pos.sh pos` | `.\start-pos.ps1 pos` | Lance la console magasin |
| Console Maison Mère | `./start-pos.sh maison-mere` | `.\start-pos.ps1 maison-mere` | Lance la console maison mère |
| Tests | `./start-pos.sh test` | `.\start-pos.ps1 test` | Exécute les tests |
| Logs | `./start-pos.sh logs` | `.\start-pos.ps1 logs` | Affiche les logs |
| État | `./start-pos.sh status` | `.\start-pos.ps1 status` | Affiche l'état des services |
| Aide | `./start-pos.sh help` | `.\start-pos.ps1 help` | Affiche l'aide |

### Commandes Docker directes :

```bash
# Démarrer seulement DB + API
docker-compose up -d db api

# Lancer la console POS
docker-compose run --rm pos-console

# Lancer la console Maison Mère  
docker-compose run --rm maison-mere-console

# Voir les logs
docker-compose logs -f

# Arrêter tous les services
docker-compose down

# Nettoyage complet (⚠️ supprime les données)
docker-compose down -v --remove-orphans
```

## 🌐 URLs importantes

Une fois démarré, les services sont accessibles sur :

- **API REST** : http://localhost:3000
- **Documentation Swagger** : http://localhost:3000/api-docs
- **Documentation Redoc** : http://localhost:3000/redoc
- **Swagger JSON** : http://localhost:3000/api-docs/swagger.json
- **Base de données** : localhost:5432

## 📊 Endpoints API principaux

```
GET    /api/v1/produits     - Liste des produits
POST   /api/v1/produits     - Créer un produit
GET    /api/v1/ventes       - Liste des ventes
POST   /api/v1/ventes       - Créer une vente
GET    /api/v1/rapports     - Génération de rapports
GET    /api/v1/utilisateurs - Liste des utilisateurs
```

## 🔧 Configuration

### Variables d'environnement

Le système utilise ces variables (avec valeurs par défaut) :

```env
POSTGRES_DB=posdb
POSTGRES_USER=posuser
POSTGRES_PASSWORD=pospass
POSTGRES_HOST=db
PORT=3000
CORS_ORIGINS=*
NODE_ENV=development
```

### Personnalisation

Pour modifier la configuration, créez un fichier `.env` :

```env
# .env
POSTGRES_PASSWORD=monmotdepasse
PORT=8080
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

## 🏗️ Architecture des conteneurs

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   pos-console   │    │  maison-mere-   │    │       api       │
│   (Interactive) │    │    console      │    │   (Port 3000)   │
│                 │    │  (Interactive)  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                   ┌─────────────────┐
                   │       db        │
                   │  PostgreSQL     │
                   │   (Port 5432)   │
                   └─────────────────┘
```

## 🧪 Tests

```bash
# Lancer tous les tests
./start-pos.sh test

# Ou directement avec Docker
docker-compose run --rm api npm test

# Tests spécifiques
docker-compose run --rm api npm test -- --testNamePattern="produit"
```

## 🐛 Dépannage

### Problèmes courants :

**Port déjà utilisé :**
```bash
# Vérifier les ports utilisés
netstat -tulpn | grep :3000
netstat -tulpn | grep :5432

# Arrêter les services qui utilisent ces ports
```

**Problème de permissions (Linux/macOS) :**
```bash
chmod +x start-pos.sh
```

**Conteneurs ne démarrent pas :**
```bash
# Voir les logs détaillés
docker-compose logs

# Reconstruire les images
docker-compose build --no-cache
```

**Base de données non accessible :**
```bash
# Vérifier l'état de PostgreSQL
docker-compose exec db pg_isready -U posuser -d posdb

# Se connecter à la DB pour debug
docker-compose exec db psql -U posuser -d posdb
```

## 🔄 Mise à jour

Pour mettre à jour le système :

```bash
# Arrêter les services
./start-pos.sh stop

# Récupérer les dernières modifications
git pull

# Reconstruire et redémarrer
./start-pos.sh restart
```

## 📝 Logs et monitoring

```bash
# Logs en temps réel
./start-pos.sh logs

# Logs d'un service spécifique
docker-compose logs -f api
docker-compose logs -f db

# État des conteneurs
docker-compose ps
```

## 🚀 Production

Pour un déploiement en production, utilisez le fichier `docker-compose.production.yml` qui inclut des services additionnels comme Prometheus et Grafana.

```bash
# Production avec monitoring
docker-compose -f docker-compose.production.yml up -d
```
