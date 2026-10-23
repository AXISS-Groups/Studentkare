"""The settings registry: every tunable business value, declared exactly once.

AGENTS.md rule 11 ("Nothing hard-coded"). A limit, amount, duration, threshold or
price that the business may want to change lives here, not as a literal at the
place that uses it. Each declaration says what the value is, its type, its
default, the bounds or allowed values that make it valid, its unit, who owns it,
and whether the client may see it (``public``).

Reading a value::

    from core.settings_registry import setting
    points = setting("rewards.referral_points", db)

``setting`` returns the super admin's override when one is stored and valid, and
the declared default otherwise. A stored value that fails its declaration (wrong
type, out of bounds, not an allowed value) is never used: the read falls back to
the default (fail closed) and one ATTENTION ops-feed event is raised for that key
until someone acknowledges it.

Overrides are edited only through ``PATCH /api/ops/settings/{key}``
(services/settings_api.py): SUPER_ADMIN, validated against the declaration, a
reason required, audited and kept in an append-only history.

This module imports only the standard library at import time, so
``backend/scripts/export_public_settings.py`` can generate
``src/generated/settings.ts`` without the backend's dependencies installed. The
frontend's defaults come from that generated file, never a second copy.
"""
from __future__ import annotations

import logging
import math
import re
import threading
import time
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

INT = "int"
FLOAT = "float"
BOOL = "bool"
STR = "str"
ENUM = "enum"
TYPES = frozenset({INT, FLOAT, BOOL, STR, ENUM})

KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$")

# How long a process trusts its copy of the overrides before re-reading them, and
# the max-age the public config endpoint sends. An edit made through the API
# clears this process's cache at once; other replicas see it within this window.
CACHE_TTL_SECONDS = 30

INVALID_OVERRIDE_KIND = "SETTING_OVERRIDE_INVALID"
OPS_RESOURCE_TYPE = "setting"


class UnknownSetting(KeyError):
    """A key that is not declared here. A programming error, never a fallback."""


class InvalidSettingValue(ValueError):
    """A value that does not satisfy its declaration."""


@dataclass(frozen=True)
class Setting:
    key: str
    type: str
    default: Any
    description: str
    area: str
    unit: str = ""
    minimum: float | None = None
    maximum: float | None = None
    allowed: tuple[str, ...] = ()
    public: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "key": self.key, "type": self.type, "default": self.default, "description": self.description,
            "area": self.area, "unit": self.unit, "min": self.minimum, "max": self.maximum,
            "allowed": list(self.allowed), "public": self.public,
        }


def validate(decl: Setting, value: Any) -> Any:
    """The value, normalised to the declared type, or ``InvalidSettingValue``."""
    if decl.type == BOOL:
        if not isinstance(value, bool):
            raise InvalidSettingValue(f"{decl.key} must be true or false")
        return value
    if decl.type == INT:
        # bool is an int in Python; a JSON true is not a number of points.
        if isinstance(value, bool) or not isinstance(value, int):
            raise InvalidSettingValue(f"{decl.key} must be a whole number")
        _check_bounds(decl, value)
        return value
    if decl.type == FLOAT:
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise InvalidSettingValue(f"{decl.key} must be a number")
        _check_bounds(decl, value)
        return float(value)
    if decl.type == STR:
        if not isinstance(value, str):
            raise InvalidSettingValue(f"{decl.key} must be text")
        if decl.allowed and value not in decl.allowed:
            raise InvalidSettingValue(f"{decl.key} must be one of {', '.join(decl.allowed)}")
        return value
    if decl.type == ENUM:
        if not isinstance(value, str) or value not in decl.allowed:
            raise InvalidSettingValue(f"{decl.key} must be one of {', '.join(decl.allowed)}")
        return value
    raise InvalidSettingValue(f"{decl.key} has an unknown type {decl.type!r}")


def _check_bounds(decl: Setting, value: float) -> None:
    if decl.minimum is not None and value < decl.minimum:
        raise InvalidSettingValue(f"{decl.key} must be at least {decl.minimum:g}")
    if decl.maximum is not None and value > decl.maximum:
        raise InvalidSettingValue(f"{decl.key} must be at most {decl.maximum:g}")


REGISTRY: dict[str, Setting] = {}


def declare(key: str, type: str, default: Any, *, description: str, area: str, unit: str = "",
            minimum: float | None = None, maximum: float | None = None, allowed: tuple[str, ...] = (),
            public: bool = False) -> Setting:
    """Add one declaration. Refuses a duplicate key, a bad key, or a default that fails its own rules."""
    if key in REGISTRY:
        raise ValueError(f"setting {key} is declared twice")
    if not KEY_PATTERN.match(key):
        raise ValueError(f"setting key {key!r} must be dotted lower_snake_case, e.g. area.name")
    if type not in TYPES:
        raise ValueError(f"setting {key} has unknown type {type!r}")
    if type == ENUM and not allowed:
        raise ValueError(f"enum setting {key} needs allowed values")
    if type in (INT, FLOAT) and None not in (minimum, maximum) and minimum > maximum:
        raise ValueError(f"setting {key} has min above max")
    if not description.strip() or not area.strip():
        raise ValueError(f"setting {key} needs a description and an owning area")
    decl = Setting(key=key, type=type, default=default, description=description, area=area, unit=unit,
                   minimum=minimum, maximum=maximum, allowed=tuple(allowed), public=public)
    validate(decl, default)
    REGISTRY[key] = decl
    return decl


# Pairs (lower, upper): the effective value of ``lower`` may never exceed that of
# ``upper``. Checked when an override is saved, so an edit cannot leave the
# water goal's default outside its own min and max.
ORDERED_PAIRS: tuple[tuple[str, str], ...] = (
    ("wellness.water_goal_ml_min", "wellness.water_goal_ml_default"),
    ("wellness.water_goal_ml_default", "wellness.water_goal_ml_max"),
    ("wellness.water_entry_ml_min", "wellness.water_entry_ml_max"),
    ("wellness.water_entry_ml_min", "wellness.water_glass_ml"),
    ("wellness.water_glass_ml", "wellness.water_entry_ml_max"),
    ("wellness.water_reminder_interval_minutes_min", "wellness.water_reminder_interval_minutes_default"),
    ("wellness.water_reminder_interval_minutes_default", "wellness.water_reminder_interval_minutes_max"),
    ("wellness.water_reminder_start_hour_default", "wellness.water_reminder_end_hour_default"),
    ("wellness.weight_kg_min", "wellness.weight_kg_max"),
    ("refill.remind_days_before_default", "refill.remind_days_before_max"),
    ("wellness.height_cm_min", "wellness.height_cm_max"),
    ("wellness.bmi_cutoff_low", "wellness.bmi_cutoff_mid"),
    ("wellness.bmi_cutoff_mid", "wellness.bmi_cutoff_high"),
    ("medicine_info.child_from_years", "medicine_info.teen_from_years"),
    ("medicine_info.teen_from_years", "medicine_info.adult_from_years"),
    ("medicine_info.adult_from_years", "medicine_info.older_adult_from_years"),
    ("medicine_info.child_from_years", "medicine_info.ask_doctor_below_years"),
    ("platform.api_rate_per_account_per_minute", "platform.api_rate_per_ip_per_minute"),
    ("autopilot.news_window_start_hour", "autopilot.news_window_end_hour"),
)


# ══════════════════════════════════════════════════════════════════════════════
# Declarations. One entry per value; the literal here IS the definition.
# ══════════════════════════════════════════════════════════════════════════════

# --- rewards ---------------------------------------------------------------
declare("rewards.referral_points", INT, 50, area="rewards", unit="points", minimum=0, maximum=10000, public=True,
        description="Points credited to the referrer when a friend who joined with their code is verified as a student.")
# Not public: an anti-abuse limit is enforced by the server, not advertised.
declare("rewards.referral_monthly_cap", INT, 20, area="rewards", unit="referrals per month", minimum=0, maximum=1000,
        description="Most referrals one account can be credited for in a calendar month (platform time zone).")
declare("rewards.referral_claim_window_hours", INT, 24, area="rewards", unit="hours", minimum=1, maximum=720,
        public=True, description="How long after sign-up a referral code can still be claimed.")
# Not public: anti-abuse limits on guessing someone's invite code.
declare("rewards.referral_claim_attempts", INT, 5, area="rewards", unit="attempts per window", minimum=1, maximum=100,
        description="Most invite codes one account may try to claim within the claim-attempt window.")
declare("rewards.referral_claim_attempt_window_minutes", INT, 60, area="rewards", unit="minutes", minimum=1,
        maximum=1440, description="Length of the window that rewards.referral_claim_attempts counts within.")
declare("rewards.ledger_entries_shown", INT, 50, area="rewards", unit="entries", minimum=1, maximum=500,
        description="Most recent points-ledger entries returned to a student by GET /api/points/me.")

# --- shop (phone boards: search, product list, orders) -----------------------
declare("shop.search_debounce_ms", INT, 250, area="shop", unit="milliseconds", minimum=0, maximum=2000, public=True,
        description="How long the phone search waits after the last keystroke before asking the catalogue for suggestions.")
declare("shop.search_suggestions_max", INT, 6, area="shop", unit="suggestions", minimum=1, maximum=20, public=True,
        description="Most catalogue suggestions the phone search shows while the student types.")
declare("shop.search_results_max", INT, 50, area="shop", unit="listings", minimum=1, maximum=100, public=True,
        description="Most catalogue listings one phone search asks for (GET /api/catalog caps a page at 100).")
declare("shop.recent_searches_max", INT, 6, area="shop", unit="searches", minimum=0, maximum=20, public=True,
        description="Most recent searches the phone search entry lists. Kept in memory for the open session only.")
declare("shop.product_list_page_size", INT, 24, area="shop", unit="listings", minimum=1, maximum=100, public=True,
        description="Listings per page on the phone product list (GET /api/catalog caps a page at 100).")
declare("shop.home_featured_count", INT, 6, area="shop", unit="listings", minimum=1, maximum=20, public=True,
        description="Products in the phone shop home's first shelf.")
declare("shop.orders_page_size", INT, 20, area="shop", unit="orders", minimum=1, maximum=100, public=True,
        description="Orders per page on the phone order history (GET /api/orders caps a page at 100).")
# Mobile 2.0 product page quantity stepper (M2Product, plan D-M2-2): the most of one
# listing a cart line may hold. POST /cart/validate and POST /orders refuse more. The
# order API's own schema bound (10) is the ceiling.
declare("shop.cart_line_max", INT, 10, area="shop", unit="units", minimum=1, maximum=10, public=True,
        description="The most of one listing a cart line may hold (the product page's quantity stepper).")
# Mobile 2.0 "Call to order" / "Call to book" (M2Home, M2Medicines, M2Labs). No
# order line exists yet, so the default is empty and the app says "not
# available yet"; the client dials it only when it is a plain phone number.
declare("shop.generics_highlight_enabled", BOOL, False, area="shop", public=True,
        description="Whether Home and the shop carry the Generics highlight (same composition, a lower price, the "
                    "pharmacist confirms the swap). Off until the generics programme is live, so no claim is shown that "
                    "the platform cannot back.")
declare("shop.order_line_phone", STR, "", area="shop", unit="phone number (digits, optional leading +)", public=True,
        description="The order line students call to order medicines or book a lab test. Empty shows the call "
                    "buttons as not available yet.")

# --- care directory ("Find care near you") -------------------------------------
# A listing reaches students only while its last check is this recent; older ones
# drop out until someone checks them again (services/care_directory.py).
declare("care_directory.verification_max_age_days", INT, 365, area="care_directory", unit="days", minimum=30,
        maximum=1095, description="How long a care-directory listing stays shown after it was last verified.")
declare("care_directory.results_max", INT, 100, area="care_directory", unit="listings", minimum=10, maximum=200,
        description="Most listings one care-directory request returns.")
# The device location a student chooses to share stays on the device; these only
# bound how long the app waits for it and how old a cached fix may be.
declare("care_directory.location_timeout_seconds", INT, 15, area="care_directory", unit="seconds", minimum=3,
        maximum=60, public=True, description="How long the app waits for the device location before saying so.")
declare("care_directory.location_max_age_seconds", INT, 120, area="care_directory", unit="seconds", minimum=0,
        maximum=900, public=True, description="Oldest device location fix the app reuses to sort by distance.")

# --- health camps (services/health_camps.py) ------------------------------------------
# Campus health camps a campus or a clinic/lab partner runs and students book a slot at.
declare("camps.upcoming_days_max", INT, 90, area="camps", unit="days", minimum=7, maximum=365, public=True,
        description="How far ahead a student's list of upcoming health camps reaches.")
declare("camps.reminder_hours_before", INT, 24, area="camps", unit="hours", minimum=1, maximum=168, public=True,
        description="How long before a booked camp slot starts the student is reminded (if reminders are on).")
declare("camps.change_cutoff_hours", INT, 2, area="camps", unit="hours", minimum=0, maximum=72, public=True,
        description="Until how long before a booked slot starts the student can still cancel or change it in the app.")
declare("camps.waitlist_max_per_slot", INT, 50, area="camps", unit="students", minimum=0, maximum=1000, public=True,
        description="Most students who can wait for a full camp slot. 0 turns the waitlist off.")
declare("camps.slots_per_camp_max", INT, 24, area="camps", unit="slots", minimum=1, maximum=96, public=True,
        description="Most bookable time slots one health camp may have.")
declare("camps.slot_capacity_max", INT, 500, area="camps", unit="students", minimum=1, maximum=5000, public=True,
        description="Most students one camp slot may hold.")
# Paid camps need a payment flow that keeps the camp (a health fact) off the commerce
# plane (Rule L). None exists yet (docs/plans/tier1-health-camps-2026-10-23.md), so a
# host cannot set a price and a paid camp cannot be booked until this is turned on.
declare("camps.paid_camps_enabled", BOOL, False, area="camps", public=True,
        description="Whether a host may set a price on a health camp. Off until camp payments are built (Rule L).")
declare("camps.price_paise_max", INT, 500000, area="camps", unit="paise", minimum=0, maximum=10000000, public=True,
        description="Highest price a host may set on a paid health camp.")

# --- newsroom: News and Blog (services/newsroom.py) ---------------------------------
# How many posts a list page, a feed and the related list show, how long public
# readers (and the CDN) may keep a response, and the size of an image placed in a post.
declare("newsroom.page_size", INT, 9, area="newsroom", unit="posts", minimum=3, maximum=30, public=True,
        description="Posts on one page of the Blog or News list.")
declare("newsroom.related_count", INT, 3, area="newsroom", unit="posts", minimum=0, maximum=6, public=True,
        description="Related posts shown under a post.")
declare("newsroom.home_teasers", INT, 2, area="newsroom", unit="posts", minimum=0, maximum=4, public=True,
        description="Latest health tips on the student Home card ('From the StudentKare blog').")
declare("newsroom.feed_items_max", INT, 30, area="newsroom", unit="posts", minimum=5, maximum=100,
        description="Most posts in one RSS or Atom feed.")
declare("newsroom.public_cache_seconds", INT, 120, area="newsroom", unit="seconds", minimum=0, maximum=3600,
        description="How long a public post response may be cached (a scheduled post can appear this much later).")
declare("newsroom.image_max_bytes", INT, 5 * 1024 * 1024, area="newsroom", unit="bytes", minimum=256 * 1024,
        maximum=10 * 1024 * 1024, description="Largest image an editor can place in a post.")
declare("newsroom.words_per_minute", INT, 200, area="newsroom", unit="words per minute", minimum=100, maximum=400,
        public=True, description="Reading speed used for a post's reading time.")

# --- content autopilot (services/newsroom_autopilot.py) ------------------------------
# Off until a super admin turns a lane on. News: up to news_per_day short summaries of
# new items from the allow-listed official feeds below, each naming and linking its
# source. Blog: posts_per_week drafts on the configured days from the topic plan (built
# only from approved knowledge sources) and a round-up of the week's What's new posts.
# Health content waits for a clinician only while content.health_requires_clinician is on (off by default,
# Krishna 2026-10-23); otherwise only precise auto posts go out and the rest wait in Content, Review.
# Times are in platform.default_timezone (IST).
declare("autopilot.kill_switch", BOOL, False, area="autopilot",
        description="Emergency stop for the content autopilot: while true it fetches, drafts and publishes nothing.")
declare("autopilot.news_enabled", BOOL, False, area="autopilot",
        description="Autopilot News lane: summarise new items from the allow-listed official feeds.")
declare("autopilot.blog_enabled", BOOL, False, area="autopilot",
        description="Autopilot Blog lane: draft the week's blog posts from the topic plan.")
declare("autopilot.news_auto_publish", BOOL, True, area="autopilot",
        description="Publish autopilot news at once when it passes the precision gate (content.precision_threshold). "
                    "Imprecise news always waits in Content, Review. Off: every news draft waits for an editor.")
declare("autopilot.blog_auto_publish", BOOL, False, area="autopilot",
        description="Publish autopilot stories and precise health tips on their day (a health tip waits for a clinician "
                    "while content.health_requires_clinician is on).")
declare("autopilot.use_model", BOOL, True, area="autopilot",
        description="Let the configured on-prem model write the headline and summary (checked against the source; "
                    "anything not grounded falls back to the source's own words).")
declare("autopilot.news_per_day", INT, 3, area="autopilot", unit="posts per day", minimum=1, maximum=5,
        description="Most autopilot news posts in one day.")
declare("autopilot.news_min_gap_minutes", INT, 120, area="autopilot", unit="minutes", minimum=0, maximum=720,
        description="Least time between two autopilot news posts, so a day's posts are spread out.")
declare("autopilot.news_window_start_hour", INT, 7, area="autopilot", unit="hour of day (IST)", minimum=0, maximum=23,
        description="Autopilot news posts only from this hour.")
declare("autopilot.news_window_end_hour", INT, 21, area="autopilot", unit="hour of day (IST)", minimum=1, maximum=24,
        description="Autopilot news posts only before this hour.")
declare("autopilot.news_max_age_hours", INT, 72, area="autopilot", unit="hours", minimum=6, maximum=336,
        description="Oldest source item the autopilot still summarises.")
declare("autopilot.news_min_relevance", INT, 1, area="autopilot", unit="keyword matches", minimum=0, maximum=10,
        description="Fewest student-relevance keyword matches an item needs to be posted.")
declare("autopilot.relevance_keywords", STR,
        "student,students,campus,college,university,youth,young people,adolescent,exam,mental health,sleep,"
        "nutrition,hydration,heat,heatwave,air quality,vaccine,vaccination,immunization,dengue,malaria,"
        "tuberculosis,hygiene,physical activity,sport,injury,tobacco,alcohol,road safety,drug alert,recall,"
        "not of standard quality,outbreak,advisory,scholarship,education,ugc",
        area="autopilot", unit="comma-separated words and phrases",
        description="What makes an item student-relevant: each word or phrase found counts once (twice in the title).")
declare("autopilot.block_words", STR,
        "patient,deceased,died,death of,obituary,victim,suicide,murder,rape,assault,arrested,accused,named",
        area="autopilot", unit="comma-separated words and phrases",
        description="An item or a written summary containing any of these is never posted (people, deaths, crime).")
declare("autopilot.headline_max_chars", INT, 90, area="autopilot", unit="characters", minimum=30, maximum=160,
        description="Longest autopilot headline.")
declare("autopilot.summary_max_chars", INT, 300, area="autopilot", unit="characters", minimum=80, maximum=300,
        description="Longest autopilot summary (two or three sentences).")
declare("autopilot.max_posts_per_day", INT, 6, area="autopilot", unit="posts per day", minimum=1, maximum=20,
        description="Hard cap on everything the autopilot drafts or publishes in one day, both lanes together.")
declare("autopilot.blog_posts_per_week", INT, 2, area="autopilot", unit="posts per week", minimum=0, maximum=7,
        description="Autopilot blog posts a week (one per configured day, in order).")
declare("autopilot.blog_days", STR, "MON,THU", area="autopilot", unit="comma-separated MON..SUN",
        description="The days the autopilot blog posts go out.")
declare("autopilot.blog_hour", INT, 10, area="autopilot", unit="hour of day (IST)", minimum=0, maximum=23,
        description="The hour the autopilot blog posts go out on their day.")
declare("autopilot.blog_lead_hours", INT, 24, area="autopilot", unit="hours", minimum=1, maximum=96,
        description="How long before its time a blog post is drafted (time for a clinician to review a health tip).")
declare("autopilot.blog_topics", STR,
        "sleep,exam stress,hydration,campus food,sports injuries,heat and sun,eye strain,handwashing,"
        "physical activity,mental wellbeing",
        area="autopilot", unit="comma-separated topics",
        description="The rotating topic plan. A topic is drafted only from approved knowledge sources about it.")
declare("autopilot.fetch_timeout_seconds", INT, 10, area="autopilot", unit="seconds", minimum=2, maximum=30,
        description="How long the autopilot waits for one feed.")
declare("autopilot.fetch_max_bytes", INT, 2 * 1024 * 1024, area="autopilot", unit="bytes", minimum=64 * 1024,
        maximum=8 * 1024 * 1024, description="Largest feed the autopilot reads.")
declare("autopilot.source_failures_before_alert", INT, 3, area="autopilot", unit="failed fetches", minimum=1,
        maximum=20, description="Failed fetches in a row before a feed raises an ops alert.")
declare("autopilot.log_size", INT, 50, area="autopilot", unit="entries", minimum=10, maximum=200,
        description="Entries in the Autopilot tab's log and queue.")
declare("autopilot.fetch_interval_minutes", INT, 30, area="autopilot", unit="minutes", minimum=15, maximum=240,
        description="How often the aggregator reads the allow-listed feeds, round the clock (the job runs every 15 "
                    "minutes; a pass reads the feeds only when this much time has gone by). Posting stays inside the "
                    "news window.")
# The allow-list of feeds. The publisher, its hosts and what was verified are in
# backend/content/newsroom/autopilot.json; a feed address must stay on its hosts.
# Verified from the network on 2026-10-23: who_news (RSS 2.0 with summaries) and
# pib_releases (RSS 2.0, titles and links only, no dates; left off). No public feed
# was found for the others: their address is empty until one is confirmed.
AUTOPILOT_SOURCES: tuple[tuple[str, str, bool], ...] = (
    ("cdsco_alerts", "", False),
    ("icmr", "", False),
    ("mohfw", "", False),
    ("pib_releases", "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3", False),
    ("ugc_notices", "", False),
    ("who_news", "https://www.who.int/rss-feeds/news-english.xml", True),
)
for _source, _url, _on in AUTOPILOT_SOURCES:
    declare(f"autopilot.source.{_source}.url", STR, _url, area="autopilot", unit="https URL on the source's hosts",
            description=f"Feed address (RSS or Atom) of the autopilot source {_source}. Empty: not verified yet.")
    declare(f"autopilot.source.{_source}.enabled", BOOL, _on, area="autopilot",
            description=f"Whether the autopilot reads the source {_source}.")

# --- content module: categories, series, precision gate, share kit (services/newsroom_content.py,
# newsroom_precision.py, newsroom_series.py) --------------------------------------------------------
# Health-advice posts (an advice template in a clinical category, and every health tip). Decision,
# Krishna as named reviewer, 2026-10-23 (docs/plans/newsroom-content-2026-10-23.md): health series posts
# do not need a clinician, so the default is off: an auto post that passes the precision gate goes out,
# an imprecise one waits for the super admin. This replaces #229's "every health tip needs a clinician"
# for auto posts. On: they wait for a clinician however precise. A health post typed by the team is never
# scored, so it still needs a clinician either way. Crisis words always send a post to review.
declare("content.health_requires_clinician", BOOL, False, area="content",
        description="Health-advice auto posts (health series, health tips, explainers, myths, quick cards in a "
                    "clinical category) wait for a clinician's approval even when they pass the precision gate. "
                    "Off (Krishna, 2026-10-23): precise ones go out, imprecise ones wait in Content, Review.")
declare("content.precision_threshold", INT, 100, area="content", unit="percent of sentences", minimum=50, maximum=100,
        description="Least share of an auto post's sentences that must be traceable to its source for it to be "
                    "approved without a person. Any failed source check (not allow-listed, too old, undated) is 0.")
declare("content.precision_sentence_min_support", INT, 70, area="content", unit="percent of words", minimum=50,
        maximum=100, description="Least share of a sentence's content words found in the source for the sentence "
                                 "to count as traceable when it is not copied word for word.")
declare("content.advice_phrases", STR,
        "you should take,should take,take a dose,dose of,dosage,mg,milligram,tablet,tablets,capsule,capsules,"
        "syrup,injection,cure,cures,treats,diagnose,diagnosis,diagnosed with,you have,prescribe,prescription,"
        "stop taking,start taking,increase your dose,reduce your dose,self-medicate",
        area="content", unit="comma-separated words and phrases",
        description="Medical-advice language: an auto post containing any of these never goes out without a person "
                    "(no dosing, no diagnosis, no treatment advice).")
declare("content.unverifiable_phrases", STR,
        "studies show,research shows,experts say,doctors say,scientists agree,it is proven,proven to,guaranteed,"
        "miracle,100%,always works,never fails,best ever,the best,number one,secret",
        area="content", unit="comma-separated words and phrases",
        description="Claims that need a source of their own: a sentence with one of these fails the gate unless "
                    "the source itself says it.")
declare("content.crisis_phrases", STR,
        "suicide,suicidal,self-harm,self harm,kill myself,end my life,overdose,want to die,hopeless,cutting",
        area="content", unit="comma-separated words and phrases",
        description="Crisis words: an auto post containing any of these never goes out on its own; it waits for a "
                    "person in Content, Review, whatever its score.")
declare("content.duplicate_similarity", INT, 60, area="content", unit="percent of title words", minimum=30,
        maximum=100, description="How alike two titles must be for the composer to warn of a duplicate topic.")
declare("content.duplicate_window_days", INT, 60, area="content", unit="days", minimum=1, maximum=365,
        description="How far back the composer looks for a post on the same topic.")
declare("content.share_utm_enabled", BOOL, True, area="content", public=True,
        description="Add utm_source (the network), utm_medium and utm_campaign to shared post links.")
declare("content.share_utm_medium", STR, "social", area="content", unit="utm_medium value", public=True,
        description="utm_medium on shared post links.")
declare("content.share_utm_campaign", STR, "newsroom", area="content", unit="utm_campaign value", public=True,
        description="utm_campaign on shared post links (a series adds its own slug).")
declare("content.caption_hashtags_max", INT, 5, area="content", unit="hashtags", minimum=0, maximum=10,
        description="Most hashtags in a LinkedIn caption from the share kit (the category's, then the brand's).")
declare("content.caption_brand_hashtag", STR, "StudentKare", area="content", unit="hashtag without #",
        description="The brand hashtag the share kit adds to every caption.")
declare("content.stats_enabled", BOOL, True, area="content", public=True,
        description="Count post views and shares (counts only: no reader, address or device is kept).")
declare("content.list_max", INT, 200, area="content", unit="posts", minimum=50, maximum=1000,
        description="Most posts one Content list or Analytics view loads.")
declare("series.lead_hours", INT, 24, area="content", unit="hours", minimum=1, maximum=96,
        description="How long before its slot a series episode is drafted (time for a clinician to review it).")
declare("series.auto_publish", BOOL, True, area="content",
        description="Schedule a series episode that passes the precision gate without a person (health episodes "
                    "still follow content.health_requires_clinician). Off: every episode waits for the super admin.")
declare("series.motivation.enabled", BOOL, False, area="content",
        description="Monday Motivation: draft an episode from the series' own library of lines and attributed "
                    "public-domain quotes on its days. Off until a super admin turns it on.")
declare("series.motivation.days", STR, "MON", area="content", unit="comma-separated MON..SUN",
        description="The days Monday Motivation goes out.")
declare("series.motivation.hour", INT, 8, area="content", unit="hour of day (IST)", minimum=0, maximum=23,
        description="The hour Monday Motivation goes out on its day.")
declare("series.health.enabled", BOOL, False, area="content",
        description="The health series: draft an episode from approved knowledge on its days, cycling the rota. "
                    "Off until a super admin turns it on.")
declare("series.health.days", STR, "MON,WED,FRI", area="content", unit="comma-separated MON..SUN",
        description="The days the health series goes out.")
declare("series.health.hour", INT, 17, area="content", unit="hour of day (IST)", minimum=0, maximum=23,
        description="The hour the health series goes out on its day.")
declare("series.health.rota", STR, "mental-health,womens-health,common-health", area="content",
        unit="comma-separated category ids",
        description="The categories the health series cycles through, one per episode, in order.")

# --- medicine information (services/medicine_info.py; plan tier1-medicine-info-2026-10-22) ---
# The "Who is it for?" age bands. The band a person picks stays on the device;
# these only say where each band starts. Below ask_doctor_below_years the screen
# always says "Ask a doctor or pharmacist before giving this" (D-MI-7).
declare("medicine_info.child_from_years", INT, 2, area="medicine_info", unit="years", minimum=1, maximum=5, public=True,
        description="Age at which the medicine-information 'child' band starts (below it: under-2).")
declare("medicine_info.teen_from_years", INT, 12, area="medicine_info", unit="years", minimum=6, maximum=16, public=True,
        description="Age at which the 'teen' band starts.")
declare("medicine_info.adult_from_years", INT, 18, area="medicine_info", unit="years", minimum=12, maximum=21, public=True,
        description="Age at which the 'adult' band starts.")
declare("medicine_info.older_adult_from_years", INT, 65, area="medicine_info", unit="years", minimum=50, maximum=80,
        public=True, description="Age at which the 'older adult' band starts.")
declare("medicine_info.ask_doctor_below_years", INT, 12, area="medicine_info", unit="years", minimum=2, maximum=18,
        public=True, description="Bands that end below this age always show 'Ask a doctor or pharmacist before giving this'.")
declare("medicine_info.search_min_chars", INT, 2, area="medicine_info", unit="characters", minimum=2, maximum=6,
        public=True, description="Fewest characters before a medicine search runs.")
declare("medicine_info.results_max", INT, 20, area="medicine_info", unit="medicines", minimum=5, maximum=50,
        description="Most medicines one search or photo returns.")
declare("medicine_info.match_min_similarity", FLOAT, 0.75, area="medicine_info", unit="ratio 0-1", minimum=0.6,
        maximum=1.0, description="How close a typed or printed word must be to a brand or salt to count as a match.")
declare("medicine_info.photo_max_kb", INT, 6144, area="medicine_info", unit="KB", minimum=256, maximum=20480,
        public=True, description="Largest photo of a strip or box the server reads.")
declare("medicine_info.photo_per_hour", INT, 30, area="medicine_info", unit="photos per address per hour",
        minimum=1, maximum=500, description="How many photos one address may have read in an hour.")
declare("medicine_info.ocr_timeout_seconds", INT, 20, area="medicine_info", unit="seconds", minimum=3, maximum=120,
        description="Longest the server spends reading the text on one photo.")
declare("medicine_info.import_max_rows", INT, 5000, area="medicine_info", unit="rows", minimum=1, maximum=100000,
        description="Most rows one medicine-information CSV import may hold.")

# --- medicines -------------------------------------------------------------
declare("meds.dose_undo_minutes", INT, 30, area="meds", unit="minutes", minimum=0, maximum=240, public=True,
        description="How long after marking a dose taken or skipped the student can undo it.")
declare("meds.times_per_day_max", INT, 6, area="meds", unit="doses per day", minimum=1, maximum=24, public=True,
        description="Most reminder times one medication plan may have in a day.")
# The clock times a student can pick for a daily medicine reminder on the phone
# (local notifications; the server sends none). Minutes after midnight.
declare("meds.reminder_minute_morning", INT, 480, area="meds", unit="minutes after midnight", minimum=0,
        maximum=1439, public=True, description="Time of the 'morning' medicine reminder slot on the phone.")
declare("meds.reminder_minute_afternoon", INT, 840, area="meds", unit="minutes after midnight", minimum=0,
        maximum=1439, public=True, description="Time of the 'afternoon' medicine reminder slot on the phone.")
declare("meds.reminder_minute_evening", INT, 1200, area="meds", unit="minutes after midnight", minimum=0,
        maximum=1439, public=True, description="Time of the 'evening' medicine reminder slot on the phone.")
declare("meds.reminder_minute_night", INT, 1320, area="meds", unit="minutes after midnight", minimum=0,
        maximum=1439, public=True, description="Time of the 'night' medicine reminder slot on the phone.")
# Refill reminders (services/refill_tracker.py). The run-out date is counted
# from the student's own pack size and dose schedule: pills on hand divided by
# pills a day. Nothing here is dosing advice; these only bound what can be typed
# and when the reminder goes out. Quiet hours are the student's own
# (care_notification_preferences), applied by the outbox.
declare("refill.remind_days_before_default", INT, 3, area="refill", unit="days", minimum=1, maximum=30, public=True,
        description="How many days before a medicine runs out the refill reminder goes out, unless the student picks another.")
declare("refill.remind_days_before_max", INT, 14, area="refill", unit="days", minimum=1, maximum=60, public=True,
        description="Most days before running out a student may ask to be reminded.")
declare("refill.remind_minute_local", INT, 600, area="refill", unit="minutes after midnight", minimum=0,
        maximum=1439, public=True, description="Local time of day a refill reminder is due (quiet hours still apply).")
declare("refill.snooze_days", INT, 1, area="refill", unit="days", minimum=1, maximum=14, public=True,
        description="How long Snooze holds a refill reminder back.")
declare("refill.pack_units_max", INT, 1000, area="refill", unit="units per pack", minimum=1, maximum=100000,
        public=True, description="Largest pack size (tablets, capsules, doses) a student can enter.")
declare("refill.units_per_dose_max", INT, 20, area="refill", unit="units per dose", minimum=1, maximum=100,
        public=True, description="Most units a student can enter for one dose (a count, never advice).")
declare("refill.packs_max", INT, 20, area="refill", unit="packs", minimum=1, maximum=100, public=True,
        description="Most packs one refill can count.")
declare("refill.tracked_max", INT, 30, area="refill", unit="medicines", minimum=1, maximum=200,
        description="Most medicines one student can track for refills.")

# --- push notifications (services/push_dispatch.py, services/push_api.py) ----
# Safety pushes (SOS answers, account security) ignore the cap, coalescing and
# quiet hours; everything else respects all three.
declare("push.rate_cap_per_hour", INT, 6, area="push", unit="pushes per hour", minimum=1, maximum=60,
        description="Most non-safety pushes one account gets in any hour; the rest wait for the next hour.")
declare("push.coalesce_seconds", INT, 120, area="push", unit="seconds", minimum=0, maximum=3600,
        description="A second push of the same category to the same account within this window is folded into the first.")
declare("push.max_attempts", INT, 4, area="push", unit="attempts", minimum=1, maximum=10,
        description="Sends tried for one push before it is marked failed.")
declare("push.retry_base_seconds", INT, 60, area="push", unit="seconds", minimum=5, maximum=3600,
        description="Wait before the first retry of a push; each later retry waits twice as long.")
declare("push.receipt_delay_seconds", INT, 900, area="push", unit="seconds", minimum=60, maximum=86400,
        description="How long after a phone push is accepted its delivery receipt is fetched from Expo.")
declare("push.batch_max", INT, 500, area="push", unit="pushes per pass", minimum=10, maximum=5000,
        description="Most pushes one dispatch pass sends.")
declare("push.ttl_seconds", INT, 86400, area="push", unit="seconds", minimum=60, maximum=2419200,
        description="How long the push service keeps an undelivered push for a phone that is off.")
declare("push.devices_per_account_max", INT, 10, area="push", unit="devices", minimum=1, maximum=50,
        description="Most phones and browsers one account can receive pushes on; registering another retires the oldest.")
declare("push.inactive_device_days", INT, 120, area="push", unit="days", minimum=7, maximum=730,
        description="A device not seen for this long stops receiving pushes until the app opens again.")
declare("push.announcement_title_max", INT, 60, area="push", unit="characters", minimum=10, maximum=120, public=True,
        description="Longest title of a super-admin announcement push.")
declare("push.announcement_body_max", INT, 160, area="push", unit="characters", minimum=20, maximum=400, public=True,
        description="Longest body of a super-admin announcement push.")
declare("push.announcement_schedule_max_days", INT, 30, area="push", unit="days", minimum=1, maximum=180, public=True,
        description="How far ahead an announcement can be scheduled.")

# --- student web (signed in) ----------------------------------------------
declare("studentweb.report_ready_days", INT, 14, area="studentweb", unit="days", minimum=1, maximum=90, public=True,
        description="How long a released lab report stays under Needs you on the student's Your Care page.")

# --- wellness --------------------------------------------------------------
declare("wellness.water_goal_ml_default", INT, 2000, area="wellness", unit="ml", minimum=100, maximum=10000,
        public=True, description="Daily water goal for a student who has not set one.")
declare("wellness.water_goal_ml_min", INT, 500, area="wellness", unit="ml", minimum=100, maximum=10000,
        public=True, description="Lowest daily water goal a student can set.")
declare("wellness.water_goal_ml_max", INT, 6000, area="wellness", unit="ml", minimum=100, maximum=10000,
        public=True, description="Highest daily water goal a student can set.")
declare("wellness.water_entry_ml_min", INT, 10, area="wellness", unit="ml", minimum=1, maximum=1000, public=True,
        description="Smallest amount one water entry may record.")
declare("wellness.water_entry_ml_max", INT, 2000, area="wellness", unit="ml", minimum=10, maximum=5000, public=True,
        description="Largest amount one water entry may record.")
declare("wellness.water_glass_ml", INT, 250, area="wellness", unit="ml", minimum=10, maximum=2000, public=True,
        description="How much one tap of '+ glass' logs on the Water card and screen.")
declare("wellness.water_history_days", INT, 7, area="wellness", unit="days", minimum=2, maximum=31, public=True,
        description="How many days, today included, the Water screen shows (GET /wellness/water/days).")
# Water reminders are local notifications on the phone; the server sends none.
declare("wellness.water_reminder_interval_minutes_min", INT, 60, area="wellness", unit="minutes", minimum=15,
        maximum=720, public=True, description="Shortest gap a student can pick between water reminders.")
declare("wellness.water_reminder_interval_minutes_default", INT, 120, area="wellness", unit="minutes", minimum=15,
        maximum=720, public=True, description="Gap between water reminders until the student picks another.")
declare("wellness.water_reminder_interval_minutes_max", INT, 240, area="wellness", unit="minutes", minimum=15,
        maximum=720, public=True, description="Longest gap a student can pick between water reminders.")
declare("wellness.water_reminder_interval_step_minutes", INT, 30, area="wellness", unit="minutes", minimum=5,
        maximum=120, public=True, description="Step of the water reminder gap picker.")
declare("wellness.water_reminder_start_hour_default", INT, 9, area="wellness", unit="hour of day", minimum=0,
        maximum=23, public=True, description="First water reminder of the day until the student picks another hour.")
declare("wellness.water_reminder_end_hour_default", INT, 21, area="wellness", unit="hour of day", minimum=0,
        maximum=23, public=True, description="No water reminder after this hour until the student picks another.")
declare("wellness.water_reminders_per_day_max", INT, 12, area="wellness", unit="reminders", minimum=1, maximum=24,
        public=True, description="Most water reminders the phone schedules in one day.")
declare("wellness.entry_backdate_days", INT, 7, area="wellness", unit="days", minimum=0, maximum=366, public=True,
        description="How far back a water entry or a body measurement may be dated.")
declare("wellness.activity_backdate_days", INT, 366, area="wellness", unit="days", minimum=0, maximum=3660,
        public=True, description="How far back a day's manual activity totals may be entered.")
declare("wellness.activity_sync_backdate_days", INT, 7, area="wellness", unit="days", minimum=0, maximum=30,
        public=True, description="How far back a day's totals read on the phone (Apple Health, Health Connect, "
                                 "the phone's motion sensor) may be synced.")
declare("wellness.steps_live_sync_seconds", INT, 60, area="wellness", unit="seconds", minimum=15, maximum=3600,
        public=True, description="While the Steps screen is open, how often the app re-reads today's total from a "
                                 "connected source and syncs it.")
# Not public: a server-side allowance for a phone clock that runs a little fast.
declare("wellness.entry_future_tolerance_minutes", INT, 5, area="wellness", unit="minutes", minimum=0, maximum=60,
        description="How far in the future an entry's time may be before it is refused (clock skew).")
# Upper bounds of one day's activity totals, typed in or synced from the phone
# (the server refuses a larger number from either). The lower bound is 0 (a
# total cannot be negative) and standing minutes are bounded by the minutes in a
# day; both are structural, not declared here.
declare("wellness.activity_steps_max", INT, 100000, area="wellness", unit="steps", minimum=1000, maximum=1000000,
        public=True, description="Most steps one day's total may record, typed in or synced from the phone.")
declare("wellness.activity_distance_km_max", FLOAT, 200.0, area="wellness", unit="km", minimum=1, maximum=1000,
        public=True, description="Longest distance one day's manual entry may record.")
declare("wellness.activity_floors_max", INT, 500, area="wellness", unit="floors", minimum=1, maximum=5000,
        public=True, description="Most floors climbed one day's manual entry may record.")
declare("wellness.activity_energy_kcal_max", FLOAT, 10000.0, area="wellness", unit="kcal", minimum=100,
        maximum=50000, public=True, description="Most active energy one day's manual entry may record.")
# Adult body-measure bounds (18+ only, AGENTS.md guardrail 8). A stored value
# outside them is never used for BMI. The generic readings form keeps its own.
declare("wellness.weight_kg_min", FLOAT, 20.0, area="wellness", unit="kg", minimum=1, maximum=100, public=True,
        description="Lowest weight the weight & BMI form accepts and BMI is computed from.")
declare("wellness.weight_kg_max", FLOAT, 350.0, area="wellness", unit="kg", minimum=100, maximum=700, public=True,
        description="Highest weight the weight & BMI form accepts and BMI is computed from.")
declare("wellness.height_cm_min", FLOAT, 100.0, area="wellness", unit="cm", minimum=30, maximum=150, public=True,
        description="Lowest height the weight & BMI form accepts and BMI is computed from.")
declare("wellness.height_cm_max", FLOAT, 250.0, area="wellness", unit="cm", minimum=150, maximum=300, public=True,
        description="Highest height the weight & BMI form accepts and BMI is computed from.")
declare("wellness.body_entries_list_cap", INT, 100, area="wellness", unit="entries", minimum=1, maximum=1000,
        description="Most weight and height entries GET /body/measurements lists, newest first.")
# BMI band cut-offs. CLINICAL OWNER: these are clinical reference values (WHO
# expert consultation, Lancet 2004, cut-offs for Asian populations). Change them
# only with the clinical lead's written sign-off, quoted in the override reason.
# Not public: the bands, with their bounds, come from GET /body/measurements.
declare("wellness.bmi_cutoff_low", FLOAT, 18.5, area="clinical", unit="kg/m²", minimum=10, maximum=40,
        description="BMI where the second band starts (WHO Asian cut-offs, 2004). Clinical owner sign-off required.")
declare("wellness.bmi_cutoff_mid", FLOAT, 23.0, area="clinical", unit="kg/m²", minimum=10, maximum=40,
        description="BMI where the third band starts (WHO Asian cut-offs, 2004). Clinical owner sign-off required.")
declare("wellness.bmi_cutoff_high", FLOAT, 25.0, area="clinical", unit="kg/m²", minimum=10, maximum=40,
        description="BMI where the fourth band starts (WHO Asian cut-offs, 2004). Clinical owner sign-off required.")

# --- health records --------------------------------------------------------
declare("health.readings_list_cap", INT, 1000, area="health", unit="rows", minimum=1, maximum=10000,
        description="Most readings GET /health/readings returns in one response.")

# --- emergency -------------------------------------------------------------
# The SOS screen re-reads an open alert so "your campus has seen it" appears
# without a reload (SosBeacon). The server pushes nothing; this is a read.
declare("emergency.sos_poll_seconds", INT, 15, area="emergency", unit="seconds", minimum=5, maximum=120, public=True,
        description="How often the SOS screen re-reads an open alert from GET /api/emergency/sos/current.")
# Blood SOS (services/agents/blood_emergency_agent.py, audit H1). A broadcast goes
# out on the platform's own WhatsApp to every matching donor on the campus, so it
# is a fixed template plus a short optional note, and it is rate limited per
# account and per campus. Counted from care_blood_sos_requests, so the limits hold
# across replicas.
declare("blood.sos_note_max_chars", INT, 140, area="emergency", unit="characters", minimum=0, maximum=280,
        description="Longest optional note a requester may add to the fixed blood SOS message (0 turns notes off).")
declare("blood.sos_max_units", INT, 4, area="emergency", unit="units", minimum=1, maximum=10,
        description="Most units of blood one blood SOS may ask for.")
declare("blood.sos_per_account_per_day", INT, 3, area="emergency", unit="requests per 24 hours", minimum=1,
        maximum=20, description="Blood SOS broadcasts one account may send in 24 hours.")
declare("blood.sos_per_campus_per_hour", INT, 5, area="emergency", unit="requests per hour", minimum=1,
        maximum=100, description="Blood SOS broadcasts that may go to one campus's donors in an hour.")
# --- lab results (services/lab_results.py; Mobile 2.0 plan Gap 1) ------------
# Input bounds only. None of these is a clinical threshold: whether a value is
# in range is decided by the range the lab printed, stored with the value.
declare("lab_results.max_rows_per_report", INT, 60, area="lab_results", unit="values", minimum=1, maximum=200,
        public=True, description="Most values one lab report (document) may hold, drafts and confirmed together.")
declare("lab_results.value_abs_max", FLOAT, 10000000.0, area="lab_results", unit="any unit", minimum=1,
        maximum=1000000000, public=True,
        description="Largest magnitude a typed value or printed range limit may have (catches typing slips).")
declare("lab_results.collected_on_max_age_years", INT, 30, area="lab_results", unit="years", minimum=1,
        maximum=100, public=True, description="How far back a typed report's collection date may be.")
declare("lab_results.list_cap", INT, 1000, area="lab_results", unit="values", minimum=1, maximum=10000,
        description="Most stored values GET /health/lab-results and the trends endpoints read in one response.")
declare("lab_results.pinned_max", INT, 8, area="lab_results", unit="tests", minimum=1, maximum=50, public=True,
        description="Most tests a student may bookmark on Trends.")
declare("trends.min_points_for_line", INT, 2, area="trends", unit="values", minimum=2, maximum=20, public=True,
        description="Fewest values of one test, in one unit, before Trends draws a line between them.")

# --- lab collection (services/clinical_api.py; WP-15 StaffCollect) ----------
# A lab may record a sample as collected only for a student whose live pass the
# same signed-in counter account verified (POST /identity/verify) within this
# many minutes. Not public: the server enforces it; the app only mirrors it.
declare("lab.collect_verification_minutes", INT, 15, area="lab", unit="minutes", minimum=1, maximum=120,
        description="How long a pass verification at a lab counter lets that counter record the student's sample "
                    "as collected.")

# --- privacy (DPDP erasure, services/erasure.py) ----------------------------
# The window a student has to change their mind after asking to delete their
# account. Public: the delete screens state the number of days and draw
# "Day n of N". A request's due time is computed from this value when it is
# read, so an edit applies to requests already waiting: lengthen it freely,
# shorten it only with the DPDP owner's sign-off quoted in the override reason.
declare("privacy.deletion_grace_days", INT, 7, area="privacy", unit="days", minimum=1, maximum=30, public=True,
        description="Days between a student's account-deletion request and its erasure; they can cancel until then.")

# --- AI kill switch (audit M2) --------------------------------------------------
# Persisted here, not in one process's memory, so every worker and replica obeys
# it (within CACHE_TTL_SECONDS) and it survives a restart. services/llm_gateway.py
# refuses every model call while it is on. Set through POST /api/v1/ops/kill-switch
# (and /reset), which record a reason and an audit row like any other override.
declare("ai.kill_switch_active", BOOL, False, area="ai",
        description="Emergency stop: while true, no AI model call is made anywhere on the platform.")

# Per-account and per-sender limits on the costly or abusable endpoints (audit L6).
# The global per-session limiter (core/rate_limiter.py) is too coarse for these.
declare("ai.ayush_questions_per_account_per_hour", INT, 30, area="ai", unit="questions per hour", minimum=5,
        maximum=500, description="Questions one account may ask Agent Ayush in an hour.")
declare("support.inquiries_per_email_per_day", INT, 3, area="support", unit="inquiries per 24 hours", minimum=1,
        maximum=50, description="Institutional inquiries accepted from one email address in 24 hours.")
declare("support.inquiries_per_ip_per_hour", INT, 10, area="support", unit="inquiries per hour", minimum=1,
        maximum=500, description="Institutional inquiries accepted from one network address in an hour.")

# --- Agent Ayush retrieval (services/vector_store.py) -------------------------
# Only used when a semantic embedding model is on (EMBEDDING_PROVIDER=ollama). A
# passage that shares no word with the question (another language, a synonym) is
# admitted only at or above this cosine similarity. Set high on purpose: calibrate
# it against the model in use (docs/guides/ayush-operations.md) before lowering it.
declare("ayush.semantic_admit_similarity", FLOAT, 0.8, area="ayush", unit="cosine similarity", minimum=0.5,
        maximum=0.99, description="Semantic mode: lowest similarity at which a passage with no shared word is admitted.")
# The share of a question's subject words (after typo correction, counting the
# article's title and help-pack keywords) a passage must contain to be considered at
# all. Half keeps "cricket score today" from matching an article that says "today";
# measured on the gold set in backend/tests/test_ayush_eval.py, re-run it after a change.
declare("ayush.min_term_overlap", FLOAT, 0.5, area="ayush", unit="share of subject words", minimum=0.2,
        maximum=1.0, description="Lowest share of a question's subject words a passage must contain to be retrieved.")

# --- platform --------------------------------------------------------------
# A name zoneinfo does not know (in an override or a student's preference) is
# never used: the student's day then falls back to this declared default.
declare("platform.default_timezone", STR, "Asia/Kolkata", area="platform", unit="IANA timezone", public=True,
        description="Timezone for a student's calendar day when they have not set a valid one, and for the "
                    "newsroom's schedules (the composer's publish-later time, series and autopilot slots).")
# General API rate limits (core/rate_limiter.py, founder decision 2026-10-22). A
# signed-in request counts against its session's budget and against its network
# address's ceiling; a request without a session against the ceiling only. One
# student page makes 10-20 calls, so 300 a minute is about 15-30 page loads a
# minute for one person. A campus puts hundreds of students behind one public
# address, so the ceiling is 10x one account (about 70-100 students actively
# browsing at once) and only stops a single source flooding. Sign-in, codes,
# passcode and PIN keep their own strict limits (auth.* and workflow_auth.limit).
# Not public. RATE_LIMIT_API_PER_ACCOUNT_PER_MINUTE / RATE_LIMIT_API_PER_IP_PER_MINUTE
# in the environment pin a value for one deployment (load tests).
declare("platform.api_rate_per_account_per_minute", INT, 300, area="platform", unit="requests per minute",
        minimum=60, maximum=6000,
        description="API requests one signed-in session may make in a minute before it is told to wait (429).")
declare("platform.api_rate_per_ip_per_minute", INT, 3000, area="platform", unit="requests per minute",
        minimum=300, maximum=100000,
        description="API requests one network address may make in a minute, all accounts behind it together.")

# --- sign-in ---------------------------------------------------------------
# A screen pace, not a security limit: the server's own send limit (3 codes per
# identifier per 5 minutes, services/workflow_auth.py) still refuses extra sends.
declare("auth.otp_resend_seconds", INT, 45, area="auth", unit="seconds", minimum=10, maximum=300, public=True,
        description="How long the code screen waits before offering to send a new sign-in code.")
# WhatsApp is offered for sign-in codes only while its OpenWA session is connected
# (services/otp_delivery.py). The session check and a failed send are remembered
# for this long, so /auth/options stays cheap and a failing channel drops out
# until a later success or a fresh check. Not public: the server decides.
# Team accounts (services/team_accounts.py, founder decision 2026-10-22): one
# shared account per role, signed in on /staff-sign-in with an ID and a 6-digit
# PIN. The switch is public so the page hides the option when it is off; the
# server refuses PIN sign-in then as well. A PIN has only a million values, so
# the lockout and the rate limits below are what keep it from being guessed.
declare("auth.staff_pin_login_enabled", BOOL, True, area="auth", public=True,
        description="Whether team accounts may sign in on the staff page with their ID and PIN.")
declare("auth.staff_pin_max_attempts", INT, 5, area="auth", unit="attempts", minimum=3, maximum=10,
        description="Wrong PINs in a row before a team account is locked.")
declare("auth.staff_pin_lockout_minutes", INT, 15, area="auth", unit="minutes", minimum=5, maximum=1440,
        description="How long a team account stays locked after too many wrong PINs.")
declare("auth.staff_pin_rate_window_minutes", INT, 15, area="auth", unit="minutes", minimum=1, maximum=120,
        description="The window the PIN sign-in rate limits below are counted over.")
declare("auth.staff_pin_ip_max_attempts", INT, 20, area="auth", unit="attempts", minimum=5, maximum=200,
        description="PIN sign-in attempts one network address may make in the rate window.")
declare("auth.staff_pin_id_max_attempts", INT, 10, area="auth", unit="attempts", minimum=5, maximum=100,
        description="PIN sign-in attempts against one ID in the rate window, whoever makes them.")
# Student passcode (services/student_passcode.py, founder decision 2026-10-22): an
# optional 4, 6 or 8 character secret a student may use instead of a code, only on
# a device that has signed in to the account before. The switch is public so the
# screens hide the option when it is off; the server refuses it then as well. A
# 4-character passcode is weak, so the lockout and rate limits below matter.
declare("auth.passcode_login_enabled", BOOL, True, area="auth", public=True,
        description="Whether students may set a passcode and sign in with it on a device they have used before.")
declare("auth.passcode_max_attempts", INT, 5, area="auth", unit="attempts", minimum=3, maximum=10,
        description="Wrong passcodes in a row before a student's passcode is locked.")
declare("auth.passcode_lockout_minutes", INT, 15, area="auth", unit="minutes", minimum=5, maximum=1440,
        description="How long a student's passcode stays locked after too many wrong tries (a code still works).")
declare("auth.passcode_rate_window_minutes", INT, 15, area="auth", unit="minutes", minimum=1, maximum=120,
        description="The window the passcode sign-in rate limits below are counted over.")
declare("auth.passcode_ip_max_attempts", INT, 20, area="auth", unit="attempts", minimum=5, maximum=200,
        description="Passcode sign-in attempts one network address may make in the rate window.")
declare("auth.passcode_id_max_attempts", INT, 10, area="auth", unit="attempts", minimum=5, maximum=100,
        description="Passcode sign-in attempts against one account in the rate window, whoever makes them.")
declare("auth.passcode_reset_window_minutes", INT, 15, area="auth", unit="minutes", minimum=5, maximum=120,
        description="How long after signing in with a code a student may replace or remove a passcode without the old one.")
# Passwords (services/account_password.py, plan tier1-auth-password-2026-10-22):
# team accounts first, students next. The switch and the minimum length are public
# so the screens hide the option when off and show the rule; the server refuses
# then as well. Unlike a PIN, a password works on a new device, so the lockout and
# rate limits below are what stand between it and guessing.
declare("auth.password_login_enabled", BOOL, True, area="auth", public=True,
        description="Whether accounts that have a password may sign in with it.")
declare("auth.password_min_length", INT, 10, area="auth", unit="characters", minimum=8, maximum=64, public=True,
        description="The shortest password that can be set.")
declare("auth.password_max_attempts", INT, 5, area="auth", unit="attempts", minimum=3, maximum=10,
        description="Wrong passwords in a row before an account's password is locked.")
declare("auth.password_lockout_minutes", INT, 15, area="auth", unit="minutes", minimum=5, maximum=1440,
        description="How long a password stays locked after too many wrong tries (other sign-in methods still work).")
declare("auth.password_rate_window_minutes", INT, 15, area="auth", unit="minutes", minimum=1, maximum=120,
        description="The window the password sign-in rate limits below are counted over.")
declare("auth.password_ip_max_attempts", INT, 20, area="auth", unit="attempts", minimum=5, maximum=200,
        description="Password sign-in attempts one network address may make in the rate window.")
declare("auth.password_id_max_attempts", INT, 10, area="auth", unit="attempts", minimum=5, maximum=100,
        description="Password sign-in attempts against one ID in the rate window, whoever makes them.")
# B2B invites (services/student_invites.py, plan tier1-auth-password-2026-10-22 b):
# a partner college creates a student's account and sends a one-time link; the
# temporary password goes separately. Both stop working after this long.
declare("auth.invite_link_hours", INT, 72, area="auth", unit="hours", minimum=1, maximum=336,
        description="How long a college's invite link and its temporary password work.")
declare("auth.whatsapp_status_cache_seconds", INT, 60, area="auth", unit="seconds", minimum=5, maximum=900,
        description="How long a WhatsApp session check (or a failed WhatsApp send) is trusted before checking again.")
declare("auth.whatsapp_status_timeout_seconds", INT, 3, area="auth", unit="seconds", minimum=1, maximum=10,
        description="Longest the server waits for OpenWA to answer the WhatsApp session check.")

# A session lasts 12 hours and /auth/refresh renews it; this caps the whole chain
# from the sign-in, after which the person signs in again (audit L1).
declare("auth.session_absolute_hours", INT, 168, area="auth", unit="hours", minimum=12, maximum=2160,
        description="Longest a sign-in can be kept alive by refreshing before the person must sign in again.")

# --- consultations ---------------------------------------------------------
declare("consult.media_join_before_minutes", INT, 15, area="consult", unit="minutes", minimum=0, maximum=120,
        public=True, description="How early before the slot starts a video consult can be joined.")
declare("consult.media_join_after_minutes", INT, 30, area="consult", unit="minutes", minimum=0, maximum=240,
        public=True, description="How long after the slot ends a video consult can still be joined.")
# Not public: the client reads the token's own expiry from the grant.
declare("consult.media_token_ttl_minutes", INT, 10, area="consult", unit="minutes", minimum=1, maximum=60,
        description="Longest lifetime of a video-consult join token (never past the join window).")

# --- appearance ------------------------------------------------------------
declare("appearance.boot_wait_ms", INT, 1500, area="appearance", unit="ms", minimum=0, maximum=10000, public=True,
        description="Longest the app waits at boot for the saved appearance before rendering with the default.")

# --- pharmacy --------------------------------------------------------------
declare("pharmacy.quote_expiry_hours", INT, 0, area="pharmacy", unit="hours", minimum=0,
        maximum=720, public=True,
        description="Hours a pharmacy's price quote stays payable. 0 means quotes do not expire.")

# --- public site -----------------------------------------------------------
# Links in the public site footer (design board Landing). Empty means "not
# published": the footer then shows no badge or icon for it, so a visitor is
# never sent to a store listing or a social account that does not exist. The
# client shows only https:// values.
for _key, _what in (
    ("app_store_url", "Apple App Store listing"),
    ("play_store_url", "Google Play listing"),
    ("instagram_url", "Instagram account"),
    ("linkedin_url", "LinkedIn page"),
    ("x_url", "X account"),
    ("youtube_url", "YouTube channel"),
):
    declare(f"public_site.{_key}", STR, "", area="public_site", unit="https URL", public=True,
            description=f"The {_what} linked from the public site footer. Empty hides the link.")


# --- billing ---------------------------------------------------------------
# Plan prices, set by the founder on 2026-10-20. Whole rupees. The server's plan
# catalogue (GET /api/billing/plans) and the online checkout read these; the
# client's defaults are generated from them. The amount Razorpay actually charges
# is fixed on the Razorpay plan (RAZORPAY_PLUS_PLAN_ID): checkout refuses to start
# when that plan's amount differs from billing.student_plus.monthly_inr.
declare("billing.student_plus.monthly_inr", INT, 149, area="billing", unit="₹ per month", minimum=1,
        maximum=100000, public=True, description="Price of the Student Plus membership, per month.")
declare("billing.student_plus.quarter_package_inr", INT, 2199, area="billing", unit="₹ per 3 months", minimum=1,
        maximum=1000000, public=True, description="Price of the Student Plus 3-month package, paid once.")
declare("billing.premium.from_monthly_inr", INT, 499, area="billing", unit="₹ per month (starting price)",
        minimum=1, maximum=100000, public=True,
        description="Starting price of Premium, per month. Always shown as \"from\" this amount.")
declare("billing.campus.per_student_yearly_inr", INT, 240, area="billing", unit="₹ per student per year",
        minimum=0, maximum=1000000, description="Listed price of the institution-paid Campus plan.")
declare("billing.student_plus.benefit_requests_per_month", INT, 2, area="billing", unit="requests per period",
        minimum=0, maximum=100, description="Care coordination requests a Student Plus member may make each paid period.")
# Not public. Members who subscribed before a price rise keep paying the old
# amount on their existing Razorpay plan; their paid invoices must still count.
# Raise this to the monthly price once every legacy subscription has moved.
declare("billing.student_plus.min_entitling_receipt_inr", INT, 99, area="billing", unit="₹", minimum=1,
        maximum=100000,
        description="Smallest paid, unrefunded Student Plus invoice that grants membership (keeps earlier subscribers).")


def get_declaration(key: str) -> Setting:
    try:
        return REGISTRY[key]
    except KeyError:
        raise UnknownSetting(key) from None


def public_settings() -> list[Setting]:
    return sorted((d for d in REGISTRY.values() if d.public), key=lambda d: d.key)


def check_ordered_pairs(values: dict[str, Any]) -> list[str]:
    """Problems with ``values`` (key -> effective value) against ORDERED_PAIRS."""
    problems = []
    for lower, upper in ORDERED_PAIRS:
        if values[lower] > values[upper]:
            problems.append(f"{lower} ({values[lower]}) must not exceed {upper} ({values[upper]})")
    return problems


# ══════════════════════════════════════════════════════════════════════════════
# Reading: overrides from care_setting_overrides, cached for CACHE_TTL_SECONDS.
# ══════════════════════════════════════════════════════════════════════════════

_lock = threading.Lock()
_cache: dict[str, Any] = {"loaded_at": None, "values": {}}


def reset_cache() -> None:
    """Forget the cached overrides; the next read goes to the database."""
    with _lock:
        _cache["loaded_at"] = None
        _cache["values"] = {}


def _report_invalid(session, key: str, reason: str) -> None:
    """One open ATTENTION ops event per invalid key. Names the key, never the value."""
    from sqlalchemy import select

    from core import workflow_models as M
    from services import ops_feed

    logger.error("[SETTINGS] stored override for %s is invalid (%s); using the default", key, reason)
    open_event = session.scalar(select(M.OpsEvent.id).where(
        M.OpsEvent.kind == INVALID_OVERRIDE_KIND, M.OpsEvent.resource_id == key,
        M.OpsEvent.acknowledged_at == 0).limit(1))
    if open_event is None:
        ops_feed.publish(session, INVALID_OVERRIDE_KIND, "ACCOUNT", severity="ATTENTION",
                         summary=f"Setting {key} has an invalid stored override; the default is in use.",
                         resource_type=OPS_RESOURCE_TYPE, resource_id=key)


def _load(db=None) -> dict[str, Any]:
    """key -> validated override value. Invalid rows are left out and reported.

    Reads in a session of its own (on the caller's engine when one is given), so
    reporting an invalid row never commits or rolls back the caller's work. If the
    overrides cannot be read at all, every setting reads as its default.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from core import workflow_models as M

    values: dict[str, Any] = {}
    try:
        if db is not None:
            session = Session(bind=db.get_bind())
        else:
            from services.db_sql import SessionLocal
            session = SessionLocal()
        with session:
            rows = session.execute(select(M.SettingOverride.key, M.SettingOverride.value)).all()
            reported = False
            for key, raw in rows:
                decl = REGISTRY.get(key)
                if decl is None:
                    # A key removed from the registry: harmless, but someone should clear it.
                    logger.warning("[SETTINGS] override stored for undeclared key %s is ignored", key)
                    continue
                try:
                    values[key] = validate(decl, raw)
                except InvalidSettingValue as exc:
                    _report_invalid(session, key, str(exc))
                    reported = True
            if reported:
                session.commit()
    except Exception as exc:  # noqa: BLE001 — unreadable overrides mean defaults, never a crash
        logger.error("[SETTINGS] overrides could not be read (%s); using defaults", type(exc).__name__)
        return {}
    return values


def _overrides(db=None) -> dict[str, Any]:
    with _lock:
        loaded_at = _cache["loaded_at"]
        if loaded_at is not None and time.monotonic() - loaded_at < CACHE_TTL_SECONDS:
            return _cache["values"]
    values = _load(db)
    with _lock:
        _cache["values"] = values
        _cache["loaded_at"] = time.monotonic()
    return values


def setting(key: str, db=None) -> Any:
    """The effective value of a declared setting: a valid override, else the default.

    Pass the request's session as ``db`` where there is one; without it the
    application's own session factory is used.
    """
    decl = get_declaration(key)
    overrides = _overrides(db)
    return overrides[key] if key in overrides else decl.default


def cached_setting(key: str) -> Any:
    """Like ``setting`` but never reads the database: the override last loaded by
    any ``setting`` call (however old), else the declared default.

    For the outermost ASGI middleware (core/rate_limiter.py), which runs on the
    event loop before any request session exists and must not block on a query.
    Request handlers reload the cache every CACHE_TTL_SECONDS, so an override
    reaches it within about that window.
    """
    decl = get_declaration(key)
    with _lock:
        values = _cache["values"]
        return values[key] if key in values else decl.default


def effective_values(db=None) -> dict[str, Any]:
    overrides = _overrides(db)
    return {key: overrides.get(key, decl.default) for key, decl in REGISTRY.items()}


def public_values(db=None) -> dict[str, Any]:
    """Effective values of the settings declared public, for GET /api/config/public."""
    values = effective_values(db)
    return {decl.key: values[decl.key] for decl in public_settings()}
