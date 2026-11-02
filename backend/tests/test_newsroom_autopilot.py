"""The content autopilot: off by default, feeds parsed safely, deduplicated, capped, spaced, written only from the
source, held for review when asked, health tips gated on a clinician, a kill switch, health and alerts, the job."""
import json
import time
from datetime import datetime, timedelta
from email.utils import format_datetime
from pathlib import Path
from string import Template
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select
from test_newsroom import account, admin, doctor  # noqa: F401 — helpers
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import rule_l
from core import settings_registry as R
from core import workflow_models as M
from services import llm_gateway, newsroom
from services import newsroom_autopilot as A
from services.workflow_scheduler import JOB_INTERVAL_OVERRIDES, PERIODIC_JOBS, workflow_scheduler

DATA = Path(__file__).resolve().parent / "data" / "autopilot"
REPO = Path(__file__).resolve().parents[2]
IST = ZoneInfo("Asia/Kolkata")
# Thursday 1 October 2026, 10:00 in India: inside the default news window (07-21).
THU_10 = datetime(2026, 10, 1, 10, 0, tzinfo=IST).timestamp()
NEWS_ON = {"autopilot.news_enabled": True, "autopilot.news_auto_publish": True}


@pytest.fixture(autouse=True)
def _fresh_settings_and_transport(monkeypatch):
    R.reset_cache()
    monkeypatch.setattr(A, "_fetch", lambda url, **kw: pytest.fail("a feed was fetched"))
    yield
    R.reset_cache()


def configure(factory, values: dict) -> None:
    with factory() as db:
        for key, value in values.items():
            R.validate(R.get_declaration(key), value)
            db.merge(M.SettingOverride(key=key, value=value, updated_by="test", updated_at=time.time()))
        db.commit()
    R.reset_cache()


def feed(now: float, name: str = "who_news.xml") -> bytes:
    text = Template((DATA / name).read_text("utf-8"))
    return text.safe_substitute(recent=format_datetime(datetime.fromtimestamp(now - 3600, IST)),
                                old=format_datetime(datetime.fromtimestamp(now - 10 * 86400, IST))).encode()


def serve(monkeypatch, body, calls=None):
    def fake(url, *, hosts, timeout, max_bytes):
        if calls is not None:
            calls.append(url)
        if isinstance(body, Exception):
            raise body
        return body
    monkeypatch.setattr(A, "_fetch", fake)


def run(factory, now):
    with factory(autoflush=False) as db:   # as in production (services/db_sql.py)
        outcome = A.run(db, now)
        db.commit()
        return outcome


def items(factory, **where):
    with factory() as db:
        statement = select(M.AutopilotItem)
        for key, value in where.items():
            statement = statement.where(getattr(M.AutopilotItem, key) == value)
        return db.scalars(statement.order_by(M.AutopilotItem.created_at, M.AutopilotItem.id)).all()


def auto_posts(factory):
    with factory() as db:
        return db.scalars(select(M.Post).where(M.Post.origin == "AUTO").order_by(M.Post.created_at, M.Post.id)).all()


# --- the catalogue and the registry ---------------------------------------------------------------

def test_autopilot_tables_have_a_plane_and_sources_match_the_registry():
    for table in ("care_autopilot_items", "care_autopilot_sources"):
        assert rule_l.TABLE_PLANES[table] == rule_l.PLATFORM
    assert {s[0] for s in R.AUTOPILOT_SOURCES} == set(A.SOURCES)
    for source_id, url, enabled in R.AUTOPILOT_SOURCES:
        source = A.SOURCES[source_id]
        # Only a feed verified from the network is on by default; one with no feed has no address.
        assert not enabled or source["verified"]
        assert bool(url) == bool(source["verified"])
        if url:
            A.check_url(url, source["hosts"])
    # Everything is off until a super admin turns it on. Once news is on, precise news goes out on its own
    # (the precision gate holds the rest; tests/test_newsroom_content.py).
    for key in ("autopilot.news_enabled", "autopilot.blog_enabled", "autopilot.blog_auto_publish",
                "autopilot.kill_switch", "series.motivation.enabled", "series.health.enabled"):
        assert R.get_declaration(key).default is False
    assert R.get_declaration("autopilot.news_auto_publish").default is True


def test_the_job_is_registered_every_fifteen_minutes_and_does_nothing_while_off(harness):
    _, factory, _ = harness
    assert "content_autopilot" in PERIODIC_JOBS and JOB_INTERVAL_OVERRIDES["content_autopilot"] == A.JOB_INTERVAL_SECONDS
    with factory() as db:
        result = workflow_scheduler.run_job_now(db, "content_autopilot")
    assert result["status"] == "SKIPPED" and result["summary"] == {"reason": "off"}
    assert items(factory) == [] and auto_posts(factory) == []


# --- feeds ------------------------------------------------------------------------------------------

def test_rss_and_atom_are_parsed_to_plain_text():
    rss = A.parse_feed(feed(THU_10))
    first = rss[0]
    assert first["title"] == "WHO warns of rising dengue cases among young people"
    assert first["excerpt"].startswith("Dengue cases have risen in 12 countries") and "<p>" not in first["excerpt"]
    assert first["publishedAt"] == pytest.approx(THU_10 - 3600)
    assert next(i for i in rss if "no-summary" in i["link"])["excerpt"] == ""
    atom = A.parse_feed((DATA / "atom.xml").read_bytes())
    assert [i["title"] for i in atom] == ["Campus & college vaccination drive"]   # the entry without a link is left out
    assert atom[0]["excerpt"] == "Colleges can host a vaccination drive."
    assert atom[0]["publishedAt"] == datetime(2026, 10, 1, 4, tzinfo=ZoneInfo("UTC")).timestamp()


@pytest.mark.parametrize("data", [
    b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa">]><rss><channel><item><title>&a;</title></item></channel></rss>',
    b"<html><body>not a feed</body></html>",
    b"not xml at all",
])
def test_unsafe_or_wrong_documents_are_refused(data):
    with pytest.raises(A.FeedError):
        A.parse_feed(data)


@pytest.mark.parametrize("url", [
    "http://www.who.int/rss-feeds/news-english.xml",          # not https
    "https://evil.example/rss.xml",                           # another host
    "https://user:pw@www.who.int/rss.xml",                    # credentials
    "https://www.who.int:8443/rss.xml",                       # another port
    "https://www.who.int.evil.example/rss.xml",
])
def test_a_feed_address_must_be_https_on_the_publishers_hosts(url):
    with pytest.raises(A.FeedError):
        A.check_url(url, A.SOURCES["who_news"]["hosts"])


def test_links_are_normalised_so_one_item_is_kept_once():
    plain = A.normalise_url("https://www.who.int/news/item/x")
    assert A.normalise_url("HTTPS://WWW.WHO.INT/news/item/x?utm_source=rss&fbclid=1#top") == plain
    assert A.normalise_url("https://www.who.int/news/item/x?id=2") != plain


# --- news ------------------------------------------------------------------------------------------------

def test_news_posts_the_most_relevant_item_instantly_with_its_source_and_tags(harness, monkeypatch):
    client, factory, _ = harness
    configure(factory, NEWS_ON)
    calls = []
    serve(monkeypatch, feed(THU_10), calls)
    outcome = run(factory, THU_10)
    assert outcome["status"] == "SUCCESS" and outcome["summary"]["news"]["posted"] == 1
    assert calls == ["https://www.who.int/rss-feeds/news-english.xml"]   # only the enabled, verified source

    by_link = {i.source_url: i for i in items(factory, lane="NEWS")}
    assert "https://example.com/news/elsewhere" not in by_link                     # off the publisher's site
    assert sum("dengue-young-people" in link for link in by_link) == 1             # deduplicated
    assert by_link["https://www.who.int/news/item/a-patient-story"].reason == "Block word: patient"
    assert by_link["https://www.who.int/news/item/old-heat-advisory"].state == "SKIPPED"
    assert by_link["https://www.who.int/news/item/no-summary"].reason == "The source gives no summary of its own"

    # The most student-relevant item: "student", "mental health" and "sleep" in its title.
    (post,) = auto_posts(factory)
    item = by_link["https://www.who.int/news/item/student-mental-health"]
    assert item.state == "POSTED" and item.post_id == post.id and item.generator == "source"
    assert by_link["https://www.who.int/news/item/dengue-young-people"].state == "SEEN"   # a candidate for later
    assert post.template == "CAMPUS_NEWS" and post.status == "PUBLISHED" and post.author_id == ""
    assert post.title == "Sample: New guidance on student mental health and sleep"   # tests are not production
    assert post.sample is True and post.tags == ["auto", "health news"] and post.cover_art   # template art, no image
    assert post.summary == ("WHO published guidance for universities on mental health and sleep. "
                            "It asks campuses to offer counselling.")
    assert post.body == [{"type": "paragraph", "text": post.summary}]
    assert (post.source_name, post.source_url) == ("World Health Organization", item.source_url)

    shown = client.get(f"/api/posts/news/{post.slug}").json()
    assert shown["auto"] is True and shown["author"]["name"]
    assert shown["source"] == {"name": "World Health Organization", "url": item.source_url,
                               "publishedAt": newsroom._iso(item.published_at)}
    with factory() as db:
        actions = [e.action for e in db.scalars(select(M.PostEvent).where(M.PostEvent.post_id == post.id))]
    assert sorted(actions) == ["AUTO_CREATED", "AUTO_PUBLISHED"]


def test_news_is_spaced_capped_per_day_and_stays_inside_the_window(harness, monkeypatch):
    _, factory, _ = harness
    configure(factory, NEWS_ON)
    serve(monkeypatch, feed(THU_10))
    assert run(factory, THU_10)["summary"]["news"]["posted"] == 1
    assert run(factory, THU_10 + 15 * 60)["summary"]["news"] == {"posted": 0, "why": "min_gap"}
    assert run(factory, THU_10 + 2 * 3600)["summary"]["news"]["posted"] == 1
    assert run(factory, THU_10 + 4 * 3600)["summary"]["news"]["posted"] == 1
    assert run(factory, THU_10 + 6 * 3600)["summary"]["news"] == {"posted": 0, "why": "daily_news_cap"}
    assert len(auto_posts(factory)) == 3
    # The irrelevant item is never chosen; the next day starts a new count, outside the window nothing posts.
    titles = [p.title for p in auto_posts(factory)]
    assert not any("budget committee" in t for t in titles)
    assert run(factory, THU_10 + 13 * 3600)["summary"]["news"] == {"posted": 0, "why": "outside_window"}   # 23:00
    assert run(factory, THU_10 + 24 * 3600)["summary"]["news"]["posted"] == 1


def test_the_daily_cap_counts_both_lanes(harness, monkeypatch):
    _, factory, _ = harness
    configure(factory, {**NEWS_ON, "autopilot.max_posts_per_day": 1, "autopilot.news_min_gap_minutes": 0})
    serve(monkeypatch, feed(THU_10))
    assert run(factory, THU_10)["summary"]["news"]["posted"] == 1
    assert run(factory, THU_10 + 60)["summary"]["news"] == {"posted": 0, "why": "daily_cap"}


def test_with_auto_publish_off_news_waits_as_a_draft_for_an_editor(harness, monkeypatch):
    client, factory, codes = harness
    configure(factory, {"autopilot.news_enabled": True, "autopilot.news_auto_publish": False})
    serve(monkeypatch, feed(THU_10))
    run(factory, THU_10)
    (post,) = auto_posts(factory)
    assert post.status == "DRAFT"
    assert items(factory, post_id=post.id)[0].state == "HELD"
    assert client.get(f"/api/posts/news/{post.slug}").status_code == 404
    headers = admin(client, factory, codes)
    published = client.post(f"/api/ops/posts/{post.id}/publish", headers=headers, json={})
    assert published.status_code == 200, published.text   # an auto post needs no named author
    assert client.get(f"/api/posts/news/{post.slug}").status_code == 200


def test_a_model_summary_is_used_only_when_grounded_in_the_source(harness, monkeypatch):
    _, factory, _ = harness
    configure(factory, {**NEWS_ON, "autopilot.news_min_gap_minutes": 0,
                        "autopilot.relevance_keywords": "dengue,young people,air quality"})
    serve(monkeypatch, feed(THU_10))
    monkeypatch.setenv("OLLAMA_URL", "http://model.test")
    llm_gateway.reset_availability()
    replies = iter([
        "HEADLINE: Dengue cases rising among young people, WHO warns\n"
        "SUMMARY: Dengue cases have risen in 12 countries this season [1]. Students should remove standing water "
        "around hostels and campuses [1]. Most cases are mild and do not need hospital care [1].",
        # An invented number and a name the source never gave: refused, the source's own words are used.
        "HEADLINE: Dengue cases rising in 40 countries\nSUMMARY: Dr Rao says dengue cases have risen in 40 countries [1].",
    ])
    monkeypatch.setattr(llm_gateway, "_transport", lambda prompt, system, **kw: next(replies))
    run(factory, THU_10)
    run(factory, THU_10 + 60)
    first, second = auto_posts(factory)
    assert first.title == "Sample: Dengue cases rising among young people, WHO warns"
    assert first.summary.startswith("Dengue cases have risen in 12 countries this season.") and "[1]" not in first.summary
    assert items(factory, post_id=first.id)[0].generator == "rephrased"
    assert second.title == "Sample: Air quality and outdoor sport"
    assert "40" not in second.title + second.summary and "Rao" not in second.summary
    assert items(factory, post_id=second.id)[0].generator == "fallback:ungrounded"


def test_a_failing_feed_is_recorded_and_alerts_after_repeated_failures(harness, monkeypatch):
    _, factory, _ = harness
    configure(factory, {**NEWS_ON, "autopilot.source_failures_before_alert": 2, "autopilot.fetch_interval_minutes": 15})
    serve(monkeypatch, TimeoutError("boom"))
    assert run(factory, THU_10)["status"] == "DEGRADED"
    assert run(factory, THU_10 + 900)["status"] == "DEGRADED"
    with factory() as db:
        health = db.get(M.AutopilotSource, "who_news")
        alerts = db.scalars(select(M.OpsEvent).where(M.OpsEvent.kind == "AUTOPILOT_SOURCE_FAILING")).all()
    assert health.failures == 2 and health.last_error == "TimeoutError" and health.last_ok_at == 0
    assert len(alerts) == 1 and alerts[0].severity == "ATTENTION" and "boom" not in alerts[0].summary
    serve(monkeypatch, feed(THU_10))
    run(factory, THU_10 + 1800)
    with factory() as db:
        health = db.get(M.AutopilotSource, "who_news")
    assert health.failures == 0 and health.last_error == "" and health.last_items == 10


# --- blog ----------------------------------------------------------------------------------------------------

WED_12 = datetime(2026, 9, 30, 12, 0, tzinfo=IST).timestamp()     # the day before Thursday's 10:00 slot
THU_SLOT = datetime(2026, 10, 1, 10, 0, tzinfo=IST).timestamp()
PASSAGES = [{"title": "Sleep in exam week", "content": "Sleep in exam week. Most students need seven to nine hours of "
             "sleep. A regular bedtime helps memory.", "sourceId": "k1", "category": "wellness", "version": 1,
             "score": 0.9, "stale": False}]


def test_a_health_tip_is_drafted_scheduled_and_public_only_after_a_clinicians_approval(harness, monkeypatch):
    client, factory, codes = harness
    configure(factory, {"autopilot.blog_enabled": True, "autopilot.blog_auto_publish": True,
                        "content.health_requires_clinician": True})
    account(factory, "doc2", "NMC_DOCTOR", "Dr. Second")
    asked = []
    monkeypatch.setattr(A.vector_store, "search", lambda db, topic, limit: asked.append(topic) or PASSAGES)
    outcome = run(factory, WED_12)
    assert outcome["summary"]["blog"] == {"drafted": 1, "skipped": 0}
    assert asked == ["sleep"]                                      # the first topic of the plan
    (tip,) = auto_posts(factory)
    assert tip.template == "HEALTH_TIP" and tip.status == "SCHEDULED" and tip.publish_at == THU_SLOT
    assert tip.title == "Sample: Sleep in exam week" and tip.reviewed_hash == ""
    assert tip.body[0] == {"type": "paragraph", "text": "Most students need seven to nine hours of sleep. A regular bedtime helps memory."}
    assert tip.body[1]["items"] == ["Sleep in exam week"]
    (item,) = items(factory, lane="BLOG")
    assert item.state == "HELD" and item.reason == "Waiting for a clinician's approval" and item.topic == "sleep"
    with factory() as db:
        notices = db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "POST_REVIEW_REQUESTED")).all()
    assert [n.account_id for n in notices] == ["doc2"]
    # Its time has come (the slot is in the past) and auto-publish is on: still not public without a review.
    assert client.get(f"/api/posts/blog/{tip.slug}").status_code == 404
    # The super admin cannot publish around the clinician.
    headers = admin(client, factory, codes)
    refused = client.post(f"/api/ops/posts/{tip.id}/publish", headers=headers, json={})
    assert refused.status_code == 409 and "clinician" in refused.json()["detail"]
    reviewer = login(client, codes, "doc2@example.test")
    queue = client.get("/api/work/post-reviews", headers=reviewer).json()["items"]
    assert [p["id"] for p in queue] == [tip.id] and queue[0]["auto"] is True
    approved = client.post(f"/api/work/post-reviews/{tip.id}/approve", headers=reviewer,
                           json={"contentHash": queue[0]["contentHash"]})
    assert approved.status_code == 200, approved.text
    assert client.get(f"/api/posts/blog/{tip.slug}").status_code == 200
    # The same slot is never drafted twice.
    assert run(factory, WED_12 + 900)["summary"]["blog"] == {"drafted": 0, "skipped": 0}


def test_a_topic_without_approved_knowledge_is_skipped_never_invented(harness, monkeypatch):
    _, factory, _ = harness
    configure(factory, {"autopilot.blog_enabled": True})
    monkeypatch.setattr(A.vector_store, "search", lambda db, topic, limit: [])
    assert run(factory, WED_12)["summary"]["blog"] == {"drafted": 0, "skipped": 1}
    assert auto_posts(factory) == []
    assert items(factory, lane="BLOG")[0].reason == "No approved knowledge source matches a topic in the plan"


def test_the_second_slot_rounds_up_the_weeks_whats_new_posts(harness, monkeypatch):
    _, factory, _ = harness
    configure(factory, {"autopilot.blog_enabled": True, "autopilot.blog_auto_publish": True})
    monkeypatch.setattr(A.vector_store, "search", lambda db, topic, limit: pytest.fail("a round-up needs no topic"))
    with factory() as db:
        db.add(M.Post(id="upd", slug="vault-search", template="PRODUCT_UPDATE", section="NEWS", title="Search in your vault",
                      summary="Find a report by its name.", body=[{"type": "paragraph", "text": "Find a report."}],
                      tags=[], cover_alt="c", cover_art="", author_id="a", status="PUBLISHED", publish_at=WED_12 - 86400,
                      first_published_at=WED_12 - 86400, created_at=WED_12 - 86400, updated_at=WED_12 - 86400))
        db.commit()
    run(factory, WED_12)
    (story,) = auto_posts(factory)
    assert story.template == "STORY" and story.status == "SCHEDULED" and story.publish_at == THU_SLOT
    assert story.body[:2] == [{"type": "heading", "text": "Search in your vault"},
                              {"type": "paragraph", "text": "Find a report by its name."}]
    assert story.body[-1] == {"type": "cta", "label": "Read all updates", "route": "/news"}
    assert items(factory, lane="BLOG")[0].state == "POSTED"


def test_blog_slots_follow_the_configured_days_and_hour():
    days = A.blog_days("thu, mon, xyz")
    assert days == [0, 3]
    slots = A.week_slots(WED_12, IST, days, 2, 10)
    assert [datetime.fromtimestamp(s, IST).strftime("%a %d %H") for s in slots] == [
        "Mon 28 10", "Thu 01 10", "Mon 05 10", "Thu 08 10"]
    assert A.week_slots(WED_12, IST, days, 1, 10)[0] == datetime(2026, 9, 28, 10, tzinfo=IST).timestamp()


# --- super admin: the tab, the kill switch ------------------------------------------------------------------

def test_the_autopilot_tab_is_the_super_admins_and_shows_sources_queue_and_log(harness, monkeypatch):
    client, factory, codes = harness
    assert client.get("/api/ops/autopilot").status_code in (401, 403)
    reviewer = doctor(client, factory, codes)
    assert client.get("/api/ops/autopilot", headers=reviewer).status_code == 403
    configure(factory, {"autopilot.news_enabled": True, "autopilot.news_auto_publish": False})
    serve(monkeypatch, feed(THU_10))
    run(factory, THU_10)
    headers = admin(client, factory, codes)
    state = client.get("/api/ops/autopilot", headers=headers).json()
    assert state["killSwitch"] is False and state["production"] is False and state["timezone"] == "Asia/Kolkata"
    assert state["news"]["enabled"] is True and state["news"]["autoPublish"] is False and state["news"]["perDay"] == 3
    who = next(s for s in state["sources"] if s["id"] == "who_news")
    assert who["enabled"] is True and who["verified"].startswith("2026-10-23") and who["lastItems"] == 10
    icmr = next(s for s in state["sources"] if s["id"] == "icmr")
    assert icmr["url"] == "" and icmr["verified"] == "" and icmr["enabled"] is False
    assert [q["state"] for q in state["queue"]] == ["HELD"] and state["queue"][0]["post"]["status"] == "DRAFT"
    assert all(entry["state"] == "SKIPPED" for entry in state["log"])


def test_check_sources_records_health_without_posting(harness, monkeypatch):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    serve(monkeypatch, feed(time.time()))
    state = client.post("/api/ops/autopilot/check-sources", headers=headers).json()
    assert next(s for s in state["sources"] if s["id"] == "who_news")["lastOkAt"]
    assert auto_posts(factory) == []


def test_the_kill_switch_stops_everything_and_can_take_auto_posts_down(harness, monkeypatch):
    client, factory, codes = harness
    configure(factory, NEWS_ON)
    serve(monkeypatch, feed(THU_10))
    run(factory, THU_10)
    (post,) = auto_posts(factory)
    headers = admin(client, factory, codes)
    assert client.post("/api/ops/autopilot/kill-switch", headers=headers, json={"active": True, "reason": ""}).status_code == 422
    stopped = client.post("/api/ops/autopilot/kill-switch", headers=headers,
                          json={"active": True, "reason": "Checking a summary", "takeDown": True})
    assert stopped.status_code == 200, stopped.text
    assert stopped.json()["killSwitch"] is True and stopped.json()["takenDown"] == 1
    assert client.get(f"/api/posts/news/{post.slug}").status_code == 404
    monkeypatch.setattr(A, "_fetch", lambda url, **kw: pytest.fail("fetched while stopped"))
    assert run(factory, THU_10 + 3 * 3600) == {"status": "SKIPPED", "summary": {"reason": "kill_switch"}}
    with factory() as db:
        history = db.scalars(select(M.SettingOverrideHistory).where(M.SettingOverrideHistory.key == "autopilot.kill_switch")).all()
        events = [e.action for e in db.scalars(select(M.PostEvent).where(M.PostEvent.post_id == post.id))]
    assert [h.reason for h in history] == ["Checking a summary"] and "UNPUBLISHED" in events
    resumed = client.post("/api/ops/autopilot/kill-switch", headers=headers, json={"active": False, "reason": "Checked"})
    assert resumed.json()["killSwitch"] is False


def test_run_now_goes_through_the_scheduler_and_is_audited(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    result = client.post("/api/ops/autopilot/run", headers=headers).json()
    assert result["run"] == {"status": "SKIPPED", "summary": {"reason": "off"}}
    assert result["job"]["lastStatus"] == "SKIPPED"
    with factory() as db:
        assert db.scalar(select(M.WorkflowAudit.id).where(M.WorkflowAudit.action == "AUTOPILOT_RUN_NOW"))


def test_content_and_copy_are_definitions_not_code():
    content = json.loads((REPO / "backend" / "content" / "newsroom" / "autopilot.json").read_text("utf-8"))
    for tag in (content["copy"]["tagAuto"], content["copy"]["tagNews"], content["copy"]["tagRoundup"]):
        assert newsroom.TAG.fullmatch(tag)
    assert A.first_sentences("One. Two two. Three three three. Four.", 300) == "One. Two two. Three three three."
    assert A.trim("a long headline that goes on", 12) == "a long…"
    assert timedelta(seconds=A.JOB_INTERVAL_SECONDS) == timedelta(minutes=15)
