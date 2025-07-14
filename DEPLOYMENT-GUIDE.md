# Déploiement VM - LOG430 Lab TB

## Prérequis

- Ubuntu/Debian/CentOS
- 4GB RAM minimum
- Connexion Internet

## Installation

```bash
sudo ./deploy-vm.sh
```

## Vérification

```bash
./test-vm-deployment.sh
```

## Services

- appConsole.js (Legacy System POS)
- maisonMereConsole.js (Console maison mère)
- 4 microservices (produit, stock, vente, reporting) - 2 instances chacun
- Kong Gateway (port 8000)
- PostgreSQL

## Accès

- Kong Gateway: http://vm-ip:8000
- Kong Manager: http://vm-ip:8002
- Monitoring: http://vm-ip:3000

## Maintenance

```bash
# Statut
sudo systemctl status log430

# Logs  
tail -f /var/log/log430.log

# Redémarrage
sudo systemctl restart log430
```
