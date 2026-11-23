# n8n workflow

`enquiry-intake.json` is **generated**, never edited in the n8n editor:

```bash
scripts/n8n.sh knowledge   # knowledge/<slug>.md from the website's content (prices, packages, terms)
scripts/n8n.sh import      # build_workflow.py → enquiry-intake.json → import + publish (n8n must be stopped)
scripts/n8n.sh start       # local n8n on http://localhost:5678
```

The generated JSON embeds the client's knowledge base, so it's gitignored. Build it from `client.env` plus the knowledge file. Credentials are never exported to the repo: `deploy.sh` exports the Google credential to a temporary file, imports it on the server, then deletes both copies.

Nodes: Enquiry webhook → Verify secret → Respond ok → Build AI request → Claude → Check AI output → Log to Sheet → Build email → Email owner. See [`scripts/build_workflow.py`](../scripts/build_workflow.py) for the instructions, output schema and guardrail code.
