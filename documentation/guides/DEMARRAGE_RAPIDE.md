# 🚀 Guide de Démarrage Rapide

Ce guide vous permet de démarrer le système POS microservices en 5 minutes.

## ⚡ Installation Express

### Prérequis
- Node.js v16+ installé
- Git installé
- Terminal/PowerShell

### Étapes (2 commandes)

```bash
# 1. Cloner et naviguer
git clone <repository-url>
cd LOG430_Lab_TB

# 2. Démarrer le système complet (installe et démarre)
node tools/start-all-services.js
```

## 🎯 Vérification Rapide

### 1. Tester la Santé du Système
```bash
node tools/test-system.js
```

**Sortie attendue :**
```
✅ Hybrid Router (3000): OK
✅ Produit Service (3001): OK
✅ Stock Service (3002): OK
✅ Vente Service (3003): OK
✅ Reporting Service (3004): OK
✅ Legacy App (3030): OK
```

### 2. Tester les APIs

**Test API Gateway :**
```bash
curl http://localhost:3000/health
# Réponse : {"status":"healthy","services":{...}}
```

## 🌐 Accès aux Services

| Service | URL | Description |
|---------|-----|-------------|
| **API Gateway** | http://localhost:3000/health | État global du système |
| **Produits API** | http://localhost:3000/api/products | API via gateway |
| **Stock API** | http://localhost:3000/api/stock | API via gateway |
| **Ventes API** | http://localhost:3000/api/sales | API via gateway |
| **Reports API** | http://localhost:3000/api/reports | API via gateway |
| **Dashboard HTML** | Ouvrir `dashboard-standalone.html` | Dashboard simple |
| **Métriques** | http://localhost:3000/metrics | Métriques Prometheus |

### URLs Directes (Dev seulement)
| Service | URL Directe | Port |
|---------|-------------|------|
| Produit Service | http://localhost:3001/health | 3001 |
| Stock Service | http://localhost:3002/health | 3002 |
| Vente Service | http://localhost:3003/health | 3003 |
| Reporting Service | http://localhost:3004/health | 3004 |
| Legacy App | http://localhost:3030/ | 3030 |

## 🧪 Tests et Monitoring

### Tests de Performance
```bash
# Test de charge K6 basique
k6 run tests/k6-load-test.js

# Test de charge avancé
k6 run tests/k6-load-test-advanced.js

# Test de stress avec monitoring
node tools/stress-test.js
```

### Démarrer le Monitoring
```bash
# Lancer Prometheus + Grafana
node tools/start-monitoring.js

# Ouvrir dashboards automatiquement
node tools/open-dashboards.js
```

## 🆘 Dépannage Express

### Problème : Port occupé
```bash
# Windows (PowerShell)
Get-Process -Name node | Stop-Process -Force

# Linux/Mac  
pkill -f node

# Redémarrer
node tools/start-all-services.js
```

### Problème : Service non disponible
```bash
# Vérifier l'état de tous les services
node tools/test-system.js

# Redémarrer un service spécifique
cd microservices/produit-service && node server.js

# Ou redémarrer tout le système
node tools/start-all-services.js
```

### Problème : Base de données corrompue
```bash
# Les bases SQLite peuvent être régénérées automatiquement
# Supprimer les fichiers .db dans microservices/*/data/ et redémarrer
```

## 🔧 Scripts Utiles

```bash
# Démarrage complet
node tools/start-all-services.js

# Tests santé système  
node tools/test-system.js

# Monitoring avec stress test
node tools/monitor-with-stress.js

# Tests Jest
npm test

# Dashboard monitoring
node tools/monitoring-dashboard.js
```

---

**⚡ En 2 minutes vous devriez avoir :**
- ✅ Tous les services démarrés
- ✅ API Gateway accessible 
- ✅ Tests système OK
- ✅ Dashboard fonctionnel

### Problème : Console freeze
```bash
# Ctrl+C pour arrêter
# Redémarrer la console
npm run pos-console
```

## ✅ Validation Complète

Si tout fonctionne, vous devriez avoir :
- ✅ 5 services en santé
- ✅ Consoles interactives fonctionnelles  
- ✅ APIs accessibles via navigateur
- ✅ Tests de charge réussis

## 📚 Prochaines Étapes

1. **Explorer les consoles** : Naviguer dans les menus POS et Admin
2. **Tester les APIs** : Utiliser curl ou Postman
3. **Voir le monitoring** : Consulter les métriques temps réel
4. **Lire la doc complète** : `documentation/GUIDE_COMPLET.md`

---

**🎉 Félicitations ! Votre système microservices est opérationnel !**

*Temps total d'installation : 3-5 minutes*  
*Temps de démarrage : 30-60 secondes*
