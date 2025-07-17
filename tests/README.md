# 🧪 Tests Jest - Architecture Hybride

## 📋 Vue d'Ensemble

Suite complète de tests automatisés pour valider tous les aspects de l'architecture hybride :
- ✅ Configuration système
- ✅ Santé des services  
- ✅ Sécurité (CORS, rate limiting)
- ✅ Routage intelligent
- ✅ Performance et load balancing
- ✅ Monitoring et observabilité
- ✅ Intégration bout-en-bout

## 🚀 Exécution des Tests

### **Test Complet Automatique**
```bash
npm run test:all
# ou
./run-tests.sh
```

### **Tests Individuels**
```bash
npm run test:health       # Santé des services
npm run test:security     # Sécurité CORS/Rate limiting
npm run test:routing      # Logique de routage
npm run test:performance  # Performance et latence
npm run test:monitoring   # Prometheus/Grafana
npm run test:integration  # Scénarios bout-en-bout
```

### **Tests avec Couverture**
```bash
npm run test:coverage
```

### **Mode Watch (Développement)**
```bash
npm run test:watch
```

## 📁 Structure des Tests

```
tests/
├── setup.test.js          # Configuration et fichiers
├── health.test.js         # Santé des services
├── security.test.js       # Sécurité CORS/Rate limiting
├── routing.test.js        # Routage intelligent
├── performance.test.js    # Performance et load balancing
├── monitoring.test.js     # Prometheus/Grafana
├── integration.test.js    # Scénarios bout-en-bout
├── jest.setup.js          # Configuration Jest
├── jest.globalSetup.js    # Setup global
├── jest.globalTeardown.js # Nettoyage global
└── jest.sequencer.js      # Ordre d'exécution
```

## 🧪 Description des Tests

### **1. Setup Tests (setup.test.js)**
- ✅ Fichiers de configuration présents
- ✅ Structure microservices correcte
- ✅ Documentation disponible

### **2. Health Tests (health.test.js)**
- ✅ Tous les services répondent
- ✅ Endpoints de santé fonctionnels
- ✅ Legacy system accessible
- ✅ Microservices opérationnels
- ✅ Kong Gateway actif
- ✅ Load balancer distribue

### **3. Security Tests (security.test.js)**
- ✅ CORS configuré correctement
- ✅ Rate limiting actif
- ✅ Headers de sécurité présents
- ✅ Protection XSS/CSRF
- ✅ Kong Admin API sécurisé
- ✅ Logs de sécurité générés

### **4. Routing Tests (routing.test.js)**
- ✅ Console POS → Legacy + Stock
- ✅ Console Maison Mère → Legacy + Reporting
- ✅ API moderne → Microservices
- ✅ Web/Mobile → Microservices prioritaires
- ✅ Fallback automatique
- ✅ Load balancing produits

### **5. Performance Tests (performance.test.js)**
- ✅ Latence accès direct vs gateway
- ✅ Load balancing équitable
- ✅ Performance par client type
- ✅ Cache et optimisations
- ✅ Métriques de performance

### **6. Monitoring Tests (monitoring.test.js)**
- ✅ Prometheus collecte métriques
- ✅ Grafana accessible
- ✅ Alertes configurées
- ✅ Logs générés
- ✅ Corrélation requêtes

### **7. Integration Tests (integration.test.js)**
- ✅ Scénario POS complet
- ✅ Scénario Maison Mère complet
- ✅ Workflow API moderne
- ✅ Application Web/Mobile
- ✅ Pipeline Kong complet
- ✅ Resilience haute charge

## 📊 Rapport de Tests

### **Après Exécution**
- 📄 **Rapport HTML** : `reports/jest-report.html`
- 📈 **Couverture de code** : `reports/coverage/index.html`
- 📝 **Logs détaillés** : Affichés dans le terminal

### **Métriques Collectées**
- ⏱️ **Latences** : Direct vs Gateway vs Router
- 📊 **Taux de succès** : Par service et endpoint
- 🔄 **Distribution load balancer** : Instances utilisées
- 🛡️ **Sécurité** : CORS, rate limiting, headers
- 📈 **Performance** : Temps de réponse moyens

## 🔧 Configuration

### **Variables d'Environnement**
```bash
NODE_ENV=test              # Mode test
VERBOSE_TESTS=true         # Logs détaillés
LOG_LEVEL=error           # Niveau de log minimal
```

### **Timeouts**
- **Test individuel** : 30 secondes
- **Requête réseau** : 5 secondes
- **Requête critique** : 10 secondes

### **Services Testés**
```javascript
{
  legacy: 'http://localhost:3000',
  produitService1: 'http://localhost:3001',
  venteService: 'http://localhost:3004',
  produitService2: 'http://localhost:3005',
  produitService3: 'http://localhost:3006',
  stockService: 'http://localhost:3007',
  reportingService: 'http://localhost:3008',
  hybridRouter: 'http://localhost:9000',
  loadBalancer: 'http://localhost:8000',
  kongGateway: 'http://localhost:8001',
  prometheus: 'http://localhost:9090',
  grafana: 'http://localhost:3333'
}
```

## 🚨 Dépannage

### **Services Non Accessibles**
```bash
# Vérifier l'état des services
docker-compose ps

# Redémarrer si nécessaire
./start.sh

# Logs des services
docker-compose logs [service-name]
```

### **Tests Échouent**
1. **Vérifier** que tous les services sont démarrés
2. **Attendre** 30 secondes après le démarrage
3. **Consulter** les logs des services
4. **Relancer** les tests individuellement

### **Performance Dégradée**
- Vérifier la charge système
- Attendre la stabilisation après démarrage
- Vérifier les connexions réseau
- Redémarrer les services si nécessaire

## 📈 Interprétation des Résultats

### **🟢 Succès Complet (0 échecs)**
- ✅ Architecture parfaitement opérationnelle
- ✅ Tous les composants fonctionnels
- ✅ Sécurité et performance optimales

### **🟡 Succès Partiel (1-2 échecs)**
- ⚠️ Problèmes mineurs détectés
- ⚠️ Fonctionnalités principales OK
- ⚠️ Optimisations recommandées

### **🔴 Échecs Multiples (3+ échecs)**
- ❌ Problèmes significatifs
- ❌ Vérifier configuration et services
- ❌ Consulter logs et redémarrer

## 🎯 Bonnes Pratiques

### **Avant les Tests**
1. Démarrer tous les services avec `./start.sh`
2. Attendre 30 secondes pour stabilisation
3. Vérifier `docker-compose ps` 

### **Pendant le Développement**
1. Utiliser `npm run test:watch`
2. Tester individuellement les modules modifiés
3. Valider avec tests complets avant commit

### **En Production**
1. Tests automatisés dans CI/CD
2. Monitoring continu avec Prometheus
3. Alertes sur échecs critiques

---

**🏁 Ces tests garantissent que l'architecture hybride fonctionne parfaitement selon les spécifications !**
