# 📊 Guide des Dashboards Grafana LAB 7

## 🚀 Démarrage Rapide

### 1. Lancement automatique
```bash
# Démarrage complet avec dashboards et génération de données
scripts\start-dashboards.bat
```

### 2. Accès aux dashboards
- **Event-Driven Architecture**: http://localhost:3000/d/lab7-event-driven/
- **RabbitMQ Topics Activity**: http://localhost:3000/d/rabbitmq-topics-activity/
- **Grafana Home**: http://localhost:3000/ (admin/admin)

## 📡 Dashboard Event-Driven Architecture

### Panneaux disponibles :

#### 📊 **Vue d'ensemble - Activité des Événements**
- Événements publiés, consommés et échoués en temps réel
- Visualisation des tendances sur les dernières 30 minutes

#### 🐰 **RabbitMQ - État des Queues**
- Messages en queue, connexions actives, consommateurs
- Indicateurs de santé avec seuils colorés

#### 📊 **Activité des Topics par Type d'Événement**
- Détail par type : réclamations, notifications, audit, analytics
- Taux par seconde avec légende détaillée

#### ⚡ **Performance Event Store**
- Latences d'écriture, lecture et replay
- Métriques de performance en millisecondes

#### 🏗️ **CQRS - Projections et Read Models**
- Projections mises à jour, requêtes read models
- Commandes traitées

#### 💚 **État de Santé des Services**
- Status UP/DOWN de tous les services
- RabbitMQ, Event Store, services métier

#### 🥧 **Distribution des Messages par Topic**
- Répartition en camembert des messages par queue
- Pourcentages et valeurs absolues

#### 📈 **Timeline - Volume d'Événements**
- Histogramme empilé par minute
- Événements publiés vs consommés vs erreurs

### Variables disponibles :
- **Service** : Filtrer par service spécifique
- **Type Événement** : Filtrer par type d'événement

## 🐰 Dashboard RabbitMQ Topics Activity

### Panneaux spécialisés :

#### 🐰 **RabbitMQ - Vue d'ensemble**
- Messages totaux, connexions, consommateurs
- Débit messages/sec, queues actives, exchanges

#### 📊 **Messages en Attente par Queue**
- Évolution des messages en attente par queue
- Filtrage par pattern (reclamation, notification, audit, analytics)

#### ⚡ **Débit - Publish vs Consume**
- Comparaison publication vs consommation
- Détection des goulots d'étranglement

#### 🔥 **Heatmap - Activité des Topics**
- Carte de chaleur de l'activité par queue
- Identification visuelle des pics d'activité

#### 🔀 **Activité des Exchanges**
- Messages entrants vs sortants par exchange
- Performance du routage

#### ⚠️ **Erreurs et Problèmes de Routing**
- Messages renvoyés, retournés, non-routables
- Messages en RAM, problèmes de performance

#### 👥 **Consommateurs Actifs par Queue**
- Répartition des consommateurs par queue
- Identification des queues sous-consommées

#### ⚡ **Performance RabbitMQ**
- Utilisation mémoire, latences I/O
- Utilisation des processus Erlang

### Variables disponibles :
- **Queue** : Filtrer par queue spécifique
- **Exchange** : Filtrer par exchange

## 🎲 Génération de Données de Test

### Commandes disponibles :

```bash
# Génération continue (15 minutes)
node scripts\generate-topics-data.js

# Test de connexion
node scripts\generate-topics-data.js --test

# Événement unique de test
node scripts\generate-topics-data.js --single

# Aide
node scripts\generate-topics-data.js --help
```

### Types d'événements générés :
- **Réclamations** : DEFAUT_PRODUIT, LIVRAISON_RETARD, SERVICE_CLIENT, etc.
- **Priorités** : LOW, MEDIUM, HIGH, URGENT
- **Canaux** : web, mobile, email, phone, chat
- **Événements spéciaux** : résolutions, escalades, feedback

### Fréquence par défaut :
- 6 réclamations/minute
- 4 mises à jour/minute  
- 2 résolutions/minute
- Événements aléatoires toutes les 45s

## 🔧 Configuration Avancée

### Import manuel des dashboards :

1. **Copier le JSON** depuis :
   - `config/grafana/dashboards/event-driven-dashboard.json`
   - `config/grafana/dashboards/rabbitmq-topics-dashboard.json`

2. **Dans Grafana** :
   - Aller sur http://localhost:3000/
   - Se connecter (admin/admin)
   - Cliquer sur "+" → "Import"
   - Coller le JSON et cliquer "Load"

### Personnalisation des métriques :

#### Ajouter de nouvelles métriques :
```prometheus
# Dans le service Node.js
const promClient = require('prom-client');

const eventsCounter = new promClient.Counter({
    name: 'custom_events_total',
    help: 'Total custom events',
    labelNames: ['type', 'service']
});
```

#### Nouvelle requête Prometheus :
```promql
# Taux d'événements personnalisés
rate(custom_events_total[5m])

# Agrégation par type
sum by (type) (custom_events_total)
```

### Variables Grafana personnalisées :

```yaml
# Nouvelle variable pour filtrer par client
- name: "client_id"
  type: "query"
  query: "label_values(events_published_total, client_id)"
  refresh: 1
  includeAll: true
```

## 🎯 Cas d'Usage Pratiques

### 1. **Monitoring Production**
- Surveiller les seuils d'alertes (messages en queue > 100)
- Vérifier la latence de l'Event Store (< 500ms)
- S'assurer que tous les services sont UP

### 2. **Debugging des Performances**
- Identifier les queues avec trop de messages en attente
- Comparer publish vs consume rates
- Analyser les erreurs de routing

### 3. **Analyse Métier**
- Voir les types de réclamations les plus fréquents
- Analyser les pics d'activité par heure/jour
- Mesurer les temps de résolution

### 4. **Capacity Planning**
- Évaluer la charge sur RabbitMQ
- Prévoir l'augmentation des consommateurs
- Anticiper les besoins en infrastructure

## 🚨 Alertes Recommandées

### Seuils critiques :
- **Messages en queue** > 100 → Alerte
- **Latence Event Store** > 1000ms → Alerte
- **Service DOWN** → Alerte immédiate
- **Erreurs de routing** > 5% → Attention

### Notifications :
```yaml
# Exemple configuration alerte Grafana
- alert: HighQueueMessages
  expr: rabbitmq_queue_messages > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    description: "Queue {{$labels.queue}} has {{$value}} messages"
```

## 📚 Ressources Supplémentaires

### Documentation :
- [Prometheus Metrics](http://localhost:9090/metrics)
- [RabbitMQ Management](http://localhost:15672/)
- [Grafana Docs](https://grafana.com/docs/)

### APIs disponibles :
- **Service Réclamation** : http://localhost:8011/api/v1/
- **Health Checks** : http://localhost:8011/health
- **Metrics** : http://localhost:8011/metrics

---

🎉 **Félicitations !** Vous avez maintenant des dashboards complets pour visualiser l'activité de votre architecture événementielle LAB 7 !
