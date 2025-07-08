#!/bin/bash

echo "🛑 ARRÊT LOAD BALANCING SIMPLE"
echo "=============================="
echo ""

cd microservices

# Arrêter les instances
for instance in 1 2 3; do
    if [ -f "logs/instance-$instance.pid" ]; then
        pid=$(cat "logs/instance-$instance.pid")
        if kill -0 $pid 2>/dev/null; then
            echo "🛑 Arrêt Instance $instance (PID: $pid)..."
            kill $pid
            
            # Attendre que le processus se termine
            for i in {1..5}; do
                if ! kill -0 $pid 2>/dev/null; then
                    break
                fi
                sleep 1
            done
            
            # Force kill si nécessaire
            if kill -0 $pid 2>/dev/null; then
                echo "   Force kill..."
                kill -9 $pid 2>/dev/null
            fi
            
            echo "   ✅ Instance $instance arrêtée"
        else
            echo "   ℹ️  Instance $instance n'était pas en cours"
        fi
        
        rm -f "logs/instance-$instance.pid"
    else
        echo "   ℹ️  Pas de PID pour instance $instance"
    fi
done

echo ""
echo "🧹 Nettoyage..."

# Nettoyer les logs si souhaité
read -p "Supprimer les logs ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f logs/instance-*.log
    echo "   ✅ Logs supprimés"
else
    echo "   ℹ️  Logs conservés"
fi

echo ""
echo "✅ Arrêt terminé"

cd ..
