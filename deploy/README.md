# Deploying n8n to an Oracle Cloud "Always Free" VM

Runs in production on a VM.Standard.E2.1.Micro in Johannesburg (Ubuntu 24.04).

1. **Oracle account** (you): sign up at oracle.com/cloud/free, home region **South Africa Central (Johannesburg)**.
2. **VM**: Compute → Instances → Create: image *Canonical Ubuntu 24.04*; shape **VM.Standard.A1.Flex** (ARM, 1 OCPU / 6 GB) if it has capacity, otherwise **VM.Standard.E2.1.Micro** (AMD, 1 GB; `server-setup.sh` adds 2 GB swap). Both are Always Free. Paste your public key (`deploy.sh` expects `~/.ssh/oracle_<slug>_n8n`, or set `SSH_KEY`). Network: "Create new VCN" + "Create new public subnet".
3. **Public IP**: on a new subnet the wizard can't assign one, so after launch: instance → Networking → VNIC → IP administration → ⋯ → Edit → *Ephemeral public IP*.
4. **Cloud firewall**: subnet → Security → Default Security List → Add Ingress Rule: source `0.0.0.0/0`, TCP, destination ports `80,443`.
5. `CREDENTIAL=import scripts/deploy.sh <ip>` on the first deploy (later deploys: `scripts/deploy.sh <ip>`, which never touches the server's Google token): renders the `/about` and `/privacy` pages from `client.env`, copies this folder, writes the server `.env` from the local one, installs Docker + swap, imports the Google credential and workflow **with n8n stopped** (one-off containers), then starts n8n + Caddy. HTTPS is issued by Let's Encrypt on the first request.
6. Google Cloud → OAuth client → redirect URI `https://<host>/rest/oauth2-credential/callback`. Google Auth Platform → Branding: home page `https://<host>/about`, privacy policy `https://<host>/privacy`; then Audience → **Publish app**. In *Testing* mode Google refresh tokens expire after 7 days, so the workflow would silently stop. Reconnect the credential once in the hosted n8n after publishing.
7. Website: Vercel env `ENQUIRY_WEBHOOK_URL=https://<host>/webhook/<slug>-enquiry` and `ENQUIRY_WEBHOOK_SECRET`; Keystatic setting `contactForm = custom`.

Gotchas learned:
- A brand-new n8n has no owner account: whoever opens the URL first claims it. Create the owner immediately (`POST /rest/owner/setup`).
- n8n's OAuth "Connect" opens a popup; if it's blocked, `GET /rest/oauth2-credential/auth?id=<credential id>` (logged in) returns the Google URL to open directly.
- `docker compose run` inside a script fed through `ssh … bash -s` reads the rest of the script as its input and silently swallows it (the publish and start never ran: a 10-minute outage). Give it `</dev/null`.
- Never run `n8n` CLI commands (`docker compose exec`) next to a running server: on a fresh database both run migrations and corrupt it ("index already exists").
- Files mounted into the container must be readable by uid 1000 (`node`); the Oracle `ubuntu` user is uid 1001.
- On the 1 GB micro, the first request after a restart can take ~20 s ("Offer expired" task-runner warnings are retries, not failures).

Costs: $0 on Always Free resources (Oracle's estimate shows the boot volume, covered by the 200 GB free allowance). Stay on Always Free shapes.
