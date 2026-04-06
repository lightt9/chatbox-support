#!/bin/bash
# Run this once on a fresh Hetzner VPS (Ubuntu 22.04) as root.
set -euo pipefail

echo "=== Installing Docker ==="
apt-get update -q
apt-get install -y ca-certificates curl gnupg lsb-release git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -q
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "Docker installed: $(docker --version)"
echo ""
echo "=== Setup complete! Next steps ==="
echo ""
echo "1. Clone your repo:"
echo "   git clone <your-repo-url> /app"
echo ""
echo "2. Create env file:"
echo "   cd /app/deploy"
echo "   cp .env.example .env"
echo "   nano .env   # fill in POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY"
echo ""
echo "3. Start everything:"
echo "   docker compose up -d --build"
echo "   (first build takes ~5 minutes)"
echo ""
echo "4. Seed demo data (first time only):"
echo "   docker compose run --rm seed"
echo ""
echo "5. Visit: http://$(curl -s ifconfig.me)"
echo "   Login: admin@chatbox.local / Admin123!"
