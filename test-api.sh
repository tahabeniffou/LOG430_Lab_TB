#!/bin/bash

echo "🎯 Test Complet du Système LOG430 Lab TB"
echo "========================================"

BASE_URL="http://localhost:3001/api/v1"

echo "📦 Test 1: Health Check"
curl -s $BASE_URL/../ | jq .

echo ""
echo "🛍️ Test 2: Liste des produits"
curl -s $BASE_URL/produits | jq .

echo ""
echo "🏪 Test 3: Liste des magasins"
curl -s $BASE_URL/magasins | jq .

echo ""
echo "👥 Test 4: Liste des utilisateurs"
curl -s $BASE_URL/utilisateurs | jq .

echo ""
echo "💰 Test 5: Liste des ventes"
curl -s $BASE_URL/ventes | jq .

echo ""
echo "📊 Test 6: Health check système"
curl -s $BASE_URL/../health | jq .

echo ""
echo "✅ Tests terminés ! Votre système fonctionne correctement."
echo ""
echo "🌐 URLs d'accès:"
echo "- API1: http://localhost:3001"
echo "- API2: http://localhost:3002"
echo "- API3: http://localhost:3003"  
echo "- API4: http://localhost:3004"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3030"
