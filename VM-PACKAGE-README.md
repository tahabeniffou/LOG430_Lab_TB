# LOG430 Lab TB - Package VM

Système de caisse POS avec microservices.

## Installation VM

```bash
scp -r log430-package/ user@vm-ip:/tmp/
cd /tmp/log430-package
sudo ./deploy-vm.sh
./test-vm-deployment.sh
```

## Services

- Legacy System (appConsole.js, maisonMereConsole.js)
- 4 Microservices (produit, stock, vente, reporting) - 2 instances chacun
- Kong Gateway (port 8000)
- PostgreSQL base données

## Accès

- Kong Gateway: http://vm-ip:8000
- Kong Manager: http://vm-ip:8002
- Prometheus: http://vm-ip:9090
- Grafana: http://vm-ip:3000

## Tests

```bash
npm test
```

## API

```bash
curl http://vm-ip:8000/api/produits
curl http://vm-ip:8000/api/ventes
curl http://vm-ip:8000/api/stock
```

## �️ Prérequis VM

- **OS:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM:** 4GB min (8GB recommandé)
- **CPU:** 2 cores min
- **Disque:** 20GB libre
- **Réseau:** Connexion Internet

## 🌐 Accès Services

Après installation:

| Service | URL | Login |
|---------|-----|-------|
| **API Gateway** | http://vm-ip:8000 | - |
| **Grafana** | http://vm-ip:3030 | admin/admin |
| **Prometheus** | http://vm-ip:9090 | - |

## 📡 Test APIs

```bash
# Tester les APIs
curl http://vm-ip:8000/api/v1/magasins
curl http://vm-ip:8000/api/v1/produits
curl http://vm-ip:8000/api/v1/ventes

# Métriques
curl http://vm-ip:9090/metrics
```

## 🔧 Maintenance

```bash
# Statut services
sudo systemctl status log430-docker

# Logs
sudo journalctl -u log430-docker -f
tail -f /var/log/log430/*.log

# Redémarrage
sudo systemctl restart log430-docker

# Mise à jour
cd /opt/log430-lab-tb
sudo -u log430 git pull
sudo systemctl restart log430-docker
```

## 🆘 Dépannage

```bash
# Vérifier Docker
docker ps
docker-compose ps

# Vérifier ports
netstat -tlnp | grep :8000

# Vérifier ressources
htop
df -h
free -h

# Re-tester
./test-vm-deployment.sh
```

## 📊 Monitoring

- **Health checks** automatiques (30s)
- **Auto-restart** services en échec
- **Métriques** système dans Grafana
- **Logs centralisés** `/var/log/log430/`

## ✅ Checklist Déploiement

- [ ] VM avec prérequis OK
- [ ] Package copié sur VM
- [ ] `deploy-vm.sh` exécuté sans erreur
- [ ] Tests passent (`test-vm-deployment.sh`)
- [ ] Services accessibles depuis l'extérieur
- [ ] Monitoring opérationnel

---
**Support:** Consulter `DEPLOYMENT-GUIDE.md` pour plus de détails

## 🌐 ACCÈS AUX SERVICES

Une fois déployé, les services sont accessibles sur:

### Interfaces Web
- **API Gateway**: `http://vm-ip:8000`
- **Grafana**: `http://vm-ip:3030` (admin/admin)
- **Prometheus**: `http://vm-ip:9090`
- **Kong Manager**: `http://vm-ip:8002` (si Kong utilisé)

### APIs REST
```bash
# Exemples d'utilisation
curl http://vm-ip:8000/api/v1/magasins
curl http://vm-ip:8000/api/v1/utilisateurs
curl http://vm-ip:8000/api/v1/produits
curl http://vm-ip:8000/api/v1/ventes
```

## 📊 MONITORING

### Métriques Disponibles
- **Performance** : Temps de réponse, débit
- **Ressources** : CPU, RAM, disque
- **Santé** : Statut des services, erreurs
- **Business** : Nombre de ventes, produits, etc.

### Alertes Configurées
- Service indisponible > 1 minute
- Temps de réponse > 1 seconde
- Utilisation CPU > 80%
- Utilisation RAM > 85%

## 🛠️ MAINTENANCE

### Commandes Utiles
```bash
# Statut des services
sudo systemctl status log430-docker

# Logs en temps réel
sudo journalctl -u log430-docker -f

# Redémarrage complet
sudo systemctl restart log430-docker

# Mise à jour
cd /opt/log430-lab-tb
sudo -u log430 git pull
sudo systemctl restart log430-docker
```

### Sauvegarde
```bash
# Sauvegarde base de données
docker exec postgres-db pg_dump -U pos_user pos_system > backup.sql

# Sauvegarde configuration
tar -czf config-backup.tar.gz /opt/log430-lab-tb/config/
```

## 🆘 SUPPORT

### Logs Principaux
- `/var/log/log430/system-monitor.log` - Monitoring système
- `docker-compose logs` - Logs des conteneurs
- `/var/log/syslog` - Logs système Linux

### Diagnostic
```bash
# Vérifier Docker
docker ps
docker-compose ps

# Vérifier les ports
netstat -tlnp | grep -E ':(8000|3030|9090|3200)'

# Vérifier les ressources
htop
df -h
free -h
```

## 📋 CHECKLIST DÉPLOIEMENT

### Avant Déploiement
- [ ] VM configurée avec prérequis
- [ ] Accès SSH fonctionnel
- [ ] Ports ouverts dans le firewall
- [ ] Connexion Internet stable

### Pendant Déploiement
- [ ] Script deploy-vm.sh exécuté sans erreur
- [ ] Tous les conteneurs Docker démarrés
- [ ] Tests automatiques passent
- [ ] Services accessibles depuis l'extérieur

### Après Déploiement
- [ ] Monitoring actif
- [ ] Sauvegardes configurées
- [ ] Documentation accessible
- [ ] Équipe formée sur la maintenance

## 🔧 PERSONNALISATION

### Variables d'Environnement
```bash
# Dans docker-compose-vm.yml
POSTGRES_PASSWORD=votre_mot_de_passe
GF_SECURITY_ADMIN_PASSWORD=votre_mot_de_passe_grafana
```

### Ports Personnalisés
```bash
# Modifier dans docker-compose-vm.yml
ports:
  - "VOTRE_PORT:8000"  # API Gateway
  - "VOTRE_PORT:3030"  # Grafana
```

### Limites de Ressources
```bash
# Ajouter dans docker-compose-vm.yml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

## 📈 SCALABILITÉ

### Ajout d'Instances
```bash
# Dupliquer un service dans docker-compose-vm.yml
produit-service-2:
  extends:
    service: produit-service
  ports:
    - "3011:3001"
```

### Load Balancing
```bash
# Utiliser docker-compose.yml avec Kong Gateway
# pour le load balancing automatique
docker-compose -f docker-compose.yml up -d
```

---

## ✅ VERSIONS TESTÉES

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18.x LTS
- **PostgreSQL**: 13+
- **Ubuntu**: 20.04 LTS, 22.04 LTS
- **Debian**: 11+
- **CentOS**: 8+
- **Rocky Linux**: 8+

## 📞 CONTACT

Pour toute question ou problème:
- Consulter la documentation: `DEPLOYMENT-GUIDE.md`
- Vérifier les logs: `/var/log/log430/`
- Exécuter les tests: `./test-vm-deployment.sh`
