"""The series scheduler: Monday Motivation and the health series, drafted ahead on their days.

Runs inside the content autopilot job (services/newsroom_autopilot.run); each
series is off until a super admin turns it on (``series.<key>.enabled``), and the
autopilot's kill switch and daily cap apply to it. Days, hours and the health
rota are settings (``series.<key>.days``, ``.hour``, ``series.health.rota``), in
``platform.default_timezone`` (IST). An episode is drafted ``series.lead_hours``
before its slot, numbered in its series, scored by the precision gate and routed
like every auto post (newsroom_autopilot.route):

* **Monday Motivation** takes the next line of the series' own library: the
  team's own words, or a quote the super admin entered with who said it and a
  link to its public-domain source. It never writes or attributes a quote of
  its own; an empty library drafts nothing.
* **Health series** cycles the rota (Mental health, Women's health, Common
  health by default): the episode's category is the next in the rota, its topic
  the next of that category's topics with approved knowledge, and its text comes
  only from those approved sources (none: the next topic, then nothing). Health
  episodes wait for a clinician while ``content.health_requires_clinician`` is on.
  A Mental health episode carries Tele-MANAS 14416 and 112 (the post page and the
  caption add them from the category), never dosing or a diagnosis (the gate
  holds advice language).
"""
from __future__ import annotations

import time
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import newsroom, newsroom_precision
from services import newsroom_autopilot as A

KEYS = ("motivation", "health")
MOTIVATION, HEALTH = KEYS
COPY = newsroom.CONTENT_DEFS["copy"]
TITLE_WORDS = 8
CITE_MAX = 120   # a quote block's "who said it" (services/newsroom.validate_block)


def any_enabled(db: Session) -> bool:
    return any(setting(f"series.{key}.enabled", db) is True for key in KEYS)


def _series(db: Session, key: str) -> M.PostSeries | None:
    return db.scalar(select(M.PostSeries).where(M.PostSeries.autopilot_key == key))


def slots(db: Session, key: str, now: float) -> list[float]:
    days = A.blog_days(str(setting(f"series.{key}.days", db)))
    if not days:
        return []
    return A.week_slots(now, A.zone(db), days, len(days), int(setting(f"series.{key}.hour", db)))


def rota(db: Session) -> list[str]:
    return [c for c in A.phrases(str(setting("series.health.rota", db))) if c]


def _episode_item(db: Session, series: M.PostSeries, key: str, slot: float, now: float) -> M.AutopilotItem:
    item = M.AutopilotItem(id=uuid.uuid4().hex, lane=A.BLOG, dedupe_key=key, source_id="", source_url="", title="",
                           excerpt="", published_at=0.0, relevance=0, state=A.SEEN, reason="", topic="", slot_at=slot,
                           post_id="", generator="", category_id="", series_id=series.id, precision=-1, created_at=now,
                           updated_at=now)
    db.add(item)
    return item


def _used(db: Session, series: M.PostSeries, category_id: str | None = None) -> int:
    statement = select(func.count(M.AutopilotItem.id)).where(M.AutopilotItem.series_id == series.id,
                                                             M.AutopilotItem.post_id != "")
    if category_id is not None:
        statement = statement.where(M.AutopilotItem.category_id == category_id)
    return int(db.scalar(statement) or 0)


def _title(prefix: str, text: str) -> str:
    words = text.split()
    head = " ".join(words[:TITLE_WORDS]).rstrip(".,;:!?")
    return f"{prefix}: {head}{'…' if len(words) > TITLE_WORDS else ''}"


def _attach(db: Session, row: M.Post, series: M.PostSeries) -> None:
    newsroom._attach_series(db, row, series.id)


def draft_motivation(db: Session, series: M.PostSeries, item: M.AutopilotItem, slot: float, now: float) -> bool:
    library = [e for e in series.library or [] if e.get("text")]
    if not library:
        item.state, item.reason = A.SKIPPED, "The Monday Motivation library is empty"
        return False
    entry = library[_used(db, series) % len(library)]
    quote = entry["kind"] == "quote"
    cite = entry["cite"] if quote else COPY["motivationOwnWords"]
    body: list[dict] = [{"type": "quote", "text": entry["text"], "cite": cite[:CITE_MAX]}]
    if quote:
        body.append({"type": "paragraph", "text": COPY["motivationSource"].format(url=entry["sourceUrl"])})
    title = _title(series.name, entry["text"])
    summary = A.trim(entry["text"], int(setting("autopilot.summary_max_chars", db)))
    row = A.create_post(db, template=series.template if series.template == "MOTIVATION" else "MOTIVATION", title=title,
                        summary=summary, body=body, tags=[COPY["tagSeries"], COPY["tagMotivation"]],
                        cover_alt=COPY["motivationCoverAlt"], now=now, seed=item.dedupe_key,
                        category_id=series.category_id)
    _attach(db, row, series)
    item.title, item.post_id, item.generator, item.category_id = row.title[:A.TITLE_MAX], row.id, "library", row.category_id
    evidence = f"{series.name}. {entry['text']} {cite}"
    report = newsroom_precision.gate(db, [A.writer_title(row), summary, entry["text"]], newsroom_precision.Source(
        text=evidence, allowed=True, kind=newsroom_precision.LIBRARY), now)
    A.route(db, row, item, report, slot, now, auto_publish=setting("series.auto_publish", db) is True)
    return True


def draft_health(db: Session, series: M.PostSeries, item: M.AutopilotItem, slot: float, now: float) -> bool:
    order = rota(db)
    if not order:
        item.state, item.reason = A.SKIPPED, "The health series rota is empty"
        return False
    block = A.phrases(setting("autopilot.block_words", db))
    start = _used(db, series) % len(order)
    for step in range(len(order)):
        category = db.get(M.PostCategory, order[(start + step) % len(order)])
        if category is None or category.archived:
            continue
        topics = [t for t in category.topics or [] if t]
        done = _used(db, series, category.id)
        for offset in range(len(topics)):
            topic = topics[(done + offset) % len(topics)]
            found = A._approved_tip(db, topic, block)
            if found is None:
                continue
            passages, paragraph, generator = found
            summary = A.first_sentences(paragraph, int(setting("autopilot.summary_max_chars", db)))
            body = [{"type": "paragraph", "text": paragraph},
                    {"type": "facts", "title": COPY["episodeSourcesTitle"],
                     "items": list(dict.fromkeys(A.trim(p["title"], A.FACT_MAX) for p in passages))}]
            row = A.create_post(db, template="SERIES_EPISODE", title=passages[0]["title"], summary=summary, body=body,
                                tags=[COPY["tagSeries"], A.slugify(topic).replace("-", " ")[:newsroom.TAG_MAX].strip() or COPY["tagSeries"]],
                                cover_alt=COPY["episodeCoverAlt"], now=now, seed=item.dedupe_key, category_id=category.id)
            _attach(db, row, series)
            item.topic, item.title, item.post_id = topic[:A.TOPIC_MAX], row.title[:A.TITLE_MAX], row.id
            item.generator, item.category_id = generator, category.id
            report = newsroom_precision.gate(db, newsroom_precision.post_texts(A.writer_title(row), summary, body),
                                             A.knowledge_source(passages), now)
            A.route(db, row, item, report, slot, now, auto_publish=setting("series.auto_publish", db) is True)
            return True
    item.state, item.reason = A.SKIPPED, "No approved knowledge source matches a topic in the rota's categories"
    return False


DRAFTERS = {MOTIVATION: draft_motivation, HEALTH: draft_health}


def draft_series(db: Session, now: float | None = None) -> dict:
    """Draft every enabled series' slots that are due (within the lead time) and not drafted yet."""
    from services.newsroom_content import ensure_defaults
    now = time.time() if now is None else now
    ensure_defaults(db)
    tz = A.zone(db)
    lead = int(setting("series.lead_hours", db)) * A.HOUR
    out: dict[str, dict] = {}
    for key in KEYS:
        if setting(f"series.{key}.enabled", db) is not True:
            continue
        series = _series(db, key)
        if series is None or series.archived:
            out[key] = {"drafted": 0, "why": "no_series"}
            continue
        drafted = skipped = 0
        for slot in slots(db, key, now):
            if not slot - lead <= now < slot + A.DAY:
                continue
            dedupe = A.dedupe_key(f"series-slot:{series.id}:{A.local(slot, tz).date().isoformat()}")
            if db.scalar(select(M.AutopilotItem.id).where(M.AutopilotItem.dedupe_key == dedupe)):
                continue
            if A._today_count(db, A.day_start(now, tz)) >= int(setting("autopilot.max_posts_per_day", db)):
                out[key] = {"drafted": drafted, "skipped": skipped, "why": "daily_cap"}
                break
            item = _episode_item(db, series, dedupe, slot, now)
            try:
                if DRAFTERS[key](db, series, item, slot, now):
                    drafted += 1
                else:
                    skipped += 1
            except ValueError as exc:   # the template refused it: recorded, never posted half-made
                item.state, item.reason = A.FAILED, str(exc)[:A.REASON_MAX]
            item.updated_at = now
            db.flush()
        else:
            out[key] = {"drafted": drafted, "skipped": skipped}
    return out


def status(db: Session, now: float) -> list[dict]:
    """The built-in series for the Autopilot tab: on or off, schedule, rota, next slots."""
    out = []
    for key in KEYS:
        series = _series(db, key)
        out.append({"key": key, "enabled": setting(f"series.{key}.enabled", db) is True,
                    "name": series.name if series else "", "slug": series.slug if series else "",
                    "id": series.id if series else "",
                    "days": [A.DAYS[d] for d in A.blog_days(str(setting(f"series.{key}.days", db)))],
                    "hour": int(setting(f"series.{key}.hour", db)),
                    "rota": rota(db) if key == HEALTH else [],
                    "library": len(series.library or []) if series and key == MOTIVATION else 0,
                    "episodes": series.episode_count if series else 0,
                    "upcoming": [s for s in slots(db, key, now) if s > now][:3]})
    return out
