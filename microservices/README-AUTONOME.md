# Architecture Microservices Autonome - LOG430 Lab

Ce projet a été **complètement migré** d'une architecture monolithique vers une architecture microservices où chaque domaine métier est devenu un service **totalement indépendant et autonome**.

## 🎯 Séparation Complète du Système de Base

### ❌ Ce qui a été SUPPRIMÉ de l'ancien système :
- ✅ Toutes les dépendances vers `../../src/domain/...`
- ✅ Partage de base de données avec le système principal
- ✅ Couplage avec la logique métier centralisée
- ✅ Anciens microservices redondants (cart-service, customer-service, etc.)

### ✅ Ce qui est maintenant AUTONOME :
- ✅ Chaque microservice a sa **propre base de données MySQL**
- ✅ Chaque microservice a sa **propre logique métier** dans `src/domain/`
- ✅ Chaque microservice a sa **propre infrastructure** dans `src/infrastructure/`
- ✅ Chaque microservice est **complètement indépendant**

## 🏗️ Architecture Finale

### Microservices autonomes (4 domaines métier)

1. **Produit Service** (Port 3001)
   - Base de données : `produit_service_db`
   - Utilisateur DB : `produit_user`
   - Logique métier : Classes `Produit`, `ProduitRepository`
   - Infrastructure : Sequelize + MySQL autonome

2. **Magasin Service** (Port 3002)
   - Base de données : `magasin_service_db`
   - Utilisateur DB : `magasin_user`
   - Logique métier : Classes `Magasin`, `MagasinRepository`
   - Infrastructure : Sequelize + MySQL autonome

3. **Utilisateur Service** (Port 3003)
   - Base de données : `utilisateur_service_db`
   - Utilisateur DB : `utilisateur_user`
   - Logique métier : Classes `Utilisateur`, `UtilisateurRepository`
   - Infrastructure : Sequelize + MySQL autonome + bcrypt

4. **Vente Service** (Port 3004)
   - Base de données : `vente_service_db`
   - Utilisateur DB : `vente_user`
   - Logique métier : Classes `Vente`, `LigneVente`, `VenteRepository`
   - Infrastructure : Sequelize + MySQL autonome + communication inter-services

## 🚀 Démarrage de l'écosystème autonome

### 1. Créer les bases de données séparées

```bash
# Démarrer MySQL (si pas déjà fait)
docker run --name mysql-microservices -e MYSQL_ROOT_PASSWORD=rootpassword -p 3306:3306 -d mysql:8.0

# Créer toutes les bases de données autonomes
./scripts/create-microservices-databases.sh
```

### 2. Démarrer tous les microservices

```bash
# Démarrer tous les services autonomes
./scripts/start-domain-microservices.sh

# OU démarrer individuellement
cd microservices/produit-service && npm install && npm start &
cd microservices/magasin-service && npm install && npm start &
cd microservices/utilisateur-service && npm install && npm start &
cd microservices/vente-service && npm install && npm start &
```

## 📋 APIs des Microservices Autonomes

### Produit Service (http://localhost:3001)
- **Base de données** : `produit_service_db` (complètement séparée)
```
GET/POST/PUT/DELETE /api/produits
GET /api/produits/categories
PUT /api/produits/:id/stock/incrementer
PUT /api/produits/:id/stock/decrementer
GET /health
```

### Magasin Service (http://localhost:3002)
- **Base de données** : `magasin_service_db` (complètement séparée)
```
GET/POST/PUT/DELETE /api/magasins
GET/POST/DELETE /api/magasins/:id/utilisateurs
GET /health
```

### Utilisateur Service (http://localhost:3003)
- **Base de données** : `utilisateur_service_db` (complètement séparée)
```
GET/POST/PUT/DELETE /api/utilisateurs
POST /api/utilisateurs/auth/login
GET /api/utilisateurs/magasin/:magasinId
GET /health
```

### Vente Service (http://localhost:3004)
- **Base de données** : `vente_service_db` (complètement séparée)
- **Communication** : Avec les autres services via HTTP
```
GET/POST/PUT/DELETE /api/ventes
POST /api/ventes/:id/lignes
PUT /api/ventes/:id/annuler
GET /api/ventes/statistiques/magasin/:magasinId
GET /health
```

## 🔧 Structure Autonome de Chaque Microservice

```
microservices/
├── produit-service/           # ← AUTONOME
│   ├── .env                   # ← Configuration séparée
│   ├── package.json           # ← Dépendances séparées
│   ├── server.js              # ← Serveur autonome
│   └── src/                   # ← Logique métier extraite
│       ├── domain/            # ← Entités métier locales
│       │   ├── BaseEntity.js
│       │   ├── Produit.js
│       │   └── ProduitRepository.js
│       └── infrastructure/    # ← Infrastructure locale
│           ├── database.js
│           └── SequelizeProduitRepository.js
├── magasin-service/           # ← AUTONOME
├── utilisateur-service/       # ← AUTONOME
└── vente-service/             # ← AUTONOME
```

## 🗄️ Bases de Données Complètement Séparées

Chaque microservice a sa **propre base de données MySQL** :

```sql
-- 4 bases de données complètement indépendantes
produit_service_db      (utilisateur: produit_user)
magasin_service_db      (utilisateur: magasin_user)
utilisateur_service_db  (utilisateur: utilisateur_user)
vente_service_db        (utilisateur: vente_user)
```

## 🔄 Communication Inter-Services

- **Vente Service** communique avec les autres via **HTTP REST**
- Aucun partage de base de données
- Chaque service valide ses propres données
- Résilience via gestion d'erreurs HTTP

## ✅ Avantages de cette Architecture

1. **Indépendance Totale** : Chaque service peut évoluer séparément
2. **Scalabilité** : Chaque service peut être scalé indépendamment
3. **Maintenance** : Modifications isolées par domaine métier
4. **Déploiement** : Déploiement indépendant de chaque service
5. **Résilience** : Panne d'un service n'affecte pas les autres
6. **Technologies** : Chaque service peut utiliser des technologies différentes

## 🛡️ Sécurité et Isolation

- Chaque base de données a son propre utilisateur
- Isolation complète des données par domaine
- Communication sécurisée via HTTPS
- Validation des données à chaque niveau

## 📊 Monitoring

```bash
# Health checks individuels
curl http://localhost:3001/health  # Produit
curl http://localhost:3002/health  # Magasin  
curl http://localhost:3003/health  # Utilisateur
curl http://localhost:3004/health  # Vente
```

---

**🎉 Migration réussie : Système monolithique → 4 microservices autonomes**

*Chaque microservice est maintenant complètement indépendant avec sa propre base de données et sa propre logique métier extraite du système de base.*
