#!/bin/bash

# Script de démarrage rapide pour les microservices basés sur les domaines métier
# Usage: ./scripts/start-domain-microservices.sh

echo "🚀 Démarrage des microservices de domaines métier..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Se placer à la racine du projet
cd "$(dirname "$0")/.."

# Créer le dossier logs
mkdir -p microservices/logs

echo -e "${BLUE}📦 Installation des dépendances...${NC}"

# Installation des dépendances
services=("produit-service" "magasin-service" "utilisateur-service" "vente-service")

for service in "${services[@]}"; do
    if [ -d "microservices/$service" ]; then
        echo -e "${YELLOW}Installing dependencies for $service...${NC}"
        cd "microservices/$service"
        npm install --silent
        cd - > /dev/null
    fi
done

echo -e "${GREEN}✅ Dépendances installées${NC}"
echo ""

# Démarrage des services en mode développement
echo -e "${BLUE}🚀 Démarrage des services...${NC}"

# Démarrer chaque service en arrière-plan
for service in "${services[@]}"; do
    if [ -d "microservices/$service" ]; then
        echo -e "${YELLOW}Starting $service...${NC}"
        cd "microservices/$service"
        
        # Tuer le processus existant s'il y en a un
        if [ -f "../logs/$service.pid" ]; then
            old_pid=$(cat "../logs/$service.pid")
            kill $old_pid 2>/dev/null
        fi
        
        # Démarrer le nouveau processus
        nohup npm start > "../logs/$service.log" 2>&1 &
        echo $! > "../logs/$service.pid"
        
        echo -e "${GREEN}✅ $service started (PID: $!)${NC}"
        cd - > /dev/null
        sleep 1
    fi
done

echo ""
echo -e "${GREEN}🎉 Tous les microservices sont démarrés !${NC}"
echo ""
echo -e "${BLUE}📋 Services disponibles :${NC}"
echo -e "  • Produit Service:     http://localhost:3001/health"
echo -e "  • Magasin Service:     http://localhost:3002/health"  
echo -e "  • Utilisateur Service: http://localhost:3003/health"
echo -e "  • Vente Service:       http://localhost:3004/health"
echo ""
echo -e "${BLUE}📊 Voir les logs :${NC}"
echo -e "  • tail -f microservices/logs/produit-service.log"
echo -e "  • tail -f microservices/logs/magasin-service.log"
echo -e "  • tail -f microservices/logs/utilisateur-service.log"
echo -e "  • tail -f microservices/logs/vente-service.log"
echo ""
echo -e "${YELLOW}Pour arrêter les services : ./scripts/stop-domain-microservices.sh${NC}"
