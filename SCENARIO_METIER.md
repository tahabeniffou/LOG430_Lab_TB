# 🏪 Scénarios Métier - Système POS

## 📋 Vue d'ensemble

Ce document décrit les scénarios métier couverts par l'architecture microservices du système POS, incluant les patterns Saga et Event-Driven.

---

## 🎯 Lab 6 - Saga Orchestrator

### Scénario 1: Vente Réussie avec Saga
**Acteur:** Client POS  
**Objectif:** Effectuer une vente complète avec réservation stock et paiement

**Étapes:**
1. **Réservation Stock** - Le stock est vérifié et réservé
2. **Débit Paiement** - Le montant est débité du compte client
3. **Création Vente** - La vente est enregistrée dans le système

**Résultat:** ✅ Transaction complète enregistrée

### Scénario 2: Échec Stock avec Compensation
**Acteur:** Client POS  
**Problème:** Stock insuffisant pour la quantité demandée

**Étapes:**
1. **Réservation Stock** - ❌ Échec (stock insuffisant)
2. **Compensation** - Aucune action requise (première étape)
3. **Notification** - Client informé de l'indisponibilité

**Résultat:** ❌ Transaction annulée, pas de charge client

### Scénario 3: Échec Paiement avec Compensation
**Acteur:** Client POS  
**Problème:** Paiement refusé (fonds insuffisants)

**Étapes:**
1. **Réservation Stock** - ✅ Réussite
2. **Débit Paiement** - ❌ Échec (paiement refusé)
3. **Compensation** - 🔄 Libération du stock réservé
4. **Notification** - Client informé du problème de paiement

**Résultat:** ❌ Transaction annulée, stock libéré

### Scénario 4: Échec Vente avec Compensation Complète
**Acteur:** Client POS  
**Problème:** Erreur système lors de la création de vente

**Étapes:**
1. **Réservation Stock** - ✅ Réussite
2. **Débit Paiement** - ✅ Réussite
3. **Création Vente** - ❌ Échec (erreur système)
4. **Compensation** - 🔄 Remboursement client + libération stock
5. **Notification** - Client informé et remboursé

**Résultat:** ❌ Transaction annulée, compensation complète

---

## 🎭 Lab 7 - Event-Driven Architecture

### Scénario 5: Réclamation Client - Saga Chorégraphiée
**Acteur:** Service Client  
**Objectif:** Traiter une réclamation avec validation et paiement

**Flux d'événements:**
1. **ReclamationCreated** → Service de Réclamation
2. **ReclamationValidated** → Service de Validation  
3. **PaymentProcessed** → Service de Paiement
4. **ClientNotified** → Service de Notification

**Événements de compensation:**
- **ReclamationRejected** → Validation échouée
- **PaymentFailed** → Paiement échoué
- **NotificationFailed** → Notification échouée

### Scénario 6: E-commerce - Commande Complète
**Acteur:** Client E-commerce  
**Objectif:** Passer une commande avec validation multi-étapes

**Flux d'événements:**
1. **OrderCreated** → Service de Commande
2. **StockChecked** → Service de Stock
3. **PaymentProcessed** → Service de Paiement
4. **OrderConfirmed** → Service de Commande
5. **CustomerNotified** → Service de Notification

---

## 🔄 Patterns de Résilience

### Circuit Breaker
- **Seuil d'échec:** 50% sur 10 requêtes
- **Timeout:** 30 secondes
- **Services protégés:** Tous les appels inter-services

### Retry Pattern
- **Tentatives:** 3 maximum
- **Backoff:** Exponentiel (1s, 2s, 4s)
- **Conditions:** Erreurs réseau, timeouts

### Bulkhead Pattern
- **Isolation:** Chaque microservice a sa propre base de données
- **Queues:** Isolation des messages RabbitMQ par service

---

## 📊 Métriques Métier

### Indicateurs Saga
- **Taux de succès:** % de sagas complétées
- **Temps de compensation:** Délai moyen de rollback
- **Étapes critiques:** Identification des points de défaillance

### Indicateurs Event-Driven
- **Débit d'événements:** Messages/seconde
- **Latence bout-en-bout:** Temps total de traitement
- **Taux de retry:** % d'événements rejoués

---

## 🎯 Cas d'Usage Avancés

### Scénario 7: Pic de Charge Black Friday
**Contexte:** Trafic 10x normal  
**Défis:** Scalabilité, disponibilité, cohérence

**Mesures:**
- Auto-scaling des microservices
- Circuit breakers actifs
- Dégradation gracieuse

### Scénario 8: Panne Réseau Partielle
**Contexte:** Perte de connectivité entre services  
**Défis:** Résilience, cohérence éventuelle

**Mesures:**
- Messages persistants RabbitMQ
- Replay d'événements
- Compensation différée

---

## 🧪 Tests de Validation

### Tests Saga
- ✅ Saga succès complet
- ✅ Échec à chaque étape
- ✅ Compensation multi-niveau
- ✅ Timeouts et retry

### Tests Event-Driven
- ✅ Événements en ordre
- ✅ Événements dupliqués
- ✅ Événements perdus
- ✅ Compensation chorégraphiée

---

*Ces scénarios valident l'architecture microservices et les patterns avancés implémentés dans le système POS.*
