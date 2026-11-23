"""Build the salon knowledge base from the website's own content files.

The site (Keystatic admin) is the single source of truth: when the owner edits a price
or package, rebuilding this file keeps the assistant's answers in sync.

    python3 scripts/build_knowledge.py "$SITE_CONTENT_DIR" > knowledge/<slug>.md   (scripts/n8n.sh knowledge does this)
"""

import json
import sys
from pathlib import Path


def load(d: Path, name: str) -> dict:
    p = d / f"{name}.json"
    return json.loads(p.read_text()) if p.exists() else {}


def items(section: dict) -> list[str]:
    out = []
    for it in section.get("items", []):
        extra = " · ".join(str(it[k]) for k in ("duration", "note", "description") if it.get(k))
        out.append(f"- {it.get('name', '')}: {it.get('price', 'price on request')}" + (f" ({extra})" if extra else ""))
    return out


def main(content: Path) -> str:
    s = load(content, "settings")
    lines = [f"# {s.get('businessName', 'The salon')}: facts the assistant may use",
             "", "## Contact", f"- Phone: {s.get('phone', '')}", f"- Email: {s.get('email', '')}",
             f"- Address: {s.get('address', '')}", f"- Instagram: {s.get('instagramHandle', '')}", ""]
    for name in ("glam-menu", "men-u"):
        m = load(content, name)
        if not m:
            continue
        lines += [f"## {m.get('title', name)}", m.get("intro", ""), ""]
        for sec in m.get("sections", []):
            lines += [f"### {sec.get('title', '')}", *items(sec), ""]
    gt = load(content, "get-togethers")
    if gt:
        lines += [f"## {gt.get('cardTitle') or gt.get('title')} ({gt.get('tagline', '')})", gt.get("intro", ""), ""]
        for p in gt.get("packages", []):
            inc = p.get("includes") or p.get("items") or []
            inc = ", ".join(inc) if isinstance(inc, list) else str(inc)
            lines.append(f"- {p.get('name', '')}: {p.get('price', '')}" + (f". Includes: {inc}" if inc else "")
                         + (f". {p.get('note')}" if p.get("note") else ""))
        terms = gt.get("terms")
        if terms:
            lines += ["", "Party terms:"] + ([f"- {t}" for t in terms] if isinstance(terms, list) else [str(terms)])
        lines.append("")
    ed = load(content, "education")
    if ed:
        lines += [f"## {ed.get('cardTitle') or ed.get('title')}", ed.get("intro", ""), ""]
        for c in ed.get("courses", []):
            lines.append(f"- Course: {c.get('name')}: {c.get('price')} ({c.get('duration', '')}, {c.get('location', '')}; {c.get('includes', '')})")
        for w in ed.get("workshops", []):
            lines.append(f"- 1-day workshop: {w.get('name')}: {w.get('price')}" + (f" ({w['note']})" if w.get("note") else ""))
        lines.append("")
    t = load(content, "terms-services")
    if t:
        lines += [f"## {t.get('title', 'Terms')} (updated {t.get('updated', '')})"]
        for sec in t.get("sections", []):
            lines.append(f"- **{sec.get('heading', '')}:** {sec.get('body', '')}")
    return "\n".join(x for x in lines if x is not None).strip() + "\n"


if __name__ == "__main__":
    print(main(Path(sys.argv[1])))
