#!/bin/bash

echo "🧪 VALIDATION DU LOAD BALANCING"
echo "================================"

echo -e "\n📊 Test des instances individuelles:"

echo -e "\n🔧 Instance 1 (port 3001):"
curl -s http://localhost:3001/health | jq -r '.instanceId + " - " + .instanceName'

echo -e "\n🔧 Instance 2 (port 3005):"
curl -s http://localhost:3005/health | jq -r '.instanceId + " - " + .instanceName'

echo -e "\n🔧 Instance 3 (port 3006):"
curl -s http://localhost:3006/health | jq -r '.instanceId + " - " + .instanceName'

echo -e "\n🔄 Test Round-Robin manuel (simulation de load balancer):"

for i in {1..9}; do
  case $((($i - 1) % 3)) in
    0) PORT=3001; INSTANCE="Instance 1" ;;
    1) PORT=3005; INSTANCE="Instance 2" ;;
    2) PORT=3006; INSTANCE="Instance 3" ;;
  esac
  
  RESPONSE=$(curl -s http://localhost:$PORT/health)
  INSTANCE_ID=$(echo $RESPONSE | jq -r '.instanceId')
  echo "Requête $i -> $INSTANCE_ID ($INSTANCE)"
done

echo -e "\n✅ Test de distribution de charge terminé!"
echo -e "\n💡 Pour un vrai load balancer, vous pouvez utiliser:"
echo "   • Kong API Gateway avec upstream/targets"
echo "   • NGINX avec upstream"
echo "   • HAProxy"
echo "   • Le simple-load-balancer.js (Node.js)"
