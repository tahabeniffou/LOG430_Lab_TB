# =========================================
# GUIDE DE DÉPLOIEMENT VM - LOG430 LAB TB
# =========================================

## 🎯 ARCHITECTURE DÉPLOYÉE

**Système POS (Point of Sale) avec microservices**
- **Legacy System** (port 3200) : API REST principale
- **4 Microservices** (ports 3001-3004) : Produit, Stock, Vente, Reporting
- **Kong Gateway** (port 8000) : API Gateway avec load balancing
- **PostgreSQL** (port 5432) : Base de données commune
- **Prometheus** (port 9090) : Monitoring des métriques
- **Grafana** (port 3030) : Dashboards et visualisation

## 📋 PRÉREQUIS VM

### Configuration Minimale
- **OS** : Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / Rocky Linux 8+
- **RAM** : 4 GB minimum (8 GB recommandé)
- **CPU** : 2 cores minimum (4 cores recommandé)
- **Disque** : 20 GB libre minimum
- **Réseau** : Connexion Internet pour télécharger les dépendances

### Ports à Ouvrir
```bash
# Ports principaux
8000  # Kong Gateway (API principale)
8001  # Kong Admin API
8002  # Kong Manager UI
3030  # Grafana (dashboards)
9090  # Prometheus (métriques)

# Ports de débogage (optionnels)
3200  # Legacy System (accès direct)
3001  # Produit Service (accès direct)
3002  # Stock Service (accès direct)
3003  # Vente Service (accès direct)
3004  # Reporting Service (accès direct)
5432  # PostgreSQL (accès externe)
```

## 🚀 PROCÉDURE DE DÉPLOIEMENT

### Étape 1 : Préparation de la VM

```bash
# 1. Connexion à la VM
ssh user@your-vm-ip

# 2. Copier les scripts de déploiement
scp deploy-vm.sh user@your-vm-ip:/tmp/
scp monitor-system.sh user@your-vm-ip:/tmp/

# 3. Rendre les scripts exécutables
chmod +x /tmp/deploy-vm.sh
chmod +x /tmp/monitor-system.sh
```

### Étape 2 : Exécution du Script de Déploiement

```bash
# Lancer le déploiement automatique
sudo /tmp/deploy-vm.sh
```

**Le script installera automatiquement :**
- Docker & Docker Compose
- Node.js 18+
- Dépendances système
- Configuration du firewall
- Services systemd
- Utilisateur de service dédié

### Étape 3 : Copie du Code Source

```bash
# Méthode 1 : Clonage Git (si repository public)
sudo -u log430 git clone https://github.com/votre-repo/LOG430_Lab_TB.git /opt/log430-lab-tb

# Méthode 2 : Copie SCP
scp -r ./* user@your-vm-ip:/tmp/log430-src/
sudo mv /tmp/log430-src/* /opt/log430-lab-tb/
sudo chown -R log430:log430 /opt/log430-lab-tb

# Méthode 3 : Copie manuelle des fichiers essentiels
# Copiez au minimum ces fichiers :
# - docker-compose.yml
# - Dockerfile
# - package.json
# - src/
# - config/
# - tests/
```

### Étape 4 : Configuration et Démarrage

```bash
# 1. Aller dans le répertoire du projet
cd /opt/log430-lab-tb

# 2. Installer les dépendances Node.js
sudo -u log430 npm install --production

# 3. Démarrer les services Docker
sudo systemctl start log430-docker

# 4. Vérifier le statut
sudo systemctl status log430-docker

# 5. Démarrer le monitoring
sudo systemctl start log430-monitor
```

## 🔍 VÉRIFICATION DU DÉPLOIEMENT

### Tests de Connectivité

```bash
# Vérifier Kong Gateway
curl http://localhost:8000

# Vérifier Kong Admin
curl http://localhost:8001

# Vérifier Grafana
curl http://localhost:3030

# Vérifier Prometheus
curl http://localhost:9090

# Test complet avec le script de test
node test-system.js
```

### Vérification des Conteneurs

```bash
# Lister tous les conteneurs
docker ps

# Vérifier les logs
docker-compose logs -f

# Logs spécifiques par service
docker-compose logs kong
docker-compose logs legacy-system
docker-compose logs produit-service-1
```

### Monitoring Système

```bash
# Logs du système
sudo journalctl -u log430-docker -f
sudo journalctl -u log430-monitor -f

# Logs applicatifs
tail -f /var/log/log430/system-monitor.log

# Ressources système
htop
df -h
free -h
```

## 🌐 ACCÈS AUX SERVICES

Une fois déployé, les services sont accessibles via :

### Interface Utilisateur
- **Kong Manager** : `http://your-vm-ip:8002`
- **Grafana** : `http://your-vm-ip:3030` (admin/admin)
- **Prometheus** : `http://your-vm-ip:9090`

### APIs
- **API Gateway** : `http://your-vm-ip:8000`
- **Kong Admin** : `http://your-vm-ip:8001`

### Exemples d'utilisation

```bash
# API via Kong Gateway
curl http://your-vm-ip:8000/api/v1/magasins
curl http://your-vm-ip:8000/api/produits
curl http://your-vm-ip:8000/api/ventes

# Métriques Prometheus
curl http://your-vm-ip:9090/metrics

# Santé des services
curl http://your-vm-ip:8000/health
```

## 🛠️ MAINTENANCE

### Commandes Utiles

```bash
# Redémarrer tous les services
sudo systemctl restart log430-docker

# Mettre à jour le code
cd /opt/log430-lab-tb
sudo -u log430 git pull
sudo systemctl restart log430-docker

# Sauvegarder la base de données
docker exec postgres-db pg_dump -U pos_user pos_system > backup.sql

# Nettoyer Docker
docker system prune -f
docker volume prune -f
```

### Logs et Debugging

```bash
# Logs principaux
tail -f /var/log/log430/system-monitor.log

# Logs Docker Compose
docker-compose logs -f --tail=100

# Logs par service
docker-compose logs legacy-system
docker-compose logs kong
docker-compose logs postgres-db

# Debug d'un service spécifique
docker exec -it legacy-system /bin/bash
```

### Mise à Jour

```bash
# 1. Sauvegarder les données
docker exec postgres-db pg_dump -U pos_user pos_system > /tmp/backup-$(date +%Y%m%d).sql

# 2. Arrêter les services
sudo systemctl stop log430-docker

# 3. Mettre à jour le code
cd /opt/log430-lab-tb
sudo -u log430 git pull

# 4. Rebuilder les images si nécessaire
docker-compose build --no-cache

# 5. Redémarrer
sudo systemctl start log430-docker
```

## 🚨 DÉPANNAGE

### Problèmes Courants

**1. Port déjà utilisé**
```bash
sudo netstat -tlnp | grep :8000
sudo kill -9 <PID>
```

**2. Conteneur qui ne démarre pas**
```bash
docker-compose logs <service-name>
docker-compose restart <service-name>
```

**3. Base de données inaccessible**
```bash
docker exec -it postgres-db psql -U pos_user -d pos_system
```

**4. Problème de permissions**
```bash
sudo chown -R log430:log430 /opt/log430-lab-tb
sudo chmod +x /opt/log430-lab-tb/*.sh
```

### Contacts et Support

- **Logs système** : `/var/log/log430/`
- **Configuration** : `/opt/log430-lab-tb/config/`
- **Documentation API** : `http://your-vm-ip:8000/docs` (si Swagger activé)

## 📊 MÉTRIQUES DE PERFORMANCE

### Indicateurs à Surveiller

- **Temps de réponse API** : < 200ms
- **Utilisation CPU** : < 70%
- **Utilisation RAM** : < 80%
- **Disponibilité services** : > 99%
- **Erreurs 5xx** : < 1%

### Alertes Recommandées

- Service indisponible > 1 minute
- Temps de réponse > 1 seconde
- Utilisation disque > 85%
- Erreurs > 10/minute

---

## ✅ CHECKLIST DÉPLOIEMENT

- [ ] VM configurée avec les prérequis
- [ ] Scripts de déploiement exécutés
- [ ] Code source copié
- [ ] Services Docker démarrés
- [ ] Tests de connectivité réussis
- [ ] Monitoring actif
- [ ] Firewall configuré
- [ ] Accès externe testé
- [ ] Documentation accessible
- [ ] Procédures de sauvegarde en place
