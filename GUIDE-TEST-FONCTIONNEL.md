#!/bin/bash

echo "🚀 === GUIDE DE TEST FONCTIONNEL ==="
echo ""

echo "Étape 1: Démarrer la base de données"
echo "  docker-compose up -d db"
echo "  # OU pour MySQL:"
echo "  # sudo systemctl start mysql"
echo ""

echo "Étape 2: Créer les bases de données des microservices"
echo "  ./scripts/create-microservices-databases.sh"
echo ""

echo "Étape 3: Démarrer les microservices"
echo "  ./scripts/start-domain-microservices.sh"
echo ""

echo "Étape 4: Tester les endpoints health"
echo "  curl http://localhost:3001/health  # produit-service"
echo "  curl http://localhost:3002/health  # magasin-service"
echo "  curl http://localhost:3003/health  # utilisateur-service"
echo "  curl http://localhost:3004/health  # vente-service"
echo ""

echo "Étape 5: Tester les APIs métier"
echo "  # Produits"
echo "  curl http://localhost:3001/api/produits"
echo "  curl -X POST http://localhost:3001/api/produits -H 'Content-Type: application/json' -d '{\"nom\":\"Test\",\"prix\":19.99}'"
echo ""
echo "  # Utilisateurs"
echo "  curl http://localhost:3003/api/utilisateurs"
echo "  curl -X POST http://localhost:3003/api/utilisateurs -H 'Content-Type: application/json' -d '{\"nom\":\"Test User\",\"email\":\"test@example.com\"}'"
echo ""
echo "  # Ventes"
echo "  curl http://localhost:3004/api/ventes"
echo ""
echo "  # Magasins"
echo "  curl http://localhost:3002/api/magasins"
echo ""

echo "Étape 6: Arrêter proprement"
echo "  ./scripts/stop-domain-microservices.sh"
echo ""

echo "🏁 Suivez ces étapes dans l'ordre pour valider complètement votre architecture !"
