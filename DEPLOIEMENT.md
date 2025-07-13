# 🚀 GUIDE DE DÉPLOIEMENT SIMPLE

## 📋 PRÉREQUIS
- Docker Desktop installé et démarré
- Git pour cloner le projet

## 🚀 DÉPLOIEMENT EN UNE COMMANDE

```bash
# Cloner le projet
git clone <votre-repo>
cd LOG430_Lab_TB

# Démarrer tout le système
docker-compose up -d

# Vérifier le déploiement
docker-compose ps
```

## 🌐 ACCÈS AUX SERVICES

### API Gateway Kong
- **Gateway:** http://localhost:8000
- **Admin:** http://localhost:8001
- **Manager:** http://localhost:8002

### Microservices (2 instances chacun)
- **Produit:** http://localhost:3001, http://localhost:3011
- **Stock:** http://localhost:3002, http://localhost:3012
- **Vente:** http://localhost:3003, http://localhost:3013
- **Reporting:** http://localhost:3004, http://localhost:3014

### Consoles
- **POS:** http://localhost:3100
- **Maison Mère:** http://localhost:3101

### Legacy System
- **Legacy:** http://localhost:3200

### Monitoring
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3030 (admin/admin)

## 🛠️ COMMANDES UTILES

```bash
# Voir les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart <service-name>

# Arrêter tout
docker-compose down

# Nettoyer complètement
docker-compose down -v --rmi all
```

## ✅ VÉRIFICATION SYSTÈME

```bash
# Santé Kong
curl http://localhost:8000/health

# Test API via Kong
curl http://localhost:8000/api/v2/produits

# Status load balancing
curl http://localhost:8001/upstreams
```

---

**🎯 SYSTÈME PRÊT EN 1 COMMANDE : `docker-compose up -d`**
