#!/usr/bin/env bash
# Local n8n for the booking assistant. Usage: scripts/n8n.sh start | knowledge | import | <any n8n command>
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; [ -f client.env ] && source client.env; set +a
SLUG="$(python3 scripts/client_profile.py CLIENT_SLUG)"
export N8N_USER_FOLDER="${N8N_USER_FOLDER:-$HOME/.n8n-$SLUG}"   # n8n data lives outside the repo
export N8N_BLOCK_ENV_ACCESS_IN_NODE=false           # workflows read the secret/API key from env
export N8N_PORT=5678 GENERIC_TIMEZONE=Africa/Johannesburg TZ=Africa/Johannesburg
export N8N_DIAGNOSTICS_ENABLED=false N8N_PERSONALIZATION_ENABLED=false
case "${1:-start}" in
  start)  exec npx -y n8n start ;;
  knowledge) # rebuild the knowledge base from the website's content (the owner edits prices there)
          python3 scripts/build_knowledge.py "$(python3 scripts/client_profile.py SITE_CONTENT_DIR)" > "knowledge/$SLUG.md"
          echo "knowledge/$SLUG.md: $(wc -w < "knowledge/$SLUG.md") words" ;;
  import) # n8n must be stopped while importing, otherwise the live webhook is dropped until restart
          if lsof -tiTCP:${N8N_PORT} -sTCP:LISTEN >/dev/null; then echo "Stop n8n first (it's running on :${N8N_PORT})"; exit 1; fi
          python3 scripts/build_workflow.py > n8n/enquiry-intake.json
          npx -y n8n import:workflow --input=n8n/enquiry-intake.json
          npx -y n8n publish:workflow --id="${SLUG}EnquiryIntake" ;;
  *)      exec npx -y n8n "$@" ;;
esac
