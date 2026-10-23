"""The content module: the precision gate, the clinician switch, the series scheduler (Monday Motivation and the
health rota), categories and series, share links and captions, the link-preview route and its nginx rule, counts."""
import io
import re
import shutil
import socket
import subprocess
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

import pytest
from PIL import Image
from sqlalchemy import select
from test_newsroom import account, admin, create, doctor, post_body  # noqa: F401 — helpers
from test_newsroom_autopilot import THU_10, auto_posts, configure, feed, items, run, serve
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import rule_l
from core import settings_registry as R
from core import workflow_models as M
from services import newsroom, newsroom_content, newsroom_cover, newsroom_series
from services import newsroom_autopilot as A
from services import newsroom_precision as P

REPO = Path(__file__).resolve().parents[2]
IST = ZoneInfo("Asia/Kolkata")
SUN_18 = datetime(2026, 10, 4, 18, 0, tzinfo=IST).timestamp()    # before Monday's slots (08:00 motivation, 17:00 health)
MON_SLOT = datetime(2026, 10, 5, 17, 0, tzinfo=IST).timestamp()
TUE_18 = datetime(2026, 10, 6, 18, 0, tzinfo=IST).timestamp()
THU_18 = datetime(2026, 10, 8, 18, 0, tzinfo=IST).timestamp()
SERIES_ON = {"series.health.enabled": True}
ADVICE = P.phrases(R.get_declaration("content.advice_phrases").default)
UNVERIFIABLE = P.phrases(R.get_declaration("content.unverifiable_phrases").default)


@pytest.fixture(autouse=True)
def _fresh_settings():
    R.reset_cache()
    yield
    R.reset_cache()


def knowledge(monkeypatch, asked=None):
    def search(db, topic, limit):
        if asked is not None:
            asked.append(topic)
        title = topic.capitalize()
        return [{"title": title, "content": f"{title}. Regular routines help many students. A campus clinic can answer "
                 "questions.", "sourceId": f"k-{topic}", "category": "wellness", "version": 1, "score": 0.9, "stale": False}]
    monkeypatch.setattr(A.vector_store, "search", search)


def gate(texts, source_text, *, published=THU_10 - 3600, allowed=True, kind=P.FEED, now=THU_10):
    return P.score(texts, P.Source(text=source_text, allowed=allowed, kind=kind, published_at=published), now,
                   threshold=100, min_support=70, max_age_hours=72, advice=ADVICE, unverifiable=UNVERIFIABLE)


# --- the precision gate --------------------------------------------------------------------------------------

SOURCE = ("WHO publishes new guidance on heat. Heatwaves affected 40 countries in 2025. The guidance asks cities to "
          "open cooling centres.")


def test_a_sentence_copied_or_grounded_in_the_source_passes():
    report = gate(["WHO publishes new guidance on heat", "Heatwaves affected 40 countries in 2025."], SOURCE)
    assert report.passed and report.score == 100 and all(s["ok"] for s in report.sentences)


@pytest.mark.parametrize(("sentence", "reason"), [
    ("Heatwaves affected 45 countries in 2025.", P.NEW_NUMBER),
    ("Heatwaves affected 40 countries, says Dr Rao.", P.NEW_NAME),
    ("Take 500 mg of paracetamol in a heatwave.", P.ADVICE),
    ("Studies show cooling centres save lives.", P.UNVERIFIABLE),
    ("Exam timetables move to the morning next semester.", P.NOT_IN_SOURCE),
])
def test_each_failure_is_named_per_sentence(sentence, reason):
    report = gate(["WHO publishes new guidance on heat.", sentence], SOURCE)
    assert not report.passed and report.score == 50
    failed = [s for s in report.sentences if not s["ok"]]
    assert [f["text"] for f in failed] == [sentence] and reason in failed[0]["reasons"]


def test_crisis_words_always_send_a_post_to_review_even_when_copied():
    crisis = P.phrases(R.get_declaration("content.crisis_phrases").default)
    text = "Tele-MANAS supports people thinking about suicide."
    report = P.score([text], P.Source(text=text, allowed=True, kind=P.KNOWLEDGE), THU_10, threshold=100, min_support=70,
                     max_age_hours=72, advice=ADVICE, unverifiable=UNVERIFIABLE, crisis=crisis)
    assert not report.passed and P.CRISIS in report.sentences[0]["reasons"]


def test_an_unverifiable_phrase_the_source_itself_uses_is_allowed():
    report = gate(["Studies show cooling centres help."], "Studies show cooling centres help in heatwaves.")
    assert report.passed


@pytest.mark.parametrize(("kwargs", "reason"), [
    ({"allowed": False}, P.SOURCE_NOT_ALLOWED),
    ({"published": THU_10 - 10 * 86400}, P.SOURCE_OLD),
    ({"published": 0.0}, P.SOURCE_UNDATED),
])
def test_a_failing_source_scores_zero_whatever_the_sentences(kwargs, reason):
    report = gate(["WHO publishes new guidance on heat."], SOURCE, **kwargs)
    assert report.score == 0 and not report.passed and reason in report.source


def test_approved_knowledge_needs_no_date_and_nothing_to_check_fails():
    assert gate(["Regular routines help."], "Regular routines help.", kind=P.KNOWLEDGE, published=0.0).passed
    assert P.NOTHING_TO_CHECK in gate([], SOURCE).source


# --- news through the gate --------------------------------------------------------------------------------------

def test_precise_news_goes_out_and_imprecise_news_waits_with_its_reasons(harness, monkeypatch):
    client, factory, codes = harness
    configure(factory, {"autopilot.news_enabled": True})          # auto-publish is on by default: precise only
    serve(monkeypatch, feed(THU_10))
    run(factory, THU_10)
    (first,) = auto_posts(factory)
    assert first.status == "PUBLISHED" and first.precision == 100 and first.hold_reason == ""
    assert first.category_id                                      # classified from the categories' keywords
    # The next one is written with a number the source does not have: held for the super admin.
    real = A.write_news
    monkeypatch.setattr(A, "write_news", lambda db, item: (lambda w: (w[0], f"{w[1]} About 99 cases were seen.", w[2]))(
        real(db, item)))
    run(factory, THU_10 + 3 * 3600)
    second = auto_posts(factory)[1]
    assert second.status == "DRAFT" and second.hold_reason == "PRECISION" and second.precision < 100
    failed = [s for s in second.precision_report["sentences"] if not s["ok"]]
    assert failed and failed[-1]["text"] == "About 99 cases were seen." and P.NEW_NUMBER in failed[-1]["reasons"]
    assert items(factory, post_id=second.id)[0].state == "HELD"
    assert client.get(f"/api/posts/news/{second.slug}").status_code == 404
    headers = admin(client, factory, codes)
    queue = client.get("/api/ops/posts?queue=review", headers=headers).json()["items"]
    assert [p["id"] for p in queue] == [second.id] and queue[0]["holdReason"] == "PRECISION"
    assert queue[0]["precisionReport"]["sentences"][-1]["ok"] is False
    # The super admin reads it and publishes it (or fixes it first): one click.
    assert client.post(f"/api/ops/posts/{second.id}/publish", headers=headers, json={}).status_code == 200
    assert client.get("/api/ops/posts?queue=review", headers=headers).json()["items"] == []


# --- the series scheduler and the clinician switch ------------------------------------------------------------------

def test_the_health_series_cycles_its_rota_on_monday_wednesday_and_friday(harness, monkeypatch):
    _, factory, _ = harness
    configure(factory, SERIES_ON)
    asked = []
    knowledge(monkeypatch, asked)
    assert run(factory, SUN_18)["summary"]["series"]["health"] == {"drafted": 1, "skipped": 0}
    run(factory, TUE_18)
    run(factory, THU_18)
    posts = auto_posts(factory)
    assert [p.category_id for p in posts] == ["mental-health", "womens-health", "common-health"]
    assert [p.episode for p in posts] == [1, 2, 3] and len({p.series_id for p in posts}) == 1
    assert asked == ["exam stress", "menstrual health", "hydration"]   # each category's first topic
    assert posts[0].template == "SERIES_EPISODE" and posts[0].publish_at == MON_SLOT
    # Never twice for one slot.
    assert run(factory, SUN_18 + 900)["summary"]["series"]["health"] == {"drafted": 0, "skipped": 0}


def test_health_episodes_wait_for_a_clinician_while_the_switch_is_on(harness, monkeypatch):
    client, factory, codes = harness
    configure(factory, {**SERIES_ON, "content.health_requires_clinician": True})
    knowledge(monkeypatch)
    run(factory, SUN_18)
    (episode,) = auto_posts(factory)
    assert episode.precision == 100 and episode.status == "SCHEDULED"
    assert items(factory, post_id=episode.id)[0].reason == A.HELD_CLINICIAN
    assert client.get(f"/api/posts/blog/{episode.slug}").status_code == 404
    reviewer = doctor(client, factory, codes)
    queue = client.get("/api/work/post-reviews", headers=reviewer).json()["items"]
    assert [p["id"] for p in queue] == [episode.id]
    approved = client.post(f"/api/work/post-reviews/{episode.id}/approve", headers=reviewer,
                           json={"contentHash": queue[0]["contentHash"]})
    assert approved.status_code == 200
    page = client.get(f"/api/posts/blog/{episode.slug}").json()
    # Mental health: the crisis lines are part of the page, and the series is named with the episode number.
    assert page["crisisLines"] is True and page["category"]["id"] == "mental-health"
    assert page["series"]["slug"] == "health-series" and page["series"]["episode"] == 1


def test_with_the_switch_off_precise_episodes_go_out_and_imprecise_ones_wait_for_the_super_admin(harness, monkeypatch):
    client, factory, codes = harness
    configure(factory, SERIES_ON)                                  # the switch is off by default
    knowledge(monkeypatch)
    run(factory, SUN_18)
    (episode,) = auto_posts(factory)
    assert episode.status == "SCHEDULED" and items(factory, post_id=episode.id)[0].state == "POSTED"
    assert client.get(f"/api/posts/blog/{episode.slug}").status_code == 200    # its slot has passed, no clinician
    # An imprecise one (a number its sources do not have) waits for the super admin, not the clinician.
    monkeypatch.setattr(A, "_approved_tip", lambda db, topic, block: (
        [{"title": "Menstrual health", "content": "Menstrual health. Regular routines help many students."}],
        "Regular routines help 9 in 10 students.", "extractive"))
    run(factory, TUE_18)
    held = auto_posts(factory)[1]
    assert held.status == "DRAFT" and held.hold_reason == "PRECISION"
    assert client.get(f"/api/posts/blog/{held.slug}").status_code == 404
    # A team member's edit resets the score: the post now needs a clinician like any typed health post.
    headers = admin(client, factory, codes)
    body = client.get(f"/api/ops/posts/{held.id}", headers=headers).json()
    fixed = {k: body[k] for k in ("template", "slug", "title", "summary", "body", "tags", "coverAlt", "coverArt",
                                  "seoTitle", "seoDescription", "featured", "authorId", "categoryId", "seriesId")}
    fixed["body"] = [{"type": "paragraph", "text": "Regular routines help many students."}]
    saved = client.put(f"/api/ops/posts/{held.id}", headers=headers, json=fixed).json()
    assert saved["precision"] == -1 and saved["needsReview"] is True and "clinician" in saved["blockedBy"]


def test_a_health_tip_typed_by_the_team_needs_a_clinician_whatever_the_switch(harness):
    client, factory, codes = harness
    configure(factory, {"content.health_requires_clinician": False})
    headers = admin(client, factory, codes)
    tip = create(client, headers, template="HEALTH_TIP", slug="sleep-tip")
    refused = client.post(f"/api/ops/posts/{tip['id']}/publish", headers=headers, json={})
    assert refused.status_code == 409 and "clinician" in refused.json()["detail"]
    # So is an explainer in a clinical category; one in Campus life is not health content.
    dengue = create(client, headers, template="EXPLAINER", slug="what-is-dengue", categoryId="common-health")
    assert client.post(f"/api/ops/posts/{dengue['id']}/publish", headers=headers, json={}).status_code == 409
    exams = create(client, headers, template="EXPLAINER", slug="how-exams-work", categoryId="campus-life")
    assert client.post(f"/api/ops/posts/{exams['id']}/publish", headers=headers, json={}).status_code == 200


def test_monday_motivation_uses_only_its_library_and_never_invents_a_quote(harness, monkeypatch):
    client, factory, codes = harness
    configure(factory, {"series.motivation.enabled": True})
    assert run(factory, SUN_18)["summary"]["series"]["motivation"] == {"drafted": 0, "skipped": 1}
    assert auto_posts(factory) == []
    assert items(factory)[0].reason == "The Monday Motivation library is empty"
    headers = admin(client, factory, codes)
    series = next(s for s in client.get("/api/ops/post-series", headers=headers).json()["items"]
                  if s["autopilotKey"] == "motivation")
    edit = {"name": series["name"], "summary": series["summary"], "categoryId": series["categoryId"],
            "template": series["template"], "hue": series["hue"]}
    # A quote without its author, source and public-domain mark is refused.
    unattributed = client.put(f"/api/ops/post-series/{series['id']}", headers=headers,
                              json={**edit, "library": [{"kind": "quote", "text": "Well begun is half done."}]})
    assert unattributed.status_code == 422
    library = [{"kind": "own", "text": "Pick one small thing you can finish today, and finish it."}]
    assert client.put(f"/api/ops/post-series/{series['id']}", headers=headers,
                      json={**edit, "library": library}).status_code == 200
    run(factory, SUN_18 + 7 * 86400)
    (post,) = auto_posts(factory)
    assert post.template == "MOTIVATION" and post.precision == 100 and post.status == "SCHEDULED"
    assert post.body[0]["text"] == library[0]["text"] and post.body[0]["cite"] == "From the StudentKare team"


def test_series_slots_follow_the_settings():
    assert A.blog_days("MON,WED,FRI") == [0, 2, 4]
    assert R.get_declaration("series.health.rota").default == "mental-health,womens-health,common-health"
    assert R.get_declaration("series.motivation.days").default == "MON"
    for key in ("series.health.enabled", "series.motivation.enabled"):
        assert R.get_declaration(key).default is False
    # Krishna, 2026-10-23: health series posts do not need a clinician; the switch stays to turn it back on.
    assert R.get_declaration("content.health_requires_clinician").default is False


# --- categories and series --------------------------------------------------------------------------------------------

def test_new_tables_have_a_plane_and_defaults_are_definitions():
    for table in ("care_post_categories", "care_post_series", "care_post_stats"):
        assert rule_l.TABLE_PLANES[table] == rule_l.PLATFORM
    import json
    manifest = json.loads((REPO / "design/icons/icon-manifest.json").read_text())
    icons = {i["name"] for i in manifest["icons"]}
    assert newsroom_content.CATEGORY_ICONS <= icons
    assert all(c["icon"] in newsroom_content.CATEGORY_ICONS and c["hue"] in newsroom_content.HUES
               for c in newsroom.CONTENT_DEFS["categories"])
    assert set(newsroom_content.HUES) == set(json.loads((newsroom_cover.CONTENT / "cover.json").read_text())["hues"])


def test_categories_are_the_super_admins_to_create_rename_and_archive(harness):
    client, factory, codes = harness
    reviewer = doctor(client, factory, codes)
    assert client.get("/api/ops/post-categories", headers=reviewer).status_code == 403
    headers = admin(client, factory, codes)
    listed = client.get("/api/ops/post-categories", headers=headers).json()
    assert [c["id"] for c in listed["items"]][:3] == ["mental-health", "womens-health", "common-health"]
    made = client.post("/api/ops/post-categories", headers=headers, json={
        "name": "Sleep health", "hue": "sky", "icon": "moon", "hashtags": ["#Sleep"], "keywords": ["Sleep"]})
    assert made.status_code == 201
    sleep = next(c for c in made.json()["items"] if c["id"] == "sleep-health")
    assert sleep["hashtags"] == ["Sleep"] and sleep["keywords"] == ["sleep"]
    assert client.post("/api/ops/post-categories", headers=headers, json={
        "name": "Bad", "hue": "#FF0000", "icon": "moon"}).status_code == 422
    assert client.post("/api/ops/post-categories", headers=headers, json={
        "name": "Bad", "hue": "sky", "icon": "not-an-icon"}).status_code == 422
    renamed = client.put("/api/ops/post-categories/sleep-health", headers=headers, json={
        "name": "Sleep", "hue": "teal", "icon": "moon"}).json()
    assert next(c for c in renamed["items"] if c["id"] == "sleep-health")["name"] == "Sleep"
    client.post("/api/ops/post-categories/sleep-health/archive", headers=headers, json={"archived": True})
    assert "sleep-health" not in {c["id"] for c in client.get("/api/post-categories").json()["items"]}
    # Mental health always carries the crisis lines and can't be archived.
    off = client.put("/api/ops/post-categories/mental-health", headers=headers, json={
        "name": "Mind", "hue": "violet", "icon": "brain", "clinical": False, "crisisLines": False}).json()
    mind = next(c for c in off["items"] if c["id"] == "mental-health")
    assert mind["crisisLines"] is True and mind["clinical"] is True and mind["name"] == "Mind"
    assert client.post("/api/ops/post-categories/mental-health/archive", headers=headers,
                       json={"archived": True}).status_code == 409
    # An archived category takes no new posts.
    assert client.post("/api/ops/posts", headers=headers, json=post_body(categoryId="sleep-health")).status_code == 422
    with factory() as db:
        audit = db.scalars(select(M.WorkflowAudit.action).where(M.WorkflowAudit.action.like("POST_CATEGORY_%"))).all()
    assert set(audit) >= {"POST_CATEGORY_CREATED", "POST_CATEGORY_EDITED", "POST_CATEGORY_ARCHIVED"}


def test_a_series_numbers_its_episodes_and_has_its_own_public_page(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    made = client.post("/api/ops/post-series", headers=headers, json={
        "name": "Hostel kitchen", "hue": "amber", "categoryId": "nutrition", "template": "EXPLAINER"})
    assert made.status_code == 201
    series = next(s for s in made.json()["items"] if s["slug"] == "hostel-kitchen")
    assert client.get("/api/series/hostel-kitchen").status_code == 404           # nothing public yet
    one = create(client, headers, slug="kitchen-one", seriesId=series["id"])
    two = create(client, headers, slug="kitchen-two", seriesId=series["id"])
    assert (one["episode"], two["episode"]) == (1, 2)
    for post in (one, two):
        client.post(f"/api/ops/posts/{post['id']}/publish", headers=headers, json={})
    page = client.get("/api/series/hostel-kitchen").json()
    assert page["series"]["name"] == "Hostel kitchen" and page["total"] == 2
    assert [i["series"]["episode"] for i in page["items"]] == [2, 1]
    assert [s["slug"] for s in client.get("/api/series").json()["items"]] == ["hostel-kitchen"]
    assert client.get("/api/posts?series=hostel-kitchen").json()["total"] == 2


def test_content_list_filters_and_one_click_unpublish(harness, monkeypatch):
    client, factory, codes = harness
    configure(factory, {"autopilot.news_enabled": True})
    serve(monkeypatch, feed(THU_10))
    run(factory, THU_10)
    headers = admin(client, factory, codes)
    manual = create(client, headers, slug="typed-by-us", categoryId="campus-life")
    client.post(f"/api/ops/posts/{manual['id']}/publish", headers=headers, json={})
    auto = client.get("/api/ops/posts?origin=AUTO", headers=headers).json()["items"]
    assert len(auto) == 1 and auto[0]["auto"] is True
    assert [p["id"] for p in client.get("/api/ops/posts?origin=MANUAL", headers=headers).json()["items"]] == [manual["id"]]
    assert [p["id"] for p in client.get("/api/ops/posts?category=campus-life", headers=headers).json()["items"]] == [manual["id"]]
    by_source = client.get("/api/ops/posts", headers=headers, params={"source": "World Health Organization"}).json()
    assert [p["id"] for p in by_source["items"]] == [auto[0]["id"]]
    assert client.post(f"/api/ops/posts/{auto[0]['id']}/unpublish", headers=headers).json()["status"] == "UNPUBLISHED"


# --- share kit, link previews, counts ------------------------------------------------------------------------------------

def test_share_links_are_plain_urls_with_utm_tags():
    url = "https://studentkare.co/blog/sleep?utm_source=linkedin"
    assert newsroom_content.share_link("linkedin", url, "Sleep") == (
        "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fstudentkare.co%2Fblog%2Fsleep%3Futm_source%3Dlinkedin")
    assert newsroom_content.share_link("whatsapp", "https://s.co/a", "Hi there").startswith("https://wa.me/?text=Hi%20there%20https")
    assert newsroom_content.share_link("facebook", "https://s.co/a", "T") == "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fs.co%2Fa"
    assert newsroom_content.share_link("telegram", "https://s.co/a", "T") == "https://t.me/share/url?url=https%3A%2F%2Fs.co%2Fa&text=T"
    assert newsroom_content.share_link("x", "https://s.co/a", "T") == "https://x.com/intent/post?url=https%3A%2F%2Fs.co%2Fa&text=T"
    mail = newsroom_content.share_link("email", "https://s.co/a", "T", "S")
    assert mail.startswith("mailto:?subject=T&body=S")
    for channel in newsroom_content.SHARE_ENDPOINTS:
        link = newsroom_content.share_link(channel, "https://s.co/a", "T")
        assert "<script" not in link and urlsplit(link).scheme in ("https", "mailto")


def test_the_share_kit_gives_links_a_caption_and_both_cards(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    post = create(client, headers, template="CAMPUS_NEWS", slug="camp-week", categoryId="mental-health",
                  title="Wellbeing week on campus", summary="Talks and quiet rooms all week.")
    kit = client.get(f"/api/ops/posts/{post['id']}/share-kit", headers=headers).json()
    linkedin = parse_qs(urlsplit(parse_qs(urlsplit(kit["links"]["linkedin"]).query)["url"][0]).query)
    assert linkedin == {"utm_source": ["linkedin"], "utm_medium": ["social"], "utm_campaign": ["newsroom"]}
    assert set(kit["links"]) == {"linkedin", "whatsapp", "x", "facebook", "telegram", "email"}
    caption = kit["caption"]
    assert caption.startswith("Wellbeing week on campus\n\nTalks and quiet rooms all week.")
    assert "Tele-MANAS 14416" in caption and "112" in caption                     # mental health: the crisis lines
    assert "#MentalHealth" in caption and caption.rstrip().endswith("#StudentKare")
    assert len(re.findall(r"#\w+", caption)) <= R.get_declaration("content.caption_hashtags_max").default
    for fmt, size in newsroom_cover.FORMATS.items():
        card = client.get(kit["cards"][fmt].removeprefix(""), headers=headers)
        assert card.status_code == 200 and "attachment" in card.headers["content-disposition"]
        assert Image.open(io.BytesIO(card.content)).size == size
    configure(factory, {"content.share_utm_enabled": False})
    plain = client.get(f"/api/ops/posts/{post['id']}/share-kit", headers=headers).json()
    assert "utm_" not in plain["links"]["linkedin"]
    assert client.get(f"/api/ops/posts/{post['id']}/share-kit", headers=doctor(client, factory, codes)).status_code == 403


def test_link_previews_carry_the_posts_own_meta_for_published_posts_only(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    post = create(client, headers, slug="heat-week", title='Heat week: "cool" rooms & water', summary="Where to cool down.")
    assert client.get("/api/posts/news/heat-week/preview.html").status_code == 404     # a draft is never previewed
    client.post(f"/api/ops/posts/{post['id']}/publish", headers=headers, json={})
    page = client.get("/api/posts/news/heat-week/preview.html")
    assert page.status_code == 200 and page.headers["content-type"].startswith("text/html")
    html = page.text
    assert '<meta property="og:title" content="Heat week: &quot;cool&quot; rooms &amp; water">' in html
    assert '<meta property="og:description" content="Where to cool down.">' in html
    assert '<meta property="og:image" content="https://studentkare.co/api/posts/news/heat-week/og.png">' in html
    assert '<meta property="og:url" content="https://studentkare.co/news/heat-week">' in html
    assert '<meta name="twitter:card" content="summary_large_image">' in html
    assert '<link rel="canonical" href="https://studentkare.co/news/heat-week">' in html
    assert "<script" not in html
    assert client.get("/api/posts/blog/heat-week/preview.html").status_code == 404     # wrong section


NGINX = REPO / "deploy/nginx.conf"
CRAWLERS = ("LinkedInBot/1.0", "facebookexternalhit/1.1", "Twitterbot/1.0", "WhatsApp/2.23", "TelegramBot (like TwitterBot)")


def test_nginx_sends_link_preview_crawlers_to_the_preview_route():
    conf = NGINX.read_text()
    assert "map $http_user_agent $sk_link_preview" in conf
    for bot in ("LinkedInBot", "facebookexternalhit", "Twitterbot", "WhatsApp", "TelegramBot"):
        assert bot in conf
    assert "rewrite ^ /api/posts/$sk_post_section/$sk_post_slug/preview.html? break;" in conf
    route = re.search(r'location ~ "(\^/\(blog\|news\)/.*?)"', conf).group(1)
    assert re.fullmatch(route.replace("$", r"\Z"), "/blog/exam-week") and not re.fullmatch(route, "/blog/../etc")


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


NGINX_BIN = shutil.which("nginx") or ""


@pytest.mark.skipif(not NGINX_BIN, reason="nginx is not installed here (the static test still runs)")
def test_nginx_routes_crawlers_and_people_differently(tmp_path):
    api, web = _free_port(), _free_port()

    class Api(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802 — the stdlib's name
            body = f"PREVIEW {self.path}".encode()
            self.send_response(200)
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", api), Api)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    (tmp_path / "html").mkdir()
    (tmp_path / "html/index.html").write_text("SHELL")
    (tmp_path / "snippets").mkdir()
    shutil.copy(REPO / "deploy/nginx/security-headers.conf", tmp_path / "snippets")
    site = (NGINX.read_text().replace("${BACKEND_UPSTREAM}", f"127.0.0.1:{api}")
            .replace("/etc/nginx/snippets", str(tmp_path / "snippets"))
            .replace("root /usr/share/nginx/html", f"root {tmp_path / 'html'}").replace("listen 80;", f"listen {web};"))
    (tmp_path / "site.conf").write_text(site)
    temp = " ".join(f"{name}_temp_path {tmp_path};" for name in ("client_body", "proxy", "fastcgi", "uwsgi", "scgi"))
    (tmp_path / "nginx.conf").write_text(
        f"user root; worker_processes 1; pid {tmp_path}/nginx.pid; error_log {tmp_path}/error.log; daemon on;\n"
        f"events {{}} http {{ access_log off; {temp} include {tmp_path}/site.conf; }}\n")
    if subprocess.run([NGINX_BIN, "-t", "-c", str(tmp_path / "nginx.conf")], capture_output=True).returncode != 0:  # noqa: S603
        pytest.skip("nginx here cannot load this configuration (permissions or modules)")
    subprocess.run([NGINX_BIN, "-c", str(tmp_path / "nginx.conf")], check=True)  # noqa: S603
    try:
        time.sleep(0.3)

        def get(path, agent):
            return urlopen(Request(f"http://127.0.0.1:{web}{path}", headers={"User-Agent": agent}), timeout=5).read().decode()

        for bot in CRAWLERS:
            assert get("/blog/exam-week", bot) == "PREVIEW /api/posts/blog/exam-week/preview.html"
        assert get("/news/heat-week?utm_source=linkedin", "LinkedInBot") == "PREVIEW /api/posts/news/heat-week/preview.html"
        assert get("/blog/exam-week", "Mozilla/5.0 (iPhone)") == "SHELL"
        assert get("/blog", "LinkedInBot") == "SHELL"
    finally:
        subprocess.run([NGINX_BIN, "-c", str(tmp_path / "nginx.conf"), "-s", "stop"], check=False)  # noqa: S603
        server.shutdown()


def test_views_and_shares_are_counted_without_the_reader(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    post = create(client, headers, slug="count-me")
    assert client.post("/api/posts/news/count-me/hit", json={"kind": "view"}).status_code == 404   # not public
    client.post(f"/api/ops/posts/{post['id']}/publish", headers=headers, json={})
    for _ in range(3):
        assert client.post("/api/posts/news/count-me/hit", json={"kind": "view"}).status_code == 204
    client.post("/api/posts/news/count-me/hit", json={"kind": "share", "channel": "linkedin"})
    assert client.post("/api/posts/news/count-me/hit", json={"kind": "share", "channel": "myspace"}).status_code == 422
    (row,) = client.get("/api/ops/post-stats", headers=headers).json()["items"]
    assert row["views"] == 3 and row["shares"] == {"linkedin": 1} and row["sharesTotal"] == 1
    with factory() as db:
        stat = db.get(M.PostStat, post["id"])
    assert set(M.PostStat.__table__.columns.keys()) == {"post_id", "views", "shares"} and stat.views == 3


def test_the_composer_warns_of_a_similar_recent_title(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    create(client, headers, slug="exam-week-sleep", title="Sleeping well during exam week")
    found = client.get("/api/ops/posts-similar", headers=headers, params={"title": "Sleeping during exam week"}).json()
    assert [f["title"] for f in found["items"]] == ["Sleeping well during exam week"]
    assert client.get("/api/ops/posts-similar", headers=headers, params={"title": "Campus food fair"}).json()["items"] == []


def test_new_templates_and_blocks_are_validated():
    assert newsroom.validate_block("MYTH_FACT", {"type": "mythfact", "myth": "Cold weather causes flu.",
                                                 "fact": "Flu is caused by a virus."}, set())["myth"]
    with pytest.raises(ValueError):
        newsroom.validate_block("STORY", {"type": "stat", "value": "3", "label": "Clinics"}, set())
    with pytest.raises(ValueError):
        newsroom.validate_block("QUICK_CARD", {"type": "stat", "value": "1234567890123", "label": "Too long"}, set())
    assert set(newsroom.ADVICE_TEMPLATES) == {"HEALTH_TIP", "SERIES_EPISODE", "EXPLAINER", "MYTH_FACT", "QUICK_CARD"}
    png = newsroom_cover.render_png("SERIES_EPISODE", "Series episode", "Exam stress", "studentkare.co", hue="violet",
                                    fmt="portrait", summary="A short summary.")
    assert Image.open(io.BytesIO(png)).size == (1080, 1350)


def test_the_series_scheduler_is_part_of_the_job_and_respects_the_kill_switch(harness, monkeypatch):
    _, factory, _ = harness
    configure(factory, {**SERIES_ON, "autopilot.kill_switch": True})
    knowledge(monkeypatch)
    assert run(factory, SUN_18) == {"status": "SKIPPED", "summary": {"reason": "kill_switch"}}
    assert newsroom_series.KEYS == ("motivation", "health")
