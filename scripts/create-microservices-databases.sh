#!/bin/bash

# Script de création des bases de données pour chaque microservice
# Usage: ./scripts/create-microservices-databases.sh

echo "🗄️ Création des bases de données pour les microservices..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration MySQL
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-"rootpassword"}
MYSQL_HOST=${MYSQL_HOST:-"localhost"}
MYSQL_PORT=${MYSQL_PORT:-"3306"}

# Fonction pour créer une base de données et un utilisateur
create_database_and_user() {
    local db_name=$1
    local user_name=$2
    local user_password=$3
    
    echo -e "${BLUE}Création de la base de données $db_name...${NC}"
    
    mysql -h $MYSQL_HOST -P $MYSQL_PORT -u root -p$MYSQL_ROOT_PASSWORD << EOF
CREATE DATABASE IF NOT EXISTS $db_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$user_name'@'%' IDENTIFIED BY '$user_password';
GRANT ALL PRIVILEGES ON $db_name.* TO '$user_name'@'%';
FLUSH PRIVILEGES;
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Base de données $db_name créée avec succès${NC}"
    else
        echo -e "${RED}❌ Erreur lors de la création de la base de données $db_name${NC}"
        return 1
    fi
}

# Vérifier que MySQL est accessible
echo -e "${YELLOW}🔍 Vérification de la connexion MySQL...${NC}"
mysql -h $MYSQL_HOST -P $MYSQL_PORT -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Impossible de se connecter à MySQL. Vérifiez que :${NC}"
    echo -e "  • MySQL est démarré"
    echo -e "  • Le mot de passe root est correct (MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD)"
    echo -e "  • L'host et le port sont corrects (MYSQL_HOST=$MYSQL_HOST:$MYSQL_PORT)"
    exit 1
fi

echo -e "${GREEN}✅ Connexion MySQL réussie${NC}"
echo ""

# Créer les bases de données pour chaque microservice
echo -e "${BLUE}📦 Création des bases de données des microservices...${NC}"

# Microservice Produit
create_database_and_user "produit_service_db" "produit_user" "produit_password"

# Microservice Magasin
create_database_and_user "magasin_service_db" "magasin_user" "magasin_password"

# Microservice Utilisateur
create_database_and_user "utilisateur_service_db" "utilisateur_user" "utilisateur_password"

# Microservice Vente
create_database_and_user "vente_service_db" "vente_user" "vente_password"

echo ""
echo -e "${GREEN}🎉 Toutes les bases de données des microservices ont été créées !${NC}"
echo ""
echo -e "${BLUE}📋 Bases de données créées :${NC}"
echo -e "  • produit_service_db (utilisateur: produit_user)"
echo -e "  • magasin_service_db (utilisateur: magasin_user)"
echo -e "  • utilisateur_service_db (utilisateur: utilisateur_user)"
echo -e "  • vente_service_db (utilisateur: vente_user)"
echo ""
echo -e "${YELLOW}💡 Les microservices peuvent maintenant être démarrés avec leurs propres bases de données !${NC}"
