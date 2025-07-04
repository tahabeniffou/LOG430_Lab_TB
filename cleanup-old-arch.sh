#!/bin/bash

# Script pour nettoyer l'ancienne architecture
# ⚠️ ATTENTION: Ce script supprime les anciens fichiers
# Utilisez-le seulement après avoir testé la nouvelle architecture

echo "🧹 Nettoyage de l'ancienne architecture..."

# Créer une sauvegarde
mkdir -p backup/old_architecture
cp -r src/api backup/old_architecture/ 2>/dev/null
cp -r src/application backup/old_architecture/ 2>/dev/null

echo "📦 Sauvegarde créée dans backup/old_architecture/"

# Supprimer les anciens fichiers (à décommenter pour vraiment nettoyer)
# rm -rf src/api/rest/controllers/
# rm -rf src/api/rest/services/
# rm -rf src/application/use_cases/
# rm -rf src/application/services/

echo "✅ Nettoyage terminé"
echo "📁 Nouvelle structure DDD prête dans src/domain/, src/infrastructure/, src/interfaces/"
