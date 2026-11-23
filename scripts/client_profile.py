"""Client profile: everything business-specific, kept out of the code.

Values come from client.env (gitignored; see client.env.example), and the environment
overrides them. Without a client.env the neutral example defaults are used.
"""

import os
import shlex
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DEFAULTS = {
    "CLIENT_SLUG": "salon",
    "CLIENT_NAME": "Example Salon",
    "CLIENT_SHORT_NAME": "Example Salon",
    "CLIENT_DESCRIPTION": "a beauty salon in Johannesburg",
    "CLIENT_VOICE_HINT": "",
    "SITE_CONTENT_DIR": "../example-site/content",
    "APP_NAME": "Booking Assistant",
    "CONTACT_EMAIL": "you@example.com",
    "GOOGLE_CRED_NAME": "Google: send mail, sheets, calendar events",
}


def load() -> dict:
    values = dict(DEFAULTS)
    path = ROOT / "client.env"
    if path.exists():
        for line in path.read_text().splitlines():
            for token in shlex.split(line, comments=True):
                key, sep, value = token.partition("=")
                if sep:
                    values[key] = value
    values.update({k: os.environ[k] for k in DEFAULTS if k in os.environ})
    return values


def knowledge_path(p: dict) -> Path:
    """The generated knowledge base for this client (gitignored)."""
    own = ROOT / "knowledge" / f"{p['CLIENT_SLUG']}.md"
    return own if own.exists() else ROOT / "knowledge" / "example.md"


if __name__ == "__main__":  # `python3 scripts/client_profile.py KEY` prints one value (for shell scripts)
    import sys
    print(load()[sys.argv[1]])
