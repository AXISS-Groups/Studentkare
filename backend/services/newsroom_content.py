"""The newsroom's content module: categories, series, the share kit, link previews and share counts.

* **Categories** (Mental health, Women's health, Campus life, …) are the super
  admin's: create, rename, archive (never delete), a service-palette hue, an icon
  from an allow-list of manifest icons, the hashtags a LinkedIn caption uses, the
  aggregator's keywords and the series scheduler's topics. ``clinical`` makes an
  advice template in it health content (services/newsroom.needs_review);
  ``crisis_lines`` puts Tele-MANAS 14416 and 112 on every post in it (Mental
  health always has both).
* **Series** (Monday Motivation, the health series, or one the super admin
  makes) group episodes with their own page (/series/{slug}) and numbering. The
  two built-in series are scheduled by services/newsroom_series.py from the
  settings registry (``series.<key>.*``).
* **Share kit** (super admin): a link per network with the UTM tags from the
  settings, a LinkedIn caption (title, summary, the crisis lines where they
  apply, the link, hashtags), and the share cards (1200x630 and 1080x1350).
  Sharing to a network is a person's click: nothing here posts anywhere.
* **Link previews.** /blog/{slug} and /news/{slug} are a single-page app, so a
  crawler that runs no JavaScript (LinkedIn, WhatsApp, X, Facebook, Telegram)
  would see the site's defaults. nginx sends those crawlers (by user agent) to
  ``/api/posts/{section}/{slug}/preview.html``: the post's title, summary,
  canonical address and share image as Open Graph and Twitter tags.
* **Counts.** Views and shares per post, as counts only: no reader, address,
  device or time is kept.

Platform plane throughout; nothing here reads or writes anything about a student.
"""
from __future__ import annotations

import re
import time
import uuid
from html import escape
from typing import Literal
from urllib.parse import quote, urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import newsroom, newsroom_cover
from services.integration_config import app_domain, brand_name
from services.workflow_auth import StrictModel, require_super_admin, workflow_db

router = APIRouter(prefix="/api", tags=["Newsroom content"])

DEFS = newsroom.CONTENT_DEFS
COPY: dict[str, str] = DEFS["copy"]
HUES: tuple[str, ...] = tuple(DEFS["hues"])
CATEGORY_ICONS: frozenset[str] = frozenset(DEFS["categoryIcons"])
SHARE_ENDPOINTS: dict[str, str] = DEFS["shareEndpoints"]
CHANNELS: tuple[str, ...] = tuple(DEFS["views"]["channels"])
ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
HASHTAG = re.compile(r"^[A-Za-z][A-Za-z0-9]{0,29}$")
PHRASE = re.compile(r"^[a-z0-9][a-z0-9 '\-]{0,59}$")
WORD = re.compile(r"\w+", re.UNICODE)
ID_MIN = 2
LIST_MAX = 30
HASHTAGS_MAX = 8
LIBRARY_MAX = 200
SIMILAR_MAX = 5
WORD_MIN_LETTERS = 4
PERCENT = 100
DAY = 86400
QUOTE, OWN = "quote", "own"


# --- defaults ------------------------------------------------------------------------------------

def ensure_defaults(db: Session) -> int:
    """The shipped categories (only while none is stored) and the built-in series (each once). Idempotent;
    the caller commits. Returns how many rows were added."""
    now = time.time()
    added = 0
    if db.scalar(select(func.count(M.PostCategory.id))) == 0:
        for index, c in enumerate(DEFS["categories"]):
            db.add(M.PostCategory(id=c["id"], name=c["name"], hue=c["hue"], icon=c["icon"], clinical=c["clinical"],
                                  crisis_lines=c["crisisLines"], hashtags=c["hashtags"], keywords=c["keywords"],
                                  topics=c["topics"], archived=False, sort=index, created_at=now, updated_by="system",
                                  updated_at=now))
            added += 1
    for s in DEFS["series"]:
        if db.scalar(select(M.PostSeries.id).where(M.PostSeries.autopilot_key == s["key"])):
            continue
        if db.scalar(select(M.PostSeries.id).where(M.PostSeries.slug == s["slug"])):
            continue   # a series the super admin made already has the address
        db.add(M.PostSeries(id=uuid.uuid4().hex, slug=s["slug"], name=s["name"], summary=s["summary"],
                            category_id=s["categoryId"], template=s["template"], hue=s["hue"], autopilot_key=s["key"],
                            episode_count=0, library=[], archived=False, sample=False, created_at=now,
                            updated_by="system", updated_at=now))
        added += 1
    db.flush()
    return added


# --- categories ------------------------------------------------------------------------------------

def _category_payload(row: M.PostCategory, counts: dict[str, int] | None = None) -> dict:
    protected = newsroom.PROTECTED_CATEGORIES.get(row.id, {})
    return {"id": row.id, "name": row.name, "hue": row.hue, "icon": row.icon,
            "clinical": bool(row.clinical) or bool(protected.get("clinical")),
            "crisisLines": bool(row.crisis_lines) or bool(protected.get("crisisLines")),
            "hashtags": list(row.hashtags or []), "keywords": list(row.keywords or []), "topics": list(row.topics or []),
            "archived": bool(row.archived), "sort": row.sort, "protected": bool(protected),
            **({"posts": counts.get(row.id, 0)} if counts is not None else {})}


def _cache(response: Response, db: Session) -> None:
    response.headers["Cache-Control"] = f"public, max-age={int(setting('newsroom.public_cache_seconds', db))}"


@router.get("/post-categories")
def public_categories(response: Response, db: Session = Depends(workflow_db)) -> dict:
    """The categories a reader can filter by (archived ones are left out)."""
    rows = db.scalars(select(M.PostCategory).where(M.PostCategory.archived.is_(False))
                      .order_by(M.PostCategory.sort, M.PostCategory.name)).all()
    _cache(response, db)
    return {"items": [{k: v for k, v in _category_payload(r).items() if k in ("id", "name", "hue", "icon", "crisisLines")}
                      for r in rows]}


def _phrases(values: list[str], what: str) -> list[str]:
    cleaned = [" ".join(v.casefold().split()) for v in values if v and v.strip()]
    if len(cleaned) > LIST_MAX or any(not PHRASE.fullmatch(v) for v in cleaned):
        raise ValueError(f"{what}: up to {LIST_MAX} lowercase words or phrases.")
    return list(dict.fromkeys(cleaned))


class CategoryInput(StrictModel):
    id: str = Field(default="", max_length=40)
    name: str = Field(min_length=2, max_length=60)
    hue: str = Field(max_length=12)
    icon: str = Field(max_length=40)
    clinical: bool = False
    crisisLines: bool = False
    hashtags: list[str] = Field(default_factory=list, max_length=HASHTAGS_MAX)
    keywords: list[str] = Field(default_factory=list, max_length=LIST_MAX)
    topics: list[str] = Field(default_factory=list, max_length=LIST_MAX)

    @field_validator("hue")
    @classmethod
    def known_hue(cls, value: str) -> str:
        if value not in HUES:
            raise ValueError("Pick a colour from the palette.")
        return value

    @field_validator("icon")
    @classmethod
    def known_icon(cls, value: str) -> str:
        if value not in CATEGORY_ICONS:
            raise ValueError("Pick an icon from the list.")
        return value

    @field_validator("hashtags")
    @classmethod
    def clean_hashtags(cls, value: list[str]) -> list[str]:
        tags = [v.strip().lstrip("#") for v in value if v and v.strip()]
        if any(not HASHTAG.fullmatch(t) for t in tags):
            raise ValueError("Hashtags are letters and numbers, starting with a letter, up to 30 characters.")
        return list(dict.fromkeys(tags))

    @field_validator("keywords")
    @classmethod
    def clean_keywords(cls, value: list[str]) -> list[str]:
        return _phrases(value, "Keywords")

    @field_validator("topics")
    @classmethod
    def clean_topics(cls, value: list[str]) -> list[str]:
        return _phrases(value, "Topics")


def _audit(db: Session, user: dict, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=user["id"], action=action, resource_id=resource_id,
                           created_at=time.time()))


def _post_counts(db: Session) -> dict[str, int]:
    return dict(db.execute(select(M.Post.category_id, func.count(M.Post.id)).group_by(M.Post.category_id)).all())


def _categories_payload(db: Session) -> dict:
    counts = _post_counts(db)
    rows = db.scalars(select(M.PostCategory).order_by(M.PostCategory.archived, M.PostCategory.sort, M.PostCategory.name)).all()
    return {"items": [_category_payload(r, counts) for r in rows], "hues": list(HUES), "icons": sorted(CATEGORY_ICONS)}


@router.get("/ops/post-categories")
def admin_categories(user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    if ensure_defaults(db):
        db.commit()
    return _categories_payload(db)


def _set_category(row: M.PostCategory, body: CategoryInput, user: dict) -> None:
    protected = newsroom.PROTECTED_CATEGORIES.get(row.id, {})
    row.name, row.hue, row.icon = " ".join(body.name.split()), body.hue, body.icon
    row.clinical = body.clinical or bool(protected.get("clinical"))
    row.crisis_lines = body.crisisLines or bool(protected.get("crisisLines"))
    row.hashtags, row.keywords, row.topics = body.hashtags, body.keywords, body.topics
    row.updated_by, row.updated_at = user["id"], time.time()


@router.post("/ops/post-categories", status_code=201)
def create_category(body: CategoryInput, user: dict = Depends(require_super_admin),
                    db: Session = Depends(workflow_db)) -> dict:
    category_id = body.id or newsroom_slug(body.name)
    if not ID.fullmatch(category_id) or len(category_id) < ID_MIN:
        raise HTTPException(422, "Use lowercase letters, numbers and single hyphens for the id, e.g. sleep-health.")
    if db.get(M.PostCategory, category_id):
        raise HTTPException(409, "A category with this id exists. Rename that one, or pick another id.")
    ensure_defaults(db)
    sort = int(db.scalar(select(func.max(M.PostCategory.sort))) or 0) + 1
    row = M.PostCategory(id=category_id, archived=False, sort=sort, created_at=time.time())
    _set_category(row, body, user)
    db.add(row)
    _audit(db, user, "POST_CATEGORY_CREATED", category_id)
    db.commit()
    return _categories_payload(db)


def _category_or_404(db: Session, category_id: str) -> M.PostCategory:
    row = db.get(M.PostCategory, category_id)
    if row is None:
        raise HTTPException(404, "Category not found.")
    return row


@router.put("/ops/post-categories/{category_id}")
def update_category(category_id: str, body: CategoryInput, user: dict = Depends(require_super_admin),
                    db: Session = Depends(workflow_db)) -> dict:
    """Rename or restyle a category. Its id (and so every post's link to it) stays."""
    row = _category_or_404(db, category_id)
    _set_category(row, body, user)
    _audit(db, user, "POST_CATEGORY_EDITED", category_id)
    db.commit()
    return _categories_payload(db)


class ArchiveInput(StrictModel):
    archived: bool


@router.post("/ops/post-categories/{category_id}/archive")
def archive_category(category_id: str, body: ArchiveInput, user: dict = Depends(require_super_admin),
                     db: Session = Depends(workflow_db)) -> dict:
    """Archive (or bring back) a category: it leaves the filters and takes no new posts; its posts keep it."""
    row = _category_or_404(db, category_id)
    if body.archived and row.id in newsroom.PROTECTED_CATEGORIES:
        raise HTTPException(409, "This category carries the crisis lines and can't be archived.")
    row.archived, row.updated_by, row.updated_at = body.archived, user["id"], time.time()
    _audit(db, user, "POST_CATEGORY_ARCHIVED" if body.archived else "POST_CATEGORY_RESTORED", category_id)
    db.commit()
    return _categories_payload(db)


def newsroom_slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.casefold()).strip("-")[:40].strip("-")


# --- series --------------------------------------------------------------------------------------

def _public_episode_count(db: Session, series_id: str, pol: newsroom.Policy, now: float) -> int:
    return len(newsroom._public_rows(db, now, pol=pol, series_id=series_id))


def series_payload(row: M.PostSeries, db: Session, *, admin: bool = False, pol: newsroom.Policy | None = None) -> dict:
    refs = newsroom.Refs({c.id: c for c in db.scalars(select(M.PostCategory))}, {})
    out = {"id": row.id, "slug": row.slug, "name": row.name, "summary": row.summary, "template": row.template,
           "hue": row.hue, "category": newsroom.category_view(row.category_id, refs), "sample": bool(row.sample),
           "path": f"/series/{row.slug}"}
    if admin:
        out.update({"categoryId": row.category_id, "autopilotKey": row.autopilot_key, "episodeCount": row.episode_count,
                    "library": list(row.library or []), "archived": bool(row.archived)})
    else:
        out["episodes"] = _public_episode_count(db, row.id, pol or newsroom.policy(db), time.time())
    return out


@router.get("/series")
def public_series(response: Response, db: Session = Depends(workflow_db)) -> dict:
    """Every series with at least one public episode."""
    pol = newsroom.policy(db)
    rows = db.scalars(select(M.PostSeries).where(M.PostSeries.archived.is_(False)).order_by(M.PostSeries.name)).all()
    items = [series_payload(r, db, pol=pol) for r in rows]
    _cache(response, db)
    return {"items": [i for i in items if i["episodes"]]}


@router.get("/series/{slug}")
def public_series_page(slug: str, response: Response, page: int = Query(1, ge=1, le=1000),
                       db: Session = Depends(workflow_db)) -> dict:
    """One series and its public episodes, newest first."""
    row = db.scalar(select(M.PostSeries).where(M.PostSeries.slug == slug))
    if row is None or row.archived:
        raise HTTPException(404, "This series is not published.")
    pol = newsroom.policy(db)
    rows = newsroom._public_rows(db, time.time(), pol=pol, series_id=row.id)
    if not rows:
        raise HTTPException(404, "This series is not published.")
    size = int(setting("newsroom.page_size", db))
    shown = rows[(page - 1) * size: page * size]
    names = newsroom._names(db, {r.author_id for r in shown} | {r.reviewed_by or "" for r in shown})
    refs = newsroom.load_refs(db, shown)
    _cache(response, db)
    return {"series": series_payload(row, db, pol=pol), "items": [newsroom.teaser(r, db, names, pol, refs) for r in shown],
            "total": len(rows), "page": page, "pageSize": size}


class LibraryEntry(StrictModel):
    """One Monday Motivation line: the team's own words, or a quote with its author and a public-domain source."""
    kind: Literal["own", "quote"]
    text: str = Field(min_length=3, max_length=300)
    cite: str = Field(default="", max_length=120)
    sourceUrl: str = Field(default="", max_length=500)
    publicDomain: bool = False


class SeriesInput(StrictModel):
    slug: str = Field(default="", max_length=80)
    name: str = Field(min_length=2, max_length=80)
    summary: str = Field(default="", max_length=300)
    categoryId: str = Field(default="", max_length=40)
    template: newsroom.Template = "SERIES_EPISODE"
    hue: str = Field(max_length=12)
    library: list[LibraryEntry] = Field(default_factory=list, max_length=LIBRARY_MAX)

    @field_validator("hue")
    @classmethod
    def known_hue(cls, value: str) -> str:
        if value not in HUES:
            raise ValueError("Pick a cover colour from the palette.")
        return value


def _library(entries: list[LibraryEntry]) -> list[dict]:
    """A quote needs who said it, an https source and the public-domain mark; nothing is ever attributed blind."""
    out = []
    for entry in entries:
        text = " ".join(entry.text.split())
        if entry.kind == QUOTE and (not entry.cite.strip() or not entry.sourceUrl.startswith("https://")
                                    or not entry.publicDomain):
            raise HTTPException(422, "A quote needs who said it, an https link to a public-domain source, and the "
                                     "public-domain box ticked. Otherwise write it as the team's own words.")
        out.append({"kind": entry.kind, "text": text, "cite": " ".join(entry.cite.split()) if entry.kind == QUOTE else "",
                    "sourceUrl": entry.sourceUrl.strip() if entry.kind == QUOTE else "",
                    "publicDomain": entry.publicDomain if entry.kind == QUOTE else False})
    return out


def _admin_series(db: Session) -> dict:
    rows = db.scalars(select(M.PostSeries).order_by(M.PostSeries.archived, M.PostSeries.name)).all()
    return {"items": [series_payload(r, db, admin=True) for r in rows], "hues": list(HUES)}


@router.get("/ops/post-series")
def admin_series(user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    if ensure_defaults(db):
        db.commit()
    return _admin_series(db)


def _check_series_category(db: Session, category_id: str) -> None:
    ensure_defaults(db)
    if category_id and (db.get(M.PostCategory, category_id) is None):
        raise HTTPException(422, "Pick the series' category from the list.")


@router.post("/ops/post-series", status_code=201)
def create_series(body: SeriesInput, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    slug = body.slug or newsroom_slug(body.name)
    if not newsroom.SLUG.fullmatch(slug) or len(slug) < newsroom.SLUG_MIN:
        raise HTTPException(422, "Use lowercase letters, numbers and single hyphens for the address.")
    if db.scalar(select(M.PostSeries.id).where(M.PostSeries.slug == slug)):
        raise HTTPException(409, "Another series already uses this address.")
    _check_series_category(db, body.categoryId)
    now = time.time()
    row = M.PostSeries(id=uuid.uuid4().hex, slug=slug, name=" ".join(body.name.split()), summary=body.summary.strip(),
                       category_id=body.categoryId, template=body.template, hue=body.hue, autopilot_key="",
                       episode_count=0, library=_library(body.library), archived=False, sample=False, created_at=now,
                       updated_by=user["id"], updated_at=now)
    db.add(row)
    _audit(db, user, "POST_SERIES_CREATED", row.id)
    db.commit()
    return _admin_series(db)


def _series_or_404(db: Session, series_id: str) -> M.PostSeries:
    row = db.get(M.PostSeries, series_id)
    if row is None:
        raise HTTPException(404, "Series not found.")
    return row


@router.put("/ops/post-series/{series_id}")
def update_series(series_id: str, body: SeriesInput, user: dict = Depends(require_super_admin),
                  db: Session = Depends(workflow_db)) -> dict:
    """Rename, restyle or edit the library. The address (slug) and the episode numbering stay."""
    row = _series_or_404(db, series_id)
    _check_series_category(db, body.categoryId)
    row.name, row.summary, row.category_id = " ".join(body.name.split()), body.summary.strip(), body.categoryId
    row.template, row.hue, row.library = body.template, body.hue, _library(body.library)
    row.updated_by, row.updated_at = user["id"], time.time()
    _audit(db, user, "POST_SERIES_EDITED", row.id)
    db.commit()
    return _admin_series(db)


@router.post("/ops/post-series/{series_id}/archive")
def archive_series(series_id: str, body: ArchiveInput, user: dict = Depends(require_super_admin),
                   db: Session = Depends(workflow_db)) -> dict:
    row = _series_or_404(db, series_id)
    row.archived, row.updated_by, row.updated_at = body.archived, user["id"], time.time()
    _audit(db, user, "POST_SERIES_ARCHIVED" if body.archived else "POST_SERIES_RESTORED", row.id)
    db.commit()
    return _admin_series(db)


# --- share links, caption, cards ------------------------------------------------------------------------

def site() -> str:
    return f"https://{app_domain()}"


def tagged_url(url: str, channel: str, db: Session, series_slug: str = "") -> str:
    """The post's address with utm_source (the network), utm_medium and utm_campaign from the settings."""
    if setting("content.share_utm_enabled", db) is not True:
        return url
    campaign = str(setting("content.share_utm_campaign", db))
    if series_slug:
        campaign = f"{campaign}-{series_slug}"
    query = urlencode({"utm_source": channel, "utm_medium": str(setting("content.share_utm_medium", db)),
                       "utm_campaign": campaign})
    return f"{url}?{query}"


def share_link(channel: str, url: str, title: str, summary: str = "") -> str:
    """The plain share address of one network: no script, pixel or SDK, and nothing about the reader."""
    base = SHARE_ENDPOINTS[channel]
    if channel == "linkedin":
        return f"{base}?url={quote(url, safe='')}"
    if channel == "whatsapp":
        return f"{base}?text={quote(f'{title} {url}', safe='')}"
    if channel == "x":
        return f"{base}?url={quote(url, safe='')}&text={quote(title, safe='')}"
    if channel == "facebook":
        return f"{base}?u={quote(url, safe='')}"
    if channel == "telegram":
        return f"{base}?url={quote(url, safe='')}&text={quote(title, safe='')}"
    body = f"{summary}\n\n{url}" if summary else url
    return f"{base}?subject={quote(title, safe='')}&body={quote(body, safe='')}"


def hashtags(db: Session, category: M.PostCategory | None) -> list[str]:
    most = int(setting("content.caption_hashtags_max", db))
    brand = str(setting("content.caption_brand_hashtag", db)).strip().lstrip("#")
    tags = list(category.hashtags or []) if category else []
    tags = list(dict.fromkeys([*tags[:max(0, most - 1)], *([brand] if brand else [])]))
    return [f"#{t}" for t in tags[:most]]


def linkedin_caption(row: M.Post, db: Session, url: str) -> str:
    """Title, summary, the crisis lines where the category carries them, the link and the hashtags."""
    category = db.get(M.PostCategory, row.category_id) if row.category_id else None
    view = newsroom.category_view(row.category_id, newsroom.Refs({category.id: category} if category else {}, {}))
    parts = [row.title, row.summary]
    if view and view["crisisLines"]:
        parts.append(COPY["captionCrisis"])
    parts.append(f"{COPY['captionReadMore']} {url}")
    tags = hashtags(db, category)
    if tags:
        parts.append(" ".join(tags))
    return "\n\n".join(p for p in parts if p)


def _series_slug(db: Session, row: M.Post) -> str:
    series = db.get(M.PostSeries, row.series_id) if row.series_id else None
    return series.slug if series else ""


@router.get("/ops/posts/{post_id}/share-kit")
def share_kit(post_id: str, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Everything to share one post by hand: links per network, the LinkedIn caption, the two card images."""
    row = newsroom._row_or_404(db, post_id)
    url = f"{site()}{newsroom.post_path(row)}"
    series = _series_slug(db, row)
    links = {channel: share_link(channel, tagged_url(url, channel, db, series), row.title, row.summary)
             for channel in SHARE_ENDPOINTS}
    linkedin_url = tagged_url(url, "linkedin", db, series)
    return {"postId": row.id, "url": url, "live": newsroom.is_public(row, time.time(), newsroom.policy(db)),
            "links": links, "urls": {channel: tagged_url(url, channel, db, series) for channel in CHANNELS},
            "caption": linkedin_caption(row, db, linkedin_url),
            "cards": {fmt: f"/api/ops/posts/{row.id}/card.png?format={fmt}" for fmt in newsroom_cover.FORMATS}}


@router.get("/ops/posts/{post_id}/card.png")
def share_card(post_id: str, format: Literal["landscape", "portrait"] = "landscape",   # noqa: A002 — the query name
               user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> Response:
    """A share card to download: 1200x630 or 1080x1350, drawn from the post's cover (works before publishing)."""
    row = newsroom._row_or_404(db, post_id)
    png = newsroom_cover.render_png(row.template, newsroom.TEMPLATES[row.template]["label"], row.title, app_domain(),
                                    hue=newsroom.series_hue(db, row), fmt=format, summary=row.summary)
    name = f"{row.slug}-{format}.png"
    return Response(png, media_type="image/png", headers={
        "Cache-Control": "private, no-store", "Content-Disposition": f'attachment; filename="{name}"'})


# --- link previews for crawlers -------------------------------------------------------------------------

def preview_html(row: M.Post, db: Session) -> str:
    """A small HTML page whose head carries the post's Open Graph and Twitter tags (for link-preview crawlers)."""
    section = newsroom.SECTION_PATHS[row.section]
    url = f"{site()}{newsroom.post_path(row)}"
    image = f"{site()}/api/posts/{section}/{row.slug}/og.png"
    title = escape(row.seo_title or row.title)
    description = escape(row.seo_description or row.summary)
    brand = escape(brand_name())
    published = newsroom._iso(row.publish_at) or ""
    meta = [
        ("name", "description", description), ("property", "og:type", "article"),
        ("property", "og:site_name", brand), ("property", "og:title", title),
        ("property", "og:description", description), ("property", "og:url", escape(url)),
        ("property", "og:image", escape(image)), ("property", "og:image:width", "1200"),
        ("property", "og:image:height", "630"), ("property", "og:image:alt", escape(row.cover_alt)),
        ("property", "article:published_time", published), ("name", "twitter:card", "summary_large_image"),
        ("name", "twitter:title", title), ("name", "twitter:description", description),
        ("name", "twitter:image", escape(image)),
    ]
    tags = "".join(f'<meta {attr}="{key}" content="{value}">' for attr, key, value in meta if value)
    return ("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
            f"<title>{title} · {brand}</title><link rel=\"canonical\" href=\"{escape(url)}\">{tags}</head>"
            f"<body><h1>{escape(row.title)}</h1><p>{escape(row.summary)}</p>"
            f"<p><a href=\"{escape(url)}\">{escape(COPY['previewReadOn'])}</a></p></body></html>")


@router.get("/posts/{section}/{slug}/preview.html")
def link_preview(section: newsroom.SectionPath, slug: str, db: Session = Depends(workflow_db)) -> Response:
    row = newsroom._public_post(db, section, slug)
    return Response(preview_html(row, db), media_type="text/html; charset=utf-8", headers={
        "Cache-Control": f"public, max-age={int(setting('newsroom.public_cache_seconds', db))}",
        "X-Robots-Tag": "noindex"})


# --- counts ------------------------------------------------------------------------------------------------

class HitInput(StrictModel):
    kind: Literal["view", "share"]
    channel: str = Field(default="", max_length=20)


@router.post("/posts/{section}/{slug}/hit", status_code=204)
def hit(section: newsroom.SectionPath, slug: str, body: HitInput, db: Session = Depends(workflow_db)) -> Response:
    """Count a view or a share of a public post. Nothing about the reader is kept: not who, where, or when."""
    if setting("content.stats_enabled", db) is not True:
        return Response(status_code=204)
    row = newsroom._public_post(db, section, slug)
    if body.kind == "share" and body.channel not in CHANNELS:
        raise HTTPException(422, "Unknown share channel.")
    stat = db.get(M.PostStat, row.id)
    if stat is None:
        stat = M.PostStat(post_id=row.id, views=0, shares={})
        db.add(stat)
    if body.kind == "view":
        stat.views = (stat.views or 0) + 1
    else:
        shares = dict(stat.shares or {})
        shares[body.channel] = int(shares.get(body.channel, 0)) + 1
        stat.shares = shares
    db.commit()
    return Response(status_code=204)


@router.get("/ops/post-stats")
def stats(user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Views and shares per post (counts only), most viewed first."""
    limit = int(setting("content.list_max", db))
    rows = db.execute(select(M.Post, M.PostStat).join(M.PostStat, M.PostStat.post_id == M.Post.id)
                      .order_by(M.PostStat.views.desc(), M.Post.id).limit(limit)).all()
    items = [{"postId": post.id, "title": post.title, "path": newsroom.post_path(post), "status": post.status,
              "template": post.template, "auto": newsroom.is_auto(post), "views": stat.views or 0,
              "shares": dict(stat.shares or {}), "sharesTotal": sum(int(v) for v in (stat.shares or {}).values())}
             for post, stat in rows]
    return {"items": items, "channels": list(CHANNELS), "enabled": setting("content.stats_enabled", db) is True}


# --- composer help ---------------------------------------------------------------------------------------

def title_words(text: str) -> set[str]:
    return {w for w in WORD.findall(text.casefold()) if len(w) >= WORD_MIN_LETTERS}


def similarity(a: str, b: str) -> int:
    left, right = title_words(a), title_words(b)
    if not left or not right:
        return 0
    return round(PERCENT * len(left & right) / len(left | right))


@router.get("/ops/posts-similar")
def similar(title: str = Query(min_length=3, max_length=160), exclude: str = Query("", max_length=64),
            user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Recent posts whose title is close to this one: the composer's duplicate-topic warning."""
    since = time.time() - int(setting("content.duplicate_window_days", db)) * DAY
    least = int(setting("content.duplicate_similarity", db))
    rows = db.scalars(select(M.Post).where(M.Post.updated_at >= since, M.Post.id != exclude)
                      .order_by(M.Post.updated_at.desc()).limit(int(setting("content.list_max", db)))).all()
    found = sorted(((similarity(title, r.title), r) for r in rows), key=lambda pair: -pair[0])
    return {"items": [{"id": r.id, "title": r.title, "path": newsroom.post_path(r), "status": r.status, "similarity": score}
                      for score, r in found if score >= least][:SIMILAR_MAX]}
