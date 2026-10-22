"""
services.help_pack — StudentKare's own help articles, published for Agent Ayush.

The articles live in version control (``backend/content/ayush_help/*.md``), are
reviewed in pull requests like code, and describe only how the product works —
never clinical advice. Clinical topics are the clinical team's, added from
Super admin → Knowledge.

``publish_help_pack`` is idempotent and safe to run on every start:

* a new article is published as category ``PRODUCT_HELP``, reviewed, version 1;
* a changed article (title, text, or a price it quotes from the settings registry)
  is updated in place as the next version;
* an unchanged article is left alone;
* an article an admin edited in the Knowledge screen, or unpublished there, is not
  touched (``force=True`` from the command restores the pack's text);
* an article deleted from the folder is unpublished.

Each article expires a year after the ``reviewed`` date in its header, so the pack
has to be looked at again at least yearly (the knowledge freshness job reports what
is expiring). Values such as prices are written as ``{{setting:key}}`` and filled
from ``core.settings_registry`` at publish time, so the help never disagrees with the
price the server charges.

HTML comments in an article (the code each article was written from) are stripped
before publishing.

An article's ``keywords:`` header lists the words and phrases students use for its
topic ("talk to a doctor", "otp not received", Hinglish "dawai"). They are never
published or quoted: ``retrieval_keywords`` hands them to retrieval
(``services.vector_store``) as extra terms for the article, so a paraphrase finds the
right article without the article's text having to carry every synonym.
"""
from __future__ import annotations

import functools
import os
import re
import time
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import select

from core import workflow_models as M
from core.settings_registry import setting

PACK_DIR = Path(__file__).resolve().parents[1] / "content" / "ayush_help"
CATEGORY = "PRODUCT_HELP"
AUTHOR = "StudentKare platform team (help pack)"
ID_PREFIX = "kb_help_"
REVIEW_VALID_DAYS = 365
SECONDS_PER_DAY = 86400
MAX_CONTENT_CHARS = 4000  # care_knowledge_sources.content
MAX_TITLE_CHARS = 180
ACTOR = "system:help-pack"
NOON_HOUR = 12
MAX_KEYWORD_CHARS = 60

_FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_PLACEHOLDER = re.compile(r"\{\{\s*setting:([a-z0-9_.]+)(?:\|([a-z]+))?\s*\}\}")
_SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{1,40}$")


class HelpPackError(ValueError):
    """An article that cannot be published as written. The whole load stops."""


@dataclass(frozen=True)
class Article:
    slug: str
    title: str
    reviewed: date
    body: str  # with placeholders, comments removed
    path: Path
    keywords: tuple[str, ...] = ()  # retrieval only, never published

    @property
    def source_id(self) -> str:
        return f"{ID_PREFIX}{self.slug}"


def autoload_enabled() -> bool:
    """``AYUSH_HELP_PACK_AUTOLOAD`` (default on): publish the pack at startup."""
    return os.getenv("AYUSH_HELP_PACK_AUTOLOAD", "true").strip().lower() not in {"0", "false", "no", "off"}


def parse(path: Path) -> Article:
    text = path.read_text(encoding="utf-8")
    match = _FRONT_MATTER.match(text)
    if not match:
        raise HelpPackError(f"{path.name}: missing the --- header ---")
    header: dict[str, str] = {}
    for line in match.group(1).splitlines():
        key, _, value = line.partition(":")
        if key.strip():
            header[key.strip()] = value.strip()
    slug, title = header.get("id", ""), header.get("title", "")
    if not _SLUG.match(slug):
        raise HelpPackError(f"{path.name}: id must be lower-case words joined by hyphens")
    if not title or len(title) > MAX_TITLE_CHARS:
        raise HelpPackError(f"{path.name}: title is missing or too long")
    try:
        reviewed = date.fromisoformat(header.get("reviewed", ""))
    except ValueError as exc:
        raise HelpPackError(f"{path.name}: reviewed must be a date, YYYY-MM-DD") from exc
    body = _COMMENT.sub("", text[match.end():])
    body = "\n\n".join(part.strip() for part in body.split("\n\n") if part.strip())
    keywords = tuple(word.strip().lower() for word in header.get("keywords", "").split(",") if word.strip())
    if any(len(word) > MAX_KEYWORD_CHARS for word in keywords):
        raise HelpPackError(f"{path.name}: a keyword is longer than {MAX_KEYWORD_CHARS} characters")
    return Article(slug=slug, title=title, reviewed=reviewed, body=body, path=path, keywords=keywords)


def load_articles(directory: Path = PACK_DIR) -> list[Article]:
    articles = [parse(path) for path in sorted(directory.glob("*.md"))]
    slugs = [article.slug for article in articles]
    if len(slugs) != len(set(slugs)):
        raise HelpPackError("two articles share an id")
    return articles


@functools.lru_cache(maxsize=4)
def _keywords_in(directory: Path) -> dict[str, tuple[str, ...]]:
    try:
        return {article.source_id: article.keywords for article in load_articles(directory) if article.keywords}
    except (HelpPackError, OSError):
        return {}  # a broken pack must not break retrieval; the loader reports it


def retrieval_keywords(directory: Path = PACK_DIR) -> dict[str, tuple[str, ...]]:
    """Source id -> the article's keywords, for retrieval. Read once per process."""
    return _keywords_in(directory)


def _format(value, how: str | None) -> str:
    if how is None:
        return str(value)
    if how == "inr":
        return f"₹{int(value):,}"
    if how == "time":
        hours, minutes = divmod(int(value), 60)
        suffix = "AM" if hours < NOON_HOUR else "PM"
        return f"{(hours % 12) or 12}:{minutes:02d} {suffix}"
    raise HelpPackError(f"unknown format |{how}")


def render(article: Article, db=None) -> str:
    """The article's text with every ``{{setting:key}}`` filled from the registry."""
    def fill(match: re.Match) -> str:
        return _format(setting(match.group(1), db), match.group(2))
    content = _PLACEHOLDER.sub(fill, article.body)
    if "{{" in content:
        raise HelpPackError(f"{article.path.name}: a placeholder was not understood")
    if len(content) > MAX_CONTENT_CHARS:
        raise HelpPackError(f"{article.path.name}: longer than {MAX_CONTENT_CHARS} characters")
    return content


def _expires_at(article: Article) -> float:
    reviewed = datetime(article.reviewed.year, article.reviewed.month, article.reviewed.day, tzinfo=timezone.utc)
    return reviewed.timestamp() + REVIEW_VALID_DAYS * SECONDS_PER_DAY


def publish_help_pack(db, *, force: bool = False, directory: Path = PACK_DIR) -> dict:
    """Publish the pack. Idempotent. Commits, then brings Ayush's index up to date."""
    articles = load_articles(directory)
    rendered = {article.source_id: (article, render(article, db)) for article in articles}
    counts = {"created": 0, "updated": 0, "unchanged": 0, "skippedEdited": 0, "skippedWithdrawn": 0, "retired": 0}
    now = time.time()

    for source_id, (article, content) in rendered.items():
        row = db.get(M.KnowledgeSource, source_id)
        if row is None:
            db.add(M.KnowledgeSource(
                id=source_id, title=article.title, category=CATEGORY, content=content, author=AUTHOR,
                version=1, reviewed=True, active=True, created_at=now, expires_at=_expires_at(article)))
            counts["created"] += 1
            continue
        if not force and row.author != AUTHOR:
            counts["skippedEdited"] += 1  # an admin edited it; theirs now
            continue
        if not force and not row.active:
            counts["skippedWithdrawn"] += 1  # an admin unpublished it
            continue
        changed = (row.title, row.content, row.category) != (article.title, content, CATEGORY)
        if changed:
            row.title, row.content, row.category = article.title, content, CATEGORY
            row.version += 1
            counts["updated"] += 1
        elif row.active and row.author == AUTHOR and row.expires_at == _expires_at(article):
            counts["unchanged"] += 1
            continue
        row.author, row.reviewed, row.active = AUTHOR, True, True
        row.expires_at = _expires_at(article)

    # An article removed from the folder is withdrawn, not left answering.
    for row in db.scalars(select(M.KnowledgeSource).where(
            M.KnowledgeSource.id.like(f"{ID_PREFIX}%"), M.KnowledgeSource.author == AUTHOR,
            M.KnowledgeSource.active.is_(True))).all():
        if row.id not in rendered:
            row.active = False
            counts["retired"] += 1

    changed_total = counts["created"] + counts["updated"] + counts["retired"]
    if changed_total:
        db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=ACTOR, action="KNOWLEDGE_HELP_PACK_PUBLISHED",
                               resource_id=f"{counts['created']}c/{counts['updated']}u/{counts['retired']}r",
                               created_at=now))
    db.commit()

    from services import vector_store
    synced = vector_store.sync_index(db)
    return {**counts, "articles": len(articles), "indexed": synced["indexed"], "embedder": synced["embedder"]}


def pack_status(db) -> dict:
    """How much of the pack is live, for the admin health card."""
    try:
        total = len(load_articles())
    except HelpPackError:
        total = 0
    live = db.scalars(select(M.KnowledgeSource.id).where(
        M.KnowledgeSource.id.like(f"{ID_PREFIX}%"), M.KnowledgeSource.active.is_(True))).all()
    return {"articles": total, "published": len(live)}
