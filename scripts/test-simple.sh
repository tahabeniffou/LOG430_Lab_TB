#!/bin/bash

echo "🧪 === TEST SIMPLE DE L'ARCHITECTURE ==="
echo ""

# Test rapide de syntaxe
echo "1️⃣ Test de syntaxe des microservices:"
for service in produit-service magasin-service utilisateur-service vente-service; do
    echo -n "  $service: "
    if [ -s "microservices/$service/server.js" ]; then
        if node -c "microservices/$service/server.js" 2>/dev/null; then
            echo "✅ OK"
        else
            echo "❌ Erreur de syntaxe"
        fi
    else
        echo "❌ Fichier vide ou manquant"
    fi
done

echo ""
echo "2️⃣ Test de structure:"
for service in produit-service magasin-service utilisateur-service vente-service; do
    echo "  📁 $service:"
    [ -f "microservices/$service/package.json" ] && echo "    ✅ package.json" || echo "    ❌ package.json"
    [ -f "microservices/$service/.env" ] && echo "    ✅ .env" || echo "    ❌ .env"
    [ -d "microservices/$service/src/domain" ] && echo "    ✅ domain" || echo "    ❌ domain"
    [ -d "microservices/$service/src/infrastructure" ] && echo "    ✅ infrastructure" || echo "    ❌ infrastructure"
done

echo ""
echo "3️⃣ Test des ports configurés:"
grep -h "PORT=" microservices/*/.env 2>/dev/null | sort

echo ""
echo "4️⃣ Instructions pour continuer:"
echo "  ▶️  Démarrer MySQL/PostgreSQL"
echo "  ▶️  Créer les BDs: ./scripts/create-microservices-databases.sh"
echo "  ▶️  Démarrer les services: ./scripts/start-domain-microservices.sh"
echo "  ▶️  Tester les APIs: curl http://localhost:3001/health"

echo ""
echo "🏁 Test simple terminé !"
