# Documentation LOG430 Lab TB

## Projet

Système POS avec microservices et Kong Gateway.

## Architecture

- appConsole.js (Legacy System POS)
- maisonMereConsole.js (Console maison mère)
- 4 microservices (produit, stock, vente, reporting) - 2 instances chacun
- Kong Gateway (port 8000)
- PostgreSQL

## Validation

- Tests automatisés (13/13)
- Load balancing Kong validé
- Monitoring opérationnel
- Documentation conforme

### 📊 Monitoring et Performance
- [Analyse performance Grafana](monitoring/ANALYSE_PERFORMANCE_GRAFANA.md)
- [Comparaison Grafana vs HTML](monitoring/COMPARAISON_GRAFANA_HTML.md)
- [Différences visuelles graphiques](monitoring/DIFFERENCES_VISUELLES_GRAPHIQUES.md)
- [Guide stress testing](monitoring/GUIDE_STRESS_TESTING.md)

### 📋 Architecture Decision Records (ADR)
- [ADR-001: Architecture Microservices](adr/ADR-001-Architecture-Microservices.md)
- [ADR-002: Kong API Gateway](adr/ADR-002-Kong-API-Gateway.md)  
- [ADR-003: Load Balancing Strategy](adr/ADR-003-Load-Balancing-Strategy.md)
- [ADR-004: Monitoring Prometheus + Grafana](adr/ADR-004-Monitoring-Prometheus-Grafana.md)
- [ADR-005: Docker et Containerisation](adr/ADR-005-Docker-Containerisation.md)
- [ADR-006: Documentation et Gouvernance](adr/ADR-006-Documentation-Gouvernance-Projet.md)

### 🚀 Déploiement
- [Guide de déploiement simple](../DEPLOIEMENT.md)
- [README principal](../README.md)

## 🎯 Points clés du système

### Architecture microservices
- **4 microservices** : Produit, Stock, Vente, Reporting
- **2 instances par service** pour la haute disponibilité
- **Kong API Gateway** pour le load balancing Round-Robin
- **PostgreSQL** comme base de données partagée

### Consoles d'interface
- **Console POS** : Interface point de vente
- **Console Maison Mère** : Interface de supervision centralisée
- **Système Legacy** : Compatibilité avec l'ancien système

### Monitoring et observabilité
- **Prometheus** : Collecte de métriques
- **Grafana** : Visualisation des dashboards
- **Kong Manager** : Interface d'administration Kong
- **Health checks** : Surveillance automatique

## 🔗 Liens rapides

- [Démarrage rapide](../DEPLOIEMENT.md#déploiement-en-une-commande)
- [Architecture détaillée](../docs/VueLogique.md)
- [Tests et validation](validation/)
- [Monitoring](monitoring/)

## 📞 Support

Pour toute question sur l'architecture ou l'implémentation, consultez les documents de validation qui contiennent les détails techniques complets.
