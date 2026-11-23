#!/usr/bin/env bash
# Deploy the booking assistant's n8n to the Oracle VM.
#   scripts/deploy.sh <vm-public-ip> [hostname]
# hostname defaults to n8n.<ip-with-dashes>.sslip.io (resolves to the IP; HTTPS via Caddy).
# Secrets are read from the local .env and written to the server's deploy/.env only.
set -euo pipefail
cd "$(dirname "$0")/.."
IP="$1"
HOST="${2:-n8n.${IP//./-}.sslip.io}"
set -a; source .env; [ -f client.env ] && source client.env; set +a
SLUG="$(python3 scripts/client_profile.py CLIENT_SLUG)"
KEY="${SSH_KEY:-$HOME/.ssh/oracle_${SLUG}_n8n}"
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new ubuntu@$IP"

# One server encryption key, created once and kept in the local .env (needed to restore backups)
if [ -z "${N8N_SERVER_ENCRYPTION_KEY:-}" ]; then
  N8N_SERVER_ENCRYPTION_KEY=$(python3 -c 'import secrets;print(secrets.token_hex(24))')
  printf 'N8N_SERVER_ENCRYPTION_KEY=%s\n' "$N8N_SERVER_ENCRYPTION_KEY" >> .env
fi

# Workflow + the Google credential (exported decrypted from local n8n, re-encrypted on the server)
mkdir -p deploy/import
python3 scripts/build_workflow.py > deploy/import/enquiry-intake.json
N8N_RUNNERS_BROKER_PORT=5690 scripts/n8n.sh export:credentials --id="$N8N_GOOGLE_CRED_ID" --decrypted \
  --output=deploy/import/google-credential.json >/dev/null 2>&1
chmod 600 deploy/import/*.json

# Public /about and /privacy pages, filled in from the client profile
rm -rf deploy/build && mkdir -p deploy/build/site
APP_NAME="$(python3 scripts/client_profile.py APP_NAME)" CONTACT_EMAIL="$(python3 scripts/client_profile.py CONTACT_EMAIL)" \
  python3 -c 'import os,sys,pathlib
for f in pathlib.Path("deploy/site").glob("*.html"):
    t=f.read_text().replace("{{APP_NAME}}",os.environ["APP_NAME"]).replace("{{CONTACT_EMAIL}}",os.environ["CONTACT_EMAIL"])
    pathlib.Path("deploy/build/site",f.name).write_text(t)'

umask 077
{
  echo "N8N_HOST=$HOST"
  echo "N8N_ENCRYPTION_KEY=$N8N_SERVER_ENCRYPTION_KEY"
  echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
  echo "ENQUIRY_WEBHOOK_SECRET=$ENQUIRY_WEBHOOK_SECRET"
  echo "ENQUIRY_SHEET_ID=$ENQUIRY_SHEET_ID"
  echo "OWNER_NOTIFY_EMAIL=$OWNER_NOTIFY_EMAIL"
} > deploy/.env

$SSH 'mkdir -p ~/n8n && { [ ! -d ~/n8n/import ] || sudo chown -R "$USER": ~/n8n/import; }'   # undo the uid-1000 handover from last deploy
scp -i "$KEY" -q -r deploy/docker-compose.yml deploy/Caddyfile deploy/server-setup.sh deploy/.env deploy/import deploy/build/site \
  "ubuntu@$IP:~/n8n/"
$SSH 'cd ~/n8n && chmod 600 .env import/*.json && bash server-setup.sh'

# Import credential + workflow with the n8n server STOPPED (one-off containers), then start
# everything so the published webhook registers. Running the CLI next to a live server clashes.
$SSH "SLUG=$SLUG bash -s" <<'REMOTE'
cd ~/n8n && sudo docker compose stop n8n >/dev/null 2>&1; set -e
  sudo chown -R 1000:1000 import   # the container runs as "node" (uid 1000); files stay chmod 600
  run() { sudo docker compose run --rm --no-deps -T n8n "$@"; }
  run import:credentials --input=/import/google-credential.json
  run import:workflow --input=/import/enquiry-intake.json
  run publish:workflow --id="${SLUG}EnquiryIntake"
  sudo rm -f import/google-credential.json
  sudo docker compose --env-file .env up -d && sudo docker compose ps
REMOTE
rm -f deploy/import/google-credential.json

echo "Deployed: https://$HOST  (webhook: https://$HOST/webhook/${SLUG}-enquiry)"
