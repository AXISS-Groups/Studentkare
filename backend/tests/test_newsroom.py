"""The newsroom: drafts never public, health tips only with a clinician's review of exactly what is published,
scheduled publishing, unique slugs, feeds and sitemap, the share image, roles and the audit trail, scanned uploads."""
import io
import json
import re
import time
from pathlib import Path

import pytest
from fastapi import HTTPException
from PIL import Image
from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import rule_l
from core import workflow_models as M
from services import newsroom, newsroom_cover
from services.newsroom_samples import seed_sample_posts

OPS = "/api/ops/posts"
WORK = "/api/work/post-reviews"
REPO = Path(__file__).resolve().parents[2]


def account(factory, account_id, role, name=None):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
                         full_name=name or f"Test {role}", role=role, active=True, profile={}, created_at=time.time()))
        db.commit()


def admin(client, factory, codes):
    account(factory, "admin", "SUPER_ADMIN", "Asha Editor")
    return login(client, codes, "admin@example.test")


def doctor(client, factory, codes, account_id="doc"):
    account(factory, account_id, "NMC_DOCTOR", "Dr. Meera Rao")
    return login(client, codes, f"{account_id}@example.test")


def post_body(template="CAMPUS_NEWS", slug="health-camp-week", **extra):
    body = {"template": template, "slug": slug, "title": "Health camp week", "summary": "What happens and where.",
            "coverAlt": "Amber campus news cover", "authorId": "admin", "tags": ["Campus", "camp"],
            "body": [{"type": "paragraph", "text": "Doors open at nine."}]}
    body.update(extra)
    return body


def create(client, headers, **extra):
    response = client.post(OPS, headers=headers, json=post_body(**extra))
    assert response.status_code == 201, response.text
    return response.json()


def public(client, section="news", slug="health-camp-week"):
    return client.get(f"/api/posts/{section}/{slug}")


def test_every_newsroom_table_has_a_plane():
    for table in ("care_posts", "care_post_events", "care_post_images"):
        assert rule_l.TABLE_PLANES[table] == rule_l.PLATFORM


def test_a_draft_is_never_public_and_publishing_needs_everything(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    post = create(client, headers, authorId="", coverAlt="")
    assert post["status"] == "DRAFT" and post["live"] is False and post["tags"] == ["campus", "camp"]
    assert public(client).status_code == 404
    assert client.get("/api/posts", params={"section": "news"}).json()["items"] == []
    refused = client.post(f"{OPS}/{post['id']}/publish", headers=headers, json={})
    assert refused.status_code == 409 and "alt text" in refused.json()["detail"]
    client.put(f"{OPS}/{post['id']}", headers=headers, json=post_body())
    published = client.post(f"{OPS}/{post['id']}/publish", headers=headers, json={})
    assert published.status_code == 200, published.text
    shown = public(client).json()
    assert shown["title"] == "Health camp week" and shown["author"]["name"] == "Asha Editor"
    assert shown["readingMinutes"] == 1 and shown["reviewed"] is None and shown["sample"] is False
    assert "max-age=" in public(client).headers["cache-control"]
    # Under the wrong section the post is not found.
    assert public(client, "blog").status_code == 404
    client.post(f"{OPS}/{post['id']}/unpublish", headers=headers)
    assert public(client).status_code == 404


def test_health_tip_needs_a_clinician_review_of_exactly_what_is_published(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    tip = create(client, headers, template="HEALTH_TIP", slug="sleep-in-exam-week",
                 body=[{"type": "paragraph", "text": "Keep a regular bedtime."}])
    assert tip["section"] == "blog" and tip["needsReview"] is True
    refused = client.post(f"{OPS}/{tip['id']}/publish", headers=headers, json={})
    assert refused.status_code == 409 and "clinician" in refused.json()["detail"]
    # The super admin cannot approve: no admin bypass.
    assert client.post(f"{WORK}/{tip['id']}/approve", headers=headers, json={"contentHash": tip["contentHash"]}).status_code == 403

    doc = doctor(client, factory, codes)
    queue = client.get(WORK, headers=doc).json()["items"]
    assert [q["id"] for q in queue] == [tip["id"]]
    stale = client.post(f"{WORK}/{tip['id']}/approve", headers=doc, json={"contentHash": "0" * 64})
    assert stale.status_code == 409
    approved = client.post(f"{WORK}/{tip['id']}/approve", headers=doc, json={"contentHash": tip["contentHash"]})
    assert approved.status_code == 200 and approved.json()["review"]["current"] is True
    assert client.get(WORK, headers=doc).json()["items"] == []

    headers = login(client, codes, "admin@example.test")
    assert client.post(f"{OPS}/{tip['id']}/publish", headers=headers, json={}).status_code == 200
    shown = public(client, "blog", "sleep-in-exam-week").json()
    assert shown["reviewed"]["by"] == "Dr. Meera Rao" and shown["reviewed"]["on"]

    # An edit after the review takes it off the site until it is reviewed again.
    edited = client.put(f"{OPS}/{tip['id']}", headers=headers, json=post_body(
        template="HEALTH_TIP", slug="sleep-in-exam-week", body=[{"type": "paragraph", "text": "Changed advice."}]))
    assert edited.status_code == 200 and edited.json()["live"] is False
    assert "REVIEW_VOIDED" in [h["action"] for h in edited.json()["history"]]
    assert public(client, "blog", "sleep-in-exam-week").status_code == 404
    assert client.get("/api/posts", params={"template": "HEALTH_TIP"}).json()["items"] == []


def test_a_clinician_can_withdraw_and_cannot_edit(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    tip = create(client, headers, template="HEALTH_TIP", slug="hydration")
    doc = doctor(client, factory, codes)
    assert client.post(OPS, headers=doc, json=post_body(slug="x-y-z")).status_code == 403
    assert client.put(f"{OPS}/{tip['id']}", headers=doc, json=post_body(template="HEALTH_TIP", slug="hydration")).status_code == 403
    client.post(f"{WORK}/{tip['id']}/approve", headers=doc, json={"contentHash": tip["contentHash"]})
    headers = login(client, codes, "admin@example.test")
    client.post(f"{OPS}/{tip['id']}/publish", headers=headers, json={})
    assert public(client, "blog", "hydration").status_code == 200
    doc = login(client, codes, "doc@example.test")
    assert client.post(f"{WORK}/{tip['id']}/withdraw", headers=doc).status_code == 200
    assert public(client, "blog", "hydration").status_code == 404
    # A clinician sees health tips only.
    headers = login(client, codes, "admin@example.test")
    news = create(client, headers, slug="other-news")
    doc = login(client, codes, "doc@example.test")
    assert client.get(f"{WORK}/{news['id']}", headers=doc).status_code == 404


def test_scheduled_posts_appear_only_when_due(harness, monkeypatch):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    post = create(client, headers)
    later = time.time() + 3600
    scheduled = client.post(f"{OPS}/{post['id']}/publish", headers=headers, json={"publishAt": later})
    assert scheduled.json()["status"] == "SCHEDULED" and scheduled.json()["live"] is False
    assert public(client).status_code == 404
    real = time.time
    monkeypatch.setattr(newsroom.time, "time", lambda: real() + 7200)
    assert public(client).status_code == 200
    assert client.get("/api/posts", params={"section": "news"}).json()["featured"]["slug"] == "health-camp-week"


def test_slugs_are_unique_and_well_formed(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    create(client, headers)
    clash = client.post(OPS, headers=headers, json=post_body(template="STORY"))
    assert clash.status_code == 409 and "slug" in clash.json()["detail"]
    assert client.post(OPS, headers=headers, json=post_body(slug="Bad Slug!")).status_code == 422
    other = create(client, headers, slug="second-post")
    moved = client.put(f"{OPS}/{other['id']}", headers=headers, json=post_body(slug="health-camp-week"))
    assert moved.status_code == 409


def test_blocks_follow_the_template_and_never_link_outside(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    bad = [
        [{"type": "cta", "label": "Go", "route": "https://example.com"}],
        [{"type": "callout", "tone": "danger", "text": "Red is for safety alerts."}],
        [{"type": "quote", "text": "Health tips have no quotes."}],
        [{"type": "image", "imageId": "nope", "alt": "A picture"}],
        [{"type": "html", "text": "<b>no</b>"}],
    ]
    for blocks in bad:
        response = client.post(OPS, headers=headers, json=post_body(template="HEALTH_TIP", slug="blocks", body=blocks))
        assert response.status_code == 422, blocks
    assert client.post(OPS, headers=headers, json=post_body(coverArt="sos-alt--p1")).status_code == 422
    assert client.post(OPS, headers=headers, json=post_body(authorId="nobody")).status_code == 422


def test_roles(harness):
    client, factory, codes = harness
    assert client.get(OPS).status_code == 401
    _, student = register(client, codes, "student@example.test")
    assert client.get(OPS, headers=student).status_code == 403
    assert client.post(OPS, headers=student, json=post_body()).status_code == 403
    assert client.get(WORK, headers=student).status_code == 403
    headers = admin(client, factory, codes)
    authors = client.get(f"{OPS}/authors", headers=headers).json()["items"]
    assert [a["role"] for a in authors] == ["SUPER_ADMIN"]   # never a student


def test_every_change_is_audited(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    post = create(client, headers)
    client.put(f"{OPS}/{post['id']}", headers=headers, json=post_body(title="Health camp week, updated"))
    client.post(f"{OPS}/{post['id']}/publish", headers=headers, json={})
    client.post(f"{OPS}/{post['id']}/unpublish", headers=headers)
    history = client.get(f"{OPS}/{post['id']}", headers=headers).json()["history"]
    assert [h["action"] for h in history][::-1] == ["CREATED", "EDITED", "PUBLISHED", "UNPUBLISHED"]
    with factory() as db:
        actions = {a.action for a in db.scalars(select(M.WorkflowAudit).where(M.WorkflowAudit.resource_id == post["id"]))}
    assert {"POST_CREATED", "POST_EDITED", "POST_PUBLISHED", "POST_UNPUBLISHED"} <= actions
    # A post that went out is unpublished, not deleted.
    assert client.delete(f"{OPS}/{post['id']}", headers=headers).status_code == 409


def png_bytes():
    out = io.BytesIO()
    Image.new("RGB", (4, 4), (10, 20, 30)).save(out, format="PNG")
    return out.getvalue()


def test_images_are_scanned_and_public_only_with_a_public_post(harness, monkeypatch):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    post = create(client, headers)
    scanned = []
    monkeypatch.setattr(newsroom, "scan_file_for_viruses", lambda content: scanned.append(len(content)) or True)
    up = client.post(f"{OPS}/{post['id']}/images", headers=headers, files={"file": ("a.png", png_bytes(), "image/png")})
    assert up.status_code == 201 and scanned
    assert client.post(f"{OPS}/{post['id']}/images", headers=headers,
                       files={"file": ("a.png", b"%PDF-1.4 not an image", "image/png")}).status_code == 415

    def infected(content):
        raise HTTPException(400, "Security Error: Malicious file detected (Eicar). Upload blocked.")
    monkeypatch.setattr(newsroom, "scan_file_for_viruses", infected)
    assert client.post(f"{OPS}/{post['id']}/images", headers=headers,
                       files={"file": ("b.png", png_bytes(), "image/png")}).status_code == 400
    with factory() as db:
        assert len(db.scalars(select(M.PostImage)).all()) == 1

    image_id = up.json()["id"]
    blocks = [{"type": "paragraph", "text": "See the map."}, {"type": "image", "imageId": image_id, "alt": "Camp venue map"}]
    client.put(f"{OPS}/{post['id']}", headers=headers, json=post_body(body=blocks))
    assert client.get(f"/api/posts/images/{image_id}").status_code == 404   # draft
    client.post(f"{OPS}/{post['id']}/publish", headers=headers, json={})
    shown = client.get(f"/api/posts/images/{image_id}")
    assert shown.status_code == 200 and shown.headers["content-type"] == "image/png"
    assert public(client).json()["body"][1]["src"] == f"/api/posts/images/{image_id}"


def test_feeds_sitemap_and_share_image(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    post = create(client, headers, title="Camp & clinic <week>")
    draft = create(client, headers, slug="still-a-draft")
    client.post(f"{OPS}/{post['id']}/publish", headers=headers, json={})
    atom = client.get("/api/posts/news/atom.xml")
    assert atom.status_code == 200 and "application/atom+xml" in atom.headers["content-type"]
    assert "Camp &amp; clinic &lt;week&gt;" in atom.text and "/news/health-camp-week" in atom.text
    assert draft["slug"] not in atom.text
    rss = client.get("/api/posts/news/rss.xml")
    assert rss.status_code == 200 and "<rss version=\"2.0\">" in rss.text and "<pubDate>" in rss.text
    assert "health-camp-week" not in client.get("/api/posts/blog/atom.xml").text
    sitemap = client.get("/api/posts/sitemap.xml").text
    assert "/news/health-camp-week" in sitemap and "still-a-draft" not in sitemap and "/blog</loc>" in sitemap
    og = client.get("/api/posts/news/health-camp-week/og.png")
    assert og.status_code == 200 and og.headers["content-type"] == "image/png"
    assert Image.open(io.BytesIO(og.content)).size == (1200, 630)
    assert client.get("/api/posts/news/still-a-draft/og.png").status_code == 404


def test_search_tags_categories_and_pages(harness):
    client, factory, codes = harness
    headers = admin(client, factory, codes)
    for n in range(4):
        p = create(client, headers, slug=f"post-{n}", title=f"Post number {n}", tags=["camp"] if n % 2 else [])
        client.post(f"{OPS}/{p['id']}/publish", headers=headers, json={})
    story = create(client, headers, template="STORY", slug="a-story", title="Team story", tags=[])
    client.post(f"{OPS}/{story['id']}/publish", headers=headers, json={})
    first = client.get("/api/posts", params={"section": "news", "pageSize": 2}).json()
    assert first["featured"] is not None and first["total"] == 3 and len(first["items"]) == 2
    assert client.get("/api/posts", params={"section": "news", "q": "number 2"}).json()["items"][0]["slug"] == "post-2"
    assert {i["slug"] for i in client.get("/api/posts", params={"tag": "camp"}).json()["items"]} == {"post-1", "post-3"}
    assert [i["slug"] for i in client.get("/api/posts", params={"template": "STORY"}).json()["items"]] == ["a-story"]
    related = public(client, "news", "post-0").json()["related"]
    assert related and all(r["section"] == "news" for r in related)


def test_samples_are_marked_and_never_fake_a_review(harness):
    client, factory, codes = harness
    account(factory, "demo-super_admin", "SUPER_ADMIN")
    with factory() as db:
        assert seed_sample_posts(db) == 5
        assert seed_sample_posts(db) == 0   # idempotent
        db.commit()
        rows = db.scalars(select(M.Post)).all()
    assert rows and all(r.sample and r.title.startswith("Sample:") for r in rows)
    tips = [r for r in rows if r.template == "HEALTH_TIP"]
    assert tips and all(r.status == "DRAFT" and not r.reviewed_hash for r in tips)
    items = client.get("/api/posts").json()
    assert all(i["sample"] for i in items["items"])


def test_cover_colours_match_the_design_tokens():
    tokens = json.loads((REPO / "design/tokens/studentkare.tokens.json").read_text())["color"]["light"]
    cover = json.loads((newsroom_cover.CONTENT / "cover.json").read_text())
    for name, value in cover["colors"].items():
        assert tokens[name]["$value"].upper() == value.upper(), name
    assert set(cover["templates"]) == set(newsroom.TEMPLATES)


def test_template_table_matches_the_app():
    source = (REPO / "src/features/newsroom/model/templates.ts").read_text()
    cover = json.loads((newsroom_cover.CONTENT / "cover.json").read_text())
    for name, spec in newsroom.TEMPLATES.items():
        block = re.search(rf"{name}: \{{(.*?)\n  \}},", source, re.S)
        assert block, name
        text = block.group(1)
        assert f"section: '{newsroom.SECTION_PATHS[spec['section']]}'" in text, name
        assert f"hue: '{cover['templates'][name]['hue']}'" in text, name
        for art in spec["art"]:
            assert f"'{art}'" in text, (name, art)
        blocks = re.search(r"blocks: \[(.*?)\]", text).group(1)
        assert [b.strip(" '") for b in blocks.split(",")] == list(spec["blocks"]), name
        assert f"advice: {'true' if spec['advice'] else 'false'}" in text, name
        assert f"words: [{spec['words'][0]}, {spec['words'][1]}]" in text, name
    routes = re.search(r"CTA_ROUTES = \[(.*?)\] as const", source, re.S).group(1)
    assert [r.strip(" '\n") for r in routes.split(",") if r.strip()] == list(newsroom.CTA_ROUTES)


@pytest.mark.parametrize("title", ["Plain title", "తెలుగు శీర్షిక"])
def test_share_image_renders_any_title(title):
    png = newsroom_cover.render_png("HEALTH_TIP", "Health tip", title, "studentkare.co")
    assert Image.open(io.BytesIO(png)).size == (1200, 630)
