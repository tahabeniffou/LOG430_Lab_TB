# Architecture Microservices - Système de Gestion de Magasins Physiques

## Vue d'ensemble
Découpage logique basé sur l'analyse du domaine métier réel : gestion de magasins physiques avec maison mère, caisses, stock local et central.

## 🎯 Services Principaux (3-4 Services Core)

### 1. **Sales Service** (Service de Ventes) 🛒
**Responsabilité** : Gestion des transactions de vente aux caisses
- Création/annulation de ventes
- Gestion des lignes de vente
- Calcul des totaux
- Historique des transactions par magasin
- Interface avec les caisses POS

**APIs** :
- `POST /api/sales/transactions` - Créer une vente
- `GET /api/sales/transactions/:id` - Consulter une vente
- `PUT /api/sales/transactions/:id/cancel` - Annuler une vente
- `GET /api/sales/magasin/:id/transactions` - Ventes par magasin

### 2. **Inventory Service** (Service Stock/Inventaire) 📦
**Responsabilité** : Gestion des stocks locaux et centraux
- Stock par magasin (local)
- Stock central (maison mère)
- Mouvements de stock (entrées/sorties)
- Seuils d'alerte et réapprovisionnement
- Synchronisation multi-magasins

**APIs** :
- `GET /api/inventory/stock/:productId/:magasinId` - Stock local
- `POST /api/inventory/movement` - Mouvement de stock
- `GET /api/inventory/central/stock` - Vue globale des stocks
- `POST /api/inventory/restock-request` - Demande de réapprovisionnement

### 3. **Store Management Service** (Service Gestion Magasins) 🏪
**Responsabilité** : Configuration et métadonnées des magasins
- Informations des magasins (nom, adresse, etc.)
- Gestion des employés par magasin
- Autorisations et rôles
- Configuration des caisses

**APIs** :
- `GET /api/stores` - Liste des magasins
- `GET /api/stores/:id/employees` - Employés du magasin
- `POST /api/stores/:id/employees` - Ajouter un employé
- `GET /api/stores/:id/config` - Configuration magasin

### 4. **Product Catalog Service** (Service Catalogue Produits) 🏷️
**Responsabilité** : Catalogue centralisé des produits
- Définition des produits (nom, prix, catégorie)
- Gestion des prix
- Catégorisation
- Recherche de produits

**APIs** :
- `GET /api/products` - Liste des produits
- `GET /api/products/search?q=` - Recherche produits
- `GET /api/products/category/:category` - Produits par catégorie
- `PUT /api/products/:id/price` - Mise à jour prix

## 🆕 Nouvelles APIs Supplémentaires (3 APIs)

### 5. **Customer Account Service** (Création Comptes Clients) 👥
**Nouvelle fonctionnalité** : Gestion des comptes clients fidélité
- Création de comptes clients
- Programme de fidélité
- Historique d'achat par client
- Points de fidélité

**APIs** :
- `POST /api/customers/register` - Créer compte client
- `GET /api/customers/:id/profile` - Profil client
- `GET /api/customers/:id/history` - Historique achats
- `PUT /api/customers/:id/loyalty-points` - Gérer points fidélité

### 6. **Shopping Cart Service** (Gestion Panier) 🛍️
**Nouvelle fonctionnalité** : Panier temporaire pour les ventes en cours
- Panier temporaire par caisse
- Ajout/suppression d'articles
- Calcul temps réel des totaux
- Réservation temporaire de stock

**APIs** :
- `POST /api/cart/create` - Créer panier caisse
- `POST /api/cart/:id/items` - Ajouter article
- `DELETE /api/cart/:id/items/:itemId` - Retirer article
- `GET /api/cart/:id/total` - Calculer total

### 7. **Order Validation Service** (Validation Commandes) ✅
**Nouvelle fonctionnalité** : Validation et finalisation des commandes
- Validation des stocks avant finalisation
- Contrôle des autorisations (remises, etc.)
- Intégration systèmes de paiement
- Génération des reçus

**APIs** :
- `POST /api/orders/validate` - Valider commande
- `POST /api/orders/:id/payment` - Traiter paiement
- `GET /api/orders/:id/receipt` - Générer reçu
- `POST /api/orders/:id/approve-discount` - Approuver remise

## 🌐 API Gateway + Load Balancer
**Point d'entrée unique** : `http://localhost:8080`
- Routage intelligent par contexte (magasin vs maison mère)
- Authentification centralisée
- Rate limiting par service
- Logging et monitoring centralisé

## 📊 Service Support (Optionnel)

### 8. **Reporting Service** (Service Rapports)
**Responsabilité** : Analytics et rapports maison mère
- Rapports consolidés multi-magasins
- KPIs de performance
- Tableaux de bord directoriaux
- Exports de données

**APIs** :
- `GET /api/reports/sales/daily` - Rapport ventes quotidiennes
- `GET /api/reports/inventory/status` - État des stocks
- `GET /api/reports/performance/:magasinId` - Performance magasin

## 🐳 Déploiement Docker

Chaque service aura son propre :
- **Dockerfile** dédié
- **package.json** avec dépendances spécifiques
- **docker-compose.microservices.yml** pour orchestration
- **Base de données** : PostgreSQL partagée avec schémas séparés
- **Cache Redis** : partagé avec préfixes par service

## 🔄 Communication Inter-Services

1. **Synchrone** : REST HTTP entre services (via API Gateway)
2. **Asynchrone** : Events/Messages pour synchronisation stock
3. **Base de données** : Schémas séparés avec clés étrangères contrôlées

## 📈 Monitoring & Observabilité

- **Prometheus** : Métriques par service
- **Grafana** : Dashboards spécialisés par domaine métier
- **Distributed Tracing** : Suivi des requêtes inter-services
- **Health Checks** : Surveillance de la santé de chaque service

## 🎯 Avantages de ce Découpage

1. **Alignement métier** : Chaque service correspond à un domaine métier clair
2. **Scalabilité ciblée** : Scale selon les besoins (ex: Sales Service aux heures de pointe)
3. **Déploiement indépendant** : Chaque équipe peut déployer son service
4. **Résilience** : Panne d'un service n'affecte pas les autres
5. **Technologies spécialisées** : Chaque service peut utiliser sa stack optimale

## ⚡ Implémentation Progressive

**Phase 1** : Services Core (Sales, Inventory, Store Management, Product Catalog)
**Phase 2** : Nouvelles APIs (Customer Account, Shopping Cart, Order Validation)
**Phase 3** : Services Support (Reporting) + Optimisations

Cette architecture respecte le domaine métier réel tout en introduisant des fonctionnalités modernes (comptes clients, panier, validation) qui enrichissent l'expérience utilisateur.
