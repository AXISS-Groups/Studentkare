"""Persistent account, clinical-self-service, and operational workflow tables."""
from datetime import date

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    event,
)
from sqlalchemy import (
    false as sa_false,
)
from sqlalchemy import (
    true as sa_true,
)
from sqlalchemy.orm import Mapped, mapped_column

from services.db_sql import Base


class Account(Base):
    __tablename__ = "care_accounts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    identifier: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    channel: Mapped[str] = mapped_column(String(16))
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(24), default="STUDENT")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    profile: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[float] = mapped_column(Float)
    # VENDOR only: PHARMACY | LAB | CLINIC | WELLNESS, set by a super admin. Its own
    # column, not a profile key, because PATCH /profile merges into the profile.
    partner_kind: Mapped[str] = mapped_column(String(12), default="", server_default="")
    # A shared team account (services/team_accounts.py): one per role, signed in
    # with a PIN, scoped to the test campus / test partner organisation so it sees
    # no real student's data. Set only by the team-accounts command, never by an API.
    is_team_account: Mapped[bool] = mapped_column(Boolean, default=False, server_default=sa_false())
    # CAMPUS_ADMIN / COUNSELLOR only: the campus this staff member acts for. Its own
    # column, never a profile key, because PATCH /profile writes the profile and a
    # campus scope taken from there let staff move themselves into any college
    # (audit C1). Set only by a super admin (create_staff, assign_campus), the
    # provisioning script and the team-accounts command.
    staff_campus: Mapped[str] = mapped_column(String(160), default="", server_default="")


class StaffPinCredential(Base):
    """A team account's sign-in PIN. Only a salted scrypt hash is kept, never the PIN.

    Failed attempts count towards a lockout (auth.staff_pin_max_attempts within
    auth.staff_pin_lockout_minutes). Platform plane (core/rule_l.py): neither group
    role has any grant on it.
    """
    __tablename__ = "care_staff_pin_credentials"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    pin_hash: Mapped[str] = mapped_column(String(255))
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_until: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    created_at: Mapped[float] = mapped_column(Float)
    rotated_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    last_sign_in_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class AccountContact(Base):
    """One way to reach an account: its email or its WhatsApp number, at most one of each.

    ``verified_at`` is when a one-time code sent to it was entered (0 = not yet).
    Only a verified contact can receive a sign-in code (services/contact_store.py),
    so a mistyped or someone else's number never becomes a way in. Each value
    belongs to one account. ``care_accounts.identifier`` stays the primary
    contact. Platform plane (core/rule_l.py). Plan tier1-auth-password-2026-10-22 (A).
    """
    __tablename__ = "care_account_contacts"
    __table_args__ = (UniqueConstraint("account_id", "kind", name="uq_account_contact_kind"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))   # EMAIL | WHATSAPP
    value: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    verified_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    created_at: Mapped[float] = mapped_column(Float)


class StudentInvite(Base):
    """A partner college's invitation to a student account it created (B2B).

    The student claims it through a one-time link sent to their email or WhatsApp
    and a temporary password the college hands over separately. Only hashes of
    the link token and the temporary password are kept. Wrong temporary passwords
    lock it like a password. Platform plane (core/rule_l.py). Plan
    tier1-auth-password-2026-10-22, amendment (b); services/student_invites.py.
    """
    __tablename__ = "care_student_invites"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    temp_password_hash: Mapped[str] = mapped_column(String(255))
    link_channel: Mapped[str] = mapped_column(String(16))   # EMAIL | WHATSAPP
    university: Mapped[str] = mapped_column(String(160))
    created_by: Mapped[str] = mapped_column(String)
    created_at: Mapped[float] = mapped_column(Float)
    expires_at: Mapped[float] = mapped_column(Float)
    sent_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    claimed_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_until: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class AccountPassword(Base):
    """An account's sign-in password. Only a salted, peppered scrypt hash is kept
    (services/team_accounts.hash_pin), never the password.

    Wrong tries count towards a lockout (auth.password_max_attempts, then
    auth.password_lockout_minutes). Team accounts only for now; students follow
    (plan tier1-auth-password-2026-10-22). Platform plane (core/rule_l.py): neither
    group role has any grant on it. See services/account_password.py.
    """
    __tablename__ = "care_account_passwords"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_until: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    last_sign_in_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class StudentPasscode(Base):
    """A student's optional secret passcode (4, 6 or 8 characters). Only a salted,
    peppered scrypt hash is kept (services/team_accounts.hash_pin), never the passcode.

    Wrong tries count towards a lockout (auth.passcode_max_attempts, then
    auth.passcode_lockout_minutes). Platform plane (core/rule_l.py): neither group
    role has any grant on it. See services/student_passcode.py.
    """
    __tablename__ = "care_student_passcodes"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    passcode_hash: Mapped[str] = mapped_column(String(255))
    length: Mapped[int] = mapped_column(Integer)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_until: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    last_sign_in_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class Session(Base):
    __tablename__ = "care_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    csrf_token: Mapped[str] = mapped_column(String(100))
    expires_at: Mapped[float] = mapped_column(Float, index=True)
    # When this session's sign-in was proven with a one-time code (0: it wasn't,
    # e.g. a passcode or a team PIN). A refresh keeps it. A student may replace a
    # forgotten passcode only shortly after a code sign-in (services/student_passcode.py).
    code_verified_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    # When the sign-in that started this chain of refreshes happened. A refresh
    # keeps it, so a session can't be renewed past auth.session_absolute_hours
    # (audit L1). 0 = issued before this column existed.
    signed_in_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class RememberedDevice(Base):
    """A device that remembers a student's last sign-in (set after every student
    sign-in, and by "remember me" at sign-out). Grants no session: it lets the
    login screen offer the masked account and start an OTP for it, and it is the
    proof that this device has signed in to the account before, which a passcode
    sign-in needs (services/student_passcode.py)."""
    __tablename__ = "care_remembered_devices"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    last_route: Mapped[str] = mapped_column(String(60), default="")
    expires_at: Mapped[float] = mapped_column(Float, index=True)


class TwoFactorSecret(Base):
    """An account's authenticator (TOTP) secret. Encrypted at rest; see services/twofa_store.py."""
    __tablename__ = "care_two_factor"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    secret_sealed: Mapped[str] = mapped_column(String(400))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[float] = mapped_column(Float, default=0.0)
    # Highest 30 s step already accepted: a code is never accepted twice.
    last_step: Mapped[int] = mapped_column(Integer, default=0)


class TwoFactorPending(Base):
    """A password-less first factor that passed and is waiting for the authenticator code."""
    __tablename__ = "care_two_factor_pending"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    expires_at: Mapped[float] = mapped_column(Float, index=True)
    # Which first factor passed: CODE (a one-time code), PASSCODE or PIN. Only a
    # code counts as code-proven for the session that follows.
    first_factor: Mapped[str] = mapped_column(String(12), default="CODE", server_default="CODE")


class OtpChallenge(Base):
    __tablename__ = "care_otp_challenges"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    identifier: Mapped[str] = mapped_column(String(254), index=True)
    intent: Mapped[str] = mapped_column(String(12))
    channel: Mapped[str] = mapped_column(String(16))
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[float] = mapped_column(Float)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    # VERIFY only: the signed-in account adding this contact. A code for one
    # account's contact can never verify it for another.
    account_id: Mapped[str] = mapped_column(String, default="", server_default="")


class SignupGrant(Base):
    __tablename__ = "care_signup_grants"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    identifier: Mapped[str] = mapped_column(String(254))
    channel: Mapped[str] = mapped_column(String(16))
    csrf_token: Mapped[str] = mapped_column(String(100))
    expires_at: Mapped[float] = mapped_column(Float)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    # The other contact, proven with its own code during sign-up (services/signup_contacts.py):
    # the email if the account signs up by WhatsApp, or the other way round.
    second_channel: Mapped[str] = mapped_column(String(16), default="", server_default="")
    second_identifier: Mapped[str] = mapped_column(String(254), default="", server_default="")
    second_verified_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class RateBucket(Base):
    __tablename__ = "care_rate_buckets"
    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[float] = mapped_column(Float, index=True)


class Reading(Base):
    __tablename__ = "care_readings"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    metric: Mapped[str] = mapped_column(String(30), index=True)
    value: Mapped[float] = mapped_column(Float)
    recorded_at: Mapped[str] = mapped_column(String(40), index=True)
    source: Mapped[str] = mapped_column(String(30), default="MANUAL")


class Document(Base):
    __tablename__ = "care_documents"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(30))
    filename: Mapped[str] = mapped_column(String(200))
    mime_type: Mapped[str] = mapped_column(String(100))
    content: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[float] = mapped_column(Float)


class Preference(Base):
    __tablename__ = "care_preferences"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    saved_exercises: Mapped[list] = mapped_column(JSON, default=list)
    completed_tasks: Mapped[list] = mapped_column(JSON, default=list)
    task_date: Mapped[str] = mapped_column(String(10), default="")
    # Daily water goal the owner set, in ml (bounds: wellness.water_goal_ml_*
    # settings). NULL = never set; the API then uses its default and says so.
    water_goal_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Test keys the owner bookmarked on Trends (services/lab_results.py, D-M2-10).
    # A test name is health data, so it lives here (clinical plane), never in
    # client storage. NULL = never set (read as no bookmarks).
    pinned_lab_tests: Mapped[list | None] = mapped_column(JSON, nullable=True)


class ClinicalProfile(Base):
    """A student's typed blood group and allergies (Rule L: clinical plane).

    These used to sit in ``care_accounts.profile`` (identity plane), where any
    code reading an account could see them. ``allergies`` is the student's own
    free text. An empty list on its own means "not answered";
    ``no_known_allergies`` is True only when the student said they have none,
    so "none" and "not answered" are never confused (the prescribing cross-check
    treats an empty list as nothing recorded). ``blood_group`` "" means not given.
    """
    __tablename__ = "care_clinical_profiles"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    blood_group: Mapped[str] = mapped_column(String(3), default="")
    allergies: Mapped[list] = mapped_column(JSON, default=list)
    no_known_allergies: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[float] = mapped_column(Float, default=0)


class WellnessGoal(Base):
    """What a student said they want from the app, asked once during setup.

    Both answers are optional and "" means not answered. Clinical plane (Rule L):
    "Manage stress" or "Sleep better" says something about a person's health, so
    commerce code must never be able to read it. No weight, BMI or body target
    is stored here, by design.
    """
    __tablename__ = "care_wellness_goals"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    primary_goal: Mapped[str] = mapped_column(String(32), default="")
    activity_level: Mapped[str] = mapped_column(String(32), default="")
    updated_at: Mapped[float] = mapped_column(Float, default=0)


class ExerciseSession(Base):
    __tablename__ = "care_exercise_sessions"
    __table_args__ = (UniqueConstraint("account_id", "client_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    client_id: Mapped[str] = mapped_column(String(80))
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    summary: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[float] = mapped_column(Float)


class CatalogImage(Base):
    """A product photo for a catalogue listing. Commerce plane (Rule L).

    These used to live in care_documents, the clinical record table, which put
    marketplace pictures in the same rows as health records and kept the image
    endpoints off the sk_commerce role. Migration c2f8a1d6e4b7 moved them here.
    """
    __tablename__ = "care_catalog_images"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("care_catalog.id"), index=True)
    filename: Mapped[str] = mapped_column(String(200))
    mime_type: Mapped[str] = mapped_column(String(100))
    content: Mapped[bytes] = mapped_column(LargeBinary)
    uploaded_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[float] = mapped_column(Float)


class CatalogEntry(Base):
    __tablename__ = "care_catalog"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(160))
    brand: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(String(2000))
    pack: Mapped[str] = mapped_column(String(160))
    price_paise: Mapped[int] = mapped_column(Integer)
    mrp_paise: Mapped[int] = mapped_column(Integer, default=0)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_prescription: Mapped[bool] = mapped_column(Boolean, default=False)
    preparation: Mapped[str] = mapped_column(String(1000), default="")
    image_id: Mapped[str] = mapped_column(String(80), nullable=True, default=None)
    image_mime: Mapped[str] = mapped_column(String(40), nullable=True, default=None)
    # The medicine-master record this listing sells (products only). Same-composition
    # alternatives and salt search go through it (services/medicine_master.py).
    medicine_id: Mapped[str | None] = mapped_column(ForeignKey("care_medicines.id"), nullable=True,
                                                    index=True, default=None)
    # Lab packages only: the tests a package is made of (names, never values),
    # how long to fast before collection (0 = none) and the lab's stated
    # turnaround. Product information, nothing about a person.
    includes: Mapped[list] = mapped_column(JSON, default=list, server_default="[]")
    fasting_hours: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    report_hours: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class Medicine(Base):
    """One medicine in the master: what is in it, its dosage form and its Indian drug schedule.

    Reference data about a product, never about a person, so it sits in the
    commerce plane beside the catalogue (core/rule_l.py). ``requires_prescription``
    is derived from ``schedule`` on every write and is never set on its own.
    ``composition_key`` is the normalised salts + strengths, so two medicines
    with the same composition compare equal whatever order the salts were typed in.
    """
    __tablename__ = "care_medicines"
    __table_args__ = (
        CheckConstraint("schedule IN ('OTC', 'H', 'H1', 'X')", name="ck_care_medicines_schedule"),
        CheckConstraint("requires_prescription OR schedule = 'OTC'", name="ck_care_medicines_rx_schedule"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    composition_key: Mapped[str] = mapped_column(String(600), index=True)
    dosage_form: Mapped[str] = mapped_column(String(24), index=True)
    pack: Mapped[str] = mapped_column(String(120))
    manufacturer: Mapped[str] = mapped_column(String(120))
    schedule: Mapped[str] = mapped_column(String(4))               # OTC | H | H1 | X
    requires_prescription: Mapped[bool] = mapped_column(Boolean, default=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    source: Mapped[str] = mapped_column(String(16), default="ADMIN")  # ADMIN | DEMO_SEED
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)


class MedicineIngredient(Base):
    """One salt of a medicine and its strength, in label order."""
    __tablename__ = "care_medicine_ingredients"
    __table_args__ = (
        UniqueConstraint("medicine_id", "salt_key"),
        CheckConstraint("strength_value > 0", name="ck_care_medicine_ingredients_strength"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    medicine_id: Mapped[str] = mapped_column(ForeignKey("care_medicines.id"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    salt: Mapped[str] = mapped_column(String(80))
    salt_key: Mapped[str] = mapped_column(String(80), index=True)   # lower case, single-spaced
    strength_value: Mapped[float] = mapped_column(Float)
    strength_unit: Mapped[str] = mapped_column(String(12))


class MedicineInfoField(Base):
    """One field of a medicine's information, with where it came from and who reviewed it.

    Plan tier1-medicine-info-2026-10-22. Product reference data (commerce plane,
    beside the master), never about a person. Identity fields (brand,
    composition, form, pack, manufacturer, schedule) keep no value here: they are
    read from the master and reviewed against its current value. Monograph fields
    (uses, side effects, warnings, storage, age availability) keep their value in
    ``value``. A field reaches users only while ``state`` is REVIEWED and the hash
    of its current value equals ``reviewed_hash`` (services/medicine_info.py).
    """
    __tablename__ = "care_medicine_info_fields"
    __table_args__ = (
        UniqueConstraint("medicine_id", "field"),
        CheckConstraint("state IN ('UNREVIEWED', 'REVIEWED')", name="ck_care_medicine_info_fields_state"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    medicine_id: Mapped[str] = mapped_column(ForeignKey("care_medicines.id"), index=True)
    field: Mapped[str] = mapped_column(String(24))
    value: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)
    source_title: Mapped[str] = mapped_column(String(200), default="")
    source_url: Mapped[str] = mapped_column(String(2000), default="")
    state: Mapped[str] = mapped_column(String(12), default="UNREVIEWED", index=True)
    reviewed_by: Mapped[str | None] = mapped_column(String, nullable=True, default=None)   # a pharmacist's account id
    reviewed_on: Mapped[date | None] = mapped_column(Date, nullable=True, default=None)
    reviewed_at: Mapped[float] = mapped_column(Float, default=0.0)
    reviewed_hash: Mapped[str] = mapped_column(String(64), default="")
    import_id: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    updated_by: Mapped[str] = mapped_column(String, default="")
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class MedicineInfoEvent(Base):
    """Append-only trail of medicine-information changes (ids and hashes only, no text)."""
    __tablename__ = "care_medicine_info_events"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    medicine_id: Mapped[str] = mapped_column(ForeignKey("care_medicines.id"), index=True)
    field: Mapped[str] = mapped_column(String(24), default="")
    action: Mapped[str] = mapped_column(String(24))                 # IMPORTED | EDITED | REVIEWED | REVIEW_WITHDRAWN
    actor_id: Mapped[str] = mapped_column(String, default="")
    actor_role: Mapped[str] = mapped_column(String(24), default="")
    value_hash: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[float] = mapped_column(Float, index=True)


class MedicineInfoImport(Base):
    """One CSV import from a licensed dataset. Everything it brings in lands UNREVIEWED."""
    __tablename__ = "care_medicine_info_imports"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    filename: Mapped[str] = mapped_column(String(200), default="")
    dataset: Mapped[str] = mapped_column(String(200))
    licence: Mapped[str] = mapped_column(String(300))
    source_url: Mapped[str] = mapped_column(String(2000), default="")
    rows_total: Mapped[int] = mapped_column(Integer, default=0)
    rows_created: Mapped[int] = mapped_column(Integer, default=0)
    rows_matched: Mapped[int] = mapped_column(Integer, default=0)
    rows_rejected: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[list] = mapped_column(JSON, default=list)
    created_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class Order(Base):
    __tablename__ = "care_orders"
    __table_args__ = (UniqueConstraint("account_id", "idempotency_key"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(80))
    request_hash: Mapped[str] = mapped_column(String(64))
    total_paise: Mapped[int] = mapped_column(Integer)
    delivery: Mapped[dict] = mapped_column(JSON)
    requested_slot: Mapped[str] = mapped_column(String(40), default="")
    payment_status: Mapped[str] = mapped_column(String(24), default="UNPAID")
    created_at: Mapped[float] = mapped_column(Float, index=True)
    # When an unpaid order gives its stock back (services/payments.py). 0 = no
    # online payment was on offer when it was placed, so it never expires.
    payment_due_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0", index=True)


def _payable_id_from_order(context) -> str:
    """A payment written with only order_id (the pre-payable shape) names that shop order."""
    return context.get_current_parameters().get("order_id") or ""


class Payment(Base):
    """A captured or failed payment for one payable (kind + id, services/payments.py).

    ``order_id`` is kept for shop orders only, where it equals ``payable_id``;
    other kinds leave it null. Code reads the payable through ``payable_kind``
    and ``payable_id``.
    """
    __tablename__ = "care_payments"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str | None] = mapped_column(ForeignKey("care_orders.id"), index=True, nullable=True, default=None)
    payable_kind: Mapped[str] = mapped_column(String(24), default="shop_order", server_default="shop_order")
    payable_id: Mapped[str] = mapped_column(String(64), default=_payable_id_from_order, server_default="", index=True)
    amount_paise: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(24), default="CREATED")
    provider: Mapped[str] = mapped_column(String(40), default="")
    provider_ref: Mapped[str] = mapped_column(String(120), default="")
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    settled_at: Mapped[float] = mapped_column(Float, default=0.0)
    intent_id: Mapped[str] = mapped_column(String(64), default="", server_default="")
    refunded_paise: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    failure_code: Mapped[str] = mapped_column(String(40), default="", server_default="")


class PaymentIntent(Base):
    """One attempt to collect a payable's amount through a provider (services/payments.py).

    A payable is anything with a server-side price: ``kind`` + ``id``. Only
    ``shop_order`` is wired; lab and consultation bookings will add kinds. No
    item names, notes or anything about the person's health are stored here or
    sent to the provider (Rule L).
    """
    __tablename__ = "care_payment_intents"
    # One payment per checkout attempt: the client's Idempotency-Key, unique per payable
    # (NULL when none was sent; NULLs never collide). Live-run audit #9.
    __table_args__ = (UniqueConstraint("payable_kind", "payable_id", "idempotency_key",
                                       name="uq_care_payment_intents_payable_key"),)
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payable_kind: Mapped[str] = mapped_column(String(24))
    payable_id: Mapped[str] = mapped_column(String(64), index=True)
    account_id: Mapped[str] = mapped_column(String(64), index=True)
    amount_paise: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    provider: Mapped[str] = mapped_column(String(24))
    provider_order_id: Mapped[str] = mapped_column(String(120), unique=True)
    test_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    # CREATED -> PAID | FAILED (a retry makes a new intent) | EXPIRED | CANCELLED
    status: Mapped[str] = mapped_column(String(16), default="CREATED", index=True)
    expires_at: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)
    idempotency_key: Mapped[str | None] = mapped_column(String(80), nullable=True, default=None)


class DispenseQuote(Base):
    """A pharmacy's price for filling one dispense, and whether it has been paid.

    Commerce plane (core/rule_l.py). It names the dispense by id only and holds
    amounts, never a medicine name, quantity, prescription text or anything
    about the patient's health: the per-item prices sit on the clinical
    care_dispense_items rows next to the medicines they price. One live quote
    per dispense (a cancelled one is kept and a new row made); it can be changed
    while QUOTED and is frozen from the moment the student starts paying
    (PAYMENT_STARTED).
    """
    __tablename__ = "care_dispense_quotes"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    dispense_id: Mapped[str] = mapped_column(String(64), index=True)
    pharmacy_id: Mapped[str] = mapped_column(String(64), index=True)   # the payee (care_service_providers.id)
    account_id: Mapped[str] = mapped_column(String(64), index=True)    # the payer: the dispense's own patient
    items_subtotal_paise: Mapped[int] = mapped_column(Integer)
    delivery_fee_paise: Mapped[int] = mapped_column(Integer, default=0)
    total_paise: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    # QUOTED -> PAYMENT_STARTED -> PAID; QUOTED | PAYMENT_STARTED -> CANCELLED
    status: Mapped[str] = mapped_column(String(16), default="QUOTED", index=True)
    quoted_by: Mapped[str] = mapped_column(String(64))
    quoted_at: Mapped[float] = mapped_column(Float)
    payment_started_at: Mapped[float] = mapped_column(Float, default=0.0)
    paid_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[float] = mapped_column(Float)


class Refund(Base):
    """A refund asked of the provider for one captured payment. One row per Idempotency-Key."""
    __tablename__ = "care_refunds"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payment_id: Mapped[str] = mapped_column(ForeignKey("care_payments.id"), index=True)
    payable_kind: Mapped[str] = mapped_column(String(24))
    payable_id: Mapped[str] = mapped_column(String(64), index=True)
    amount_paise: Mapped[int] = mapped_column(Integer)
    provider: Mapped[str] = mapped_column(String(24))
    provider_refund_id: Mapped[str] = mapped_column(String(120), default="")
    # REQUESTED (provider not answered yet) -> PROCESSED | PENDING | FAILED
    status: Mapped[str] = mapped_column(String(16), default="REQUESTED")
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True)
    reason: Mapped[str] = mapped_column(String(300), default="")
    requested_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)


class LabOrderCharge(Base):
    """The price of a lab test a student booked for themselves, and whether it is paid.

    Commerce plane (Rule L). The ``lab_order`` payable reads and settles this
    row and nothing clinical: ``lab_order_id`` names the clinical row only as
    an opaque id, the way a payment intent names its payable, and the payment
    code never reads care_lab_orders. The clinical side reads
    ``payment_status`` to keep an unpaid booking out of the laboratory's queue.
    """
    __tablename__ = "care_lab_order_charges"
    __table_args__ = (UniqueConstraint("account_id", "idempotency_key"),)
    lab_order_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(64), index=True)
    catalog_item_id: Mapped[str] = mapped_column(String(80))
    # The laboratory's ServiceProvider id, so a paid booking reaches its ops feed.
    lab_id: Mapped[str] = mapped_column(String(80), index=True)
    amount_paise: Mapped[int] = mapped_column(Integer)
    # UNPAID -> PAID | EXPIRED | CANCELLED; PAID -> PARTIALLY_REFUNDED | REFUNDED
    payment_status: Mapped[str] = mapped_column(String(24), default="UNPAID", index=True)
    payment_due_at: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class LabCollector(Base):
    """A laboratory's own sample collector: a LAB_COLLECTOR account that works for one lab.

    Added by the lab (POST /work/lab-collectors). A collector sees only the
    pickups assigned to them and only moves a sample from assigned to collected
    to handed over: never a report, never another lab's order.
    """
    __tablename__ = "care_lab_collectors"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lab_id: Mapped[str] = mapped_column(ForeignKey("care_service_providers.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), unique=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[float] = mapped_column(Float)


class MockGatewayPayment(Base):
    """The mock provider's own ledger: what a real gateway would hold on its side.

    Written only by services/payment_gateway.MockProvider, which refuses to run
    in production. A row here is the simulated gateway's word, never ours: an
    order is paid only after the normal verify path reads it back.
    """
    __tablename__ = "care_mock_gateway_payments"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider_order_id: Mapped[str] = mapped_column(String(120), index=True)
    amount_paise: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[str] = mapped_column(String(16))   # captured | failed
    error_code: Mapped[str] = mapped_column(String(40), default="")
    refunded_paise: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[float] = mapped_column(Float)


class OrderLine(Base):
    __tablename__ = "care_order_lines"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("care_orders.id"), index=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("care_catalog.id"))
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[int] = mapped_column(Integer)
    price_paise: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="REQUESTED")


class Policy(Base):
    __tablename__ = "care_policies"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    insurer: Mapped[str] = mapped_column(String(100))
    policy_number: Mapped[str] = mapped_column(String(100))
    sum_insured: Mapped[int] = mapped_column(Integer)
    valid_until: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[float] = mapped_column(Float)


class SupportRequest(Base):
    __tablename__ = "care_support_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    subject: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(String(2000))
    status: Mapped[str] = mapped_column(String(20), default="OPEN")
    created_at: Mapped[float] = mapped_column(Float)


class WorkflowAudit(Base):
    __tablename__ = "care_workflow_audit"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    actor_id: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str] = mapped_column(String)
    created_at: Mapped[float] = mapped_column(Float, index=True)


class HomeContent(Base):
    """Landing-page marketing copy stored per section. Never auto-populated."""
    __tablename__ = "care_home_content"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(160), default="")
    eyebrow: Mapped[str] = mapped_column(String(80), default="")
    body: Mapped[str] = mapped_column(String(4000), default="")
    summary: Mapped[str] = mapped_column(String(400), default="")
    action: Mapped[str] = mapped_column(String(120), default="")
    target: Mapped[str] = mapped_column(String(40), default="")
    icon: Mapped[str] = mapped_column(String(40), default="")
    color: Mapped[str] = mapped_column(String(20), default="")
    sort: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Article(Base):
    __tablename__ = "care_articles"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    tag: Mapped[str] = mapped_column(String(60), default="")
    title: Mapped[str] = mapped_column(String(180))
    read_time: Mapped[str] = mapped_column(String(20), default="")
    color: Mapped[str] = mapped_column(String(20), default="")
    body: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort: Mapped[int] = mapped_column(Integer, default=0)


class SystemSetting(Base):
    """Persistent key-value store for runtime configuration (integrations, etc)."""
    __tablename__ = "care_system_settings"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class ScheduledJob(Base):
    """A recurring or one-off background job. Durable so it survives restarts."""
    __tablename__ = "care_scheduled_jobs"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    interval_seconds: Mapped[int] = mapped_column(Integer, default=7200)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run_at: Mapped[float] = mapped_column(Float, default=0.0)
    next_run_at: Mapped[float] = mapped_column(Float, default=0.0)
    last_status: Mapped[str] = mapped_column(String(20), default="NEVER_RUN")
    last_error: Mapped[str] = mapped_column(String(1000), default="")
    # Cross-process run lease: claimed by an atomic conditional UPDATE so two
    # workers/replicas never run the same job at once. Expires if a holder dies.
    lease_owner: Mapped[str] = mapped_column(String(80), default="", server_default="")
    lease_expires_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class AgentRun(Base):
    """One durable execution of a background/agent job."""
    __tablename__ = "care_agent_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    job_key: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(24), default="QUEUED")
    started_at: Mapped[float] = mapped_column(Float, default=0.0)
    finished_at: Mapped[float] = mapped_column(Float, default=0.0)
    error: Mapped[str] = mapped_column(String(1000), default="")
    summary: Mapped[dict] = mapped_column(JSON, default=dict)


class OutboxEvent(Base):
    """Durable intent to deliver a notification/message; prevents duplicate side effects."""
    __tablename__ = "care_outbox_events"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(60))
    account_id: Mapped[str] = mapped_column(String, index=True, default="")
    dedupe_key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    sent_at: Mapped[float] = mapped_column(Float, default=0.0)
    read_at: Mapped[float] = mapped_column(Float, default=0.0)
    last_error: Mapped[str] = mapped_column(String(1000), default="")
    # PENDING: not picked before this time (retry backoff, quiet hours, a
    # reminder that is not due yet). SENDING: the claim's deadline, after which
    # an unfinished send is failed rather than repeated.
    next_attempt_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")

    __table_args__ = (Index("ix_care_outbox_events_status_next_attempt", "status", "next_attempt_at"),)


class MedicationPlan(Base):
    """An account-owned medication plan with explicit instructions and dates."""
    __tablename__ = "care_medication_plans"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    dosage: Mapped[str] = mapped_column(String(120), default="")
    frequency: Mapped[str] = mapped_column(String(120), default="")
    # Structured doses per day (1 to meds.times_per_day_max), set by the owner. ``frequency`` is free
    # text ("twice daily", "as needed") and is never parsed into a count; with
    # no value here the planned number of doses is unknown, not guessed.
    times_per_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="USER")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class MedicationDose(Base):
    """A logged dose occurrence, taken or skipped. Unique per plan so duplicate logs cannot double-count."""
    __tablename__ = "care_medication_doses"
    __table_args__ = (UniqueConstraint("plan_id", "dose_date", "dose_time"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("care_medication_plans.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    dose_date: Mapped[str] = mapped_column(String(10))
    dose_time: Mapped[str] = mapped_column(String(8), default="")
    taken_at: Mapped[float] = mapped_column(Float, default=0.0)
    # TAKEN or SKIPPED (the student said they skipped it). Only TAKEN counts as a dose taken.
    outcome: Mapped[str] = mapped_column(String(8), default="TAKEN", server_default="TAKEN")


class AvailabilitySlot(Base):
    """A bookable time slot for a provider/service. Capacity is reserved on booking."""
    __tablename__ = "care_availability_slots"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    catalog_item_id: Mapped[str] = mapped_column(ForeignKey("care_catalog.id"), index=True)
    slot_start: Mapped[str] = mapped_column(String(40))
    slot_end: Mapped[str] = mapped_column(String(40))
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    booked: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Appointment(Base):
    """A persisted, capacity-reserved appointment with an explicit state machine."""
    __tablename__ = "care_appointments"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    catalog_item_id: Mapped[str] = mapped_column(ForeignKey("care_catalog.id"), index=True)
    slot_id: Mapped[str] = mapped_column(ForeignKey("care_availability_slots.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="REQUESTED")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class NotificationPreference(Base):
    """User notification preferences: channels, timezone, and quiet hours."""
    __tablename__ = "care_notification_preferences"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    # "" = never chosen: resolved on read to the platform.default_timezone
    # setting (services/student_time.zone_named), so a change to that setting
    # reaches every student who never picked a zone. Not a column default of a
    # zone name: the registry can't be read at import time, and a value frozen
    # at insert would stop following the setting.
    timezone: Mapped[str] = mapped_column(String(40), default="")
    quiet_start: Mapped[str] = mapped_column(String(5), default="22:00")
    quiet_end: Mapped[str] = mapped_column(String(5), default="08:00")
    # Both off until the student turns them on. A consent that defaults to
    # granted is not a consent, and DPDP asks for each purpose separately.
    pickup_location_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    ayush_history_enabled: Mapped[bool] = mapped_column(Boolean, default=False)


APPEARANCES = ("SYSTEM", "DARK", "LIGHT")


class AppearancePreference(Base):
    """How the apps look for this person (System / Dark / Light), on every device.

    Platform plane: a display choice, nothing about anyone's health. No row
    means the person has never chosen, which the apps treat differently from
    an explicit SYSTEM (web keeps its local default).
    """
    __tablename__ = "care_appearance_preferences"
    __table_args__ = (
        CheckConstraint("appearance IN ('SYSTEM', 'DARK', 'LIGHT')", name="ck_care_appearance_preferences_value"),
    )
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    appearance: Mapped[str] = mapped_column(String(8))
    updated_at: Mapped[float] = mapped_column(Float)


class ClaimRequest(Base):
    """A user-submitted claim request. Explicitly not an insurer submission."""
    __tablename__ = "care_claim_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    policy_id: Mapped[str] = mapped_column(ForeignKey("care_policies.id"), index=True)
    provider_name: Mapped[str] = mapped_column(String(160), default="")
    service: Mapped[str] = mapped_column(String(160), default="")
    amount_paise: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(24), default="DRAFT")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class ReviewedBenefit(Base):
    """A reviewed insurance benefit entry (non-clinical coverage summary)."""
    __tablename__ = "care_reviewed_benefits"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    category: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(1000), default="")
    reviewed: Mapped[bool] = mapped_column(Boolean, default=True)
    sort: Mapped[int] = mapped_column(Integer, default=0)


class RecordShare(Base):
    """A time-limited consent grant for a clinician to view a user's record."""
    __tablename__ = "care_record_shares"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    clinician_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("care_documents.id"), index=True)
    granted_at: Mapped[float] = mapped_column(Float, default=0.0)
    expires_at: Mapped[float] = mapped_column(Float, default=0.0)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    last_viewed_at: Mapped[float] = mapped_column(Float, default=0.0)


class DeletionRequest(Base):
    """A user-requested account/data deletion. Explicit, not immediate."""
    __tablename__ = "care_deletion_requests"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    requested_at: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    processed_at: Mapped[float] = mapped_column(Float, default=0.0)


class CampusVerification(Base):
    """A record of campus affiliation verification for a student account."""
    __tablename__ = "care_campus_verifications"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    university: Mapped[str] = mapped_column(String(160), default="")
    roll_number: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    verified_by: Mapped[str] = mapped_column(String, default="")
    verified_at: Mapped[float] = mapped_column(Float, default=0.0)


class CampusDeparture(Base):
    """A student leaving their campus: graduating, transferring or taking a break.

    One row per departure so history survives an undo. On ``effective_on`` the
    campus link is removed (see services/campus_departure.complete_departure);
    the student's records and account are untouched.
    """
    __tablename__ = "care_campus_departures"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    university: Mapped[str] = mapped_column(String(160), default="")
    reason: Mapped[str] = mapped_column(String(16))  # GRADUATING | TRANSFERRING | PAUSING
    destination: Mapped[str] = mapped_column(String(160), default="")
    effective_on: Mapped[str] = mapped_column(String(10), index=True)  # YYYY-MM-DD, platform.default_timezone
    status: Mapped[str] = mapped_column(String(12), default="SCHEDULED", index=True)  # SCHEDULED | COMPLETED | CANCELLED
    created_at: Mapped[float] = mapped_column(Float)
    completed_at: Mapped[float] = mapped_column(Float, default=0.0)


class SosAlert(Base):
    """A student's SOS. Exists the moment it is raised, before any message is sent,
    so the campus console sees it even if every outbound channel fails."""
    __tablename__ = "care_sos_alerts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    campus: Mapped[str] = mapped_column(String(160), default="", index=True)
    location_note: Mapped[str] = mapped_column(String(300), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="ACTIVE", index=True)  # ACTIVE | ACKNOWLEDGED | RESOLVED | CANCELLED
    created_at: Mapped[float] = mapped_column(Float, index=True)
    acknowledged_by: Mapped[str] = mapped_column(String, default="")
    acknowledged_at: Mapped[float] = mapped_column(Float, default=0.0)
    resolved_at: Mapped[float] = mapped_column(Float, default=0.0)
    resolution_note: Mapped[str] = mapped_column(String(1000), default="")
    cancelled_at: Mapped[float] = mapped_column(Float, default=0.0)


class SosDelivery(Base):
    """One attempt to reach one recipient about one SOS, with its real outcome."""
    __tablename__ = "care_sos_deliveries"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    alert_id: Mapped[str] = mapped_column(ForeignKey("care_sos_alerts.id"), index=True)
    recipient_kind: Mapped[str] = mapped_column(String(20))  # CAMPUS_CONSOLE | CAMPUS_SECURITY | EMERGENCY_CONTACT
    channel: Mapped[str] = mapped_column(String(12))  # CONSOLE | WHATSAPP
    recipient_label: Mapped[str] = mapped_column(String(160), default="")  # a name, never a number
    status: Mapped[str] = mapped_column(String(10))  # SENT | FAILED | SKIPPED
    detail: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[float] = mapped_column(Float)


class CampusSecurityContact(Base):
    """Who a campus wants woken up by an SOS. Managed by that campus's administrators."""
    __tablename__ = "care_campus_security_contacts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    campus: Mapped[str] = mapped_column(String(160), index=True)  # compared case- and space-insensitively
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(32))
    created_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[float] = mapped_column(Float)


class ErasureArchive(Base):
    """A sealed (Fernet-encrypted) copy of an erased account's rows.

    Kept only for DPDP_ARCHIVE_RETENTION_DAYS, readable only by a super admin
    who states a reason (audited), then destroyed. The student is told this.
    """
    __tablename__ = "care_erasure_archives"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    former_account_id: Mapped[str] = mapped_column(String, index=True)  # not a FK: the account no longer exists
    sealed: Mapped[bytes] = mapped_column(LargeBinary)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    archived_at: Mapped[float] = mapped_column(Float)
    destroy_after: Mapped[float] = mapped_column(Float, index=True)
    destroyed_at: Mapped[float] = mapped_column(Float, default=0.0)


class ReturnRequest(Base):
    """A student asking to return an item from an order line. The refund itself
    is arranged with the provider: no order payment provider is connected."""
    __tablename__ = "care_return_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    order_line_id: Mapped[str] = mapped_column(ForeignKey("care_order_lines.id"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    reason: Mapped[str] = mapped_column(String(20))  # WRONG_ITEM | DAMAGED | NOT_NEEDED | OTHER
    note: Mapped[str] = mapped_column(String(500), default="")
    photo: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    photo_mime: Mapped[str] = mapped_column(String(40), default="")
    status: Mapped[str] = mapped_column(String(16), default="REQUESTED", index=True)  # REQUESTED | APPROVED | DECLINED | PICKED_UP | CANCELLED
    refund_paise: Mapped[int] = mapped_column(Integer, default=0)
    decision_note: Mapped[str] = mapped_column(String(500), default="")
    decided_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[float] = mapped_column(Float, index=True)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class HostelVisitRequest(Base):
    """A lab sample pickup or nurse visit at the student's hostel room."""
    __tablename__ = "care_hostel_visit_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    service: Mapped[str] = mapped_column(String(16))  # LAB_PICKUP | NURSE_VISIT
    hostel_block: Mapped[str] = mapped_column(String(80))
    room: Mapped[str] = mapped_column(String(40))
    window_start: Mapped[float] = mapped_column(Float)
    window_end: Mapped[float] = mapped_column(Float)
    note: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(16), default="REQUESTED", index=True)  # REQUESTED | ASSIGNED | COMPLETED | DECLINED | CANCELLED
    assigned_provider_id: Mapped[str | None] = mapped_column(ForeignKey("care_accounts.id"), nullable=True, index=True)
    decision_note: Mapped[str] = mapped_column(String(500), default="")
    # The self-booked lab test this visit collects for. The lab was chosen at
    # booking, so such a visit is already the lab's and never open to others.
    lab_order_id: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None, index=True)
    created_at: Mapped[float] = mapped_column(Float, index=True)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class RefillRequest(Base):
    """A student asking a pharmacy partner to refill one of their medication plans."""
    __tablename__ = "care_refill_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("care_medication_plans.id"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(16), default="REQUESTED", index=True)  # REQUESTED | ACCEPTED | DECLINED | READY | CANCELLED
    decision_note: Mapped[str] = mapped_column(String(500), default="")
    linked_order_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[float] = mapped_column(Float, index=True)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class HealthCamp(Base):
    """A health camp with bookable time slots and a fixed station sequence."""
    __tablename__ = "care_health_camps"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    date: Mapped[str] = mapped_column(String(10))
    location: Mapped[str] = mapped_column(String(160), default="")
    what_to_bring: Mapped[str] = mapped_column(String(1000), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class HealthCampSlot(Base):
    """A bookable time slot for a health camp."""
    __tablename__ = "care_health_camp_slots"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    camp_id: Mapped[str] = mapped_column(ForeignKey("care_health_camps.id"), index=True)
    slot_start: Mapped[str] = mapped_column(String(40))
    slot_end: Mapped[str] = mapped_column(String(40))
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    booked: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class HealthCampStation(Base):
    """A station within a health camp."""
    __tablename__ = "care_health_camp_stations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    camp_id: Mapped[str] = mapped_column(ForeignKey("care_health_camps.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    sort: Mapped[int] = mapped_column(Integer, default=0)


class CampAttendance(Base):
    """A student's registration, booked slot, and per-station progress at a camp."""
    __tablename__ = "care_camp_attendances"
    __table_args__ = (UniqueConstraint("camp_id", "account_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    camp_id: Mapped[str] = mapped_column(ForeignKey("care_health_camps.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    slot_id: Mapped[str | None] = mapped_column(
        ForeignKey("care_health_camp_slots.id"),
        index=True,
        nullable=True,
    )
    checked_in: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_stations: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)

class ConsultationSession(Base):
    """A teleconsult session for a confirmed appointment. Tracks an honest state."""
    __tablename__ = "care_consultation_sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    appointment_id: Mapped[str] = mapped_column(ForeignKey("care_appointments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="WAITING")
    student_joined_at: Mapped[float] = mapped_column(Float, default=0.0)
    provider_joined_at: Mapped[float] = mapped_column(Float, default=0.0)
    ended_at: Mapped[float] = mapped_column(Float, default=0.0)
    signal_payload: Mapped[dict] = mapped_column(JSON, default=dict)


class KnowledgeSource(Base):
    """An approved, versioned knowledge entry with ownership and expiry."""
    __tablename__ = "care_knowledge_sources"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(60), default="GENERAL")
    content: Mapped[str] = mapped_column(String(4000), default="")
    author: Mapped[str] = mapped_column(String(120), default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    expires_at: Mapped[float] = mapped_column(Float, default=0.0)


class CareProgramme(Base):
    """A student's enrolment on a chronic care programme with one clinician.

    The enrolment is the consent: a clinician's chronic list is scoped to the
    programmes students agreed to be on with them, not to a campus roster.

    `state` is ACTIVE or ENDED_BY_STUDENT. Leaving is the student's alone —
    it ends the follow-up and keeps the record, and nothing about it is
    published to the campus feed.
    """
    __tablename__ = "care_programmes"
    # The tracker's only query (migration c71d94b2e5a8). Its leading column
    # also serves lookups by clinician_id alone, so that has no index of its own.
    __table_args__ = (Index("ix_care_programmes_clinician_state", "clinician_id", "state"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    clinician_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"))
    # What the student is on a programme for, and the agreed measure. Free text
    # written by the clinician: no condition taxonomy exists here to constrain it.
    programme: Mapped[str] = mapped_column(String(120))
    target: Mapped[str] = mapped_column(String(200), default="")
    review_interval_days: Mapped[int] = mapped_column(Integer, default=90)
    last_review_at: Mapped[float] = mapped_column(Float, default=0.0)
    state: Mapped[str] = mapped_column(String(24), default="ACTIVE")
    ended_at: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class FollowUpTask(Base):
    """A staff follow-up task created from overdue care requests."""
    __tablename__ = "care_followup_tasks"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str] = mapped_column(String, index=True, default="")
    account_id: Mapped[str] = mapped_column(String, index=True, default="")
    note: Mapped[str] = mapped_column(String(400), default="")
    status: Mapped[str] = mapped_column(String(24), default="OPEN")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    resolved_at: Mapped[float] = mapped_column(Float, default=0.0)


class DocumentIntake(Base):
    """A document queued for extraction, with an explicit processing state."""
    __tablename__ = "care_document_intake"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("care_documents.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="QUEUED")
    extractor: Mapped[str] = mapped_column(String(40), default="")
    draft: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    processed_at: Mapped[float] = mapped_column(Float, default=0.0)


class IntakeReviewItem(Base):
    """A field extracted from a document that needs human review before use."""
    __tablename__ = "care_intake_review_items"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    intake_id: Mapped[str] = mapped_column(ForeignKey("care_document_intake.id"), index=True)
    field: Mapped[str] = mapped_column(String(60))
    value: Mapped[str] = mapped_column(String(500), default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    reviewed_by: Mapped[str] = mapped_column(String, default="")
    reviewed_at: Mapped[float] = mapped_column(Float, default=0.0)


class EncounterNote(Base):
    """A clinician-authored encounter note draft linked to a patient."""
    __tablename__ = "care_encounter_notes"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    appointment_id: Mapped[str] = mapped_column(String, index=True, default="")
    subjective: Mapped[str] = mapped_column(String(2000), default="")
    objective: Mapped[str] = mapped_column(String(2000), default="")
    assessment: Mapped[str] = mapped_column(String(2000), default="")
    plan: Mapped[str] = mapped_column(String(2000), default="")
    status: Mapped[str] = mapped_column(String(24), default="DRAFT")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class BloodDonor(Base):
    """A consent-registered student blood donor with contact info and availability."""
    __tablename__ = "care_blood_donors"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    blood_group: Mapped[str] = mapped_column(String(5), index=True)
    hostel_block: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(20))
    last_donated: Mapped[str] = mapped_column(String(40), default="")
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    visible: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class BloodSOSRequest(Base):
    """An emergency blood request with matched donor count and delivery status."""
    __tablename__ = "care_blood_sos_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    patient_name: Mapped[str] = mapped_column(String(120))
    required_group: Mapped[str] = mapped_column(String(5))
    units_needed: Mapped[int] = mapped_column(Integer, default=1)
    hospital_location: Mapped[str] = mapped_column(String(200))
    urgency: Mapped[str] = mapped_column(String(20), default="CRITICAL")
    matching_donors_count: Mapped[int] = mapped_column(Integer, default=0)
    # The campus the broadcast went to ("" = every campus, super admin only). Also
    # what the per-campus rate limit counts (audit H1).
    campus: Mapped[str] = mapped_column(String(160), default="", server_default="", index=True)
    status: Mapped[str] = mapped_column(String(24), default="QUEUED")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
class CrisisEvent(Base):
    """A crisis-gate activation, recorded for counsellor follow-up.

    The student's query is never stored. A crisis message is the most sensitive
    string in the system and rule 9 keeps it out of logs and analytics; the kind,
    the matched language and the surface are enough to route a follow-up.
    """
    __tablename__ = "care_crisis_events"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    kind: Mapped[str] = mapped_column(String(24), index=True)
    language: Mapped[str] = mapped_column(String(10), default="")
    surface: Mapped[str] = mapped_column(String(40), default="")
    detected_by: Mapped[str] = mapped_column(String(10), default="SERVER")  # SERVER | CLIENT
    created_at: Mapped[float] = mapped_column(Float, index=True)
    acknowledged_at: Mapped[float] = mapped_column(Float, default=0.0)
    acknowledged_by: Mapped[str] = mapped_column(String, default="")
    outcome: Mapped[str] = mapped_column(String(24), default="PENDING")
    outcome_note: Mapped[str] = mapped_column(String(500), default="")


class ServiceProvider(Base):
    """A dispensing or diagnostic partner, with the location needed to find one nearby.

    Verification follows the preventive directory's evidence rule: a listing carries
    its source and a verification timestamp, and an expired licence is never treated
    as valid.
    """
    __tablename__ = "care_service_providers"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    kind: Mapped[str] = mapped_column(String(12), index=True)  # PHARMACY | LAB | CLINIC
    legal_name: Mapped[str] = mapped_column(String(160), index=True)
    licence_no: Mapped[str] = mapped_column(String(80), default="")
    licence_expiry: Mapped[float] = mapped_column(Float, default=0.0)
    accreditation: Mapped[str] = mapped_column(String(80), default="")
    address: Mapped[str] = mapped_column(String(400), default="")
    pincode: Mapped[str] = mapped_column(String(6), index=True)
    latitude: Mapped[float] = mapped_column(Float, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, default=0.0)
    serviceable_pincodes: Mapped[dict] = mapped_column(JSON, default=list)
    open_hours: Mapped[str] = mapped_column(String(200), default="")
    home_collection: Mapped[bool] = mapped_column(Boolean, default=False)
    # How a pharmacy hands medicines over. Recorded at onboarding, never assumed:
    # a provider with neither flag set has simply not said.
    delivery_available: Mapped[bool] = mapped_column(Boolean, default=False, server_default=sa_false())
    pickup_available: Mapped[bool] = mapped_column(Boolean, default=False, server_default=sa_false())
    source_url: Mapped[str] = mapped_column(String(2000), default="")
    verified_at: Mapped[float] = mapped_column(Float, default=0.0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class CareFacility(Base):
    """A place a student can get care: a hospital, clinic, pharmacy, ambulance service or blood bank.

    Curated by a super admin (any campus, or every campus when ``campus`` is
    empty) or by a campus administrator (their own campus only). Reference data
    about a place, never about a person, so it sits in the platform plane.

    A listing reaches students only while it is active and its ``verified_on``
    date is set and recent enough (``care_directory.verification_max_age_days``):
    the directory never shows a place nobody has checked. ``source`` says how it
    was checked ("Called the front desk", "Hospital website"). There is no bed
    availability, rating or review field, by design.
    """
    __tablename__ = "care_facilities"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    kind: Mapped[str] = mapped_column(String(16), index=True)  # HOSPITAL | CLINIC | PHARMACY | AMBULANCE | BLOOD_BANK
    name: Mapped[str] = mapped_column(String(160), index=True)
    departments: Mapped[list] = mapped_column(JSON, default=list)
    address: Mapped[str] = mapped_column(String(400), default="")
    area: Mapped[str] = mapped_column(String(120), default="")
    pincode: Mapped[str] = mapped_column(String(6), default="")
    # Both or neither: a place with no coordinates is listed without directions or distance.
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    phone: Mapped[str] = mapped_column(String(32), default="")
    emergency_24x7: Mapped[bool] = mapped_column(Boolean, default=False)
    hours_text: Mapped[str] = mapped_column(String(200), default="")
    source: Mapped[str] = mapped_column(String(200), default="")
    source_url: Mapped[str] = mapped_column(String(2000), default="")
    verified_on: Mapped[date | None] = mapped_column(Date, nullable=True, default=None)
    # "" = every campus and the public page; otherwise the students of that campus only.
    campus: Mapped[str] = mapped_column(String(160), default="", index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_by: Mapped[str] = mapped_column(String, default="")
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class Prescription(Base):
    """A clinician-issued prescription. The artefact a pharmacy can act on."""
    __tablename__ = "care_prescriptions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    encounter_id: Mapped[str] = mapped_column(String, index=True, default="")
    prescriber_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    prescriber_reg_no: Mapped[str] = mapped_column(String(60), default="")
    patient_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    issued_at: Mapped[float] = mapped_column(Float, index=True)
    valid_until: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(24), default="ISSUED", index=True)
    advice: Mapped[str] = mapped_column(String(1000), default="")
    allergy_check: Mapped[dict] = mapped_column(JSON, default=dict)


class PrescriptionItem(Base):
    """One prescribed drug. Structured, never free text: the pharmacy has to act on it."""
    __tablename__ = "care_prescription_items"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    prescription_id: Mapped[str] = mapped_column(ForeignKey("care_prescriptions.id"), index=True)
    generic_name: Mapped[str] = mapped_column(String(160))
    brand_name: Mapped[str] = mapped_column(String(160), default="")
    strength: Mapped[str] = mapped_column(String(60), default="")
    form: Mapped[str] = mapped_column(String(40), default="")
    dose: Mapped[str] = mapped_column(String(60), default="")
    frequency: Mapped[str] = mapped_column(String(60), default="")
    duration_days: Mapped[int] = mapped_column(Integer, default=0)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    substitution_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    # OTC | H | H1 | X — drives the dispensing rules and the retention register.
    schedule_class: Mapped[str] = mapped_column(String(4), default="OTC")


class Dispense(Base):
    """A pharmacy's fulfilment of a prescription, with its own lifecycle.

    Separate from OrderLine: a dispense carries a pharmacist verification step that a
    product delivery does not, and it must never complete without one.
    """
    __tablename__ = "care_dispenses"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    prescription_id: Mapped[str] = mapped_column(ForeignKey("care_prescriptions.id"), index=True)
    pharmacy_id: Mapped[str] = mapped_column(ForeignKey("care_service_providers.id"), index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="RX_ISSUED", index=True)
    verified_by: Mapped[str] = mapped_column(String, default="")
    verified_at: Mapped[float] = mapped_column(Float, default=0.0)
    substitution_note: Mapped[str] = mapped_column(String(500), default="")
    rejection_reason: Mapped[str] = mapped_column(String(300), default="")
    delivery: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[float] = mapped_column(Float, index=True)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class RxUploadReview(Base):
    """A prescription file the student uploaded, sent to one pharmacy for a pharmacist's check.

    Sits in the same review queue as an e-prescription dispense but carries no
    medicine lines and starts no fulfilment: approving records the outcome only.
    The file stays in the student's vault (``care_documents``); ``document_id`` is
    not a foreign key so the student can delete the file at any time, which
    withdraws a review still pending. The file link a pharmacist opens is
    single-holder and short-lived: only a hash of its token is stored.
    """
    __tablename__ = "care_rx_upload_reviews"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(String, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    pharmacy_id: Mapped[str] = mapped_column(ForeignKey("care_service_providers.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="PENDING", index=True)  # PENDING | RX_VERIFIED | REJECTED | WITHDRAWN
    verified_by: Mapped[str] = mapped_column(String(120), default="")
    verified_at: Mapped[float] = mapped_column(Float, default=0.0)
    reviewer_account_id: Mapped[str] = mapped_column(String, default="")
    checks: Mapped[dict] = mapped_column(JSON, default=dict)
    rejection_reason: Mapped[str] = mapped_column(String(300), default="")
    link_token_hash: Mapped[str] = mapped_column(String(64), default="")
    link_issued_to: Mapped[str] = mapped_column(String, default="")
    link_expires_at: Mapped[float] = mapped_column(Float, default=0.0)
    last_viewed_at: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[float] = mapped_column(Float, index=True)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class LabOrder(Base):
    """A diagnostic test order, tracked from booking to released report.

    A sample has a lifecycle a delivery does not: it is collected, transported,
    analysed and only then released, and a critical value must interrupt that queue.
    """
    __tablename__ = "care_lab_orders"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    prescription_id: Mapped[str] = mapped_column(String, index=True, default="")
    patient_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    lab_id: Mapped[str] = mapped_column(ForeignKey("care_service_providers.id"), index=True)
    ordered_by: Mapped[str] = mapped_column(String, index=True, default="")
    test_panel: Mapped[dict] = mapped_column(JSON, default=list)
    clinical_indication: Mapped[str] = mapped_column(String(500), default="")
    collection_mode: Mapped[str] = mapped_column(String(12), default="WALK_IN")  # HOME | WALK_IN
    slot_start: Mapped[str] = mapped_column(String(40), default="")
    # The catalogue test this order is for, and the published slot whose place
    # it holds. Null on rows created before they were recorded.
    catalog_item_id: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    slot_id: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    fasting_required: Mapped[bool] = mapped_column(Boolean, default=False)
    collector_name: Mapped[str] = mapped_column(String(120), default="")
    # The LAB_COLLECTOR account assigned (care_lab_collectors); collector_name is
    # that account's name, kept for display. "" on rows from before.
    collector_id: Mapped[str] = mapped_column(String(64), default="", server_default="", index=True)
    # Where a home or hostel sample is collected: {"kind": "HOSTEL", "hostelBlock",
    # "room"} or {"kind": "HOME", "line", "city", "pincode", "landmark"}. Null for
    # walk-in and for rows from before it was recorded.
    collection_address: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)
    tube_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    collected_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    handed_over_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    sample_id: Mapped[str] = mapped_column(String(40), default="", index=True)
    status: Mapped[str] = mapped_column(String(24), default="BOOKED", index=True)
    report_document_id: Mapped[str] = mapped_column(String, default="")
    critical_flag: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    critical_note: Mapped[str] = mapped_column(String(500), default="")
    # A flagged result that nobody has looked at is the actual risk, so the
    # acknowledgement is recorded rather than assumed.
    critical_acknowledged_at: Mapped[float] = mapped_column(Float, default=0.0)
    critical_acknowledged_by: Mapped[str] = mapped_column(String, default="")
    rejection_reason: Mapped[str] = mapped_column(String(300), default="")
    # Every report is held here, outside the student's vault, until a doctor
    # reviews and releases it. Release copies it into a Document and clears it.
    report_content: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True, default=None)
    report_mime: Mapped[str] = mapped_column(String(100), default="")
    report_filename: Mapped[str] = mapped_column(String(200), default="")
    reviewer_id: Mapped[str] = mapped_column(String, default="", index=True)
    reviewed_at: Mapped[float] = mapped_column(Float, default=0.0)
    review_note: Mapped[str] = mapped_column(String(1000), default="")
    created_at: Mapped[float] = mapped_column(Float, index=True)
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


LAB_BODY_SYSTEMS = ("HEART_BLOOD", "BLOOD_SUGAR", "VITAMINS", "THYROID", "KIDNEY", "LIVER", "BLOOD_COUNT", "OTHER")
LAB_RESULT_SOURCES = ("LAB_RELEASED", "STUDENT_CONFIRMED")
LAB_RESULT_STATUSES = ("DRAFT", "CONFIRMED")


class LabTestReference(Base):
    """A lab test the app can name and group: no person, no value, no range.

    Platform plane. ``body_system`` is the clinical lead's grouping and rows are
    added only by a clinician-reviewed migration (``reviewed_by`` / ``reviewed_at``).
    There is deliberately no reference range here: a value is only ever compared
    with the range printed by the lab that measured it (care_lab_results).
    """
    __tablename__ = "care_lab_test_reference"
    __table_args__ = (
        CheckConstraint("body_system IN ('" + "', '".join(LAB_BODY_SYSTEMS) + "')",
                        name="ck_care_lab_test_reference_body_system"),
    )
    code: Mapped[str] = mapped_column(String(40), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120))
    body_system: Mapped[str] = mapped_column(String(20))
    default_unit: Mapped[str] = mapped_column(String(40), default="", server_default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=sa_true())
    reviewed_by: Mapped[str] = mapped_column(String(120), default="", server_default="")
    reviewed_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class LabResult(Base):
    """One value from one lab report, owned by the student it is about.

    Clinical plane. A row typed by the student starts as DRAFT and is never
    listed, trended or read by anything until the student confirms it
    (``status`` CONFIRMED). ``ref_low`` / ``ref_high`` / ``ref_text`` are the
    range exactly as the lab printed it; whether the value is inside it is
    computed on every read and never stored. Rows with a ``lab_order_id`` are
    visible only once that order is REPORT_RELEASED (the doctor's release gate).
    """
    __tablename__ = "care_lab_results"
    __table_args__ = (
        CheckConstraint("source IN ('" + "', '".join(LAB_RESULT_SOURCES) + "')", name="ck_care_lab_results_source"),
        CheckConstraint("status IN ('" + "', '".join(LAB_RESULT_STATUSES) + "')", name="ck_care_lab_results_status"),
        Index("ix_care_lab_results_account_status", "account_id", "status"),
    )
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    test_code: Mapped[str | None] = mapped_column(ForeignKey("care_lab_test_reference.code"), nullable=True,
                                                  index=True)
    test_name_as_printed: Mapped[str] = mapped_column(String(120))
    value_numeric: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_text: Mapped[str] = mapped_column(String(60), default="", server_default="")
    unit: Mapped[str] = mapped_column(String(40), default="", server_default="")
    ref_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    ref_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    ref_text: Mapped[str] = mapped_column(String(80), default="", server_default="")
    collected_on: Mapped[date] = mapped_column(Date)
    lab_name: Mapped[str] = mapped_column(String(120), default="", server_default="")
    source: Mapped[str] = mapped_column(String(20))
    document_id: Mapped[str | None] = mapped_column(ForeignKey("care_documents.id", ondelete="CASCADE"),
                                                    nullable=True, index=True)
    lab_order_id: Mapped[str | None] = mapped_column(ForeignKey("care_lab_orders.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(12), default="DRAFT")
    created_at: Mapped[float] = mapped_column(Float)
    confirmed_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class OpsEvent(Base):
    """A significant action from any surface, routed to the dashboards that need it.

    This is a routing signal, not a data surface. ``summary`` carries counts and
    states only — never a drug name, test name, diagnosis or free text a student
    wrote. Whoever needs the detail opens the underlying resource, which has its own
    access control. That keeps clinical specifics off commercial surfaces (Rule L)
    without having to reason about audiences per field.
    """
    __tablename__ = "care_ops_events"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    kind: Mapped[str] = mapped_column(String(48), index=True)
    # MARKETPLACE | CLINICAL | PHARMACY | LAB | CAMPUS | SAFETY | ACCOUNT | SUPPORT
    domain: Mapped[str] = mapped_column(String(16), index=True)
    severity: Mapped[str] = mapped_column(String(10), default="INFO", index=True)
    actor_id: Mapped[str] = mapped_column(String, index=True, default="")
    actor_role: Mapped[str] = mapped_column(String(24), default="")
    # The account the event concerns; lets a student's own feed be scoped.
    subject_id: Mapped[str] = mapped_column(String, index=True, default="")
    # The vendor account or service provider whose queue this belongs to.
    provider_id: Mapped[str] = mapped_column(String, index=True, default="")
    resource_type: Mapped[str] = mapped_column(String(32), default="")
    resource_id: Mapped[str] = mapped_column(String, index=True, default="")
    summary: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[float] = mapped_column(Float, index=True)
    acknowledged_at: Mapped[float] = mapped_column(Float, default=0.0)
    acknowledged_by: Mapped[str] = mapped_column(String, default="")


class DispenseItem(Base):
    """Per-item fulfilment, so a pharmacy holding part of a prescription can say so.

    Without this a pharmacy with two of three items has to reject the whole
    prescription, which is not how dispensing works.
    """
    __tablename__ = "care_dispense_items"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    dispense_id: Mapped[str] = mapped_column(ForeignKey("care_dispenses.id"), index=True)
    prescription_item_id: Mapped[str] = mapped_column(ForeignKey("care_prescription_items.id"), index=True)
    quantity_requested: Mapped[int] = mapped_column(Integer, default=0)
    quantity_dispensed: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    note: Mapped[str] = mapped_column(String(300), default="")
    # The owning pharmacy's quote for this line (PUT /dispenses/{id}/quote). Kept
    # here, beside the medicine it prices, so the commerce-plane quote
    # (care_dispense_quotes) carries totals only. 0 quoted = not available.
    unit_price_paise: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    quantity_quoted: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class SubstitutionRequest(Base):
    """A pharmacy's proposal to swap a prescribed drug, and the prescriber's answer.

    The prescriber decides, never the pharmacy. A proposal sits PENDING until the
    clinician who wrote the prescription approves or refuses it.
    """
    __tablename__ = "care_substitution_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    dispense_id: Mapped[str] = mapped_column(ForeignKey("care_dispenses.id"), index=True)
    prescription_item_id: Mapped[str] = mapped_column(ForeignKey("care_prescription_items.id"), index=True)
    proposed_by: Mapped[str] = mapped_column(String, default="")
    proposed_generic: Mapped[str] = mapped_column(String(160), default="")
    proposed_brand: Mapped[str] = mapped_column(String(160), default="")
    reason: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[str] = mapped_column(String(16), default="PENDING", index=True)
    decided_by: Mapped[str] = mapped_column(String, default="")
    decided_at: Mapped[float] = mapped_column(Float, default=0.0)
    decision_note: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[float] = mapped_column(Float, index=True)


class ActivityCounter(Base):
    """Aggregated request telemetry — every endpoint, no personal data.

    This is the counterpart to ``OpsEvent``. The feed carries the handful of events
    a person must act on; this carries *everything else*, as counts rather than
    records, so the platform is fully observable without a student's vitals, dose
    logs or documents appearing on an operator's screen.

    What is stored: the matched route template, the method, the caller's role, the
    status class, a one-hour bucket, a count and total latency. Deliberately absent:
    the account id, path parameters, query values, request bodies and responses.
    ``/health/readings/{reading_id}`` is recorded as the template, never with the id
    filled in, so a row can never identify whose reading was deleted.
    """
    __tablename__ = "care_activity_counters"
    __table_args__ = (UniqueConstraint("bucket", "route", "method", "actor_role", "status_class"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    # Unix hour — aggregation keeps this table small however much traffic arrives.
    bucket: Mapped[int] = mapped_column(Integer, index=True)
    route: Mapped[str] = mapped_column(String(200), index=True)
    method: Mapped[str] = mapped_column(String(10))
    actor_role: Mapped[str] = mapped_column(String(24), default="ANONYMOUS", index=True)
    status_class: Mapped[str] = mapped_column(String(3), default="2xx", index=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    total_latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    max_latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    last_at: Mapped[float] = mapped_column(Float, default=0.0)


class KnowledgeChunk(Base):
    """A retrievable passage from an approved source, with its vector.

    Chunks rather than whole documents because a 4,000-character source answers one
    question in one paragraph; retrieving the whole thing buries the answer and wastes
    the model's attention. The vector is stored as JSON rather than a native vector
    type so the same code runs on SQLite in tests and Postgres in production; moving
    to pgvector later changes this column and nothing else.

    Only sources that are active, reviewed and unexpired are ever chunked, so the
    retrieval layer cannot surface unapproved content even by accident.
    """
    __tablename__ = "care_knowledge_chunks"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("care_knowledge_sources.id"), index=True)
    ordinal: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(String(2000), default="")
    # Which source revision produced this chunk. A re-index of an edited source
    # replaces its chunks; a stale version here means the index needs rebuilding.
    source_version: Mapped[int] = mapped_column(Integer, default=1)
    embedder: Mapped[str] = mapped_column(String(40), default="")
    vector: Mapped[dict] = mapped_column(JSON, default=list)
    created_at: Mapped[float] = mapped_column(Float, default=0.0)


class AgentTurn(Base):
    """One exchange with a conversational agent, kept for evaluation and safety review.

    The student's message is stored because an agent transcript is the only way to
    tell whether it answered well, and because a refusal that should have been an
    answer is invisible otherwise. That makes this table clinical data: it is owned by
    the student, readable by them, and never routed to an operational dashboard.
    """
    __tablename__ = "care_agent_turns"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String, index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    agent: Mapped[str] = mapped_column(String(40), default="ayush", index=True)
    question: Mapped[str] = mapped_column(String(1000), default="")
    answer: Mapped[str] = mapped_column(String(4000), default="")
    outcome: Mapped[str] = mapped_column(String(24), default="ANSWERED", index=True)
    citation_ids: Mapped[dict] = mapped_column(JSON, default=list)
    top_score: Mapped[float] = mapped_column(Float, default=0.0)
    generator: Mapped[str] = mapped_column(String(40), default="extractive")
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[float] = mapped_column(Float, index=True)


# Tables created by migration e84d2b91c01f. No router serves them: account erasure
# is services/erasure.py (DeletionRequest + ErasureArchive). Kept so models and
# migrations agree.
class DPDPErasureRequest(Base):
    __tablename__ = "care_dpdp_erasure_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    request_date: Mapped[float] = mapped_column(Float, index=True)
    scheduled_erasure_date: Mapped[float] = mapped_column(Float, index=True)
    status: Mapped[str] = mapped_column(String(24), default="PENDING")
    legally_retained_items: Mapped[list] = mapped_column(JSON, default=list)


class ConsentRecord(Base):
    """What a person agreed to, the version of the wording, and when (DPDP Act 2023, s.6).

    Append-only: a change of mind is a new row or a withdrawal timestamp, never
    an edit, so the record of what was agreed at signup survives.
    """
    __tablename__ = "care_consent_records"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    version: Mapped[str] = mapped_column(String(40), index=True)
    purposes: Mapped[list] = mapped_column(JSON, default=list)
    language: Mapped[str] = mapped_column(String(5), default="en")
    recorded_at: Mapped[float] = mapped_column(Float, index=True)
    withdrawn_at: Mapped[float] = mapped_column(Float, default=0.0)
    # Sign-up rows only: the privacy notice and terms versions shown on the
    # consent screen (care_legal_documents), or "unpublished" when none was
    # published then. "" on optional-purpose rows and on rows from before this.
    notice_version: Mapped[str] = mapped_column(String(40), default="", server_default="")
    terms_version: Mapped[str] = mapped_column(String(40), default="", server_default="")


LEGAL_DOCUMENT_KINDS = ("PRIVACY_NOTICE", "TERMS", "GRIEVANCE_OFFICER")
LEGAL_DOCUMENT_STATUSES = ("DRAFT", "PUBLISHED", "RETIRED")


class LegalDocument(Base):
    """A version of the privacy notice, the terms or the grievance officer details.

    Written by a super admin from the text legal supplies (services/legal_documents.py);
    nothing in the code authors it. A draft can be edited; publishing freezes it and
    retires the version it replaces, so every sign-up record can name the exact text
    it was shown. Platform plane: legal text, no person's data.
    """
    __tablename__ = "care_legal_documents"
    __table_args__ = (
        UniqueConstraint("kind", "version", name="uq_care_legal_documents_kind_version"),
        CheckConstraint("kind IN ('PRIVACY_NOTICE', 'TERMS', 'GRIEVANCE_OFFICER')", name="ck_care_legal_documents_kind"),
        CheckConstraint("status IN ('DRAFT', 'PUBLISHED', 'RETIRED')", name="ck_care_legal_documents_status"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    kind: Mapped[str] = mapped_column(String(24), index=True)
    version: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="DRAFT")
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)
    published_by: Mapped[str] = mapped_column(String(64), default="", server_default="")
    published_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class NamedSuperAdmin(Base):
    """A super admin who is one named person, not the shared team account (audit H3).

    Created only by another super admin (services/named_super_admins.py). The account
    must use an authenticator whatever the 2FA policy says; ``totp_signed_in_at`` is the
    first sign-in that passed the authenticator step, which the guided retirement of
    the shared super admin waits for. Platform plane: no grant to either group role.
    """
    __tablename__ = "care_named_super_admins"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[float] = mapped_column(Float)
    totp_signed_in_at: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class DPDPConsentPolicyVersion(Base):
    __tablename__ = "care_dpdp_consent_policy_versions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    version: Mapped[str] = mapped_column(String(40), unique=True)
    title: Mapped[str] = mapped_column(String(160))
    change_summary: Mapped[str] = mapped_column(String(2000))
    effective_date: Mapped[float] = mapped_column(Float)
    force_reconsent: Mapped[bool] = mapped_column(Boolean, default=False)


# --- Points, referrals (commerce plane, core/rule_l.py) -----------------------
#
# Points have no cash value and cannot be redeemed for anything yet. They are
# earned only for non-health actions (a friend you invited became a verified
# student); never for a body metric, a reading, a result or adding a health
# record (AGENTS.md guardrail 4, Rule L). These tables hold account ids, codes,
# counts and amounts only: nothing about anyone's health.

# Every reason a ledger entry may carry. The database refuses any other value
# (ck_care_points_ledger_reason), so a health-related reason cannot be written
# even by mistake. Adding one needs a migration and a Rule L review.
POINTS_REASONS = ("REFERRAL_VERIFIED", "REVERSAL")


class ReferralCode(Base):
    """A student's own invite code. Issued once, never regenerated or changed."""
    __tablename__ = "care_referral_codes"
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True)
    created_at: Mapped[float] = mapped_column(Float)


class Referral(Base):
    """One account that joined with someone's code. One row per referred account, ever.

    status: PENDING (signed up, not yet a verified student) -> REWARDED, or
    CAPPED (verified, but the inviter had reached the monthly cap) or
    INELIGIBLE (self-referral, inviter no longer an active student, or the
    18+ check could not be passed). Only PENDING ever changes.
    """
    __tablename__ = "care_referrals"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    referred_account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), unique=True)
    inviter_account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    code: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(16), default="PENDING", index=True)
    created_at: Mapped[float] = mapped_column(Float)
    verified_at: Mapped[float] = mapped_column(Float, default=0.0)


class PointsEntry(Base):
    """Append-only points ledger. A balance is the sum of an account's entries.

    Nothing updates or deletes a row (account erasure aside, which removes
    everything an erased account owns). A mistake is undone by a REVERSAL entry
    pointing at the entry it cancels. ``idempotency_key`` is unique, so the same
    award can never be written twice.
    """
    __tablename__ = "care_points_ledger"
    __table_args__ = (
        CheckConstraint("reason IN ('REFERRAL_VERIFIED', 'REVERSAL')", name="ck_care_points_ledger_reason"),
        CheckConstraint("amount <> 0", name="ck_care_points_ledger_amount"),
    )
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("care_accounts.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(32))
    idempotency_key: Mapped[str] = mapped_column(String(120), unique=True)
    # The referral (care_referrals.id) an award is for; empty for a reversal.
    reference_id: Mapped[str] = mapped_column(String(64), default="")
    reverses_entry_id: Mapped[str] = mapped_column(String(64), default="")
    created_by: Mapped[str] = mapped_column(String(64), default="system")
    created_at: Mapped[float] = mapped_column(Float, index=True)


class SettingOverride(Base):
    """A super admin's value for one declared setting (core/settings_registry.py).

    Platform plane: business configuration, never anything about a person. One
    row per overridden key; no row means the declared default is in force. The
    value is checked against its declaration on every read, so a row written
    around the API cannot put an out-of-bounds value into effect.
    """
    __tablename__ = "care_setting_overrides"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[object] = mapped_column(JSON)
    updated_by: Mapped[str] = mapped_column(String(64))
    updated_at: Mapped[float] = mapped_column(Float)


class SettingOverrideHistory(Base):
    """Append-only record of every change to a setting override, with its reason.

    ``old_value`` / ``new_value`` are SQL NULL when there was / is no override
    (the default in force). Never updated or deleted: the ORM refuses it below
    and, on Postgres, a trigger from migration a7d3e9c1f5b2 refuses it too.
    """
    __tablename__ = "care_setting_override_history"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    key: Mapped[str] = mapped_column(String(80), index=True)
    old_value: Mapped[object | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    new_value: Mapped[object | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    reason: Mapped[str] = mapped_column(String(500))
    changed_by: Mapped[str] = mapped_column(String(64), index=True)
    changed_at: Mapped[float] = mapped_column(Float, index=True)


def _history_is_append_only(mapper, connection, target):
    raise ValueError("care_setting_override_history is append-only")


event.listen(SettingOverrideHistory, "before_update", _history_is_append_only)
event.listen(SettingOverrideHistory, "before_delete", _history_is_append_only)


class Post(Base):
    """A News or Blog post (the newsroom), written by the team in one of the SK templates.

    Platform plane: public editorial content that never names or describes a
    student (services/newsroom.py refuses nothing about a person because nothing
    about a person is ever read into it). ``template`` fixes the layout, the
    cover and the body blocks allowed; ``section`` follows from it (blog or news).

    A post is public only while ``status`` is PUBLISHED, or SCHEDULED with
    ``publish_at`` in the past. A HEALTH_TIP is public only while a clinician's
    approval (``reviewed_hash``) still equals the hash of its current content: any
    edit after the review takes it off the site until it is reviewed again.
    ``sample`` rows exist only in development and test builds (services/demo_seed.py).
    """
    __tablename__ = "care_posts"
    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED')", name="ck_care_posts_status"),
        CheckConstraint("section IN ('BLOG', 'NEWS')", name="ck_care_posts_section"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    template: Mapped[str] = mapped_column(String(20), index=True)   # HEALTH_TIP | CAMPUS_NEWS | PRODUCT_UPDATE | PRESS_RELEASE | STORY
    section: Mapped[str] = mapped_column(String(8), index=True)     # BLOG | NEWS, from the template
    title: Mapped[str] = mapped_column(String(160))
    summary: Mapped[str] = mapped_column(String(300), default="")
    body: Mapped[list] = mapped_column(JSON, default=list)          # the template's blocks (services/newsroom.py)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    cover_alt: Mapped[str] = mapped_column(String(200), default="")
    cover_art: Mapped[str] = mapped_column(String(40), default="")  # one of the template's kit art names, or ""
    seo_title: Mapped[str] = mapped_column(String(70), default="")
    seo_description: Mapped[str] = mapped_column(String(160), default="")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    author_id: Mapped[str] = mapped_column(String, default="")       # a team member's account
    status: Mapped[str] = mapped_column(String(12), default="DRAFT", index=True)
    publish_at: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    first_published_at: Mapped[float] = mapped_column(Float, default=0.0)
    reviewed_by: Mapped[str | None] = mapped_column(String, nullable=True, default=None)  # an NMC_DOCTOR account id
    reviewed_at: Mapped[float] = mapped_column(Float, default=0.0)
    reviewed_hash: Mapped[str] = mapped_column(String(64), default="")
    sample: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
    updated_by: Mapped[str] = mapped_column(String, default="")
    updated_at: Mapped[float] = mapped_column(Float, default=0.0)


class PostEvent(Base):
    """Append-only trail of a post: created, edited, reviewed, published, … (ids and hashes, no text)."""
    __tablename__ = "care_post_events"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    post_id: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(String(24))
    actor_id: Mapped[str] = mapped_column(String, default="")
    actor_role: Mapped[str] = mapped_column(String(20), default="")
    content_hash: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[float] = mapped_column(Float, default=0.0, index=True)


class PostImage(Base):
    """An image placed in a post's body, virus-scanned before it was stored (like care_catalog_images)."""
    __tablename__ = "care_post_images"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    post_id: Mapped[str] = mapped_column(String, index=True)
    filename: Mapped[str] = mapped_column(String(200), default="")
    mime_type: Mapped[str] = mapped_column(String(40))
    content: Mapped[bytes] = mapped_column(LargeBinary)
    uploaded_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[float] = mapped_column(Float, default=0.0)
