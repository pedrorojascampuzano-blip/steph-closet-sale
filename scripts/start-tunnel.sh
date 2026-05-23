#!/usr/bin/env bash
# Arranca el server local + tunnel Cloudflare para la closet sale
# Uso: bash scripts/start-tunnel.sh
set -e

cd "$(dirname "$0")/.."

# Mata procesos previos
pkill -f "python3 -m http.server 8181" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://localhost:8181" 2>/dev/null || true
sleep 1

# Arranca server local
cd docs
python3 -m http.server 8181 > /tmp/closet-server.log 2>&1 &
echo "Server arrancado (puerto 8181), PID $!"
sleep 2

# Arranca tunnel
cd ..
cloudflared tunnel --url http://localhost:8181 --no-autoupdate > /tmp/closet-tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "Cloudflared arrancando, PID $TUNNEL_PID..."

# Espera URL
for i in $(seq 1 30); do
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/closet-tunnel.log 2>/dev/null | head -1)
  if [ -n "$URL" ]; then
    sleep 5  # esperar registración completa
    echo ""
    echo "==========================================="
    echo "  URL pública lista:"
    echo "  $URL"
    echo "==========================================="
    # Auto-copy a clipboard si está en macOS
    echo -n "$URL" | pbcopy 2>/dev/null && echo "(copiada al portapapeles)"
    exit 0
  fi
  sleep 2
done

echo "Timeout esperando tunnel. Ver /tmp/closet-tunnel.log"
exit 1
