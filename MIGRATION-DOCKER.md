# 🔄 Migration vers Docker - LOG430 POS

Ce guide vous aide à migrer du système actuel vers la solution Docker simplifiée.

## 🎯 Pourquoi Docker?

- **Simplicité** : Une seule commande pour tout démarrer
- **Portabilité** : Fonctionne identiquement sur Windows, macOS et Linux
- **Isolation** : Environnement propre sans conflits de dépendances
- **Standardisation** : Configuration cohérente pour tous les développeurs

## 🚀 Démarrage rapide

### 1. Prérequis
- Docker Desktop installé
- Ports 3000 et 5432 libres

### 2. Lancement en une commande

**Windows:**
```powershell
.\start-pos.ps1
```

**Linux/macOS:**
```bash
chmod +x start-pos.sh
./start-pos.sh
```

### 3. Accès aux services

- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/api-docs
- **Console POS**: `.\start-pos.ps1 pos` ou `./start-pos.sh pos`

## 📊 Comparaison des méthodes

| Aspect | Solution actuelle | Solution Docker |
|--------|------------------|-----------------|
| **Démarrage** | Multiple commandes | 1 commande |
| **Dépendances** | Node + PostgreSQL local | Docker seulement |
| **Configuration** | Variables d'env manuelles | Automatique |
| **Portabilité** | Dépendante du système | Universelle |
| **Nettoyage** | Manuel | `docker-compose down` |

## 🛠️ Commandes principales

```bash
# Démarrer tout
./start-pos.sh start

# Console magasin
./start-pos.sh pos

# Console maison mère
./start-pos.sh maison-mere

# Tests
./start-pos.sh test

# Arrêt
./start-pos.sh stop

# Logs
./start-pos.sh logs

# État des services
./start-pos.sh status
```

## 🧪 Validation

Testez votre installation :

```bash
# Linux/macOS
chmod +x test-docker.sh
./test-docker.sh

# Ou tests manuels
curl http://localhost:3000
curl http://localhost:3000/api-docs/swagger.json
```

## 🔍 Dépannage

### Problème: Ports occupés
```bash
# Vérifier les ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :5432

# Libérer si nécessaire
docker-compose down
```

### Problème: Images corrompues
```bash
# Reconstruction complète
docker-compose build --no-cache
./start-pos.sh restart
```

### Problème: Base de données
```bash
# Reset complet
./start-pos.sh clean
./start-pos.sh start
```

## 📈 Prochaines étapes

1. **Testez** la solution Docker
2. **Migrez** vos configurations dans `.env`
3. **Adaptez** vos scripts de développement
4. **Documentez** vos changements spécifiques

La solution Docker coexiste avec l'existant - vous pouvez revenir à l'ancienne méthode si nécessaire.
