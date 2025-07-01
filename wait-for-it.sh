#!/usr/bin/env bash
# wait-for-it.sh: Attends qu'un service réseau soit disponible
# Usage: ./wait-for-it.sh host:port -- commande

hostport=$1
shift
host="${hostport%%:*}"
port="${hostport##*:}"

while ! nc -z "$host" "$port"; do
  echo "En attente de $host:$port..."
  sleep 1
done

exec "$@"
