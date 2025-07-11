# ADR-001: Migration vers Architecture Microservices

## Statut
**ACCEPTÉ** - Décembre 2024

## Contexte
Le système legacy monolithique présente des limitations critiques :
- Couplage fort entre domaines métier (Produit, Vente, Stock, Reporting)
- Difficulté de maintenance et d'évolution
- Performance dégradée sous charge
- Équipes bloquées par les dépendances croisées
- Pas de scalabilité horizontale

## Décision
Nous migrons vers une architecture microservices avec les caractéristiques suivantes :

### Services Identifiés
1. **Produit Service** (port 3001) - Gestion du catalogue produits
2. **Stock Service** (port 3002) - Gestion des inventaires  
3. **Vente Service** (port 3003) - Gestion des transactions commerciales
4. **Reporting Service** (port 3004) - Analytics et rapports

### Composants Infrastructure
- **Hybrid Router** (API Gateway - port 3000) pour routage et résilience
- **Base de données SQLite** par service pour autonomie complète
- **Legacy App** (port 3030) maintenue pour transition progressive

## Conséquences

### Positives ✅
- **Autonomie des équipes** : Chaque service peut être développé/déployé indépendamment
- **Isolation** : Pas de contamination entre domaines métier
- **Résilience** : Circuit breaker et fallback vers legacy
- **Simplicité** : SQLite évite la complexité des serveurs DB externes
- **Observabilité** : Métriques Prometheus intégrées nativement

### Négatives ❌
- **Complexité réseau** : Communication HTTP entre services
- **Transactions** : Pas d'ACID cross-services (éventuelle cohérence)
- **Débogage** : Plus complexe en environnement distribué
- **Latence** : Hop réseau additionnel via API Gateway

## Alternatives Considérées

### 1. Refactoring Monolithe
- **Rejeté** : Coût élevé, risque de régression
- Maintient les limitations de scalabilité

### 2. Architecture Modulaire  
- **Rejeté** : Couplage de déploiement persistant
- Équipes toujours bloquées par les dépendances

### 3. Serverless Functions
- **Rejeté** : Cold start incompatible avec latence requise POS
- Vendor lock-in avec cloud providers

## Critères de Succès Mesurés
- ✅ **Services autonomes** : 4 microservices déployés indépendamment  
- ✅ **Observabilité** : Métriques Prometheus + Grafana operationnels
- ✅ **Résilience** : Circuit breaker + fallback legacy implémentés
- ✅ **Migration** : Transition progressive sans arrêt de service
- ✅ **Tests** : Suite complète Jest + K6 pour validation continue

## Implémentation Réalisée
**Stack technique** :
- Node.js + Express pour tous les services
- SQLite pour base de données par service  
- Docker + Docker Compose pour containerisation
- Prometheus + Grafana pour monitoring
- Dashboard HTML/Chart.js comme alternative simple

## Date de Révision
**Juin 2025** - Évaluation métriques production et migration complète

---
*Auteur : Équipe Architecture*  
*Réviseurs : Équipe développement*
