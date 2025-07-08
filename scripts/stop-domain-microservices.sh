#!/bin/bash

# Script d'arrêt pour les microservices de domaines métier
# Usage: ./scripts/stop-domain-microservices.sh

echo "🛑 Arrêt des microservices de domaines métier..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Se placer à la racine du projet
cd "$(dirname "$0")/.."

# Services à arrêter
services=("produit-service" "magasin-service" "utilisateur-service" "vente-service")

echo -e "${BLUE}🔍 Arrêt des services...${NC}"

for service in "${services[@]}"; do
    pid_file="microservices/logs/$service.pid"
    
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}Arrêt de $service (PID: $pid)...${NC}"
            kill $pid
            
            # Attendre que le processus se termine
            count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${RED}Force killing $service...${NC}"
                kill -9 $pid
            fi
            
            echo -e "${GREEN}✅ $service arrêté${NC}"
        else
            echo -e "${YELLOW}⚠️  $service n'était pas en cours d'exécution${NC}"
        fi
        
        # Supprimer le fichier PID
        rm "$pid_file"
    else
        echo -e "${YELLOW}⚠️  Pas de fichier PID trouvé pour $service${NC}"
    fi
done

# Arrêter aussi tous les processus Node.js qui pourraient traîner sur nos ports
echo -e "${BLUE}🧹 Nettoyage des processus sur les ports 3001-3004...${NC}"

for port in 3001 3002 3003 3004; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
        kill $pid 2>/dev/null
    fi
done

echo ""
echo -e "${GREEN}🎉 Tous les microservices ont été arrêtés !${NC}"
echo ""
echo -e "${BLUE}📋 Pour redémarrer les services :${NC}"
echo -e "  ./scripts/start-domain-microservices.sh"
