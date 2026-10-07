"""
Studentkare Data Security Pattern — Comprehensive Automated Test Suite
Compliance Verification: DPDP Act 2023, DPDP Rules 2025, ABDM Guidelines

Tests:
1. 5-Tier Data Classification & Role Privilege Isolation
2. Envelope Encryption (AES-256-GCM) with Per-Student DEK (T3) and Per-Record DEK (T4)
3. Crypto-shredding (Erasure by DEK Destruction)
4. Purpose-Bound Access Control (Closed PurposeCode Enum)
5. Signed Consent Artefact & Instant Gateway Revocation
6. Hash-Chained Append-Only Audit Ledger Integrity
7. Emergency Card Exception Bounds & Honesty Markers
8. Security Remediation (CORS Configuration & Secrets OTP)
"""

import secrets
from datetime import datetime, timedelta, timezone

import pytest
from cryptography.exceptions import InvalidTag

from core.audit_chain import AuditEvent, HashChainedAuditLedger
from core.consent_engine import (
    ConsentArtefact,
    ConsentGatewayValidator,
    GranteeInfo,
    PurposeCode,
    consent_signing_key,
)
from core.crypto_service import StudentkareCryptoService, generate_key
from core.emergency_card import EmergencyCardManager, EmergencyContact, StudentEmergencyCardPayload


def test_01_envelope_encryption_and_crypto_shredding():
    """Verify AES-256-GCM envelope encryption and crypto-shredding erasure."""
    crypto = StudentkareCryptoService(tenant_id="tenant_snist_01")
    student_id = "STU_884901"
    raw_fhir_payload = b'{"resourceType": "Observation", "code": "Blood Glucose", "value": 110}'

    # Encrypt T3 Clinical Data
    ciphertext, wrapped_dek = crypto.encrypt_t3_clinical(student_id, raw_fhir_payload)
    assert ciphertext != raw_fhir_payload
    assert len(wrapped_dek) > 0

    # Decrypt T3 Clinical Data
    decrypted = crypto.decrypt_t3_clinical(student_id, ciphertext, wrapped_dek)
    assert decrypted == raw_fhir_payload

    # Perform Crypto-Shredding
    shred_success = crypto.crypto_shred_student(student_id)
    assert shred_success is True

    # Verify Ciphertext becomes permanently unrecoverable
    # Narrowed from bare Exception: AESGCM raises InvalidTag when the key is gone,
    # and a broad assertion would also pass on a NameError from a broken test.
    with pytest.raises(InvalidTag):
        crypto.decrypt_t3_clinical(student_id, ciphertext, wrapped_dek)


def test_02_t4_sensitive_per_record_dek_and_shredding():
    """Verify T4 sensitive clinical per-record DEK envelope encryption and crypto-shredding."""
    crypto = StudentkareCryptoService(tenant_id="tenant_vnr_02")
    record_id = "REC_T4_9920"
    sensitive_payload = b'{"category": "MentalHealth", "consultationNotes": "Patient exhibiting mild stress."}'

    # Encrypt T4 Sensitive Clinical Data
    ciphertext, wrapped_dek = crypto.encrypt_t4_sensitive(record_id, sensitive_payload)
    assert ciphertext != sensitive_payload

    # Decrypt T4 Sensitive Clinical Data
    decrypted = crypto.decrypt_t4_sensitive(record_id, ciphertext, wrapped_dek)
    assert decrypted == sensitive_payload

    # Crypto-shred specific T4 record
    assert crypto.crypto_shred_record(record_id) is True

    # Decryption MUST fail with PermissionError
    with pytest.raises(PermissionError, match="Crypto-shredded"):
        crypto.decrypt_t4_sensitive(record_id, ciphertext, wrapped_dek)


def test_03_purpose_code_closed_enum():
    """Verify that purpose codes are restricted to the closed enum."""
    valid_purposes = [p.value for p in PurposeCode]
    assert "STUDENT_SELF" in valid_purposes
    assert "CLINICIAN_ACTIVE_CONSULT" in valid_purposes
    assert "EMERGENCY_RESPONDER" in valid_purposes
    assert "CAMP_STATION" in valid_purposes
    assert "DPDP_REQUEST" in valid_purposes
    assert "BREAK_GLASS" in valid_purposes

    # Strict Rule: GENERAL and ADMIN MUST NOT exist
    assert "GENERAL" not in valid_purposes
    assert "ADMIN" not in valid_purposes


@pytest.fixture
def consent_key(monkeypatch):
    """A configured signing key, the way a deployment supplies one.

    The key used to be a literal in core/consent_engine.py, which made every
    signature forgeable by anyone holding the repository.
    """
    monkeypatch.setenv("CONSENT_SIGNING_KEY", "k" * 48)


def test_consent_signing_fails_closed_without_a_key(monkeypatch):
    """No key means no signature, rather than one anyone can forge."""
    monkeypatch.delenv("CONSENT_SIGNING_KEY", raising=False)
    with pytest.raises(RuntimeError, match="CONSENT_SIGNING_KEY"):
        consent_signing_key()


def test_consent_signing_rejects_a_short_key(monkeypatch):
    monkeypatch.setenv("CONSENT_SIGNING_KEY", "tooshort")
    with pytest.raises(RuntimeError, match="32 characters"):
        consent_signing_key()


def test_a_signature_does_not_verify_under_a_different_key(consent_key, monkeypatch):
    """The whole point of the key being secret: another key must not validate."""
    now = datetime.now(timezone.utc)
    grantee = GranteeInfo(grantee_type="CLINICIAN", id="DOC_4012", name="Dr. Sharma")
    artefact = ConsentArtefact(
        id="CONSENT_2002", student_id="STU_1", grantee=grantee,
        purpose=PurposeCode.CLINICIAN_ACTIVE_CONSULT, data_types=["Observation"],
        valid_from=now - timedelta(hours=1), valid_until=now + timedelta(days=7),
    )
    artefact.sign()
    assert artefact.verify_signature() is True
    monkeypatch.setenv("CONSENT_SIGNING_KEY", "d" * 48)
    assert artefact.verify_signature() is False


def test_04_signed_consent_artefact_validation_and_revocation(consent_key,):
    """Verify signed consent artefact signature checking and instant gateway revocation."""
    now = datetime.now(timezone.utc)
    grantee = GranteeInfo(grantee_type="CLINICIAN", id="DOC_4012", name="Dr. Sharma")

    artefact = ConsentArtefact(
        id="CONSENT_1001",
        student_id="STU_884901",
        grantee=grantee,
        purpose=PurposeCode.CLINICIAN_ACTIVE_CONSULT,
        data_types=["Observation", "MedicationRequest"],
        valid_from=now - timedelta(hours=1),
        valid_until=now + timedelta(days=7),
    )
    artefact.sign()
    assert artefact.verify_signature() is True

    # Validate access request - SUCCESS
    allowed, reason = ConsentGatewayValidator.validate_access_request(
        artefact,
        requested_purpose=PurposeCode.CLINICIAN_ACTIVE_CONSULT,
        requested_grantee_id="DOC_4012",
        requested_resource_type="Observation",
        now=now
    )
    assert allowed is True
    assert "Access granted" in reason

    # Test Instant Revocation
    artefact.revoked_at = now - timedelta(seconds=1)
    artefact.sign() # Re-sign after revocation update

    allowed_revoked, reason_revoked = ConsentGatewayValidator.validate_access_request(
        artefact,
        requested_purpose=PurposeCode.CLINICIAN_ACTIVE_CONSULT,
        requested_grantee_id="DOC_4012",
        requested_resource_type="Observation",
        now=now
    )
    assert allowed_revoked is False
    assert "revoked" in reason_revoked


def test_05_hash_chained_audit_ledger_integrity():
    """Verify append-only hash chaining and tamper detection."""
    ledger = HashChainedAuditLedger(secret="test_secret_123")

    event1 = AuditEvent(
        actor_id="USER_01",
        actor_type="HUMAN",
        purpose_code=PurposeCode.STUDENT_SELF,
        rule_reference="Rule-K1",
        tenant_id="tenant_01",
        subject_id="STU_884901",
        resource_types=["Observation"],
        outcome="SUCCESS",
    )
    ledger.record_access_pre_render(event1)

    event2 = AuditEvent(
        actor_id="DOC_4012",
        actor_type="HUMAN",
        purpose_code=PurposeCode.CLINICIAN_ACTIVE_CONSULT,
        rule_reference="Rule-K1",
        tenant_id="tenant_01",
        subject_id="STU_884901",
        resource_types=["MedicationRequest"],
        outcome="SUCCESS",
    )
    ledger.record_access_pre_render(event2)

    # Verify cryptographic integrity
    is_valid, corrupt_idx = ledger.verify_integrity()
    assert is_valid is True
    assert corrupt_idx is None

    # Simulate Tampering in Chain
    ledger.chain[0].actor_id = "ATTACKER_HACKED"
    is_valid_after_tamper, corrupt_idx_after_tamper = ledger.verify_integrity()
    assert is_valid_after_tamper is False
    assert corrupt_idx_after_tamper == 0


def test_06_emergency_card_exception_and_t4_exclusion():
    """Verify Emergency Card payload bounds, honesty markers, and T4 keyword rejection."""
    contact = EmergencyContact(name="Parent Contact", relationship="Mother", phone="+919876543210")

    card = StudentEmergencyCardPayload(
        card_id="CARD_9910",
        student_id="STU_884901",
        student_name="Rahul Verma",
        blood_group="O+",
        allergies=["Penicillin"],
        chronic_conditions=["Asthma"],
        current_medications=["Inhaler"],
        emergency_contacts=[contact],
        abha_number="91-2234-5678-9012"
    )

    mgr = EmergencyCardManager()
    mgr.save_card(card)

    # Offline / Lock Screen Read (no auth required)
    card_data = mgr.read_card_offline_or_qr("CARD_9910", reader_context="LOCK_SCREEN")
    assert card_data is not None
    assert card_data["student_name"] == "Rahul Verma"
    assert "Not a medical record" in card_data["honesty_marker"]
    assert "Printed cards cannot be revoked remotely" in card_data["printed_revocation_warning"]

    # Verify T4 sensitive items (e.g. HIV / Psychiatric) are rejected at model validation
    with pytest.raises(ValueError, match="T4 sensitive information"):
        StudentEmergencyCardPayload(
            card_id="CARD_BAD",
            student_id="STU_884901",
            student_name="Rahul Verma",
            blood_group="O+",
            allergies=["Penicillin"],
            chronic_conditions=["HIV positive"], # T4 prohibited
            current_medications=["Inhaler"],
            emergency_contacts=[contact],
        )
