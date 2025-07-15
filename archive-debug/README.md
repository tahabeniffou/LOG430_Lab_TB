# Archive Fichiers de Débogage

Ce dossier contient les fichiers utilisés pendant le développement et le débogage du système.

## Fichiers archivés

### Scripts de déploiement
- `deploy-complete.js` : Script de déploiement automatisé complet
- `deploy-docker.bat` : Script batch Windows pour déploiement
- `deploy-docker.sh` : Script bash pour déploiement
- `deploy-local.bat` : Script déploiement local Windows
- `rebuild-system.js` : Script de reconstruction système

### Scripts de diagnostic
- `kong-diagnostic.js` : Diagnostic Kong Gateway
- `fix-healthchecks.ps1` : Script de correction health checks
- `test-complete-system.js` : Tests système complets

### Configurations de débogage
- `docker-compose-corrected.yml` : Version corrigée docker-compose
- `DEPLOY_SUCCESS_REPORT.md` : Rapport de succès déploiement

## Utilisation

Ces fichiers peuvent être restaurés si nécessaire pour le débogage :

```bash
# Restaurer un fichier
cp archive-debug/[filename] ./

# Restaurer tous les fichiers
cp archive-debug/* ./
```

## Note

Les fichiers de test principaux sont conservés à la racine :
- `test-workflow.js` : Test principal infrastructure + microservices
- `test-ecommerce-workflow.js` : Test workflow e-commerce
- `test-microservices-workflow.js` : Test load balancing

---

*Archivé le 15 Juillet 2025*
