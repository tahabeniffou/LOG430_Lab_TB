# 🔥 GUIDE COMPLET - STRESS TESTING & MONITORING

## 🎯 OBJECTIF

Stresser votre système POS et observer l'impact en temps réel sur les métriques de performance, exactement comme dans votre configuration Grafana/Prometheus.

## 📊 DASHBOARD DE MÉTRIQUES

### Ouverture Rapide
```bash
npm run dashboards:metrics
```

### Métriques Surveillées
- **📈 RPS Total** - Requêtes par seconde
- **💻 Utilisation CPU** - Pourcentage d'utilisation processeur
- **❌ Taux d'Erreurs 500** - Pourcentage d'erreurs serveur
- **⚡ Latence Moyenne** - Temps de réponse en millisecondes

### Interface Interactive
- ✅ **Graphiques temps réel** avec Chart.js
- ✅ **Contrôles de stress test** intégrés
- ✅ **Logs système** en direct
- ✅ **Configuration flexible** des tests

## 🚀 COMMANDES DE STRESS TEST

### Scripts NPM (Recommandé)
```bash
# Test léger - Vérification système
npm run stress:light     # 5 RPS × 30s

# Test modéré - Charge normale
npm run stress:medium    # 25 RPS × 60s

# Test intensif - Charge élevée
npm run stress:heavy     # 100 RPS × 120s

# Test extrême - Limite système
npm run stress:extreme   # 500 RPS × 60s
```

### Scripts Directs
```bash
node tools/stress-test.js light
node tools/stress-test.js medium  
node tools/stress-test.js heavy
node tools/stress-test.js extreme
```

### Monitoring Complet
```bash
# Lance dashboard + guide stress test
npm run monitoring:metrics
```

## 🎮 UTILISATION PRATIQUE

### Étape 1: Préparer le Monitoring
```bash
# Ouvrir le dashboard de métriques
npm run dashboards:metrics
```

### Étape 2: Démarrer les Services (Si nécessaire)
```bash
# Démarrer tous les microservices
npm run start:all

# OU démarrer le routeur hybride seul
npm start
```

### Étape 3: Lancer un Stress Test
```bash
# Dans un nouveau terminal
npm run stress:medium
```

### Étape 4: Observer les Résultats
- 📊 **Dashboard** - Graphiques temps réel
- 🖥️ **Terminal** - Statistiques détaillées
- 📋 **Logs** - Événements système

## 📈 MÉTRIQUES DÉTAILLÉES

### RPS (Requêtes Par Seconde)
- **Normal:** 2-10 RPS
- **Stress Léger:** 5 RPS
- **Stress Moyen:** 25 RPS  
- **Stress Lourd:** 100 RPS
- **Stress Extrême:** 500+ RPS

### CPU Utilisation
- **Normal:** 5-20%
- **Stress Léger:** 10-30%
- **Stress Moyen:** 30-60%
- **Stress Lourd:** 60-90%
- **Stress Extrême:** 80-100%

### Taux d'Erreurs
- **Excellent:** < 1%
- **Bon:** 1-3%
- **Acceptable:** 3-5%
- **Problématique:** 5-10%
- **Critique:** > 10%

### Latence
- **Excellente:** < 200ms
- **Bonne:** 200-500ms
- **Acceptable:** 500-1000ms
- **Lente:** 1000-2000ms
- **Problématique:** > 2000ms

## 🔧 CONFIGURATION DU STRESS TEST

### Endpoints Testés
```javascript
// Test Light
/api/health
/api/products
/api/sales

// Test Medium  
/api/health
/api/products
/api/products/1
/api/sales
/api/stock
/api/reporting/stats

// Test Heavy & Extreme
Tous les endpoints + POST requests
```

### Paramètres Configurables
- **Intensité:** light, medium, heavy, extreme
- **Durée:** 10-300 secondes
- **Taux d'erreur simulé:** 0-50%
- **Service cible:** Spécifique ou tous

## 📊 ANALYSE DES RÉSULTATS

### Statistiques Fournies
```
⏱️  Durée réelle: 60.45s
📈 RPS réel: 24.8
✅ Taux de succès: 96.2%
❌ Taux d'erreur: 3.8%

📊 STATISTIQUES DE LATENCE:
   Moyenne: 245ms
   Minimum: 89ms
   Maximum: 1205ms
   P50: 198ms
   P95: 567ms
   P99: 890ms
```

### Interprétation
- **P50 (Médiane):** 50% des requêtes plus rapides
- **P95:** 95% des requêtes plus rapides  
- **P99:** 99% des requêtes plus rapides

### Recommandations Automatiques
- ✅ **Performance excellente** si succès > 95% et latence < 500ms
- ⚠️ **Taux d'erreur élevé** si erreurs > 5%
- ⚠️ **Latence élevée** si moyenne > 1000ms

## 🎯 SCÉNARIOS DE TEST RECOMMANDÉS

### 1. Test de Santé Basique
```bash
npm run stress:light
```
**Objectif:** Vérifier que le système répond correctement

### 2. Test de Charge Normale
```bash
npm run stress:medium
```
**Objectif:** Simuler la charge d'utilisation normale

### 3. Test de Pic de Trafic
```bash
npm run stress:heavy
```
**Objectif:** Tester la résistance aux pics de charge

### 4. Test de Limite Système
```bash
npm run stress:extreme
```
**Objectif:** Découvrir les limites du système

## 📸 CAPTURES POUR DOCUMENTATION

### Métriques à Capturer
1. **Dashboard au repos** - Métriques normales
2. **Pendant stress test** - Pics de charge
3. **Résultats terminal** - Statistiques finales
4. **Graphiques de récupération** - Retour à la normale

### Outils de Capture
- **Windows:** Win + Shift + S
- **Résolution:** 1920x1080 minimum
- **Format:** PNG pour la qualité

## 🚨 SURVEILLANCE D'ALERTES

### Seuils Critiques
- **CPU > 95%** pendant > 30s
- **Taux d'erreur > 10%**
- **Latence > 5000ms**
- **RPS = 0** (système inactif)

### Actions Recommandées
1. **Arrêter le stress test** si problème détecté
2. **Vérifier les logs** système
3. **Redémarrer les services** si nécessaire
4. **Analyser les goulots** d'étranglement

## ✅ VALIDATION FINALE

### Checklist Test Réussi
- [ ] Dashboard s'ouvre correctement
- [ ] Métriques s'affichent en temps réel
- [ ] Stress test s'exécute sans erreur
- [ ] Graphiques se mettent à jour
- [ ] Statistiques finales cohérentes
- [ ] Système récupère après test

---

## 🎓 READY FOR TESTING!

Votre système de stress testing est maintenant configuré et prêt à l'emploi. Utilisez les commandes ci-dessus pour analyser les performances de votre architecture POS en temps réel!
