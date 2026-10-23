"""What a push says, which category an event belongs to, and the announcement check.

This is the definition of push copy and categories (AGENTS.md rule 11: a
definition may hold its own literals). A push is read on a lock screen, over a
shoulder, in a notification shade. So the text for anything raised by the
outbox is a fixed, generic line per category, in the device's language, and
never carries a medicine, test, condition, result, clinician or camp service:
the payload of the event is never read here. The details are in the app, after
unlock and sign-in (DESIGN.md §7, the canvas board *Notification templates*).

English is the source; Telugu and Hindi are unreviewed first drafts listed in
docs/i18n/review-needed.md. "Student Kare" stays in English.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

PUSH = "PUSH"
WHATSAPP = "WHATSAPP"
EMAIL = "EMAIL"
CHANNELS = (PUSH, WHATSAPP, EMAIL)
EXTERNAL_CHANNELS = (WHATSAPP, EMAIL)

SAFETY = "SAFETY"
CARE = "CARE"
REMINDERS = "REMINDERS"
ORDERS = "ORDERS"
CAMPS = "CAMPS"
ACCOUNT = "ACCOUNT"
ANNOUNCEMENTS = "ANNOUNCEMENTS"
OFFERS = "OFFERS"

LOCALES = ("en", "hi", "te")
DEFAULT_LOCALE = "en"


@dataclass(frozen=True)
class Category:
    key: str
    # Channels a student may pick for it. In-app (the inbox) is always on and
    # is not listed: it is where the details are.
    channels: tuple[str, ...]
    # Whether the default includes the student's sign-in channel (WhatsApp or
    # email). True where events of this kind went out that way before push
    # existed (reminders), so nobody silently loses a message they used to get.
    default_sign_in_channel: bool
    locked: bool = False          # safety: always on, every channel, any hour
    path: str = "/notifications"  # where a tap opens (web path; the phone maps it in src/native/linking.ts)
    android_channel: str = "reminders"
    ios_category: str = "update"


# Order is the order the settings screens draw them in.
CATEGORIES: dict[str, Category] = {
    SAFETY: Category(SAFETY, CHANNELS, True, locked=True, android_channel="safety", ios_category="safety"),
    CARE: Category(CARE, CHANNELS, True, android_channel="reminders"),
    REMINDERS: Category(REMINDERS, CHANNELS, True, path="/medications", android_channel="reminders",
                        ios_category="reminder"),
    ORDERS: Category(ORDERS, (PUSH,), False, path="/orders", android_channel="orders"),
    CAMPS: Category(CAMPS, CHANNELS, True, path="/health-camp", android_channel="camps"),
    ACCOUNT: Category(ACCOUNT, (PUSH,), False, android_channel="reminders"),
    ANNOUNCEMENTS: Category(ANNOUNCEMENTS, (PUSH,), False, android_channel="announcements",
                            ios_category="announcement"),
}
# Partner offers are not a channel grid: a single opt-in, off by default
# (care_notification_preferences.marketing_opt_in). Rule L, core/rule_l.py.
OFFERS_CATEGORY = Category(OFFERS, (PUSH,), False, android_channel="announcements", ios_category="announcement")


def category(key: str) -> Category:
    return OFFERS_CATEGORY if key == OFFERS else CATEGORIES[key]


# Event type → category. Exact names first, then prefixes. Anything unknown is
# CARE: the generic "new update" line, health-plane rules (safest default).
_EXACT = {
    "MEDICATION_REMINDER": REMINDERS,
    "medication_refill": REMINDERS,
    "appointment_reminder": CARE,
    "camp_reminder": CAMPS,
    "STOCK_BACK": ORDERS,
    "BLOOD_SOS": SAFETY,
    "CRISIS_ALERT": SAFETY,
    "TWO_FACTOR_RESET": SAFETY,
}
_PREFIXES = (
    ("SOS_", SAFETY),
    ("CAMP_", CAMPS),
    ("CAMPUS_", ACCOUNT),          # campus verification, leaving campus
    ("ORDER_", ORDERS),
    ("SUBSCRIPTION_", ORDERS),
    ("RETURN_", ORDERS),
    ("REFUND_", ORDERS),
    ("PAYMENT_", ORDERS),
)


def category_of(event_type: str) -> str:
    name = event_type or ""
    if name in _EXACT:
        return _EXACT[name]
    for prefix, key in _PREFIXES:
        if name.startswith(prefix):
            return key
    return CARE


# --- what the lock screen shows ------------------------------------------------
BRAND = "Student Kare"

LOCK_SCREEN: dict[str, dict[str, str]] = {
    "en": {
        SAFETY: "You have an important update in Student Kare. Open the app now.",
        CARE: "You have a new update in Student Kare. Open the app to see it.",
        REMINDERS: "You have a reminder in Student Kare.",
        ORDERS: "You have an order update in Student Kare.",
        CAMPS: "You have an update about a booking in Student Kare.",
        ACCOUNT: "You have an account update in Student Kare.",
    },
    "hi": {
        SAFETY: "Student Kare में आपके लिए एक ज़रूरी अपडेट है। अभी ऐप खोलें।",
        CARE: "Student Kare में आपके लिए एक नया अपडेट है। देखने के लिए ऐप खोलें।",
        REMINDERS: "Student Kare में आपके लिए एक रिमाइंडर है।",
        ORDERS: "Student Kare में आपके ऑर्डर का अपडेट है।",
        CAMPS: "Student Kare में आपकी बुकिंग का अपडेट है।",
        ACCOUNT: "Student Kare में आपके खाते का अपडेट है।",
    },
    "te": {
        SAFETY: "Student Kare లో మీకు ముఖ్యమైన అప్‌డేట్ ఉంది. ఇప్పుడే యాప్ తెరవండి.",
        CARE: "Student Kare లో మీకు కొత్త అప్‌డేట్ ఉంది. చూడటానికి యాప్ తెరవండి.",
        REMINDERS: "Student Kare లో మీకు ఒక రిమైండర్ ఉంది.",
        ORDERS: "Student Kare లో మీ ఆర్డర్ అప్‌డేట్ ఉంది.",
        CAMPS: "Student Kare లో మీ బుకింగ్ గురించి అప్‌డేట్ ఉంది.",
        ACCOUNT: "Student Kare లో మీ ఖాతా అప్‌డేట్ ఉంది.",
    },
}


def normal_locale(value: str | None) -> str:
    code = (value or "").strip().lower()[:2]
    return code if code in LOCALES else DEFAULT_LOCALE


def lock_screen_text(category_key: str, locale: str | None) -> tuple[str, str]:
    """(title, body) for an outbox push: the brand and a fixed generic line. Nothing else."""
    lines = LOCK_SCREEN[normal_locale(locale)]
    return BRAND, lines.get(category_key, lines[CARE])


# --- announcement check ----------------------------------------------------------
# Announcements and offers are the only pushes whose text a person writes, and
# that text is shown on the lock screen. It must not be about anyone's health,
# must not ask for a code or a password, and carries no link (a link in a push
# is how phishing looks). The terms are matched as whole words, case-insensitive.
# Public-health notices ("dengue alert", "flu camp") are refused too: whether a
# super admin may push clinical alert content is a Tier 1 decision
# (docs/plans/tier1-push-clinical-alerts-2026-10-23.md), not this check's.
HEALTH_TERMS = (
    # care and records
    "diagnosis", "diagnosed", "prescription", "prescribed", "medicine", "medicines", "medication", "medications",
    "tablet", "tablets", "capsule", "capsules", "dose", "doses", "dosage", "pill", "pills", "injection", "vaccine",
    "vaccination", "report", "reports", "result", "results", "lab", "test", "tests", "scan", "x-ray", "blood",
    "sugar", "pressure", "bp", "hba1c", "cholesterol", "thyroid", "symptom", "symptoms", "condition", "disease",
    "illness", "infection", "allergy", "allergies", "doctor", "consult", "clinic", "hospital", "patient",
    "treatment", "therapy", "counselling", "counseling", "counsellor", "camp", "screening", "checkup", "check-up",
    # conditions
    "fever", "flu", "dengue", "malaria", "typhoid", "covid", "tuberculosis", "tb", "hiv", "aids", "std", "sti",
    "cancer", "diabetes", "asthma", "pregnancy", "pregnant", "contraception", "abortion", "depression", "anxiety",
    "mental", "suicide", "self-harm", "addiction", "rehab",
    # Hindi and Telugu (drafts; docs/i18n/review-needed.md)
    "दवा", "दवाई", "रिपोर्ट", "जाँच", "बीमारी", "डॉक्टर", "इलाज", "बुखार",
    "మందు", "మందులు", "రిపోర్ట్", "పరీక్ష", "వ్యాధి", "డాక్టర్", "చికిత్స", "జ్వరం",
)
CODE_TERMS = ("otp", "password", "passcode", "pin", "aadhaar", "abha", "cvv", "verification code", "one-time code")
_WORD = r"(?<![\w-]){}(?![\w-])"
_HEALTH = re.compile("|".join(_WORD.format(re.escape(term)) for term in HEALTH_TERMS), re.IGNORECASE)
_CODES = re.compile("|".join(_WORD.format(re.escape(term)) for term in CODE_TERMS), re.IGNORECASE)
_LINK = re.compile(r"(https?://|www\.|\b[a-z0-9-]+\.(com|co|in|org|net|io|ly|me|app)\b)", re.IGNORECASE)

PROBLEM_TITLE_EMPTY = "TITLE_EMPTY"
PROBLEM_BODY_EMPTY = "BODY_EMPTY"
PROBLEM_TITLE_TOO_LONG = "TITLE_TOO_LONG"
PROBLEM_BODY_TOO_LONG = "BODY_TOO_LONG"
PROBLEM_HEALTH = "HEALTH_TERM"
PROBLEM_CODE = "ASKS_FOR_CODE"
PROBLEM_LINK = "HAS_LINK"


def check_announcement(title: str, body: str, *, title_max: int, body_max: int) -> list[str]:
    """Closed problem codes; an empty list means the text may be pushed."""
    problems: list[str] = []
    clean_title, clean_body = (title or "").strip(), (body or "").strip()
    if not clean_title:
        problems.append(PROBLEM_TITLE_EMPTY)
    if not clean_body:
        problems.append(PROBLEM_BODY_EMPTY)
    if len(clean_title) > title_max:
        problems.append(PROBLEM_TITLE_TOO_LONG)
    if len(clean_body) > body_max:
        problems.append(PROBLEM_BODY_TOO_LONG)
    text = f"{clean_title}\n{clean_body}"
    if _HEALTH.search(text):
        problems.append(PROBLEM_HEALTH)
    if _CODES.search(text):
        problems.append(PROBLEM_CODE)
    if _LINK.search(text):
        problems.append(PROBLEM_LINK)
    return problems


def contains_health_term(text: str) -> bool:
    return bool(_HEALTH.search(text or ""))
