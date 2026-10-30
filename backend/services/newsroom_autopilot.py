"""The content autopilot: News from official feeds, and the week's Blog plan, posted on a schedule.

Off until a super admin turns a lane on (settings ``autopilot.*``); the
``autopilot.kill_switch`` setting stops everything at once. It runs as the
scheduled job ``content_autopilot`` (services/workflow_scheduler.py) every
JOB_INTERVAL_SECONDS. Times are in ``platform.default_timezone`` (IST).

**News (instant, up to ``autopilot.news_per_day`` a day).** Each pass inside the
posting window reads the allow-listed feeds (backend/content/newsroom/autopilot.json:
a feed address must stay on its publisher's hosts, https only), keeps every new
item once (deduplicated by its normalised link), refuses items that carry a
block word (people, deaths, crime) or are too old, scores the rest for students
(``autopilot.relevance_keywords``) and posts the best one, at most one a pass and
``autopilot.news_min_gap_minutes`` apart. The post is a Campus news post: our
own short headline and a two- or three-sentence summary of that item, the
source named and linked with its date, tagged Auto. The words come from the
source: the configured on-prem model may rephrase them (through the AI
constitution, Rule-A), and its text is used only if every sentence is grounded
in the item (no new number, name or negation; services/agent_ayush.py checks),
it is short enough and safe; otherwise the source's own title and first
sentences are used. An item with no text of its own is not summarised.

**Blog (``autopilot.blog_posts_per_week`` on ``autopilot.blog_days``).** Each slot
is drafted ``autopilot.blog_lead_hours`` early and scheduled for its time. A
slot is either a health tip on the next topic of the plan, written only from
approved knowledge sources about it (none, no post), or a round-up of the
week's What's new posts (their own titles and summaries). **A health tip is
public only once a clinician approves it** (services/newsroom.py, no bypass);
the autopilot notifies the clinicians and it waits in their queue.

**Precision gate (services/newsroom_precision.py).** Every draft is scored:
each sentence must be traceable to the item's own text (numbers, dates and
names included), with no advice or unverifiable claim, from an allow-listed,
recent, dated source. At or above ``content.precision_threshold`` a post goes out
on its own (news, when ``autopilot.news_auto_publish``); below it waits in
Content, Review with each failed sentence and why. Health content waits for a
clinician while ``content.health_requires_clinician`` is on, however precise.

**Aggregator.** The feeds are read round the clock, every
``autopilot.fetch_interval_minutes``; each new item is classified into a
category by the categories' keywords. Posting stays inside the news window.
The series scheduler (services/newsroom_series.py) runs in the same job.

**Safety.** Rate caps per lane and per day, length limits, no images (the
template cover only), nothing about a person, every post audited
(``care_post_events``, actor ``autopilot``) and tagged Auto. In development and
test builds every auto post is a sample (``sample`` and a "Sample:" title).
A failing feed raises an ops alert after ``autopilot.source_failures_before_alert``
failures in a row. Item text is public already; nothing here reads or writes
anything about a student (Rule L, platform plane).
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import time
import unicodedata
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

import httpx
from defusedxml import ElementTree as SafeET
from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.app_env import is_dev_or_test
from core.settings_registry import setting
from services import agent_ayush, llm_gateway, newsroom, newsroom_precision, ops_feed, vector_store
from services.integration_config import brand_name
from services.workflow_auth import StrictModel, require_super_admin, workflow_db

router = APIRouter(prefix="/api", tags=["Newsroom autopilot"])

JOB_KEY = "content_autopilot"
JOB_INTERVAL_SECONDS = 900

CONTENT = json.loads((Path(__file__).resolve().parents[1] / "content" / "newsroom" / "autopilot.json").read_text("utf-8"))
SOURCES: dict[str, dict] = {source["id"]: source for source in CONTENT["sources"]}
COPY: dict[str, str] = CONTENT["copy"]

NEWS, BLOG = "NEWS", "BLOG"
SEEN, SKIPPED, POSTED, HELD, FAILED = "SEEN", "SKIPPED", "POSTED", "HELD", "FAILED"
ACTOR = {"id": "autopilot", "role": "AUTOPILOT"}
NEWS_TEMPLATE, TIP_TEMPLATE, ROUNDUP_TEMPLATE = "CAMPUS_NEWS", "HEALTH_TIP", "STORY"
DAYS = ("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN")
HOUR, DAY, WEEK = 3600, 86400, 7 * 86400
MAX_REDIRECTS = 3
TITLE_MAX, EXCERPT_MAX, REASON_MAX, URL_MAX, TOPIC_MAX, FACT_MAX, HEADING_MAX = 300, 2000, 200, 1000, 60, 200, 120
SUMMARY_SENTENCES = 3
HEADLINE_MIN = 12
SLUG_BASE_MAX = 60
TRACKING = re.compile(r"^(utm_|fbclid$|gclid$|mc_eid$|mc_cid$)")
TAGS = re.compile(r"<[^>]+>")
SPACE = re.compile(r"\s+")
SENTENCE = re.compile(r"(?<=[.!?])\s+")
CITATION = re.compile(r"\s*\[\d{1,2}\]")
NUMBER = re.compile(r"\d+(?:[.,]\d+)?")
CAPITALISED = re.compile(r"\b[A-Z][\w'-]*")
QUOTES = ('"', "“", "”")
NEWS_RULE = "Rule-A"
MODEL_DECLINED = "NO_ANSWER"

NEWS_INSTRUCTIONS = (
    "TASK: Write a short news headline and a two- or three-sentence summary of the numbered source "
    "passage for university students in India.\n"
    "- Use ONLY facts stated in the passage. Do not add any fact, number, date, name, quote, advice, "
    "diagnosis, medicine or dose, and do not use your own knowledge.\n"
    "- Keep the passage's meaning exactly, including every 'not' or 'never'. Do not quote anyone.\n"
    "- Reply in exactly two lines:\n"
    "HEADLINE: <the headline, at most {limit} characters>\n"
    "SUMMARY: <two or three sentences, each ending with [1]>\n"
    f"- If the passage is about a specific person or patient, or you cannot do this, reply exactly {MODEL_DECLINED}."
)


class FeedError(RuntimeError):
    """A feed could not be read or parsed. The message is an error class, never feed text."""


# --- clock ------------------------------------------------------------------------------

def zone(db: Session) -> ZoneInfo:
    try:
        return ZoneInfo(str(setting("platform.default_timezone", db)))
    except Exception:  # noqa: BLE001 — an unknown zone name falls back to UTC, never a crash
        return ZoneInfo("UTC")


def local(now: float, tz: ZoneInfo) -> datetime:
    return datetime.fromtimestamp(now, tz)


def day_start(now: float, tz: ZoneInfo) -> float:
    at = local(now, tz)
    return at.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()


# --- settings helpers ---------------------------------------------------------------------

def phrases(raw: str) -> list[str]:
    """A comma-separated setting as clean, lower-case phrases."""
    return [" ".join(part.casefold().split()) for part in (raw or "").split(",") if part.strip()]


def blog_days(raw: str) -> list[int]:
    """Weekday numbers (Monday 0) of the configured days, in week order; unknown names are ignored."""
    names = {name.strip().upper()[:3] for name in (raw or "").split(",")}
    return [index for index, name in enumerate(DAYS) if name in names]


def _contains(text: str, phrase: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", text) is not None


def relevance(title: str, excerpt: str, keywords: list[str]) -> int:
    """Each keyword counts twice when it is in the title, once when only in the text."""
    head, body = title.casefold(), excerpt.casefold()
    return sum(2 if _contains(head, k) else 1 if _contains(body, k) else 0 for k in keywords)


def blocked_word(text: str, words: list[str]) -> str | None:
    folded = text.casefold()
    return next((word for word in words if _contains(folded, word)), None)


# --- sources -----------------------------------------------------------------------------------

def source_url(source_id: str, db: Session) -> str:
    return str(setting(f"autopilot.source.{source_id}.url", db) or "").strip()


def source_enabled(source_id: str, db: Session) -> bool:
    return setting(f"autopilot.source.{source_id}.enabled", db) is True


def check_url(url: str, hosts: list[str]) -> str:
    """The URL if it is https on one of the source's hosts; FeedError otherwise (no SSRF, no plain http)."""
    try:
        parts = urlsplit(url)
    except ValueError:
        raise FeedError("BadUrl") from None
    if parts.scheme != "https" or parts.username or parts.password or parts.port not in (None, 443):
        raise FeedError("NotHttpsOnSourceHost")
    if (parts.hostname or "").lower() not in hosts:
        raise FeedError("OffSourceHost")
    return url


def _http_get(url: str, *, hosts: list[str], timeout: float, max_bytes: int) -> bytes:
    """GET a feed: https on the source's hosts only (redirects too), capped in size and time."""
    headers = {"User-Agent": f"{brand_name()} newsroom autopilot",
               "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8"}
    with httpx.Client(timeout=timeout, follow_redirects=False, headers=headers) as client:
        for _ in range(MAX_REDIRECTS + 1):
            check_url(url, hosts)
            with client.stream("GET", url) as response:
                if response.is_redirect:
                    url = urljoin(url, response.headers.get("location", ""))
                    continue
                response.raise_for_status()
                data = bytearray()
                for chunk in response.iter_bytes():
                    data += chunk
                    if len(data) > max_bytes:
                        raise FeedError("FeedTooLarge")
                return bytes(data)
    raise FeedError("TooManyRedirects")


# The transport. Replaced in tests with fixtures; nothing else should touch it.
_fetch: Callable[..., bytes] = _http_get


def clean_text(raw: str | None, limit: int) -> str:
    """Plain text from a feed field: markup removed, entities decoded, whitespace collapsed."""
    text = html.unescape(TAGS.sub(" ", html.unescape(raw or "")))
    text = SPACE.sub(" ", newsroom.CONTROL.sub("", text)).strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0]


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _child(element: ET.Element, *names: str) -> ET.Element | None:
    for child in element:
        if _local_name(child.tag) in names:
            return child
    return None


def _text(element: ET.Element, *names: str) -> str:
    child = _child(element, *names)
    return "".join(child.itertext()) if child is not None else ""


def _date(raw: str) -> float:
    raw = (raw or "").strip()
    if not raw:
        return 0.0
    try:
        return parsedate_to_datetime(raw).timestamp()
    except (TypeError, ValueError, IndexError):
        pass
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def _atom_link(entry: ET.Element) -> str:
    for child in entry:
        if _local_name(child.tag) == "link" and child.get("rel", "alternate") == "alternate" and child.get("href"):
            return child.get("href", "")
    return ""


def parse_feed(data: bytes) -> list[dict]:
    """Entries of an RSS 2.0, RSS 1.0 (RDF) or Atom feed: title, link, the source's text, date.

    A document type declaration is refused before parsing (no entity expansion of any kind).
    """
    if b"<!doctype" in data.lower() or b"<!entity" in data.lower():
        raise FeedError("DoctypeRefused")
    try:
        root = SafeET.fromstring(data, forbid_dtd=True, forbid_entities=True, forbid_external=True)
    except Exception:  # noqa: BLE001 — a parse error, or defusedxml refusing an attack, is "not a feed"
        raise FeedError("NotXml") from None
    kind = _local_name(root.tag)
    if kind == "rss":
        channel = _child(root, "channel")
        entries = [e for e in (channel if channel is not None else []) if _local_name(e.tag) == "item"]
    elif kind == "RDF":
        entries = [e for e in root if _local_name(e.tag) == "item"]
    elif kind == "feed":
        entries = [e for e in root if _local_name(e.tag) == "entry"]
    else:
        raise FeedError("NotAFeed")
    items = []
    for entry in entries:
        if kind == "feed":
            link = _atom_link(entry)
            text = _text(entry, "summary") or _text(entry, "content")
            date = _date(_text(entry, "published") or _text(entry, "updated"))
        else:
            link = _text(entry, "link").strip()
            guid = _child(entry, "guid")
            if not link and guid is not None and guid.get("isPermaLink", "true") == "true":
                link = (guid.text or "").strip()
            text = _text(entry, "description") or _text(entry, "encoded") or _text(entry, "content")
            date = _date(_text(entry, "pubDate") or _text(entry, "date") or _text(entry, "updated"))
        title = clean_text(_text(entry, "title"), TITLE_MAX)
        if title and link:
            items.append({"title": title, "link": link.strip(), "excerpt": clean_text(text, EXCERPT_MAX),
                          "publishedAt": date})
    return items


def normalise_url(url: str) -> str:
    """One spelling per link: lower-case scheme and host, no fragment, no tracking parameters."""
    parts = urlsplit(url.strip())
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not TRACKING.match(k)])
    path = parts.path or "/"
    return urlunsplit((parts.scheme.lower(), (parts.netloc or "").lower(), path, query, ""))


def dedupe_key(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _health(db: Session, source_id: str) -> M.AutopilotSource:
    row = db.get(M.AutopilotSource, source_id)
    if row is None:
        row = M.AutopilotSource(source_id=source_id, last_fetch_at=0.0, last_ok_at=0.0, last_error="",
                                last_items=0, failures=0)
        db.add(row)
    return row


def _alert(db: Session, kind: str, summary: str, resource_id: str = "") -> None:
    """An ATTENTION event on the ops feed and, when Slack is set up, an ops alert. Never raises."""
    ops_feed.publish(db, kind, "ACCOUNT", severity="ATTENTION", summary=summary, actor_id=ACTOR["id"],
                     actor_role=ACTOR["role"], resource_type="autopilot", resource_id=resource_id)
    try:
        from services.slack_notifier import post_ops_alert
        post_ops_alert(f":newspaper: {summary}", kind="autopilot", purpose="ops")
    except Exception:  # noqa: BLE001, S110 — an alert never breaks the run
        pass


def fetch_due(db: Session, now: float) -> bool:
    """Whether ``autopilot.fetch_interval_minutes`` has gone by since the last read of any feed."""
    last = db.scalar(select(func.max(M.AutopilotSource.last_fetch_at))) or 0.0
    return now - last >= int(setting("autopilot.fetch_interval_minutes", db)) * 60


def classify(title: str, excerpt: str, categories: list[M.PostCategory]) -> str:
    """The category whose keywords the item matches most (twice in the title); the default news category if none."""
    best, best_score = "", 0
    for category in categories:
        hits = relevance(title, excerpt, [" ".join(k.casefold().split()) for k in category.keywords or []])
        if hits > best_score:
            best, best_score = category.id, hits
    return best or newsroom.CONTENT_DEFS["defaultNewsCategory"]


def _live_categories(db: Session) -> list[M.PostCategory]:
    from services.newsroom_content import ensure_defaults
    ensure_defaults(db)
    return list(db.scalars(select(M.PostCategory).where(M.PostCategory.archived.is_(False)).order_by(M.PostCategory.sort)))


def fetch_sources(db: Session, now: float) -> dict:
    """Read every enabled feed once; record new items (SEEN or SKIPPED with why, and their category) and each feed's
    health."""
    timeout = float(setting("autopilot.fetch_timeout_seconds", db))
    max_bytes = int(setting("autopilot.fetch_max_bytes", db))
    alert_after = int(setting("autopilot.source_failures_before_alert", db))
    max_age = int(setting("autopilot.news_max_age_hours", db)) * HOUR
    keywords = phrases(setting("autopilot.relevance_keywords", db))
    block = phrases(setting("autopilot.block_words", db))
    categories = _live_categories(db)
    result = {"sources": 0, "failed": [], "new": 0}
    for source_id, source in SOURCES.items():
        url = source_url(source_id, db)
        if not source_enabled(source_id, db) or not url:
            continue
        result["sources"] += 1
        health = _health(db, source_id)
        health.last_fetch_at = now
        try:
            entries = parse_feed(_fetch(check_url(url, source["hosts"]), hosts=source["hosts"], timeout=timeout,
                                        max_bytes=max_bytes))
        except Exception as exc:  # noqa: BLE001 — a failing feed is recorded, the others still run
            health.failures = (health.failures or 0) + 1
            health.last_error = (exc.args[0] if isinstance(exc, FeedError) and exc.args else type(exc).__name__)[:REASON_MAX]
            result["failed"].append(source_id)
            if health.failures == alert_after:
                _alert(db, "AUTOPILOT_SOURCE_FAILING",
                       f"Autopilot source {source_id} failed {health.failures} times in a row ({health.last_error}).",
                       source_id)
            continue
        health.failures, health.last_error, health.last_ok_at, health.last_items = 0, "", now, len(entries)
        result["new"] += _record_entries(db, source_id, source, entries, now, max_age, keywords, block, categories)
    db.flush()
    return result


def _record_entries(db: Session, source_id: str, source: dict, entries: list[dict], now: float, max_age: int,
                    keywords: list[str], block: list[str], categories: list[M.PostCategory]) -> int:
    added = 0
    seen: set[str] = set()   # this batch too: a session without autoflush would not see rows added above
    for entry in entries:
        try:
            link = normalise_url(check_url(entry["link"], source["hosts"]))
        except (FeedError, ValueError):
            continue   # a link off the publisher's own site is never followed or posted
        key = dedupe_key(link)
        if len(link) > URL_MAX or key in seen or db.scalar(select(M.AutopilotItem.id).where(M.AutopilotItem.dedupe_key == key)):
            continue
        seen.add(key)
        state, reason = SEEN, ""
        word = blocked_word(f"{entry['title']} {entry['excerpt']}", block)
        if word:
            state, reason = SKIPPED, f"Block word: {word}"
        elif entry["publishedAt"] and entry["publishedAt"] < now - max_age:
            state, reason = SKIPPED, "Older than the news age limit"
        elif not entry["excerpt"]:
            state, reason = SKIPPED, "The source gives no summary of its own"
        db.add(M.AutopilotItem(
            id=uuid.uuid4().hex, lane=NEWS, dedupe_key=key, source_id=source_id, source_url=link,
            title=entry["title"], excerpt=entry["excerpt"], published_at=entry["publishedAt"] or 0.0,
            relevance=relevance(entry["title"], entry["excerpt"], keywords), state=state, reason=reason[:REASON_MAX],
            category_id=classify(entry["title"], entry["excerpt"], categories), created_at=now, updated_at=now))
        added += 1
    return added


# --- writing -----------------------------------------------------------------------------------

def trim(text: str, limit: int) -> str:
    """At most ``limit`` characters, cut at a word with an ellipsis when it had to be cut."""
    text = SPACE.sub(" ", text).strip()
    if len(text) <= limit:
        return text
    return text[:limit - 1].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def first_sentences(text: str, limit: int, count: int = SUMMARY_SENTENCES) -> str:
    """The first whole sentences of ``text`` that fit ``limit`` (at least one, trimmed)."""
    sentences = [s.strip() for s in SENTENCE.split(SPACE.sub(" ", text).strip()) if s.strip()]
    out = ""
    for sentence in sentences[:count]:
        joined = f"{out} {sentence}".strip()
        if len(joined) > limit:
            break
        out = joined
    return out or trim(sentences[0] if sentences else "", limit)


def _names_grounded(text: str, evidence: str) -> bool:
    """Every capitalised word not opening a sentence is in the evidence (no new name)."""
    folded = evidence.casefold()
    for sentence in SENTENCE.split(text):
        for index, match in enumerate(CAPITALISED.finditer(sentence)):
            if index == 0 and match.start() == 0:
                continue
            if match.group(0).casefold() not in folded:
                return False
    return True


def _safe(text: str, block: list[str]) -> bool:
    return agent_ayush.output_is_safe(text) and blocked_word(text, block) is None and not any(q in text for q in QUOTES)


def headline_is_grounded(headline: str, evidence: str) -> bool:
    if not set(NUMBER.findall(headline)) <= set(NUMBER.findall(evidence)):
        return False
    return vector_store.support(headline, evidence) >= agent_ayush.REPHRASE_MIN_SUPPORT and _names_grounded(headline, evidence)


def parse_model_reply(reply: str) -> tuple[str, str] | None:
    headline = summary = ""
    for line in reply.splitlines():
        label, _, value = line.partition(":")
        if label.strip().upper() == "HEADLINE":
            headline = value.strip()
        elif label.strip().upper() == "SUMMARY":
            summary = value.strip()
    return (headline, summary) if headline and summary else None


def model_news(title: str, excerpt: str, headline_max: int, summary_max: int, block: list[str]) -> tuple[tuple[str, str] | None, str]:
    """((headline, summary), "rephrased") when the model's text passes every check, else (None, "fallback:<why>")."""
    passages = [{"title": title, "content": excerpt}]
    try:
        reply = llm_gateway.invoke(agent_ayush.build_rephrase_prompt("Summarise this news item.", passages),
                                   rule_id=NEWS_RULE, instructions=NEWS_INSTRUCTIONS.format(limit=headline_max))
    except Exception as exc:  # noqa: BLE001 — every failure uses the source's own words
        return None, f"fallback:{agent_ayush._fallback_reason(exc)}"
    if reply.strip() == MODEL_DECLINED:
        return None, "fallback:declined"
    parsed = parse_model_reply(reply)
    if parsed is None:
        return None, "fallback:format"
    headline, cited = parsed
    summary = CITATION.sub("", cited).strip()
    evidence = f"{title}. {excerpt}"
    sentences = [s for s in SENTENCE.split(summary) if s.strip()]
    if not (HEADLINE_MIN <= len(headline) <= headline_max) or len(summary) > summary_max or len(sentences) > SUMMARY_SENTENCES:
        return None, "fallback:length"
    if not (_safe(headline, block) and _safe(summary, block)):
        return None, "fallback:unsafe"
    if not (agent_ayush.rephrasing_is_grounded(cited, passages) and headline_is_grounded(headline, evidence)
            and _names_grounded(summary, evidence)):
        return None, "fallback:ungrounded"
    return (headline, summary), "rephrased"


def write_news(db: Session, item: M.AutopilotItem) -> tuple[str, str, str] | None:
    """(headline, summary, generator) for an item, or None when nothing honest can be written."""
    headline_max = int(setting("autopilot.headline_max_chars", db))
    summary_max = int(setting("autopilot.summary_max_chars", db))
    block = phrases(setting("autopilot.block_words", db))
    generator = "source"
    if setting("autopilot.use_model", db) is True and llm_gateway.is_configured():
        written, generator = model_news(item.title, item.excerpt, headline_max, summary_max, block)
        if written:
            return written[0], written[1], generator
    headline = trim(item.title, headline_max)
    summary = first_sentences(item.excerpt, summary_max)
    if not summary or not (_safe(headline, block) and _safe(summary, block)):
        return None
    return headline, summary, generator


# --- posting -------------------------------------------------------------------------------------

def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")[:SLUG_BASE_MAX].strip("-")


def _unique_slug(db: Session, title: str, seed: str, fallback: str) -> str:
    base = slugify(title) or fallback
    slug = f"{base}-{dedupe_key(seed)[:6]}"
    counter = 1
    while db.scalar(select(M.Post.id).where(M.Post.slug == slug)):
        counter += 1
        slug = f"{base}-{dedupe_key(seed)[:6]}-{counter}"
    return slug


def create_post(db: Session, *, template: str, title: str, summary: str, body: list[dict], tags: list[str],
                cover_alt: str, now: float, seed: str, source: dict | None = None, category_id: str = "") -> M.Post:
    """An AUTO post as a DRAFT, in its template, validated like an editor's. A sample outside production."""
    sample = is_dev_or_test()
    if sample:
        title = COPY["samplePrefix"] + title
    art = newsroom.TEMPLATES[template]["art"]
    row = M.Post(
        id=uuid.uuid4().hex, slug=_unique_slug(db, title, seed, newsroom.SECTION_PATHS[newsroom.TEMPLATES[template]["section"]]),
        template=template, section=newsroom.TEMPLATES[template]["section"], title=trim(title, M.Post.__table__.c.title.type.length),
        summary=summary, body=newsroom.validate_body(template, body, set()), tags=tags, cover_alt=cover_alt,
        cover_art=art[0] if art else "", featured=False, author_id="", status=newsroom.DRAFT, publish_at=0.0,
        first_published_at=0.0, reviewed_by=None, reviewed_at=0.0, reviewed_hash="", sample=sample,
        origin=newsroom.AUTO, source_name=(source or {}).get("name", ""), source_url=(source or {}).get("url", ""),
        source_published_at=(source or {}).get("at", 0.0), category_id=category_id, series_id="", episode=0,
        precision=-1, precision_report={}, hold_reason="", created_by=ACTOR["id"], created_at=now,
        updated_by=ACTOR["id"], updated_at=now)
    db.add(row)
    db.flush()
    newsroom._event(db, ACTOR, row, "AUTO_CREATED")
    return row


def _go_live(db: Session, row: M.Post, at: float, now: float) -> None:
    """Publish now, or schedule for ``at``. A health tip still shows only once a clinician approves it."""
    if at > now:
        row.status, row.publish_at = newsroom.SCHEDULED, at
        newsroom._event(db, ACTOR, row, "AUTO_SCHEDULED")
    else:
        row.status, row.publish_at = newsroom.PUBLISHED, now
        newsroom._event(db, ACTOR, row, "AUTO_PUBLISHED")
    row.first_published_at = row.first_published_at or row.publish_at
    row.updated_at = now


HELD_EDITOR = "Waiting for an editor (auto-publish is off)"
HELD_CLINICIAN = "Waiting for a clinician's approval"


def route(db: Session, row: M.Post, item: M.AutopilotItem, report: newsroom_precision.Report, at: float, now: float,
          *, auto_publish: bool) -> str:
    """Where a scored draft goes. Imprecise: held for the super admin (Content, Review). Health content: scheduled,
    public only once a clinician approves it (unless the switch is off and it is precise). Otherwise out on its
    own when auto-publish allows, or held for an editor. Returns the item's state."""
    row.precision, row.precision_report = report.score, report.as_dict()
    item.precision = report.score
    if not report.passed:
        row.hold_reason = "PRECISION"
        item.state, item.reason = HELD, f"Held for the super admin: precision {report.score}% (needs {report.threshold}%)"
        ops_feed.publish(db, "AUTOPILOT_DRAFT_HELD", "ACCOUNT", summary="An auto draft failed the precision gate.",
                         actor_id=ACTOR["id"], actor_role=ACTOR["role"], resource_type="post", resource_id=row.id)
        return HELD
    if newsroom.needs_review(row, newsroom.policy(db)):
        _go_live(db, row, at, now)   # scheduled; public only once a clinician approves this exact version
        _notify_clinicians(db, row)
        item.state, item.reason = HELD, HELD_CLINICIAN
        return HELD
    if auto_publish:
        _go_live(db, row, at, now)
        item.state = POSTED
        return POSTED
    row.hold_reason = "EDITOR"
    item.state, item.reason = HELD, HELD_EDITOR
    ops_feed.publish(db, "AUTOPILOT_DRAFT_HELD", "ACCOUNT", summary="The autopilot drafted a post for review.",
                     actor_id=ACTOR["id"], actor_role=ACTOR["role"], resource_type="post", resource_id=row.id)
    return HELD


def writer_title(row: M.Post) -> str:
    """The title as written: without the "Sample: " a development build puts in front (the gate scores the writer)."""
    return row.title.removeprefix(COPY["samplePrefix"])


def _today_count(db: Session, start: float, lane: str | None = None) -> int:
    statement = select(func.count(M.AutopilotItem.id)).where(
        M.AutopilotItem.state.in_((POSTED, HELD)), M.AutopilotItem.updated_at >= start, M.AutopilotItem.post_id != "")
    if lane:
        statement = statement.where(M.AutopilotItem.lane == lane)
    return int(db.scalar(statement) or 0)


def post_news(db: Session, now: float) -> dict:
    """Post the best new item, when the window, the day's cap and the gap allow it."""
    tz = zone(db)
    hour = local(now, tz).hour
    if not int(setting("autopilot.news_window_start_hour", db)) <= hour < int(setting("autopilot.news_window_end_hour", db)):
        return {"posted": 0, "why": "outside_window"}
    start = day_start(now, tz)
    if _today_count(db, start, NEWS) >= int(setting("autopilot.news_per_day", db)):
        return {"posted": 0, "why": "daily_news_cap"}
    if _today_count(db, start) >= int(setting("autopilot.max_posts_per_day", db)):
        return {"posted": 0, "why": "daily_cap"}
    last = db.scalar(select(func.max(M.AutopilotItem.updated_at)).where(
        M.AutopilotItem.lane == NEWS, M.AutopilotItem.state.in_((POSTED, HELD)), M.AutopilotItem.post_id != ""))
    if last and now - last < int(setting("autopilot.news_min_gap_minutes", db)) * 60:
        return {"posted": 0, "why": "min_gap"}
    oldest = now - int(setting("autopilot.news_max_age_hours", db)) * HOUR
    candidates = db.scalars(select(M.AutopilotItem).where(
        M.AutopilotItem.lane == NEWS, M.AutopilotItem.state == SEEN,
        M.AutopilotItem.relevance >= int(setting("autopilot.news_min_relevance", db)),
        M.AutopilotItem.created_at >= oldest)).all()
    candidates = [c for c in candidates if not c.published_at or c.published_at >= oldest]
    candidates.sort(key=lambda c: (-c.relevance, -(c.published_at or c.created_at), c.source_url))
    for item in candidates:
        written = write_news(db, item)
        if written is None:
            item.state, item.reason, item.updated_at = SKIPPED, "Nothing could be written from the source's text", now
            continue
        headline, summary, generator = written
        source = SOURCES[item.source_id]
        body = [{"type": "paragraph", "text": summary}]
        try:
            row = create_post(db, template=NEWS_TEMPLATE, title=headline, summary=summary, body=body,
                              tags=[COPY["tagAuto"], COPY["tagNews"]], cover_alt=COPY["newsCoverAlt"], now=now,
                              seed=item.dedupe_key, source={"name": source["publisher"], "url": item.source_url,
                                                            "at": item.published_at}, category_id=item.category_id)
        except ValueError as exc:   # the template refused it: recorded, never posted half-made
            item.state, item.reason, item.updated_at = FAILED, str(exc)[:REASON_MAX], now
            continue
        item.post_id, item.generator, item.updated_at = row.id, generator, now
        report = newsroom_precision.gate(db, newsroom_precision.post_texts(headline, summary, body), newsroom_precision.Source(
            text=f"{item.title}. {item.excerpt}", allowed=source_enabled(item.source_id, db), kind=newsroom_precision.FEED,
            published_at=item.published_at), now)
        state = route(db, row, item, report, now, now, auto_publish=setting("autopilot.news_auto_publish", db) is True)
        return {"posted": 1, "postId": row.id, "generator": generator, "state": state, "precision": report.score}
    return {"posted": 0, "why": "no_candidate"}


# --- the blog plan --------------------------------------------------------------------------------

def week_slots(now: float, tz: ZoneInfo, days: list[int], per_week: int, hour: int) -> list[float]:
    """This week's and next week's slot times (the first ``per_week`` configured days, at ``hour``)."""
    today = local(now, tz).replace(hour=hour, minute=0, second=0, microsecond=0)
    monday = today - timedelta(days=today.weekday())
    chosen = days[:per_week]
    return [(monday + timedelta(weeks=w, days=d)).timestamp() for w in (0, 1) for d in chosen]


def knowledge_source(passages: list[dict]) -> newsroom_precision.Source:
    """Approved knowledge as a precision-gate source: allow-listed by its approval, no date needed."""
    text = " ".join(f"{p['title']}. {p['content']}" for p in passages)
    return newsroom_precision.Source(text=text, allowed=True, kind=newsroom_precision.KNOWLEDGE)


def _approved_tip(db: Session, topic: str, block: list[str]) -> tuple[list[dict], str, str] | None:
    """(passages, paragraph, generator) about a topic from approved knowledge, or None."""
    try:
        passages = vector_store.search(db, topic, limit=3)
    except Exception:  # noqa: BLE001 — a retrieval failure drafts nothing, never invents
        return None
    if not passages:
        return None
    paragraph = first_sentences(passages[0]["content"].removeprefix(f"{passages[0]['title']}. "), EXCERPT_MAX, count=6)
    generator = "extractive"
    if setting("autopilot.use_model", db) is True and llm_gateway.is_configured():
        answer, generator = agent_ayush.generate(f"What should students know about {topic}?", passages, paragraph)
        if generator == agent_ayush.GENERATOR_REPHRASED:
            paragraph = CITATION.sub("", answer).strip()
    if not paragraph or not _safe(paragraph, block):
        return None
    return passages, paragraph, generator


def _roundup_posts(db: Session, now: float) -> list[M.Post]:
    rows = db.scalars(select(M.Post).where(
        M.Post.template == "PRODUCT_UPDATE", M.Post.status.in_((newsroom.PUBLISHED, newsroom.SCHEDULED)),
        M.Post.publish_at >= now - WEEK, M.Post.publish_at <= now, M.Post.origin != newsroom.AUTO)
        .order_by(M.Post.publish_at.desc())).all()
    pol = newsroom.policy(db)
    return [r for r in rows if newsroom.is_public(r, now, pol) and (is_dev_or_test() or not r.sample)]


def _notify_clinicians(db: Session, row: M.Post) -> int:
    doctors = db.scalars(select(M.Account.id).where(M.Account.role == newsroom.REVIEWER_ROLE,
                                                    M.Account.active.is_(True))).all()
    summary = "A health tip drafted by the autopilot is waiting for your review."
    for doctor in doctors:
        ops_feed.notify(db, doctor, "POST_REVIEW_REQUESTED", dedupe_key=f"post-review:{row.id}:{doctor}",
                        summary=summary, resource_type="post", resource_id=row.id)
    ops_feed.publish(db, "POST_REVIEW_REQUESTED", "CLINICAL", severity="ATTENTION", summary=summary,
                     actor_id=ACTOR["id"], actor_role=ACTOR["role"], resource_type="post", resource_id=row.id)
    return len(doctors)


def _draft_tip(db: Session, item: M.AutopilotItem, slot: float, now: float) -> bool:
    block = phrases(setting("autopilot.block_words", db))
    topics = phrases(setting("autopilot.blog_topics", db))
    if not topics:
        return False
    used = int(db.scalar(select(func.count(M.AutopilotItem.id)).where(
        M.AutopilotItem.lane == BLOG, M.AutopilotItem.topic != "", M.AutopilotItem.post_id != "",
        M.AutopilotItem.series_id == "")) or 0)
    summary_max = int(setting("autopilot.summary_max_chars", db))
    for step in range(len(topics)):
        topic = topics[(used + step) % len(topics)]
        found = _approved_tip(db, topic, block)
        if found is None:
            continue
        passages, paragraph, generator = found
        body = [{"type": "paragraph", "text": paragraph},
                {"type": "facts", "title": COPY["tipSourcesTitle"], "items": list(dict.fromkeys(trim(p["title"], FACT_MAX) for p in passages))}]
        summary = first_sentences(paragraph, summary_max)
        row = create_post(db, template=TIP_TEMPLATE, title=passages[0]["title"], summary=summary,
                          body=body, tags=[COPY["tagAuto"], slugify(topic).replace("-", " ")[:newsroom.TAG_MAX].strip() or COPY["tagAuto"]],
                          cover_alt=COPY["blogTipCoverAlt"], now=now, seed=item.dedupe_key)
        item.topic, item.title, item.post_id, item.generator = topic[:TOPIC_MAX], row.title[:TITLE_MAX], row.id, generator
        report = newsroom_precision.gate(db, newsroom_precision.post_texts(writer_title(row), summary, body), knowledge_source(passages), now)
        route(db, row, item, report, slot, now, auto_publish=setting("autopilot.blog_auto_publish", db) is True)
        return True
    return False


def _draft_roundup(db: Session, item: M.AutopilotItem, updates: list[M.Post], slot: float, now: float) -> None:
    body: list[dict] = []
    for update in updates:
        body += [{"type": "heading", "text": trim(update.title, HEADING_MAX)}, {"type": "paragraph", "text": update.summary or update.title}]
    body.append({"type": "cta", "label": COPY["roundupCta"], "route": "/news"})
    row = create_post(db, template=ROUNDUP_TEMPLATE, title=COPY["roundupTitle"], summary=COPY["roundupSummary"], body=body,
                      tags=[COPY["tagAuto"], COPY["tagRoundup"]], cover_alt=COPY["roundupCoverAlt"], now=now, seed=item.dedupe_key)
    item.title, item.post_id, item.generator = row.title[:TITLE_MAX], row.id, "extractive"
    if setting("autopilot.blog_auto_publish", db) is True:
        _go_live(db, row, slot, now)
        item.state = POSTED
    else:
        item.state, item.reason = HELD, "Waiting for an editor (auto-publish is off)"


def draft_blog(db: Session, now: float) -> dict:
    """Draft every blog slot that is due (within the lead time) and not drafted yet."""
    tz = zone(db)
    per_week = int(setting("autopilot.blog_posts_per_week", db))
    days = blog_days(str(setting("autopilot.blog_days", db)))
    if not per_week or not days:
        return {"drafted": 0, "why": "no_slots"}
    lead = int(setting("autopilot.blog_lead_hours", db)) * HOUR
    slots = week_slots(now, tz, days, per_week, int(setting("autopilot.blog_hour", db)))
    drafted, skipped = 0, 0
    for index, slot in enumerate(slots):
        if not slot - lead <= now < slot + DAY:
            continue
        key = dedupe_key(f"blog-slot:{local(slot, tz).date().isoformat()}")
        if db.scalar(select(M.AutopilotItem.id).where(M.AutopilotItem.dedupe_key == key)):
            continue
        if _today_count(db, day_start(now, tz)) >= int(setting("autopilot.max_posts_per_day", db)):
            return {"drafted": drafted, "skipped": skipped, "why": "daily_cap"}
        item = M.AutopilotItem(id=uuid.uuid4().hex, lane=BLOG, dedupe_key=key, source_id="", source_url="", title="",
                               excerpt="", published_at=0.0, relevance=0, state=SEEN, reason="", topic="", slot_at=slot,
                               post_id="", generator="", category_id="", series_id="", precision=-1, created_at=now,
                               updated_at=now)
        db.add(item)
        updates = _roundup_posts(db, now) if index % 2 else []
        try:
            if updates:
                _draft_roundup(db, item, updates, slot, now)
                drafted += 1
            elif _draft_tip(db, item, slot, now):
                drafted += 1
            else:
                item.state, item.reason = SKIPPED, "No approved knowledge source matches a topic in the plan"
                skipped += 1
        except ValueError as exc:   # the template refused it: recorded, never posted half-made
            item.state, item.reason = FAILED, str(exc)[:REASON_MAX]
        db.flush()   # the next slot's topic rotation and caps count this one (sessions do not autoflush)
    return {"drafted": drafted, "skipped": skipped}


# --- the job --------------------------------------------------------------------------------------

def run(db: Session, now: float | None = None) -> dict:
    """The scheduled job. Never commits (the runner does); a failing feed degrades, never stops the run."""
    now = time.time() if now is None else now
    if setting("autopilot.kill_switch", db) is True:
        return {"status": "SKIPPED", "summary": {"reason": "kill_switch"}}
    from services import newsroom_series
    news_on, blog_on = setting("autopilot.news_enabled", db) is True, setting("autopilot.blog_enabled", db) is True
    series_on = newsroom_series.any_enabled(db)
    if not news_on and not blog_on and not series_on:
        return {"status": "SKIPPED", "summary": {"reason": "off"}}
    summary: dict[str, Any] = {}
    status = "SUCCESS"
    if news_on:
        if fetch_due(db, now):
            fetched = fetch_sources(db, now)
            summary["fetch"] = fetched
            if fetched["failed"]:
                status = "DEGRADED"
        else:
            summary["fetch"] = {"skipped": "interval"}
        summary["news"] = post_news(db, now)
    if blog_on:
        summary["blog"] = draft_blog(db, now)
    if series_on:
        summary["series"] = newsroom_series.draft_series(db, now)
    db.flush()
    return {"status": status, "summary": summary}


# --- super admin: the Autopilot tab ------------------------------------------------------------------

def _post_view(row: M.Post | None, now: float, pol: newsroom.Policy) -> dict | None:
    if row is None:
        return None
    return {"id": row.id, "status": row.status, "live": newsroom.is_public(row, now, pol), "path": newsroom.post_path(row),
            "template": row.template, "needsReview": newsroom.needs_review(row, pol),
            "reviewCurrent": newsroom.review_current(row), "publishAt": row.publish_at or None, "sample": bool(row.sample),
            "precision": row.precision if row.precision is not None else -1, "holdReason": row.hold_reason or ""}


def _item_view(item: M.AutopilotItem, post: M.Post | None, now: float, pol: newsroom.Policy,
               series: dict[str, str] | None = None) -> dict:
    source = SOURCES.get(item.source_id)
    return {"id": item.id, "lane": item.lane, "state": item.state, "reason": item.reason, "title": item.title,
            "topic": item.topic, "sourceId": item.source_id, "sourceName": source["publisher"] if source else "",
            "sourceUrl": item.source_url, "sourcePublishedAt": item.published_at or None, "relevance": item.relevance,
            "generator": item.generator, "slotAt": item.slot_at or None, "createdAt": item.created_at,
            "updatedAt": item.updated_at, "post": _post_view(post, now, pol), "categoryId": item.category_id or "",
            "seriesName": (series or {}).get(item.series_id or "", ""),
            "precision": item.precision if item.precision is not None else -1}


def status_payload(db: Session, now: float | None = None) -> dict:
    now = time.time() if now is None else now
    tz = zone(db)
    limit = int(setting("autopilot.log_size", db))
    start = day_start(now, tz)
    sources = []
    for source_id, source in SOURCES.items():
        health = db.get(M.AutopilotSource, source_id)
        url = source_url(source_id, db)
        sources.append({"id": source_id, "publisher": source["publisher"], "url": url,
                        "enabled": source_enabled(source_id, db), "verified": source["verified"],
                        "lastFetchAt": health.last_fetch_at if health and health.last_fetch_at else None,
                        "lastOkAt": health.last_ok_at if health and health.last_ok_at else None,
                        "lastError": health.last_error if health else "", "lastItems": health.last_items if health else 0,
                        "failures": health.failures if health else 0})
    acted = db.scalars(select(M.AutopilotItem).where(M.AutopilotItem.state.in_((POSTED, HELD, SKIPPED, FAILED)))
                       .order_by(M.AutopilotItem.updated_at.desc(), M.AutopilotItem.id).limit(limit)).all()
    posts = {p.id: p for p in db.scalars(select(M.Post).where(M.Post.id.in_({i.post_id for i in acted if i.post_id})))}
    pol = newsroom.policy(db)
    series_names = dict(db.execute(select(M.PostSeries.id, M.PostSeries.name)).all())
    views = [_item_view(i, posts.get(i.post_id), now, pol, series_names) for i in acted]
    queue = [v for v in views if v["post"] and not v["post"]["live"] and v["post"]["status"] != newsroom.UNPUBLISHED]
    log = [v for v in views if v not in queue]
    per_week = int(setting("autopilot.blog_posts_per_week", db))
    days = blog_days(str(setting("autopilot.blog_days", db)))
    upcoming = [s for s in week_slots(now, tz, days, per_week, int(setting("autopilot.blog_hour", db))) if s > now] if per_week else []
    job = db.get(M.ScheduledJob, JOB_KEY)
    return {
        "killSwitch": setting("autopilot.kill_switch", db) is True,
        "production": not is_dev_or_test(),
        "timezone": tz.key,
        "model": {"configured": llm_gateway.is_configured(), "use": setting("autopilot.use_model", db) is True,
                  "aiKillSwitch": llm_gateway.kill_switch_active()},
        "news": {"enabled": setting("autopilot.news_enabled", db) is True,
                 "autoPublish": setting("autopilot.news_auto_publish", db) is True,
                 "perDay": int(setting("autopilot.news_per_day", db)), "today": _today_count(db, start, NEWS),
                 "windowStart": int(setting("autopilot.news_window_start_hour", db)),
                 "windowEnd": int(setting("autopilot.news_window_end_hour", db)),
                 "candidates": int(db.scalar(select(func.count(M.AutopilotItem.id)).where(
                     M.AutopilotItem.lane == NEWS, M.AutopilotItem.state == SEEN)) or 0)},
        "blog": {"enabled": setting("autopilot.blog_enabled", db) is True,
                 "autoPublish": setting("autopilot.blog_auto_publish", db) is True, "perWeek": per_week,
                 "days": [DAYS[d] for d in days], "hour": int(setting("autopilot.blog_hour", db)),
                 "topics": phrases(setting("autopilot.blog_topics", db)), "upcoming": upcoming[:per_week]},
        "sources": sources,
        "fetchIntervalMinutes": int(setting("autopilot.fetch_interval_minutes", db)),
        "precision": {"threshold": int(setting("content.precision_threshold", db)),
                      "healthRequiresClinician": setting("content.health_requires_clinician", db) is True},
        "series": series_status(db, now),
        "queue": queue,
        "log": log,
        "job": {"lastRunAt": job.last_run_at or None, "lastStatus": job.last_status, "lastError": job.last_error,
                "nextRunAt": job.next_run_at or None} if job else None,
    }


def series_status(db: Session, now: float) -> list[dict]:
    from services import newsroom_series
    return newsroom_series.status(db, now)


@router.get("/ops/autopilot")
def autopilot_status(user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    return status_payload(db)


@router.post("/ops/autopilot/run")
def run_now(user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Run the job now through the scheduler (its lease, its record). Settings, windows and caps still apply."""
    from services.workflow_scheduler import JobBusyError, workflow_scheduler
    try:
        result = workflow_scheduler.run_job_now(db, JOB_KEY)
    except JobBusyError as exc:
        raise HTTPException(409, "The autopilot is running already.") from exc
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=user["id"], action="AUTOPILOT_RUN_NOW", resource_id=JOB_KEY,
                           created_at=time.time()))
    db.commit()
    return {"run": {"status": result["status"], "summary": result.get("summary", {})}, **status_payload(db)}


@router.post("/ops/autopilot/check-sources")
def check_sources(user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Read every enabled feed now and record its health. Posts nothing."""
    fetch_sources(db, time.time())
    db.commit()
    return status_payload(db)


class KillSwitchInput(StrictModel):
    active: bool
    reason: str = Field(min_length=3, max_length=500)
    takeDown: bool = False


@router.post("/ops/autopilot/kill-switch")
def kill_switch(body: KillSwitchInput, user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Stop (or restart) the autopilot. Stopping can also take every live or scheduled auto post off the site."""
    from services.settings_api import write_override
    taken = 0
    if body.active and body.takeDown:
        now = time.time()
        for row in db.scalars(select(M.Post).where(M.Post.origin == newsroom.AUTO,
                                                   M.Post.status.in_((newsroom.PUBLISHED, newsroom.SCHEDULED)))).all():
            row.status, row.updated_by, row.updated_at = newsroom.UNPUBLISHED, user["id"], now
            newsroom._event(db, user, row, "UNPUBLISHED")
            taken += 1
    if body.active:
        _alert(db, "AUTOPILOT_STOPPED", f"The content autopilot was stopped by a super admin ({taken} auto posts taken down).")
    write_override(db, user, "autopilot.kill_switch", True if body.active else None, body.reason)   # commits
    return {"takenDown": taken, **status_payload(db)}
