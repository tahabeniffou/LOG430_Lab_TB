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
3. **Vente Service** (port 3004) - Gestion des transactions commerciales
4. **Reporting Service** (port 3005) - Analytics et rapports

### Composants Infrastructure
- **API Gateway** (Hybrid Router - port 9000) pour routage et sécurité
- **Base de données SQLite** par service pour autonomie
- **Legacy App** (port 3000) maintenue pour transition progressive

## Conséquences

### Positives ✅
- **Autonomie des équipes** : Chaque service peut être développé/déployé indépendamment
- **Scalabilité** : Scale horizontal par service selon la charge
- **Résilience** : Isolation des pannes entre services
- **Technologie** : Liberté technologique par équipe
- **Performance** : +80% de débit mesuré vs legacy

### Négatives ❌
- **Complexité réseau** : Latence additionnelle (+1ms P50)
- **Observabilité** : Besoin de monitoring distribué
- **Transactions** : Pas de ACID cross-services
- **Débogage** : Plus complexe en environnement distribué

## Alternatives Considérées

### 1. Refactoring Monolithe
- **Rejeté** : Coût élevé, risque de régression
- Maintient les limitations de scalabilité

### 2. Architecture Modulaire
- **Rejeté** : Couplage de déploiement persistent
- Équipes toujours bloquées par les dépendances

### 3. Serverless
- **Rejeté** : Cold start incompatible avec latence requise
- Vendor lock-in avec cloud providers

## Critères de Succès
- [ ] Débit > 8 req/sec (vs 5 req/sec legacy)
- [ ] Latence P95 < 10ms
- [ ] Uptime > 99.9% par service
- [ ] Temps de déploiement < 5 minutes par service
- [ ] Isolation : Panne d'un service n'affecte pas les autres

## Date de Révision
**Juin 2025** - Évaluation des métriques de production

---
*Auteur : Équipe Architecture*  
*Réviseurs : CTO, Lead Developers*
