# 📜 Scripts et Utilitaires - LAB6 Saga Orchestrator

Ce dossier contient tous les scripts de test, démonstration et utilitaires pour le Saga Orchestrator.

## 📁 Structure

```
scripts/
├── demo/                    # Scripts de démonstration
│   ├── observability-full-demo.js  # Demo complète avec 176 sagas
│   └── quick-saga-demo.js          # Demo rapide pour validation
├── tests/                   # Scripts de test
│   ├── test-saga.js                # Tests scénarios de succès
│   ├── test-failure.js             # Tests scénarios d'échec
│   ├── load-test-saga.js           # Tests de charge
│   └── quick-observability-test.js # Tests rapides observabilité
├── start-saga-test.bat      # Script Windows de démarrage
└── start-saga-test.sh       # Script Linux/Mac de démarrage
```

## 🚀 Utilisation

### Scripts de Démonstration

```bash
# Démonstration complète avec observabilité
node scripts/demo/observability-full-demo.js

# Demo rapide pour validation
node scripts/demo/quick-saga-demo.js
```

### Scripts de Test

```bash
# Tests de succès
node scripts/tests/test-saga.js

# Tests d'échecs et compensations
node scripts/tests/test-failure.js

# Tests de charge
node scripts/tests/load-test-saga.js

# Tests d'observabilité
node scripts/tests/quick-observability-test.js
```

### Scripts de Démarrage

```bash
# Windows
.\scripts\start-saga-test.bat

# Linux/Mac
./scripts/start-saga-test.sh
```

## 📊 Résultats Attendus

### Demo Complète
- **176 sagas** exécutées
- **92.61% de succès**
- **13 compensations** automatiques
- **45.87 req/sec** peak

### Tests de Performance
- **P95 latence** < 1s
- **100% compensations** réussies
- **103 métriques** Prometheus collectées

## 🔧 Prérequis

1. **Saga Orchestrator** démarré : `node saga-orchestrator-prometheus.js`
2. **Services de monitoring** : `docker-compose -f docker-compose-monitoring.yml up -d`
3. **Node.js 18+** installé
4. **Dependencies** : `npm install`

## 📈 Monitoring

- **Grafana** : http://localhost:3000 (admin/admin123)
- **Prometheus** : http://localhost:9090
- **Saga API** : http://localhost:8010
- **Logs** : ../logs/saga-orchestrator.log

## 🎯 Scripts pour CI/CD

Ces scripts sont également utilisés dans la pipeline GitHub Actions pour :
- Tests automatisés de régression
- Validation des métriques
- Tests de performance
- Validation de l'observabilité
