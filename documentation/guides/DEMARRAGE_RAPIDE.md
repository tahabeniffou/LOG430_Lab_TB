# 🚀 Démarrage Rapide (5 minutes)

## ⚡ Installation

```bash
# 1. Cloner
git clone <repository-url>
cd LOG430_Lab_TB

# 2. Démarrer (installe automatiquement)
npm run start:all
```

## ✅ Validation

```bash
# Vérifier que tout fonctionne
npm run test:system
```

**Résultat attendu :**
```
✅ API Gateway (3000): OK
✅ Produit Service (3001): OK  
✅ Stock Service (3002): OK
✅ Vente Service (3003): OK
✅ Reporting Service (3004): OK
```

## 🌐 Accès

| Service | URL | Description |
|---------|-----|-------------|
| **Dashboard** | `dashboard-standalone.html` | Monitoring simple |
| **API Gateway** | http://localhost:3000/health | État du système |
| **Métriques** | http://localhost:3000/metrics | Prometheus |
| **Load Balancer** | http://localhost:3000/load-balancer/status | Répartition de charge |

## 🚀 Load Balancing (Optionnel)

```bash
# Démarrer avec 3 instances par service (12 microservices)
npm run start:load-balancing

# Tester la distribution
npm run test:load-balancing
```

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests de performance
npm run test:load

# Monitoring temps réel
npm run monitoring
```

## 🛑 Arrêt

**Ctrl+C** dans le terminal ou fermer la fenêtre.

---

**C'est tout !** Le système est opérationnel avec architecture microservices, load balancing et monitoring.
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
