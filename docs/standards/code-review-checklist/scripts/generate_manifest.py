"""Regenerate review-checklist.yml from CODE_REVIEW_CHECKLIST.md. Usage: python scripts/generate_manifest.py (requires PyYAML)."""
import re, yaml, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
doc = pathlib.Path(ROOT / "CODE_REVIEW_CHECKLIST.md").read_text().split("\n")
rules = yaml.safe_load(open(ROOT / ".semgrep/review-checklist.yml"))["rules"]
AREAS = {"LINT":"Linting","HC":"Hardcoding","CMT":"Comment quality","CC":"Clean code",
         "AGT":"AI agent orchestration","GEN":"General best practices"}
head = re.compile(r'^#{3,4} ((LINT|HC|CMT|CC|AGT|GEN)-(\d+)) · (.+)$')
meta = re.compile(r'^\*\*Severity:\*\* (.+?) · \*\*Automation:\*\* (.+?) · \*\*Applies to:\*\* (.+)$')

def clean(t):
    t = re.sub(r'\*\*(.+?)\*\*', r'\1', t); t = t.replace('`','')
    return t.strip()

def section(start, label):
    """Inline text after **Label:** or the bullet list under it."""
    for i in range(start, len(doc)):
        if head.match(doc[i]): return None
        if doc[i].startswith(f"**{label}:**"):
            inline = doc[i][len(label)+5:].strip()
            if inline: return [clean(inline)]
            out=[]; j=i+1
            while j < len(doc) and doc[j].strip()=="" : j+=1
            while j < len(doc) and (doc[j].startswith(("- ","  ")) or re.match(r'^\d+\. ',doc[j])):
                if doc[j].startswith(("- ",)) or re.match(r'^\d+\. ',doc[j]):
                    out.append(clean(re.sub(r'^(- |\d+\. )','',doc[j])))
                else: out[-1] += " " + clean(doc[j])
                j+=1
            return out
    return None

items=[]
for i,l in enumerate(doc):
    m = head.match(l)
    if not m: continue
    cid, prefix, num, title = m.group(1), m.group(2), m.group(3), m.group(4)
    mm = next(meta.match(doc[k]) for k in range(i+1,i+4) if meta.match(doc[k]))
    sev_raw, auto_raw, applies = mm.groups()
    sev = re.match(r'(BLOCKER|MAJOR|MINOR|PER_RULE|PER RULE)', sev_raw)
    level = re.match(r'(AUTO|ASSISTED|MANUAL)', auto_raw).group(1)
    tools = re.search(r'\((.+)\)$', auto_raw)
    stmt = next((clean(doc[k][len("**Checkpoint:**"):]) for k in range(i, i+8) if doc[k].startswith("**Checkpoint:**")), None)
    sg = [r["id"] for r in rules if r["id"].startswith(f"{prefix.lower()}{num}-")]
    entry = {
        "id": cid, "area": AREAS[prefix], "title": clean(title),
        "severity": sev.group(1) if sev else ("PER_RULE" if clean(sev_raw).lower().startswith("per") else clean(sev_raw)),
    }
    if sev and clean(sev_raw) != sev.group(1): entry["severity_note"] = clean(sev_raw)
    entry.update({"automation": level,
        "tools": clean(tools.group(1)) if tools else None,
        "applies_to": clean(applies), "checkpoint": stmt,
        "red_flags": section(i+1,"Red flags"),
        "pass": section(i+1,"Pass"), "fail": section(i+1,"Fail"),
    })
    if sg: entry["semgrep_rules"] = sg
    items.append({k:v for k,v in entry.items() if v is not None})

manifest = {
  "schema_version": 1,
  "document": "CODE_REVIEW_CHECKLIST.md",
  "severity_levels": {
    'BLOCKER': 'Security, data loss, data leakage, duplicate money/side effects, or production hangs. CI: Job fails. Merge: Cannot merge. The only waiver is a security owner confirming a false positive.',
    'MAJOR': 'Correctness, reliability, or maintainability risk. CI: Job fails (AUTO) or reviewer requests changes (MANUAL). Merge: Fix, or record a waiver approved by the tech lead with a ticket',
    'MINOR': 'Readability or consistency. CI: Annotation or comment only. Merge: Fix now or file a ticket. Does not block.',
    "PER_RULE": "Severity is set per tool rule or pattern; see severity_note and the checkpoint table",
  },
  "comment_format": "[<ID>][<SEVERITY>] <file:line> <problem>. <required change>.",
  "waiver_format": "WAIVER: <ID> | <file> | <reason> | <ticket> | approved: <handle>",
  "checkpoints": items,
}
out = ROOT / "review-checklist.yml"
out.write_text("# Generated from CODE_REVIEW_CHECKLIST.md. Regenerate when the document changes; do not edit by hand.\n"
               + yaml.safe_dump(manifest, sort_keys=False, allow_unicode=True, width=1000))
# checks
from collections import Counter
print(len(items), Counter(x["area"] for x in items))
print(Counter(x["severity"] for x in items), Counter(x["automation"] for x in items))
missing=[(x["id"],k) for x in items for k in ("checkpoint","pass","fail") if not x.get(k)]
print("missing fields:", missing)
print("no red flags:", [x["id"] for x in items if not x.get("red_flags")])
covered={r for x in items for r in x.get("semgrep_rules",[])}
print("unmapped semgrep rules:", [r["id"] for r in rules if r["id"] not in covered])
