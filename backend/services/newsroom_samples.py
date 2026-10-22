"""Sample newsroom posts for development and test builds only.

Every row is ``sample=True``, its title starts with "Sample:" and the site shows a
"Sample post" chip on it. Production never gets them: services/demo_seed.py calls
this only when demo accounts are enabled (APP_ENV development/testing and
SEED_DEMO_DATA=true). The sample health tip is left as a draft waiting for a real
clinician's review: seeding an approval would fake one.
"""
from __future__ import annotations

import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M
from services.newsroom import DRAFT, PUBLISHED, TEMPLATES

SAMPLE_AUTHOR = "demo-super_admin"
DAY = 86400

SAMPLES: tuple[dict, ...] = (
    {"slug": "sample-exam-week-sleep", "template": "HEALTH_TIP", "status": DRAFT, "art": "brain-alt--p3",
     "title": "Sample: sleep in exam week", "summary": "A sample health tip for development builds. It waits for a clinician's review.",
     "tags": ["sleep", "exams"], "alt": "Green health tip cover with the StudentKare shield",
     "body": [{"type": "paragraph", "text": "This is sample text for a development build, not advice."},
              {"type": "list", "ordered": False, "items": ["Sample point one", "Sample point two"]},
              {"type": "callout", "tone": "info", "text": "Sample callout. In an emergency, call 112."},
              {"type": "cta", "label": "Find care", "route": "/find-care"}]},
    {"slug": "sample-campus-health-camp", "template": "CAMPUS_NEWS", "status": PUBLISHED, "art": "calendar-alt--p4", "age": 2,
     "title": "Sample: health camp on campus", "summary": "A sample campus news post for development builds.",
     "tags": ["campus"], "alt": "Amber campus news cover with a calendar",
     "body": [{"type": "paragraph", "text": "Sample text for a development build. No real event is announced here."},
              {"type": "facts", "title": "Sample facts", "items": ["When: sample date", "Where: sample venue"]}]},
    {"slug": "sample-whats-new", "template": "PRODUCT_UPDATE", "status": PUBLISHED, "art": "bell--p2", "age": 4, "featured": True,
     "title": "Sample: what's new in the app", "summary": "A sample product update for development builds.",
     "tags": ["app"], "alt": "Navy product update cover with a bell",
     "body": [{"type": "heading", "text": "Sample heading"},
              {"type": "paragraph", "text": "Sample text for a development build. Nothing here describes a real release."},
              {"type": "cta", "label": "Open Find care", "route": "/find-care"}]},
    {"slug": "sample-press-release", "template": "PRESS_RELEASE", "status": PUBLISHED, "art": "doc--p4", "age": 6,
     "title": "Sample: press release", "summary": "A sample press release for development builds.",
     "tags": ["press"], "alt": "Blue press release cover with a document",
     "body": [{"type": "paragraph", "text": "Sample text for a development build. Not a real announcement."},
              {"type": "quote", "text": "Sample quote.", "cite": "Sample spokesperson"}]},
    {"slug": "sample-student-story", "template": "STORY", "status": PUBLISHED, "art": "chat-alt--p4", "age": 8,
     "title": "Sample: a team story", "summary": "A sample story for development builds. It names no student.",
     "tags": ["team"], "alt": "Violet story cover with a speech bubble",
     "body": [{"type": "paragraph", "text": "Sample text for a development build."},
              {"type": "quote", "text": "Sample quote from a team member.", "cite": "Sample team member"}]},
)


def seed_sample_posts(db: Session, now: float | None = None) -> int:
    """Adds the sample posts that are missing. Idempotent. Returns how many were added."""
    now = now or time.time()
    if db.get(M.Account, SAMPLE_AUTHOR) is None:
        return 0
    added = 0
    for sample in SAMPLES:
        if db.scalar(select(M.Post.id).where(M.Post.slug == sample["slug"])):
            continue
        at = now - sample.get("age", 0) * DAY
        published = sample["status"] == PUBLISHED
        db.add(M.Post(
            id=f"post-{sample['slug']}", slug=sample["slug"], template=sample["template"],
            section=TEMPLATES[sample["template"]]["section"], title=sample["title"], summary=sample["summary"],
            body=sample["body"], tags=sample["tags"], cover_alt=sample["alt"], cover_art=sample["art"],
            featured=sample.get("featured", False), author_id=SAMPLE_AUTHOR, status=sample["status"],
            publish_at=at if published else 0.0, first_published_at=at if published else 0.0, sample=True,
            created_by=SAMPLE_AUTHOR, created_at=at, updated_by=SAMPLE_AUTHOR, updated_at=at))
        added += 1
    db.flush()
    return added
