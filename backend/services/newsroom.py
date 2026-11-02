"""The newsroom: StudentKare's Blog and News, written by the team in the SK templates.

Five templates, each a fixed layout and cover built from the design tokens:
health tip and story (the Blog), campus news, product update and press release
(News). An author picks a template; fonts, colours and the cover come from it,
never from the author. The rules every response keeps:

* **Published only.** The public endpoints return a post only while it is
  PUBLISHED, or SCHEDULED with its time in the past. A draft, an unpublished
  post or a scheduled one before its time is simply not found.
* **Health tips are clinically reviewed.** A HEALTH_TIP is published only with a
  clinician's approval (an ``NMC_DOCTOR`` account; no admin bypass) of exactly
  its current content: the approval stores the content hash, and any later edit
  voids it and takes the post off the site until it is reviewed again. The post
  says who reviewed it and when.
* **Other templates** are published by an editor; the super admin is the editor
  (there is no separate editor role).
* **Typed by the team, or tagged Auto.** Nothing in this module calls a model.
  Posts the content autopilot drafts (services/newsroom_autopilot.py) are
  ``origin=AUTO``: shown with an Auto tag, their source named and linked, written
  only from that source (or from approved knowledge), and a health tip still
  needs a clinician's approval like any other.
* **Never about a student.** Posts are editorial text on the platform plane;
  nothing about any person's health is read into or out of this module (Rule L).
* **Images** placed in a post are checked by their bytes and virus-scanned
  before they are stored (like product photos), and are public only while a
  public post shows them.
* **Audited.** Every create, edit, review, publish and unpublish is written to
  the post's trail (``care_post_events``) and to the workflow audit.

Feeds (RSS and Atom per section), the sitemap and the share image (a 1200x630 PNG
drawn on our server from the same cover; services/newsroom_cover.py) are public
and cached for ``newsroom.public_cache_seconds``.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import format_datetime
from pathlib import Path
from typing import Any, Literal
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import newsroom_cover, upload_files
from services.integration_config import app_domain, brand_name
from services.security_scanner import scan_file_for_viruses
from services.workflow_auth import StrictModel, authenticated_user, require_super_admin, workflow_db

router = APIRouter(prefix="/api", tags=["Newsroom"])

# --- templates -------------------------------------------------------------------

BLOG = "BLOG"
NEWS = "NEWS"
SECTION_PATHS = {BLOG: "blog", NEWS: "news"}
PATH_SECTIONS = {path: section for section, path in SECTION_PATHS.items()}
SectionPath = Literal["blog", "news"]

HEALTH_TIP = "HEALTH_TIP"
Template = Literal["HEALTH_TIP", "CAMPUS_NEWS", "PRODUCT_UPDATE", "PRESS_RELEASE", "STORY", "MOTIVATION", "SERIES_EPISODE",
                   "EVENT", "CAMPUS_SPOTLIGHT", "EXPLAINER", "MYTH_FACT", "QUICK_CARD"]

# Body blocks, and which each template allows. The frontend's template table
# (src/features/newsroom/model/templates.ts) mirrors this; tests compare the two.
# ``review``: always needs a clinician (a health tip). ``advice``: may carry health
# advice, so it needs a clinician when its category is clinical (see needs_review).
# ``words``: the composer's length guide (fewest, most words), a guide only.
BLOCK_TYPES = ("heading", "paragraph", "list", "quote", "callout", "image", "facts", "cta", "mythfact", "stat")
TEMPLATES: dict[str, dict[str, Any]] = {
    "HEALTH_TIP": {"section": BLOG, "label": "Health tip", "review": True, "advice": True, "words": (150, 900),
                   "art": ("heart--p1", "wellness-alt--p5", "brain-alt--p3", "thermo-alt--p1"),
                   "blocks": ("heading", "paragraph", "list", "callout", "image", "facts", "cta")},
    "STORY": {"section": BLOG, "label": "Story", "review": False, "advice": False, "words": (200, 1500),
              "art": ("user--p4", "chat-alt--p4", "home-alt--p4"),
              "blocks": ("heading", "paragraph", "quote", "image", "callout", "cta")},
    "CAMPUS_NEWS": {"section": NEWS, "label": "Campus news", "review": False, "advice": False, "words": (80, 800),
                    "art": ("calendar-alt--p4", "home-alt--p4", "idcard-alt--p4"),
                    "blocks": ("heading", "paragraph", "list", "image", "facts", "quote", "cta")},
    "PRODUCT_UPDATE": {"section": NEWS, "label": "What's new", "review": False, "advice": False, "words": (60, 600),
                       "art": ("bell--p2", "settings-alt--p4", "vault-alt--p4"),
                       "blocks": ("heading", "paragraph", "list", "image", "callout", "cta")},
    "PRESS_RELEASE": {"section": NEWS, "label": "Press release", "review": False, "advice": False, "words": (150, 1000),
                      "art": ("doc--p4", "chat-alt--p4"),
                      "blocks": ("heading", "paragraph", "quote", "list", "facts", "image")},
    "MOTIVATION": {"section": BLOG, "label": "Motivation", "review": False, "advice": False, "words": (10, 200),
                   "art": ("wellness-alt--p5", "chat-alt--p4", "user--p4"),
                   "blocks": ("quote", "paragraph", "callout", "cta")},
    "SERIES_EPISODE": {"section": BLOG, "label": "Series episode", "review": False, "advice": True, "words": (120, 700),
                       "art": ("brain-alt--p3", "wellness-alt--p5", "heart--p1", "thermo-alt--p1", "calendar-alt--p4"),
                       "blocks": ("heading", "paragraph", "list", "callout", "facts", "quote", "cta")},
    "EVENT": {"section": NEWS, "label": "Event", "review": False, "advice": False, "words": (60, 500),
              "art": ("calendar-alt--p4", "home-alt--p4", "bell--p2"),
              "blocks": ("heading", "paragraph", "facts", "list", "image", "callout", "cta")},
    "CAMPUS_SPOTLIGHT": {"section": NEWS, "label": "Campus spotlight", "review": False, "advice": False, "words": (150, 900),
                         "art": ("home-alt--p4", "idcard-alt--p4", "user--p4"),
                         "blocks": ("heading", "paragraph", "quote", "image", "facts", "cta")},
    "EXPLAINER": {"section": BLOG, "label": "Explainer", "review": False, "advice": True, "words": (250, 1200),
                  "art": ("search--p4", "doc--p4", "lab-alt--p5"),
                  "blocks": ("heading", "paragraph", "list", "facts", "callout", "image", "cta")},
    "MYTH_FACT": {"section": BLOG, "label": "Myth vs fact", "review": False, "advice": True, "words": (80, 700),
                  "art": ("chat-alt--p4", "shield--p5", "search--p4"),
                  "blocks": ("heading", "paragraph", "mythfact", "callout", "cta")},
    "QUICK_CARD": {"section": BLOG, "label": "Quick card", "review": False, "advice": True, "words": (20, 250),
                   "art": ("chart-alt--p4", "lab-alt--p5", "bell--p2"),
                   "blocks": ("heading", "stat", "facts", "paragraph", "callout", "cta")},
}
ADVICE_TEMPLATES = tuple(name for name, spec in TEMPLATES.items() if spec["advice"])
STAT_VALUE_MAX = 12
MYTHFACT_MAX = 6

# The content module's definitions (default categories, built-in series, fixed copy).
CONTENT_DEFS: dict = json.loads((Path(__file__).resolve().parents[1] / "content" / "newsroom" / "content.json")
                                .read_text("utf-8"))

# Where a call-to-action button may lead: app routes only, never an outside link.
CTA_ROUTES = (
    "/blog", "/consult", "/crisis", "/find-care", "/lab-tests", "/medicine-info", "/news", "/plans",
    "/preventive-care", "/records", "/shop", "/signup", "/support",
)
CALLOUT_TONES = ("info", "attention")   # never danger: red is for safety and clinical alerts only

DRAFT, SCHEDULED, PUBLISHED, UNPUBLISHED = "DRAFT", "SCHEDULED", "PUBLISHED", "UNPUBLISHED"
Status = Literal["DRAFT", "SCHEDULED", "PUBLISHED", "UNPUBLISHED"]

# Team members who can be named as a post's author.
AUTHOR_ROLES = frozenset({"SUPER_ADMIN", "NMC_DOCTOR", "CAMPUS_ADMIN", "COUNSELLOR"})
REVIEWER_ROLE = "NMC_DOCTOR"

SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SLUG_MIN, SLUG_MAX = 3, 80
TAG = re.compile(r"^[a-z0-9]+(?:[ -][a-z0-9]+)*$")
TAG_MAX, TAGS_MAX = 30, 8
BLOCKS_MAX = 60
LIST_ITEMS_MAX = 12
FACT_ITEMS_MAX = 8
CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
WORD = re.compile(r"\w+", re.UNICODE)
SEARCH_SCAN_MAX = 1000
HISTORY_MAX = 100
IMAGE_TYPES = frozenset({upload_files.PNG, upload_files.JPEG, upload_files.WEBP})
HASH_LENGTH = 64


# --- who --------------------------------------------------------------------------

def require_reviewer(user: dict = Depends(authenticated_user)) -> dict:
    """Only a clinician approves a health tip. No admin bypass."""
    if user.get("role") != REVIEWER_ROLE:
        raise HTTPException(403, "Only a clinician can review a health tip.")
    return user


def require_post_reader(user: dict = Depends(authenticated_user)) -> dict:
    """The editor (super admin) or a clinician reviewer."""
    if user.get("role") not in {"SUPER_ADMIN", REVIEWER_ROLE}:
        raise HTTPException(403, "Posts are edited by the super admin and reviewed by clinicians.")
    return user


# --- content ----------------------------------------------------------------------

AUTO = "AUTO"


def is_auto(row: M.Post) -> bool:
    return row.origin == AUTO


def source_of(row: M.Post) -> dict | None:
    """The outside item an auto post summarises (publisher, link, its date), or None."""
    if not row.source_url:
        return None
    return {"name": row.source_name, "url": row.source_url, "publishedAt": _iso(row.source_published_at)}


def content_of(row: M.Post) -> dict:
    """Everything a reader sees in the post itself; its hash is what a reviewer approves.

    The source line is part of it only when there is one, so the hash of every
    post without a source (and every approval of one) is unchanged.
    """
    content = {"template": row.template, "title": row.title, "summary": row.summary, "body": row.body or [],
               "tags": row.tags or [], "coverAlt": row.cover_alt, "coverArt": row.cover_art}
    if row.source_url:
        content["source"] = {"name": row.source_name, "url": row.source_url, "at": row.source_published_at}
    return content


def content_hash(row: M.Post) -> str:
    return hashlib.sha256(json.dumps(content_of(row), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def review_current(row: M.Post) -> bool:
    return bool(row.reviewed_by) and bool(row.reviewed_hash) and row.reviewed_hash == content_hash(row)


@dataclass(frozen=True)
class Policy:
    """What the clinical gate needs to know, read once per request: the clinical categories and two settings."""
    clinical: frozenset[str]
    requires_clinician: bool
    threshold: int


def clinical_categories(db: Session) -> frozenset[str]:
    """The clinical category ids. Before any category is stored, the shipped defaults (fail closed)."""
    rows = db.execute(select(M.PostCategory.id, M.PostCategory.clinical)).all()
    if not rows:
        return frozenset(c["id"] for c in CONTENT_DEFS["categories"] if c["clinical"])
    return frozenset(category_id for category_id, clinical in rows if clinical)


def policy(db: Session) -> Policy:
    return Policy(clinical_categories(db), setting("content.health_requires_clinician", db) is True,
                  int(setting("content.precision_threshold", db)))


def health_content(row: M.Post, pol: Policy) -> bool:
    """A health tip, or an advice template (series episode, explainer, myth vs fact, quick card) in a clinical category."""
    spec = TEMPLATES[row.template]
    return bool(spec["review"]) or (bool(spec["advice"]) and row.category_id in pol.clinical)


def precise(row: M.Post, pol: Policy) -> bool:
    """An auto post the precision gate scored at or above the threshold, as it stands (an edit resets the score)."""
    return is_auto(row) and row.precision >= pol.threshold and row.precision >= 0


def needs_review(row: M.Post, pol: Policy) -> bool:
    """Whether a clinician must approve exactly this version before it is public.

    Health content always does, except an auto post that passed the precision gate
    while ``content.health_requires_clinician`` is off. A post typed by the team
    is never scored, so a team health tip always needs a clinician (#229).
    """
    if not health_content(row, pol):
        return False
    return not (not pol.requires_clinician and precise(row, pol))


def is_public(row: M.Post, now: float, pol: Policy) -> bool:
    """Published (or scheduled and due), and for health content, reviewed as it stands now."""
    if row.status == PUBLISHED or (row.status == SCHEDULED and row.publish_at <= now):
        return review_current(row) if needs_review(row, pol) else True
    return False


def _clean(text: Any, *, low: int, high: int, what: str) -> str:
    if not isinstance(text, str):
        raise ValueError(f"{what} must be text.")
    value = CONTROL.sub("", text).strip()
    if what.endswith("paragraph"):
        value = re.sub(r"[ \t]+", " ", value)
    else:
        value = " ".join(value.split())
    if not low <= len(value) <= high:
        raise ValueError(f"{what} must be {low}–{high} characters.")
    return value


def _items(raw: Any, *, most: int, high: int, what: str) -> list[str]:
    if not isinstance(raw, list) or not raw:
        raise ValueError(f"{what} needs at least one line.")
    if len(raw) > most:
        raise ValueError(f"{what} can have at most {most} lines.")
    return [_clean(item, low=1, high=high, what=f"A line in {what.lower()}") for item in raw]


def validate_block(template: str, block: Any, image_ids: set[str]) -> dict:
    """One body block, cleaned, or ValueError saying what to fix. Plain text only: no HTML, no outside links."""
    if not isinstance(block, dict) or block.get("type") not in BLOCK_TYPES:
        raise ValueError("Each block needs a known type.")
    kind = block["type"]
    if kind not in TEMPLATES[template]["blocks"]:
        raise ValueError(f"A {TEMPLATES[template]['label'].lower()} can't have a {kind} block.")
    if kind == "heading":
        return {"type": kind, "text": _clean(block.get("text"), low=2, high=120, what="A heading")}
    if kind == "paragraph":
        return {"type": kind, "text": _clean(block.get("text"), low=1, high=2000, what="A paragraph")}
    if kind == "list":
        return {"type": kind, "ordered": block.get("ordered") is True,
                "items": _items(block.get("items"), most=LIST_ITEMS_MAX, high=300, what="A list")}
    if kind == "quote":
        cite = block.get("cite") or ""
        return {"type": kind, "text": _clean(block.get("text"), low=2, high=500, what="A quote"),
                "cite": _clean(cite, low=0, high=120, what="Who said it") if cite else ""}
    if kind == "callout":
        tone = block.get("tone", "info")
        if tone not in CALLOUT_TONES:
            raise ValueError("A callout is either information or 'needs attention'.")
        return {"type": kind, "tone": tone, "text": _clean(block.get("text"), low=2, high=500, what="A callout")}
    if kind == "image":
        image_id = block.get("imageId")
        if not isinstance(image_id, str) or image_id not in image_ids:
            raise ValueError("Upload the image to this post before placing it.")
        caption = block.get("caption") or ""
        return {"type": kind, "imageId": image_id,
                "alt": _clean(block.get("alt"), low=3, high=200, what="An image's alt text"),
                "caption": _clean(caption, low=0, high=200, what="A caption") if caption else ""}
    if kind == "mythfact":
        return {"type": kind, "myth": _clean(block.get("myth"), low=2, high=300, what="A myth"),
                "fact": _clean(block.get("fact"), low=2, high=500, what="A fact")}
    if kind == "stat":
        return {"type": kind, "value": _clean(block.get("value"), low=1, high=STAT_VALUE_MAX, what="A figure"),
                "label": _clean(block.get("label"), low=2, high=120, what="A figure's label")}
    if kind == "facts":
        title = block.get("title") or ""
        return {"type": kind, "title": _clean(title, low=0, high=80, what="A key-facts title") if title else "",
                "items": _items(block.get("items"), most=FACT_ITEMS_MAX, high=200, what="Key facts")}
    route = block.get("route")
    if route not in CTA_ROUTES:
        raise ValueError("A button can open one of the app's pages only.")
    return {"type": kind, "label": _clean(block.get("label"), low=2, high=40, what="A button label"), "route": route}


def validate_body(template: str, body: Any, image_ids: set[str]) -> list[dict]:
    if not isinstance(body, list):
        raise ValueError("The body is a list of blocks.")
    if len(body) > BLOCKS_MAX:
        raise ValueError(f"A post can have at most {BLOCKS_MAX} blocks.")
    return [validate_block(template, block, image_ids) for block in body]


def block_text(block: dict) -> str:
    parts = [block.get("text", ""), block.get("cite", ""), block.get("title", ""), block.get("label", ""),
             block.get("caption", ""), block.get("myth", ""), block.get("fact", ""), block.get("value", ""),
             *block.get("items", [])]
    return " ".join(p for p in parts if p)


def reading_minutes(row: M.Post, db: Session) -> int:
    words = len(WORD.findall(" ".join([row.title, row.summary, *(block_text(b) for b in row.body or [])])))
    return max(1, math.ceil(words / int(setting("newsroom.words_per_minute", db))))


# --- payloads -----------------------------------------------------------------------

def _names(db: Session, ids: set[str]) -> dict[str, str]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    return {a.id: a.full_name for a in db.scalars(select(M.Account).where(M.Account.id.in_(ids)))}


def _iso(at: float) -> str | None:
    return datetime.fromtimestamp(at, UTC).isoformat().replace("+00:00", "Z") if at else None


def post_path(row: M.Post) -> str:
    return f"/{SECTION_PATHS[row.section]}/{row.slug}"


def _site() -> str:
    return f"https://{app_domain()}"


@dataclass(frozen=True)
class Refs:
    """The categories and series a page of posts points at, read once."""
    categories: dict[str, M.PostCategory]
    series: dict[str, M.PostSeries]


def load_refs(db: Session, rows: list[M.Post]) -> Refs:
    ids = {r.series_id for r in rows if r.series_id}
    series = {s.id: s for s in db.scalars(select(M.PostSeries).where(M.PostSeries.id.in_(ids)))} if ids else {}
    return Refs({c.id: c for c in db.scalars(select(M.PostCategory))}, series)


DEFAULT_CATEGORIES = {c["id"]: c for c in CONTENT_DEFS["categories"]}
PROTECTED_CATEGORIES: dict[str, dict] = CONTENT_DEFS["protectedCategories"]


def category_view(category_id: str, refs: Refs) -> dict | None:
    """A post's category as a reader sees it. Before categories are stored, the shipped default."""
    if not category_id:
        return None
    row = refs.categories.get(category_id)
    if row is not None:
        crisis = bool(row.crisis_lines) or bool(PROTECTED_CATEGORIES.get(row.id, {}).get("crisisLines"))
        return {"id": row.id, "name": row.name, "hue": row.hue, "icon": row.icon, "crisisLines": crisis}
    default = DEFAULT_CATEGORIES.get(category_id)
    if default is None:
        return None
    return {"id": default["id"], "name": default["name"], "hue": default["hue"], "icon": default["icon"],
            "crisisLines": bool(default["crisisLines"])}


def series_view(row: M.Post, refs: Refs) -> dict | None:
    series = refs.series.get(row.series_id) if row.series_id else None
    if series is None:
        return None
    return {"slug": series.slug, "name": series.name, "hue": series.hue, "episode": row.episode}


def teaser(row: M.Post, db: Session, names: dict[str, str], pol: Policy, refs: Refs) -> dict:
    """What a list, the Home card and What's new show. Nothing about any reader."""
    reviewed = None
    if needs_review(row, pol) and review_current(row):
        reviewed = {"by": names.get(row.reviewed_by or "", ""), "on": _iso(row.reviewed_at)}
    category = category_view(row.category_id, refs)
    return {
        "id": row.id, "slug": row.slug, "section": SECTION_PATHS[row.section], "template": row.template,
        "title": row.title, "summary": row.summary, "tags": list(row.tags or []), "coverAlt": row.cover_alt,
        "coverArt": row.cover_art or None, "author": {"name": author_name(row, names)},
        "publishedAt": _iso(row.publish_at), "updatedAt": _iso(row.updated_at), "featured": bool(row.featured),
        "readingMinutes": reading_minutes(row, db), "reviewed": reviewed, "sample": bool(row.sample),
        "path": post_path(row), "ogImage": f"/api/posts/{SECTION_PATHS[row.section]}/{row.slug}/og.png",
        "auto": is_auto(row), "source": source_of(row), "category": category, "series": series_view(row, refs),
        "crisisLines": bool(category and category["crisisLines"]), "healthNote": health_content(row, pol),
    }


def author_name(row: M.Post, names: dict[str, str]) -> str:
    """The team member who wrote it; an auto post without one is by the brand."""
    return names.get(row.author_id, "") or (brand_name() if is_auto(row) else "")


def _public_body(row: M.Post) -> list[dict]:
    return [{**b, "src": f"/api/posts/images/{b['imageId']}"} if b.get("type") == "image" else dict(b)
            for b in row.body or []]


def _public_rows(db: Session, now: float, section: str | None = None, template: str | None = None,
                 pol: Policy | None = None, *, category: str = "", series_id: str = "") -> list[M.Post]:
    statement = select(M.Post).where(M.Post.status.in_((PUBLISHED, SCHEDULED)), M.Post.publish_at <= now)
    if section:
        statement = statement.where(M.Post.section == section)
    if template:
        statement = statement.where(M.Post.template == template)
    if category:
        statement = statement.where(M.Post.category_id == category)
    if series_id:
        statement = statement.where(M.Post.series_id == series_id)
    rows = db.scalars(statement.order_by(M.Post.publish_at.desc(), M.Post.id).limit(SEARCH_SCAN_MAX)).all()
    pol = pol or policy(db)
    return [r for r in rows if is_public(r, now, pol)]


def _cache(response: Response, db: Session) -> None:
    response.headers["Cache-Control"] = f"public, max-age={int(setting('newsroom.public_cache_seconds', db))}"


def _matches(row: M.Post, query: str) -> bool:
    haystack = " ".join([row.title, row.summary, " ".join(row.tags or []), *(block_text(b) for b in row.body or [])])
    return all(term in haystack.casefold() for term in query.casefold().split())


# --- public: lists, a post, images ----------------------------------------------------

@router.get("/posts")
def list_posts(response: Response, section: SectionPath | None = None, template: Template | None = None,
               q: str = Query("", max_length=80), tag: str = Query("", max_length=TAG_MAX),
               category: str = Query("", max_length=40), series: str = Query("", max_length=80),
               page: int = Query(1, ge=1, le=1000), page_size: int | None = Query(None, alias="pageSize", ge=1, le=30),
               db: Session = Depends(workflow_db)) -> dict:
    """Published posts, newest first, with the section's featured post on an unfiltered first page."""
    now = time.time()
    pol = policy(db)
    series_id = ""
    if series:
        found = db.scalar(select(M.PostSeries.id).where(M.PostSeries.slug == series))
        series_id = found or "-"
    rows = _public_rows(db, now, PATH_SECTIONS.get(section or ""), template, pol, category=category, series_id=series_id)
    filtered = bool(template or q.strip() or tag.strip() or category or series)
    if q.strip():
        rows = [r for r in rows if _matches(r, q.strip())]
    if tag.strip():
        rows = [r for r in rows if tag.strip().casefold() in (r.tags or [])]
    size = page_size or int(setting("newsroom.page_size", db))
    featured = None
    if not filtered and page == 1 and rows:
        featured = next((r for r in rows if r.featured), rows[0])
    listed = [r for r in rows if r is not featured]
    shown = listed[(page - 1) * size: page * size]
    names = _names(db, {r.author_id for r in shown} | {r.reviewed_by or "" for r in shown}
                   | ({featured.author_id, featured.reviewed_by or ""} if featured else set()))
    refs = load_refs(db, [*shown, *([featured] if featured else [])])
    _cache(response, db)
    return {"items": [teaser(r, db, names, pol, refs) for r in shown], "total": len(listed), "page": page,
            "pageSize": size, "featured": teaser(featured, db, names, pol, refs) if featured else None}


def _public_post(db: Session, section: str, slug: str) -> M.Post:
    row = db.scalar(select(M.Post).where(M.Post.slug == slug))
    if row is None or SECTION_PATHS[row.section] != section or not is_public(row, time.time(), policy(db)):
        raise HTTPException(404, "This post is not published.")
    return row


@router.get("/posts/images/{image_id}")
def public_image(image_id: str, db: Session = Depends(workflow_db)) -> Response:
    """An image, only while a public post shows it."""
    image = db.get(M.PostImage, image_id)
    post = db.get(M.Post, image.post_id) if image else None
    shown = post is not None and is_public(post, time.time(), policy(db)) and any(
        b.get("type") == "image" and b.get("imageId") == image_id for b in post.body or [])
    if image is None or not shown:
        raise HTTPException(404, "Image not found.")
    return Response(image.content, media_type=image.mime_type, headers={
        "Cache-Control": f"public, max-age={int(setting('newsroom.public_cache_seconds', db))}",
        "X-Content-Type-Options": "nosniff"})


@router.get("/posts/{section}/{slug}/og.png")
def share_image(section: SectionPath, slug: str, db: Session = Depends(workflow_db)) -> Response:
    """The 1200x630 share image, drawn on our server from the post's cover (no outside service)."""
    row = _public_post(db, section, slug)
    png = newsroom_cover.render_png(row.template, TEMPLATES[row.template]["label"], row.title, app_domain(),
                                    hue=series_hue(db, row))
    return Response(png, media_type="image/png", headers={
        "Cache-Control": f"public, max-age={int(setting('newsroom.public_cache_seconds', db))}"})


# --- feeds and sitemap ------------------------------------------------------------------

def _feed_rows(db: Session, section: str) -> list[M.Post]:
    return _public_rows(db, time.time(), section)[:int(setting("newsroom.feed_items_max", db))]


@router.get("/posts/{section}/atom.xml")
def atom_feed(section: SectionPath, db: Session = Depends(workflow_db)) -> Response:
    rows = _feed_rows(db, PATH_SECTIONS[section])
    names = _names(db, {r.author_id for r in rows})
    site, brand = _site(), escape(brand_name())
    updated = _iso(max((r.updated_at or r.publish_at for r in rows), default=0.0)) or _iso(time.time())
    entries = "".join(
        f"<entry><title>{escape(r.title)}</title><link href=\"{site}{post_path(r)}\"/>"
        f"<id>{site}{post_path(r)}</id><published>{_iso(r.publish_at)}</published>"
        f"<updated>{_iso(r.updated_at or r.publish_at)}</updated>"
        f"<author><name>{escape(author_name(r, names) or brand_name())}</name></author>"
        f"<category term=\"{escape(r.template)}\" label=\"{escape(TEMPLATES[r.template]['label'])}\"/>"
        f"<summary>{escape(r.summary)}</summary></entry>" for r in rows)
    xml = (f"<?xml version=\"1.0\" encoding=\"utf-8\"?><feed xmlns=\"http://www.w3.org/2005/Atom\">"
           f"<title>{brand} {section.capitalize()}</title><id>{site}/{section}</id>"
           f"<link href=\"{site}/{section}\"/><link rel=\"self\" href=\"{site}/api/posts/{section}/atom.xml\"/>"
           f"<updated>{updated}</updated>{entries}</feed>")
    return Response(xml, media_type="application/atom+xml", headers={
        "Cache-Control": f"public, max-age={int(setting('newsroom.public_cache_seconds', db))}"})


@router.get("/posts/{section}/rss.xml")
def rss_feed(section: SectionPath, db: Session = Depends(workflow_db)) -> Response:
    rows = _feed_rows(db, PATH_SECTIONS[section])
    site, brand = _site(), escape(brand_name())
    items = "".join(
        f"<item><title>{escape(r.title)}</title><link>{site}{post_path(r)}</link>"
        f"<guid isPermaLink=\"true\">{site}{post_path(r)}</guid>"
        f"<pubDate>{format_datetime(datetime.fromtimestamp(r.publish_at, UTC))}</pubDate>"
        f"<category>{escape(TEMPLATES[r.template]['label'])}</category>"
        f"<description>{escape(r.summary)}</description></item>" for r in rows)
    xml = (f"<?xml version=\"1.0\" encoding=\"utf-8\"?><rss version=\"2.0\"><channel>"
           f"<title>{brand} {section.capitalize()}</title><link>{site}/{section}</link>"
           f"<description>{brand} {section}</description>{items}</channel></rss>")
    return Response(xml, media_type="application/rss+xml", headers={
        "Cache-Control": f"public, max-age={int(setting('newsroom.public_cache_seconds', db))}"})


@router.get("/posts/sitemap.xml")
def sitemap(db: Session = Depends(workflow_db)) -> Response:
    """The section pages and every public post (the static pages are in public/sitemap.xml)."""
    site = _site()
    rows = _public_rows(db, time.time())
    urls = [f"<url><loc>{site}/{path}</loc></url>" for path in SECTION_PATHS.values()]
    urls += [f"<url><loc>{site}{post_path(r)}</loc><lastmod>{_iso(r.updated_at or r.publish_at)}</lastmod></url>"
             for r in rows]
    xml = ("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
           f"<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">{''.join(urls)}</urlset>")
    return Response(xml, media_type="application/xml", headers={
        "Cache-Control": f"public, max-age={int(setting('newsroom.public_cache_seconds', db))}"})


@router.get("/posts/{section}/{slug}")
def read_post(section: SectionPath, slug: str, response: Response, db: Session = Depends(workflow_db)) -> dict:
    """One published post, with related posts: the same template first, then the same section."""
    row = _public_post(db, section, slug)
    now = time.time()
    pol = policy(db)
    count = int(setting("newsroom.related_count", db))
    others = [r for r in _public_rows(db, now, row.section, pol=pol) if r.id != row.id]
    related = sorted(others, key=lambda r: (r.series_id != row.series_id or not row.series_id,
                                            r.template != row.template, -r.publish_at))[:count]
    names = _names(db, {row.author_id, row.reviewed_by or ""} | {r.author_id for r in related}
                   | {r.reviewed_by or "" for r in related})
    refs = load_refs(db, [row, *related])
    _cache(response, db)
    return {**teaser(row, db, names, pol, refs), "body": _public_body(row), "seoTitle": row.seo_title or row.title,
            "seoDescription": row.seo_description or row.summary,
            "related": [teaser(r, db, names, pol, refs) for r in related]}


def series_hue(db: Session, row: M.Post) -> str | None:
    """A series episode's cover takes its series' style; any other post its template's."""
    if not row.series_id:
        return None
    series = db.get(M.PostSeries, row.series_id)
    return series.hue if series else None


# --- the editor (super admin) ---------------------------------------------------------------

class PostInput(StrictModel):
    template: Template
    slug: str = Field(min_length=SLUG_MIN, max_length=SLUG_MAX)
    title: str = Field(min_length=3, max_length=160)
    summary: str = Field(default="", max_length=300)
    body: list[dict] = Field(default_factory=list, max_length=BLOCKS_MAX)
    tags: list[str] = Field(default_factory=list, max_length=TAGS_MAX)
    coverAlt: str = Field(default="", max_length=200)
    coverArt: str = Field(default="", max_length=40)
    seoTitle: str = Field(default="", max_length=70)
    seoDescription: str = Field(default="", max_length=160)
    featured: bool = False
    authorId: str = Field(default="", max_length=64)
    categoryId: str = Field(default="", max_length=40)
    seriesId: str = Field(default="", max_length=64)

    @field_validator("slug")
    @classmethod
    def valid_slug(cls, value: str) -> str:
        if not SLUG.fullmatch(value):
            raise ValueError("Use lowercase letters, numbers and single hyphens, e.g. exam-week-sleep.")
        return value

    @field_validator("title", "summary", "coverAlt", "seoTitle", "seoDescription")
    @classmethod
    def one_line(cls, value: str) -> str:
        return " ".join(CONTROL.sub("", value).split())

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, value: list[str]) -> list[str]:
        tags = [" ".join(t.casefold().split()) for t in value if t and t.strip()]
        if any(len(t) > TAG_MAX or not TAG.fullmatch(t) for t in tags):
            raise ValueError(f"Tags are lowercase words (letters and numbers), up to {TAG_MAX} characters.")
        return list(dict.fromkeys(tags))


def _event(db: Session, user: dict, row: M.Post, action: str) -> None:
    now = time.time()
    db.add(M.PostEvent(id=uuid.uuid4().hex, post_id=row.id, action=action, actor_id=user["id"],
                       actor_role=str(user.get("role", "")), content_hash=content_hash(row), created_at=now))
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=user["id"], action=f"POST_{action}", resource_id=row.id,
                           created_at=now))


def _image_ids(db: Session, post_id: str) -> set[str]:
    return set(db.scalars(select(M.PostImage.id).where(M.PostImage.post_id == post_id)))


def _check_author(db: Session, author_id: str) -> None:
    if not author_id:
        return
    account = db.get(M.Account, author_id)
    if account is None or not account.active or account.role not in AUTHOR_ROLES:
        raise HTTPException(422, "Pick the author from the team list.")


def _check_category(db: Session, category_id: str, current: str) -> None:
    if not category_id or category_id == current:
        return
    category = db.get(M.PostCategory, category_id)
    if category is None:
        from services.newsroom_content import (
            ensure_defaults,  # a fresh install: the shipped categories first
        )
        ensure_defaults(db)
        category = db.get(M.PostCategory, category_id)
    if category is None or category.archived:
        raise HTTPException(422, "Pick a category from the list (archived ones can't take new posts).")


def _attach_series(db: Session, row: M.Post, series_id: str) -> None:
    """Join or leave a series. Joining gives the next episode number; the number stays once given."""
    if series_id == (row.series_id or ""):
        return
    if not series_id:
        row.series_id, row.episode = "", 0
        return
    series = db.get(M.PostSeries, series_id)
    if series is None or series.archived:
        raise HTTPException(422, "Pick a series from the list (archived ones can't take new episodes).")
    series.episode_count = (series.episode_count or 0) + 1
    row.series_id, row.episode = series.id, series.episode_count


def _apply(db: Session, row: M.Post, body: PostInput) -> None:
    if body.coverArt and body.coverArt not in TEMPLATES[body.template]["art"]:
        raise HTTPException(422, "Pick the cover art from the template's own set.")
    _check_author(db, body.authorId)
    _check_category(db, body.categoryId, row.category_id or "")
    try:
        blocks = validate_body(body.template, body.body, _image_ids(db, row.id))
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    row.template, row.section, row.slug = body.template, TEMPLATES[body.template]["section"], body.slug
    row.title, row.summary, row.body, row.tags = body.title, body.summary, blocks, body.tags
    row.cover_alt, row.cover_art, row.seo_title, row.seo_description = body.coverAlt, body.coverArt, body.seoTitle, body.seoDescription
    row.featured, row.author_id, row.category_id = body.featured, body.authorId, body.categoryId
    _attach_series(db, row, body.seriesId)


def _commit_slug(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Another post already uses this web address (slug). Choose a different one.") from exc


def _slug_free(db: Session, slug: str, own_id: str) -> None:
    taken = db.scalar(select(M.Post.id).where(M.Post.slug == slug, M.Post.id != own_id))
    if taken:
        raise HTTPException(409, "Another post already uses this web address (slug). Choose a different one.")


def blocked_by(row: M.Post, pol: Policy) -> str | None:
    """Why a post can't be published as it stands, or None."""
    if not row.title.strip() or not row.summary.strip():
        return "Add a title and a summary."
    if not row.cover_alt.strip():
        return "Describe the cover for screen readers (cover alt text)."
    if not row.author_id and not is_auto(row):
        return "Choose the author."
    if not row.body:
        return "Add at least one block to the body."
    if needs_review(row, pol) and not review_current(row):
        return "A clinician must review this health post as it stands before it is published."
    return None


def admin_payload(row: M.Post, db: Session, viewer: dict, pol: Policy | None = None, refs: Refs | None = None) -> dict:
    names = _names(db, {row.author_id, row.reviewed_by or ""})
    now = time.time()
    pol = pol or policy(db)
    refs = refs or load_refs(db, [row])
    review = None
    if row.reviewed_by:
        review = {"by": names.get(row.reviewed_by, ""), "at": row.reviewed_at, "current": review_current(row),
                  "byYou": row.reviewed_by == viewer["id"]}
    return {
        "id": row.id, "template": row.template, "section": SECTION_PATHS[row.section], "slug": row.slug,
        "title": row.title, "summary": row.summary, "body": _admin_body(row), "tags": list(row.tags or []),
        "coverAlt": row.cover_alt, "coverArt": row.cover_art, "seoTitle": row.seo_title,
        "seoDescription": row.seo_description, "featured": bool(row.featured), "authorId": row.author_id,
        "authorName": author_name(row, names), "status": row.status, "publishAt": row.publish_at or None,
        "live": is_public(row, now, pol), "needsReview": needs_review(row, pol), "review": review,
        "contentHash": content_hash(row), "blockedBy": blocked_by(row, pol), "sample": bool(row.sample),
        "path": post_path(row), "readingMinutes": reading_minutes(row, db),
        "createdAt": row.created_at, "updatedAt": row.updated_at, "auto": is_auto(row), "source": source_of(row),
        "categoryId": row.category_id or "", "seriesId": row.series_id or "", "episode": row.episode or 0,
        "category": category_view(row.category_id, refs), "series": series_view(row, refs),
        "precision": row.precision if row.precision is not None else -1, "precisionReport": row.precision_report or None,
        "holdReason": row.hold_reason or "", "healthContent": health_content(row, pol),
    }


def _admin_body(row: M.Post) -> list[dict]:
    return [{**b, "src": f"/api/ops/post-images/{b['imageId']}"} if b.get("type") == "image" else dict(b)
            for b in row.body or []]


def _row_or_404(db: Session, post_id: str) -> M.Post:
    row = db.get(M.Post, post_id)
    if row is None:
        raise HTTPException(404, "Post not found.")
    return row


@router.get("/ops/posts")
def admin_list(status: Status | None = None, template: Template | None = None, q: str = Query("", max_length=80),
               category: str = Query("", max_length=40), series: str = Query("", max_length=64),
               origin: Literal["AUTO", "MANUAL"] | None = None, source: str = Query("", max_length=120),
               queue: Literal["review"] | None = None,
               user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Every post, manual or auto, with the Content module's filters. ``queue=review``: auto drafts held for the
    super admin (imprecise, or auto-publish off) and posts waiting for a clinician."""
    statement = select(M.Post)
    if status:
        statement = statement.where(M.Post.status == status)
    if template:
        statement = statement.where(M.Post.template == template)
    if category:
        statement = statement.where(M.Post.category_id == category)
    if series:
        statement = statement.where(M.Post.series_id == series)
    if origin:
        statement = statement.where(M.Post.origin == origin) if origin == AUTO else statement.where(M.Post.origin != AUTO)
    if source:
        statement = statement.where(M.Post.source_name == source)
    limit = int(setting("content.list_max", db))
    rows = db.scalars(statement.order_by(M.Post.updated_at.desc(), M.Post.id).limit(limit)).all()
    if q.strip():
        rows = [r for r in rows if _matches(r, q.strip())]
    pol = policy(db)
    if queue == "review":
        rows = [r for r in rows if r.status != UNPUBLISHED and (
            (r.status == DRAFT and r.hold_reason) or (needs_review(r, pol) and not review_current(r)))]
    refs = load_refs(db, list(rows))
    return {"items": [admin_payload(r, db, user, pol, refs) for r in rows], "total": len(rows)}


@router.get("/ops/posts/authors")
def authors(user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Team members who can be named as an author (staff accounts; never a student)."""
    rows = db.scalars(select(M.Account).where(M.Account.role.in_(sorted(AUTHOR_ROLES)), M.Account.active.is_(True))
                      .order_by(M.Account.full_name, M.Account.id)).all()
    return {"items": [{"id": a.id, "name": a.full_name, "role": a.role} for a in rows]}


@router.post("/ops/posts", status_code=201)
def create_post(body: PostInput, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    now = time.time()
    row = M.Post(id=uuid.uuid4().hex, status=DRAFT, created_by=user["id"], created_at=now, updated_by=user["id"],
                 updated_at=now, body=[], tags=[])
    _slug_free(db, body.slug, row.id)
    _apply(db, row, body)
    db.add(row)
    _event(db, user, row, "CREATED")
    _commit_slug(db)
    return admin_payload(row, db, user)


@router.get("/ops/posts/{post_id}")
def admin_read(post_id: str, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    row = _row_or_404(db, post_id)
    return {**admin_payload(row, db, user), "history": _history(db, row, user)}


def _history(db: Session, row: M.Post, user: dict) -> list[dict]:
    events = db.scalars(select(M.PostEvent).where(M.PostEvent.post_id == row.id)
                        .order_by(M.PostEvent.created_at.desc(), M.PostEvent.id).limit(HISTORY_MAX)).all()
    names = _names(db, {e.actor_id for e in events})
    return [{"id": e.id, "action": e.action, "actorRole": e.actor_role, "actorName": names.get(e.actor_id, ""),
             "byYou": e.actor_id == user["id"], "at": e.created_at} for e in events]


@router.put("/ops/posts/{post_id}")
def update_post(post_id: str, body: PostInput, user: dict = Depends(require_super_admin),
                db: Session = Depends(workflow_db)) -> dict:
    """Save the post. A health tip whose content changes needs a new clinical review before it is public again."""
    row = _row_or_404(db, post_id)
    before = content_hash(row)
    _slug_free(db, body.slug, row.id)
    _apply(db, row, body)
    row.updated_by, row.updated_at = user["id"], time.time()
    _event(db, user, row, "EDITED")
    if content_hash(row) != before and row.precision >= 0:
        row.precision = -1   # the gate scored the words it was given, not a person's edit of them
    if needs_review(row, policy(db)) and row.reviewed_hash and content_hash(row) != before:
        _event(db, user, row, "REVIEW_VOIDED")
    _commit_slug(db)
    return {**admin_payload(row, db, user), "history": _history(db, row, user)}


class PublishInput(StrictModel):
    publishAt: float | None = Field(default=None, gt=0, allow_inf_nan=False)


@router.post("/ops/posts/{post_id}/publish")
def publish(post_id: str, body: PublishInput, user: dict = Depends(require_super_admin),
            db: Session = Depends(workflow_db)) -> dict:
    """Publish now, or schedule for ``publishAt`` (Unix seconds). Refused while anything is missing."""
    row = _row_or_404(db, post_id)
    reason = blocked_by(row, policy(db))
    if reason:
        raise HTTPException(409, reason)
    now = time.time()
    if body.publishAt is not None and body.publishAt > now:
        row.status, row.publish_at = SCHEDULED, body.publishAt
        action = "SCHEDULED"
    else:
        row.status, row.publish_at = PUBLISHED, now
        action = "PUBLISHED"
    row.first_published_at = row.first_published_at or row.publish_at
    row.updated_by, row.updated_at, row.hold_reason = user["id"], now, ""
    _event(db, user, row, action)
    db.commit()
    return {**admin_payload(row, db, user), "history": _history(db, row, user)}


@router.post("/ops/posts/{post_id}/unpublish")
def unpublish(post_id: str, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Take a post off the site at once (a scheduled one is cancelled). It keeps its text."""
    row = _row_or_404(db, post_id)
    if row.status not in (PUBLISHED, SCHEDULED):
        raise HTTPException(409, "This post is not published or scheduled.")
    row.status, row.updated_by, row.updated_at = UNPUBLISHED, user["id"], time.time()
    _event(db, user, row, "UNPUBLISHED")
    db.commit()
    return {**admin_payload(row, db, user), "history": _history(db, row, user)}


@router.delete("/ops/posts/{post_id}")
def delete_post(post_id: str, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Delete a draft that was never published. A post that went out is unpublished instead, so its trail stays."""
    row = _row_or_404(db, post_id)
    if row.first_published_at or row.status != DRAFT:
        raise HTTPException(409, "A post that has been published is unpublished, not deleted.")
    for image in db.scalars(select(M.PostImage).where(M.PostImage.post_id == row.id)):
        db.delete(image)
    _event(db, user, row, "DELETED")
    db.delete(row)
    db.commit()
    return {"success": True}


@router.post("/ops/posts/{post_id}/images", status_code=201)
def upload_image(post_id: str, file: UploadFile = File(...), user: dict = Depends(require_super_admin),
                 db: Session = Depends(workflow_db)) -> dict:
    """An image for this post: PNG, JPEG or WebP by its bytes, virus-scanned, then stored with the post."""
    row = _row_or_404(db, post_id)
    maximum = int(setting("newsroom.image_max_bytes", db))
    content = upload_files.read_capped(file.file, maximum, f"Images can be up to {maximum // (1024 * 1024)} MB.")
    mime = upload_files.sniff_mime(content)
    if mime not in IMAGE_TYPES:
        raise HTTPException(415, "Use a PNG, JPEG or WebP image.")
    scan_file_for_viruses(content)   # raises on a detection; fails closed when the scanner is down in production
    image = M.PostImage(id=uuid.uuid4().hex, post_id=row.id, mime_type=mime, content=content,
                        filename=upload_files.safe_filename(file.filename, f"image.{upload_files.EXTENSIONS[mime]}"),
                        uploaded_by=user["id"], created_at=time.time())
    db.add(image)
    _event(db, user, row, "IMAGE_ADDED")
    db.commit()
    return {"id": image.id, "src": f"/api/ops/post-images/{image.id}"}


@router.get("/ops/post-images/{image_id}")
def admin_image(image_id: str, user: dict = Depends(require_post_reader), db: Session = Depends(workflow_db)) -> Response:
    """Preview for the editor, and for a clinician reviewing a health tip."""
    image = db.get(M.PostImage, image_id)
    post = db.get(M.Post, image.post_id) if image else None
    if image is None or post is None or (user["role"] == REVIEWER_ROLE and not needs_review(post, policy(db))):
        raise HTTPException(404, "Image not found.")
    return Response(image.content, media_type=image.mime_type,
                    headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


# --- clinical review (clinicians) ---------------------------------------------------------------

def _reviewable(db: Session, post_id: str) -> M.Post:
    row = db.get(M.Post, post_id)
    if row is None or not needs_review(row, policy(db)):
        raise HTTPException(404, "Health tip not found.")
    return row


@router.get("/work/post-reviews")
def review_queue(state: Literal["TO_REVIEW", "REVIEWED", "ALL"] = "TO_REVIEW", user: dict = Depends(require_reviewer),
                 db: Session = Depends(workflow_db)) -> dict:
    """Health posts (health tips, and advice posts in a clinical category) waiting for a clinician, or changed since
    one approved them."""
    pol = policy(db)
    rows = db.scalars(select(M.Post).where(M.Post.template.in_(ADVICE_TEMPLATES), M.Post.status != UNPUBLISHED)
                      .order_by(M.Post.updated_at.desc(), M.Post.id).limit(SEARCH_SCAN_MAX)).all()
    rows = [r for r in rows if needs_review(r, pol)]
    if state == "TO_REVIEW":
        rows = [r for r in rows if not review_current(r)]
    elif state == "REVIEWED":
        rows = [r for r in rows if review_current(r)]
    refs = load_refs(db, list(rows))
    return {"items": [admin_payload(r, db, user, pol, refs) for r in rows], "total": len(rows)}


@router.get("/work/post-reviews/{post_id}")
def review_read(post_id: str, user: dict = Depends(require_reviewer), db: Session = Depends(workflow_db)) -> dict:
    row = _reviewable(db, post_id)
    return {**admin_payload(row, db, user), "history": _history(db, row, user)}


class ApproveInput(StrictModel):
    contentHash: str = Field(min_length=HASH_LENGTH, max_length=HASH_LENGTH)


@router.post("/work/post-reviews/{post_id}/approve")
def approve(post_id: str, body: ApproveInput, user: dict = Depends(require_reviewer),
            db: Session = Depends(workflow_db)) -> dict:
    """A clinician approves exactly the content they read (its hash); a change made meanwhile is refused."""
    row = _reviewable(db, post_id)
    digest = content_hash(row)
    if digest != body.contentHash:
        raise HTTPException(409, "This health tip changed after you opened it. Read it again before approving.")
    if not row.body or not row.title.strip():
        raise HTTPException(422, "There is nothing to review in this health tip yet.")
    row.reviewed_by, row.reviewed_at, row.reviewed_hash = user["id"], time.time(), digest
    _event(db, user, row, "REVIEWED")
    db.commit()
    return {**admin_payload(row, db, user), "history": _history(db, row, user)}


@router.post("/work/post-reviews/{post_id}/withdraw")
def withdraw(post_id: str, user: dict = Depends(require_reviewer), db: Session = Depends(workflow_db)) -> dict:
    """Withdraw an approval: the health tip leaves the site at once until it is reviewed again."""
    row = _reviewable(db, post_id)
    if not row.reviewed_hash:
        raise HTTPException(409, "This health tip is not approved.")
    row.reviewed_by, row.reviewed_at, row.reviewed_hash = None, 0.0, ""
    _event(db, user, row, "REVIEW_WITHDRAWN")
    db.commit()
    return {**admin_payload(row, db, user), "history": _history(db, row, user)}
