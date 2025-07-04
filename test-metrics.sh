#!/bin/bash

echo "🔍 Test des Métriques - LOG430 Lab TB"
echo "===================================="

echo "📊 Test 1: Métriques API1 (depuis l'intérieur)"
docker compose exec api1 curl -s http://localhost:3000/metrics | head -3

echo ""
echo "📊 Test 2: Métriques API1 (depuis l'extérieur)"
curl -s http://localhost:3001/metrics | head -3 || echo "❌ Pas d'accès externe"

echo ""
echo "📊 Test 3: Prometheus targets"
curl -s http://localhost:9090/api/v1/targets 2>/dev/null | grep -o '"health":"[^"]*"' | sort | uniq -c || echo "❌ Prometheus non accessible"

echo ""
echo "📊 Test 4: État des services"
docker compose ps

echo ""
echo "✅ Les métriques sont disponibles:"
echo "- API1 interne: docker compose exec api1 curl http://localhost:3000/metrics"
echo "- API2 interne: docker compose exec api2 curl http://localhost:3000/metrics"
echo "- API3 interne: docker compose exec api3 curl http://localhost:3000/metrics"
echo "- API4 interne: docker compose exec api4 curl http://localhost:3000/metrics"
echo "- Prometheus: http://localhost:9090"
