#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

usage() {
  cat <<EOF
Usage: $0 [command]

Commands:
  start    Pull the Ollama image and start the daemon in detached mode
  stop     Stop the Ollama daemon
  status   Show container status and health check
  help     Show this message
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

case "$1" in
  start)
    echo "Pulling latest Ollama image and starting service..."
    docker compose -f "$COMPOSE_FILE" pull
    docker compose -f "$COMPOSE_FILE" up -d
    echo "Waiting for Ollama to become healthy..."
    sleep 5
    curl -s -o /dev/null -w "%{http_code}\n" http://localhost:11434/api/tags
    ;;
  stop)
    echo "Stopping Ollama service..."
    docker compose -f "$COMPOSE_FILE" down
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" ps
    echo
    echo "Health check:" 
    curl -s -o /dev/null -w "%{http_code}\n" http://localhost:11434/api/tags || true
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "Unknown command: $1"
    usage
    exit 1
    ;;
esac
