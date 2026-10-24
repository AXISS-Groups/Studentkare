"""What the emergency-card wallet pass says (services/wallet_passes.py).

The definition of the pass's fixed words (AGENTS.md rule 11: a definition may hold
its own literals), in the three app languages. Apple Wallet picks the phone's
language from the ``<lang>.lproj/pass.strings`` files built from this table; Google
Wallet gets the same table as translated values. The student's own data (name,
contact, allergies…) is never translated or changed.

English is the source; Telugu and Hindi are unreviewed first drafts listed in
docs/i18n/review-needed.md. "Studentkare", "Tele-MANAS", 112 and 14416 stay as they
are. Plan: docs/plans/tier1-emergency-card-wallet-2026-10-24.md (legal review owed).
"""
from __future__ import annotations

from services.crisis_gate import (
    EMERGENCY_NUMBER as EMERGENCY_NUMBER,  # re-exported for the pass builders
)
from services.crisis_gate import TELE_MANAS_PRIMARY

LOCALES = ("en", "hi", "te")
DEFAULT_LOCALE = "en"

TELE_MANAS_NUMBER = TELE_MANAS_PRIMARY
ORGANIZATION = "Studentkare"

COPY: dict[str, dict[str, str]] = {
    "pass.description": {
        "en": "Emergency card",
        "hi": "इमरजेंसी कार्ड",
        "te": "ఎమర్జెన్సీ కార్డు",
    },
    "pass.title": {
        "en": "In case of emergency",
        "hi": "इमरजेंसी में",
        "te": "అత్యవసర పరిస్థితిలో",
    },
    "label.name": {"en": "Name", "hi": "नाम", "te": "పేరు"},
    "label.blood": {"en": "Blood group", "hi": "ब्लड ग्रुप", "te": "బ్లడ్ గ్రూప్"},
    "label.contact": {"en": "Emergency contact", "hi": "इमरजेंसी संपर्क", "te": "ఎమర్జెన్సీ కాంటాక్ట్"},
    "label.allergies": {"en": "Allergies", "hi": "एलर्जी", "te": "అలర్జీలు"},
    "label.conditions": {"en": "Health conditions", "hi": "स्वास्थ्य स्थितियाँ", "te": "ఆరోగ్య పరిస్థితులు"},
    "label.medicines": {"en": "Medicines", "hi": "दवाएँ", "te": "మందులు"},
    "label.call112": {"en": "Emergency", "hi": "इमरजेंसी", "te": "అత్యవసరం"},
    "label.teleManas": {"en": "Tele-MANAS (mental health)", "hi": "Tele-MANAS (मानसिक स्वास्थ्य)",
                        "te": "Tele-MANAS (మానసిక ఆరోగ్యం)"},
    "label.updated": {"en": "Updated", "hi": "अपडेट", "te": "అప్‌డేట్"},
    "label.about": {"en": "About this pass", "hi": "इस पास के बारे में", "te": "ఈ పాస్ గురించి"},
    "value.call112": {"en": "Call 112", "hi": "112 पर कॉल करें", "te": "112కి కాల్ చేయండి"},
    "value.teleManas": {"en": "Call 14416", "hi": "14416 पर कॉल करें", "te": "14416కి కాల్ చేయండి"},
    "value.notSet": {"en": "Not set", "hi": "सेट नहीं", "te": "సెట్ చేయలేదు"},
    "value.about": {
        "en": "The student chose what is on this pass in Studentkare. It may be read from the lock screen. "
              "It updates when they change their emergency card.",
        "hi": "इस पास पर क्या हो, यह छात्र ने Studentkare में चुना है। इसे लॉक स्क्रीन से पढ़ा जा सकता है। "
              "इमरजेंसी कार्ड बदलने पर यह अपडेट होता है।",
        "te": "ఈ పాస్‌లో ఏం ఉండాలో విద్యార్థి Studentkareలో ఎంచుకున్నారు. దీన్ని లాక్ స్క్రీన్ నుండి చదవవచ్చు. "
              "ఎమర్జెన్సీ కార్డు మారిస్తే ఇది అప్‌డేట్ అవుతుంది.",
    },
    "value.removed": {
        "en": "This card was removed from Studentkare. It holds no details.",
        "hi": "यह कार्ड Studentkare से हटा दिया गया है। इसमें कोई जानकारी नहीं है।",
        "te": "ఈ కార్డు Studentkare నుండి తీసివేయబడింది. ఇందులో ఏ వివరాలూ లేవు.",
    },
    # Blood groups in words: a symbol alone is easy to misread (as on the card).
    "blood.A+": {"en": "A positive", "hi": "A पॉज़िटिव", "te": "A పాజిటివ్"},
    "blood.A-": {"en": "A negative", "hi": "A नेगेटिव", "te": "A నెగటివ్"},
    "blood.B+": {"en": "B positive", "hi": "B पॉज़िटिव", "te": "B పాజిటివ్"},
    "blood.B-": {"en": "B negative", "hi": "B नेगेटिव", "te": "B నెగటివ్"},
    "blood.O+": {"en": "O positive", "hi": "O पॉज़िटिव", "te": "O పాజిటివ్"},
    "blood.O-": {"en": "O negative", "hi": "O नेगेटिव", "te": "O నెగటివ్"},
    "blood.AB+": {"en": "AB positive", "hi": "AB पॉज़िटिव", "te": "AB పాజిటివ్"},
    "blood.AB-": {"en": "AB negative", "hi": "AB नेगेटिव", "te": "AB నెగటివ్"},
}


def text(key: str, locale: str = DEFAULT_LOCALE) -> str:
    entry = COPY[key]
    return entry.get(locale) or entry[DEFAULT_LOCALE]


def translations(key: str) -> dict[str, str]:
    """Every language's text for a key (the source language included)."""
    return {locale: text(key, locale) for locale in LOCALES}
