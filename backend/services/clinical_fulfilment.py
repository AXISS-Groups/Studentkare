"""
services.clinical_fulfilment — prescribing, dispensing and diagnostic fulfilment rules.

Three things live here because they are decisions, not plumbing:

1. **Allergy cross-check.** Python peer of ``src/ai/engines/allergyCrossCheck.ts`` (M-4.3).
   Deterministic substance and cross-reactivity matching, never a model. It states a
   fact ("your record lists a penicillin allergy") and never offers clinical advice,
   and it never claims safety — a clear result carries no reassurance.

2. **Dispense lifecycle.** A prescription cannot be dispensed without a named
   pharmacist verifying it. The transition table below is the only way to move a
   dispense forward, so there is no path that skips that step.

3. **Lab lifecycle.** A sample is collected, transported, analysed and only then
   released. A critical value interrupts the queue rather than waiting in it.
"""
from __future__ import annotations

# ── Allergy cross-check (M-4.3) ────────────────────────────────────────────────
# SYNC: src/ai/engines/allergyCrossCheck.ts — CROSS_REACTIVITY_MAP
CROSS_REACTIVITY_MAP: dict[str, list[str]] = {
    "SUB_SULFA_COMPOUND": ["SUB_SULFA_COMPOUND", "SULFA", "SULFAMETHOXAZOLE", "SULFONAMIDE"],
    "SUB_PENICILLIN": ["SUB_PENICILLIN", "PENICILLIN", "AMOXICILLIN", "AMPICILLIN"],
    "SUB_CIPROFLOXACIN": ["SUB_CIPROFLOXACIN", "CIPROFLOXACIN", "FLUOROQUINOLONE"],
}


def cross_check_allergies(generic_name: str, allergies: list[str], substance_code: str = "") -> dict:
    """Flag a prescribed substance against the patient's recorded allergies.

    Students record allergies as free text ("Sulfa drugs", "penicillin"), not as codes,
    so matching works in both directions: the recorded text against the drug name, and
    each cross-reactive term against the recorded text.

    Two things this deliberately does not do. It never reports that a drug is safe —
    ``hasConflict: False`` means nothing matched, and an empty allergy list means
    nothing was recorded, which is not the same as no allergies. And without a
    ``substance_code`` it cannot know a drug's cross-reactive family, so it compares
    names only; ``crossReactivityChecked`` says which of the two happened, and the
    caller must show that rather than imply a fuller check than was run.
    """
    checked_families = bool(substance_code)
    if not generic_name or not allergies:
        return {"hasConflict": False, "conflicts": [], "crossReactivityChecked": checked_families}

    target = generic_name.strip().upper()
    family = CROSS_REACTIVITY_MAP.get(substance_code.strip().upper(), [])
    if substance_code and not family:
        family = [substance_code.strip().upper()]

    conflicts = []
    for allergy in allergies:
        recorded = (allergy or "").strip().upper()
        if not recorded:
            continue
        name_match = recorded in target or target in recorded
        # "SULFA" must match a record of "SULFA DRUGS"; substring either way covers
        # the phrasing students actually use.
        family_match = any(term and (term in recorded or recorded in term) for term in family)
        if name_match or family_match:
            conflicts.append({
                "substance": allergy,
                "flag": (
                    f"This contains {allergy}. Your record lists a {allergy} allergy. "
                    f"Do not take this without asking a doctor."
                ),
            })
    return {"hasConflict": bool(conflicts), "conflicts": conflicts, "crossReactivityChecked": checked_families}


# ── Dispense lifecycle ─────────────────────────────────────────────────────────
DISPENSE_START = "RX_ISSUED"

# A dispense may only move along these edges. PACKED is unreachable without
# RX_VERIFIED, which is the pharmacist gate.
DISPENSE_TRANSITIONS: dict[str, tuple[str, ...]] = {
    "RX_ISSUED": ("RX_VERIFIED", "REJECTED", "CANCELLED"),
    "RX_VERIFIED": ("ACCEPTED", "PARTIALLY_ACCEPTED", "REJECTED", "CANCELLED"),
    # SUBSTITUTION_PROPOSED is entered through /dispenses/{id}/substitutions and left
    # only when the prescriber decides. The pharmacy cannot approve its own proposal.
    "SUBSTITUTION_PROPOSED": ("RX_VERIFIED", "REJECTED", "CANCELLED"),
    "PARTIALLY_ACCEPTED": ("PACKED", "REJECTED", "CANCELLED"),
    "ACCEPTED": ("PACKED", "REJECTED", "CANCELLED"),
    "PACKED": ("OUT_FOR_DELIVERY", "CANCELLED"),
    "OUT_FOR_DELIVERY": ("DELIVERED", "RETURNED"),
    "DELIVERED": ("RETURNED",),
    "REJECTED": (),
    "CANCELLED": (),
    "RETURNED": (),
}

DISPENSE_TERMINAL = {"DELIVERED", "REJECTED", "CANCELLED", "RETURNED"}

# Transitions only the patient may make; everything else belongs to the pharmacy.
DISPENSE_PATIENT_TRANSITIONS = {"CANCELLED"}


# ── Lab lifecycle ──────────────────────────────────────────────────────────────
LAB_START = "BOOKED"

LAB_TRANSITIONS: dict[str, tuple[str, ...]] = {
    "BOOKED": ("ASSIGNED", "CANCELLED"),
    "ASSIGNED": ("SAMPLE_COLLECTED", "CANCELLED"),
    "SAMPLE_COLLECTED": ("IN_TRANSIT", "RECEIVED_AT_LAB", "SAMPLE_REJECTED"),
    "IN_TRANSIT": ("RECEIVED_AT_LAB", "SAMPLE_REJECTED"),
    "RECEIVED_AT_LAB": ("IN_ANALYSIS", "SAMPLE_REJECTED"),
    "IN_ANALYSIS": ("REPORT_READY", "SAMPLE_REJECTED"),
    "REPORT_READY": ("REPORT_RELEASED",),
    "REPORT_RELEASED": (),
    # A haemolysed, insufficient or mislabelled sample needs somewhere to go that
    # is neither a fabricated result nor losing the booking.
    "SAMPLE_REJECTED": ("RECOLLECTION_REQUIRED", "CANCELLED"),
    "RECOLLECTION_REQUIRED": ("ASSIGNED", "CANCELLED"),
    "CANCELLED": (),
}

LAB_TERMINAL = {"REPORT_RELEASED", "CANCELLED"}

# Rejecting a sample must say why: the student is being asked to give another one.
LAB_REQUIRES_REASON = {"SAMPLE_REJECTED"}

# A sample identifier must exist before the chain of custody can continue.
LAB_REQUIRES_SAMPLE_ID = {"IN_TRANSIT", "RECEIVED_AT_LAB", "IN_ANALYSIS", "REPORT_READY", "REPORT_RELEASED"}

LAB_PATIENT_TRANSITIONS = {"CANCELLED"}


class TransitionError(ValueError):
    """Raised for a move the lifecycle does not allow. Callers map this to HTTP 409."""


def assert_transition(table: dict[str, tuple[str, ...]], current: str, target: str, label: str) -> None:
    allowed = table.get(current)
    if allowed is None:
        raise TransitionError(f"{label} is in an unknown state '{current}'.")
    if target not in allowed:
        readable = ", ".join(allowed) if allowed else "nothing — it is final"
        raise TransitionError(f"A {label} at '{current}' can only move to {readable}.")


def next_dispense_states(current: str) -> list[str]:
    return list(DISPENSE_TRANSITIONS.get(current, ()))


def next_lab_states(current: str) -> list[str]:
    return list(LAB_TRANSITIONS.get(current, ()))
