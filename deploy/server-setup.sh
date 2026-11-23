#!/usr/bin/env bash
# Runs ON the Oracle VM (Ubuntu 24.04; AMD micro or ARM A1). Idempotent: safe to run again.
set -euo pipefail
cd "$(dirname "$0")"

# 0. Swap: the Always Free AMD micro has only 1 GB RAM; 2 GB swap keeps n8n stable
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf >/dev/null && sudo sysctl -p /etc/sysctl.d/99-swap.conf >/dev/null
fi

# 1. Docker
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

# 2. Oracle's Ubuntu images block 80/443 in iptables even when the cloud firewall allows them
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$p" -m state --state NEW -j ACCEPT 2>/dev/null \
    || sudo iptables -I INPUT 6 -p tcp --dport "$p" -m state --state NEW -j ACCEPT
done
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq netfilter-persistent >/dev/null
sudo netfilter-persistent save >/dev/null

# 3. Pull images. scripts/deploy.sh imports the workflow with n8n stopped, then starts
#    n8n + Caddy (HTTPS certificate is fetched automatically on first request).
#    Never run n8n CLI commands while the server is up: on a fresh DB both run migrations and clash.
sudo docker compose --env-file .env pull -q
