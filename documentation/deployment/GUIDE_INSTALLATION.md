# 🚀 Guide d'Installation - Système POS Microservices

## Prérequis

### Logiciels requis
- **Docker Desktop** 4.0+ installé et démarré
- **Node.js** 18+ (pour développement local)
- **Git** pour cloner le repository
- **8GB RAM** minimum recommandé
- **10GB espace disque** pour images Docker

### Ports requis
Assurez-vous que ces ports sont disponibles :

| Service | Port | Description |
|---------|------|-------------|
| Kong Proxy | 8000 | API Gateway |
| Kong Admin | 8001 | Administration Kong |
| Prometheus | 9090 | Métriques |
| Grafana | 3008 | Dashboards |
| Produit Service | 3001, 3011 | 2 instances |
| Stock Service | 3002, 3012 | 2 instances |
| Vente Service | 3003, 3013 | 2 instances |
| Reporting Service | 3004, 3014 | 2 instances |
| Compte Service | 3005, 3015 | 2 instances |
| Panier Service | 3006, 3016 | 2 instances |
| Checkout Service | 3007, 3017 | 2 instances |
| Legacy Service | 3000 | 1 instance |

---

## 🔧 Installation Complète

### 1. Clone du repository

```bash
git clone https://github.com/tahabeniffou/LOG430_Lab_TB.git
cd LOG430_Lab_TB
```

### 2. Vérification environnement

```bash
# Vérifier Docker
docker --version
docker-compose --version

# Vérifier Node.js
node --version
npm --version
```

### 3. Déploiement infrastructure

```bash
# Démarrer tous les services (peut prendre 5-10 minutes)
docker-compose up -d

# Vérifier le statut des conteneurs
docker-compose ps
```

**Attendu :** Tous les services doivent être "Up" ou "Up (healthy)"

### 4. Configuration Kong Gateway

```bash
# Attendre que Kong soit prêt (30-60 secondes)
curl -f http://localhost:8001/status || echo "Kong pas encore prêt"

# Configurer les routes (Windows PowerShell)
cd config
# Si bash disponible :
bash kong-config.sh
# Sinon, configuration manuelle (voir section suivante)
```

### 5. Validation déploiement

```bash
# Test automatisé complet
node test-workflow.js

# Vérification manuelle rapide
curl http://localhost:8000/api/produits
curl http://localhost:9090/api/v1/targets
curl http://localhost:3008/api/health
```

---

## ⚙️ Configuration Kong Manuelle

Si le script automatique ne fonctionne pas, voici la configuration manuelle :

### Services et Upstreams

```bash
# Service Produit
curl -X POST http://localhost:8001/upstreams --data "name=produit-upstream"
curl -X POST http://localhost:8001/upstreams/produit-upstream/targets --data "target=produit-service-1:3001"
curl -X POST http://localhost:8001/upstreams/produit-upstream/targets --data "target=produit-service-2:3001"
curl -X POST http://localhost:8001/services --data "name=produit-service" --data "host=produit-upstream"
curl -X POST http://localhost:8001/services/produit-service/routes --data "paths[]=/api/produits"

# Service Stock
curl -X POST http://localhost:8001/upstreams --data "name=stock-upstream"
curl -X POST http://localhost:8001/upstreams/stock-upstream/targets --data "target=stock-service-1:3002"
curl -X POST http://localhost:8001/upstreams/stock-upstream/targets --data "target=stock-service-2:3002"
curl -X POST http://localhost:8001/services --data "name=stock-service" --data "host=stock-upstream"
curl -X POST http://localhost:8001/services/stock-service/routes --data "paths[]=/api/stocks"

# Service Vente
curl -X POST http://localhost:8001/upstreams --data "name=vente-upstream"
curl -X POST http://localhost:8001/upstreams/vente-upstream/targets --data "target=vente-service-1:3003"
curl -X POST http://localhost:8001/upstreams/vente-upstream/targets --data "target=vente-service-2:3003"
curl -X POST http://localhost:8001/services --data "name=vente-service" --data "host=vente-upstream"
curl -X POST http://localhost:8001/services/vente-service/routes --data "paths[]=/api/ventes"

# Service Reporting
curl -X POST http://localhost:8001/upstreams --data "name=reporting-upstream"
curl -X POST http://localhost:8001/upstreams/reporting-upstream/targets --data "target=reporting-service-1:3004"
curl -X POST http://localhost:8001/upstreams/reporting-upstream/targets --data "target=reporting-service-2:3004"
curl -X POST http://localhost:8001/services --data "name=reporting-service" --data "host=reporting-upstream"
curl -X POST http://localhost:8001/services/reporting-service/routes --data "paths[]=/api/reports"

# Service Compte
curl -X POST http://localhost:8001/upstreams --data "name=compte-upstream"
curl -X POST http://localhost:8001/upstreams/compte-upstream/targets --data "target=compte-service-1:3005"
curl -X POST http://localhost:8001/upstreams/compte-upstream/targets --data "target=compte-service-2:3005"
curl -X POST http://localhost:8001/services --data "name=compte-service" --data "host=compte-upstream"
curl -X POST http://localhost:8001/services/compte-service/routes --data "paths[]=/api/comptes"

# Service Panier
curl -X POST http://localhost:8001/upstreams --data "name=panier-upstream"
curl -X POST http://localhost:8001/upstreams/panier-upstream/targets --data "target=panier-service-1:3006"
curl -X POST http://localhost:8001/upstreams/panier-upstream/targets --data "target=panier-service-2:3006"
curl -X POST http://localhost:8001/services --data "name=panier-service" --data "host=panier-upstream"
curl -X POST http://localhost:8001/services/panier-service/routes --data "paths[]=/api/paniers"

# Service Checkout
curl -X POST http://localhost:8001/upstreams --data "name=checkout-upstream"
curl -X POST http://localhost:8001/upstreams/checkout-upstream/targets --data "target=checkout-service-1:3007"
curl -X POST http://localhost:8001/upstreams/checkout-upstream/targets --data "target=checkout-service-2:3007"
curl -X POST http://localhost:8001/services --data "name=checkout-service" --data "host=checkout-upstream"
curl -X POST http://localhost:8001/services/checkout-service/routes --data "paths[]=/api/checkout"
```

---

## 🔍 Vérification Installation

### 1. Status des conteneurs

```bash
docker-compose ps
```

**Résultat attendu :** Tous les services "Up" ou "Up (healthy)"

### 2. Test APIs

```bash
# Test via Kong Gateway
curl http://localhost:8000/api/produits
curl http://localhost:8000/api/stocks
curl http://localhost:8000/api/ventes
curl http://localhost:8000/api/reports

# Test services directs
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

### 3. Test monitoring

```bash
# Prometheus targets
curl http://localhost:9090/api/v1/targets

# Grafana health
curl http://localhost:3008/api/health
```

### 4. Test complet automatisé

```bash
# Script de test global
node test-workflow.js
```

---

## 🌐 Accès aux Interfaces

### Interfaces Web

| Service | URL | Credentials | Description |
|---------|-----|-------------|-------------|
| **Kong Gateway** | http://localhost:8000 | - | Point d'entrée APIs |
| **Kong Admin** | http://localhost:8001 | - | Administration Kong |
| **Grafana** | http://localhost:3008 | admin/admin | Dashboards monitoring |
| **Prometheus** | http://localhost:9090 | - | Métriques et targets |

### APIs Microservices

| Service | URL Direct | URL Kong Gateway |
|---------|------------|------------------|
| **Produits** | http://localhost:3001/api/produits | http://localhost:8000/api/produits |
| **Stock** | http://localhost:3002/api/stocks | http://localhost:8000/api/stocks |
| **Ventes** | http://localhost:3003/api/ventes | http://localhost:8000/api/ventes |
| **Reports** | http://localhost:3004/api/reports | http://localhost:8000/api/reports |
| **Comptes** | http://localhost:3005/api/comptes | http://localhost:8000/api/comptes |
| **Paniers** | http://localhost:3006/api/paniers | http://localhost:8000/api/paniers |
| **Checkout** | http://localhost:3007/api/checkout | http://localhost:8000/api/checkout |
| **Legacy** | http://localhost:3000 | - |

---

## 🎯 Tests de Validation

### Test automatisé complet

```bash
node test-workflow.js
```

**Résultat attendu :**
- ✅ Infrastructure : Kong, Prometheus, Grafana opérationnels
- ✅ Services : 7/7 microservices healthy
- ✅ APIs : Toutes les routes Kong fonctionnelles
- ✅ Load Balancing : Distribution sur 2 instances

### Test workflow e-commerce

```bash
node test-ecommerce-workflow.js
```

### Collection Postman

Importer `tests/POS_Microservices_Kong.postman_collection.json` dans Postman pour tests manuels.

---

## 🛠️ Commandes de Maintenance

### Redémarrage services

```bash
# Redémarrer un service spécifique
docker-compose restart produit-service-1

# Redémarrer tous les services
docker-compose restart
```

### Logs et debugging

```bash
# Logs d'un service
docker-compose logs -f produit-service-1

# Logs Kong
docker-compose logs -f kong

# Logs toutes les bases de données
docker-compose logs -f postgres-produit postgres-stock postgres-vente
```

### Rebuild après modification

```bash
# Rebuild et redéployer un service
docker-compose build produit-service-1
docker-compose up -d produit-service-1

# Rebuild complet
docker-compose down
docker-compose build
docker-compose up -d
```

### Nettoyage

```bash
# Arrêter tous les services
docker-compose down

# Arrêter et supprimer volumes (ATTENTION : perte données)
docker-compose down -v

# Nettoyage images Docker
docker system prune -f
```

---

## ⚠️ Troubleshooting Courant

### Problème : Services ne démarrent pas

```bash
# Vérifier logs
docker-compose logs [service-name]

# Vérifier ports disponibles
netstat -ano | findstr :8000

# Redémarrer Docker Desktop
```

### Problème : Kong routes non configurées

```bash
# Vérifier Kong est prêt
curl http://localhost:8001/status

# Lister services existants
curl http://localhost:8001/services

# Re-configurer Kong
cd config && bash kong-config.sh
```

### Problème : Base de données non accessible

```bash
# Vérifier status PostgreSQL
docker-compose ps | grep postgres

# Redémarrer bases de données
docker-compose restart postgres-produit postgres-stock postgres-vente postgres-reporting
```

### Problème : Grafana inaccessible

```bash
# Vérifier Grafana sur port 3008 (changé pour éviter conflit)
curl http://localhost:3008/api/health

# Redémarrer Grafana
docker-compose restart grafana
```

---

## 📋 Checklist Installation

- [ ] Docker Desktop installé et démarré
- [ ] Repository cloné
- [ ] `docker-compose up -d` exécuté avec succès
- [ ] Tous les conteneurs "Up" dans `docker-compose ps`
- [ ] Kong configuré (script ou manuel)
- [ ] `node test-workflow.js` réussi
- [ ] Accès Grafana http://localhost:3008 (admin/admin)
- [ ] Accès Prometheus http://localhost:9090
- [ ] APIs accessible via Kong http://localhost:8000/api/*

---

*Guide maintenu par l'équipe LOG430 - Dernière mise à jour : 15 Juillet 2025*
