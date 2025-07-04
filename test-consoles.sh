#!/bin/bash

echo "🧪 Test des Consoles LOG430 Lab TB"
echo "=================================="
echo ""

echo "📱 Test 1: Vérification des fichiers console..."
if [ -f "src/interfaces/console/PosConsole.js" ]; then
    echo "✅ PosConsole.js trouvé"
else
    echo "❌ PosConsole.js manquant"
fi

if [ -f "src/interfaces/console/MaisonMereConsole.js" ]; then
    echo "✅ MaisonMereConsole.js trouvé"
else
    echo "❌ MaisonMereConsole.js manquant"
fi

echo ""
echo "🔗 Test 2: Test de connexion API..."
API_AVAILABLE=$(curl -s http://localhost:3001/ > /dev/null 2>&1 && echo "OK" || echo "KO")
echo "API Status: $API_AVAILABLE"

if [ "$API_AVAILABLE" = "OK" ]; then
    echo ""
    echo "📊 Test 3: Données disponibles..."
    
    echo -n "Produits: "
    PRODUITS_COUNT=$(curl -s http://localhost:3001/api/v1/produits | jq '. | length' 2>/dev/null || echo "0")
    echo "$PRODUITS_COUNT produits"
    
    echo -n "Magasins: "
    MAGASINS_COUNT=$(curl -s http://localhost:3001/api/v1/magasins | jq '. | length' 2>/dev/null || echo "0")
    echo "$MAGASINS_COUNT magasins"
    
    echo -n "Ventes: "
    VENTES_COUNT=$(curl -s http://localhost:3001/api/v1/ventes | jq '. | length' 2>/dev/null || echo "0")
    echo "$VENTES_COUNT ventes"
    
    echo -n "Utilisateurs: "
    USERS_COUNT=$(curl -s http://localhost:3001/api/v1/utilisateurs | jq '. | length' 2>/dev/null || echo "0")
    echo "$USERS_COUNT utilisateurs"
fi

echo ""
echo "🖥️ Test 4: Test de lancement des consoles..."
echo "Les consoles vont se lancer en mode test (5 secondes max)..."

echo ""
echo "📱 Test POS Console..."
timeout 5s npm run pos-console > /dev/null 2>&1 &
POS_PID=$!
sleep 2
if kill -0 $POS_PID 2>/dev/null; then
    echo "✅ POS Console démarre correctement"
    kill $POS_PID 2>/dev/null
else
    echo "❌ POS Console a un problème"
fi

echo ""
echo "🏢 Test Maison Mère Console..."
timeout 5s npm run maison-mere-console > /dev/null 2>&1 &
MM_PID=$!
sleep 2
if kill -0 $MM_PID 2>/dev/null; then
    echo "✅ Maison Mère Console démarre correctement"
    kill $MM_PID 2>/dev/null
else
    echo "❌ Maison Mère Console a un problème"
fi

echo ""
echo "✅ Test des consoles terminé !"
echo ""
echo "🚀 Pour utiliser les consoles :"
echo "- POS Console: npm run pos-console"
echo "- Maison Mère Console: npm run maison-mere-console"
