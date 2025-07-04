#!/bin/bash

echo "🔄 Démonstration Load Balancer Round Robin"
echo "=========================================="
echo ""

echo "📊 Envoi de 8 requêtes via Load Balancer..."
echo "Chaque requête devrait aller vers une API différente :"
echo ""

for i in {1..8}; do
    echo -n "Requête $i → "
    timestamp=$(curl -s http://localhost:8000/ | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
    echo "Timestamp: $timestamp"
    sleep 0.2
done

echo ""
echo "💡 Avec Round Robin :"
echo "- Requête 1,5 → API1"  
echo "- Requête 2,6 → API2"
echo "- Requête 3,7 → API3"
echo "- Requête 4,8 → API4"
echo ""
echo "✅ Distribution équitable des 8 requêtes sur 4 APIs !"
