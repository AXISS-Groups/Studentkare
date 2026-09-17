"""
Studentkare Data Security Pattern — Cryptographic Service & Key Management
Compliance: DPDP Act 2023, DPDP Rules 2025, ABDM Guidelines

Implements AES-256-GCM authenticated envelope encryption across data tiers:
  KMS Root Key (HSM, India region CMEK)
   └── KEK per tenant          (rotated annually)
        └── DEK per student     (T3 Clinical)
             └── DEK per record (T4 Sensitive Clinical)

Erasure Mechanism: Crypto-shredding (permanent destruction of student/record DEK).
"""

import logging
import os
import secrets
from typing import Dict, Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger(__name__)

# Key custody configuration — KMS Customer Managed Keys in India Region (ap-south-1 / asia-south1)
KMS_REGION = os.getenv("KMS_REGION", "ap-south-1")
MASTER_KMS_KEY_ID = os.getenv("MASTER_KMS_KEY_ID", "alias/studentkare-root-key")

# In-memory transient DEK vault simulation (wrapped in production via KMS API)
# In production, DEK keys are unwrapped via KMS CMEK call and scrubbed from RAM.
_KEY_STORE: Dict[str, bytes] = {}


def generate_key() -> bytes:
    """Generate a cryptographically secure 256-bit AES-GCM key."""
    return AESGCM.generate_key(bit_length=256)


def wrap_dek(dek: bytes, kek: bytes) -> bytes:
    """Wrap a DEK with a Tenant/Record KEK using AES-256-GCM."""
    aesgcm = AESGCM(kek)
    nonce = secrets.token_bytes(12)
    ciphertext = aesgcm.encrypt(nonce, dek, None)
    return nonce + ciphertext


def unwrap_dek(wrapped_dek: bytes, kek: bytes) -> bytes:
    """Unwrap a DEK using a Tenant/Record KEK."""
    if len(wrapped_dek) < 28:
        raise ValueError("Invalid wrapped DEK format")
    nonce = wrapped_dek[:12]
    ciphertext = wrapped_dek[12:]
    aesgcm = AESGCM(kek)
    return aesgcm.decrypt(nonce, ciphertext, None)


def encrypt_payload(data: bytes, key: bytes) -> Tuple[bytes, bytes]:
    """
    Encrypt plaintext bytes using AES-256-GCM authenticated encryption.
    Returns (nonce, ciphertext_with_tag).
    """
    aesgcm = AESGCM(key)
    nonce = secrets.token_bytes(12)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return nonce, ciphertext


def decrypt_payload(nonce: bytes, ciphertext: bytes, key: bytes) -> bytes:
    """
    Decrypt AES-256-GCM authenticated ciphertext.
    Fails if payload or tag has been tampered with.
    """
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)


class StudentkareCryptoService:
    """
    High-level envelope encryption manager for Studentkare 5-tier data pattern.
    """

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._kek = self._get_or_create_tenant_kek(tenant_id)

    def _get_or_create_tenant_kek(self, tenant_id: str) -> bytes:
        store_key = f"kek:{tenant_id}"
        if store_key not in _KEY_STORE:
            _KEY_STORE[store_key] = generate_key()
        return _KEY_STORE[store_key]

    def get_or_create_student_dek(self, student_id: str) -> bytes:
        """T3 Clinical: Retrieve or initialize per-student DEK."""
        store_key = f"dek:student:{self.tenant_id}:{student_id}"
        if store_key not in _KEY_STORE:
            _KEY_STORE[store_key] = generate_key()
        return _KEY_STORE[store_key]

    def create_record_dek(self, record_id: str) -> bytes:
        """T4 Sensitive Clinical: Generate a unique per-record DEK."""
        store_key = f"dek:record:{self.tenant_id}:{record_id}"
        dek = generate_key()
        _KEY_STORE[store_key] = dek
        return dek

    def encrypt_t3_clinical(self, student_id: str, payload_bytes: bytes) -> Tuple[bytes, bytes]:
        """
        Encrypt T3 FHIR / clinical payload using per-student DEK.
        Returns (combined_nonce_ciphertext, wrapped_dek).
        """
        dek = self.get_or_create_student_dek(student_id)
        nonce, ciphertext = encrypt_payload(payload_bytes, dek)
        wrapped_dek = wrap_dek(dek, self._kek)
        return nonce + ciphertext, wrapped_dek

    def decrypt_t3_clinical(self, student_id: str, encrypted_payload: bytes, wrapped_dek: bytes) -> bytes:
        """Decrypt T3 clinical payload using per-student DEK."""
        dek = self.get_or_create_student_dek(student_id)
        nonce = encrypted_payload[:12]
        ciphertext = encrypted_payload[12:]
        return decrypt_payload(nonce, ciphertext, dek)

    def encrypt_t4_sensitive(self, record_id: str, payload_bytes: bytes) -> Tuple[bytes, bytes]:
        """
        Encrypt T4 sensitive clinical payload using per-record DEK.
        Returns (combined_nonce_ciphertext, wrapped_dek).
        """
        dek = self.create_record_dek(record_id)
        nonce, ciphertext = encrypt_payload(payload_bytes, dek)
        wrapped_dek = wrap_dek(dek, self._kek)
        return nonce + ciphertext, wrapped_dek

    def decrypt_t4_sensitive(self, record_id: str, encrypted_payload: bytes, wrapped_dek: bytes) -> bytes:
        """Decrypt T4 sensitive clinical payload using per-record DEK."""
        store_key = f"dek:record:{self.tenant_id}:{record_id}"
        dek = _KEY_STORE.get(store_key)
        if not dek:
            raise PermissionError("Crypto-shredded or invalid record DEK")
        nonce = encrypted_payload[:12]
        ciphertext = encrypted_payload[12:]
        return decrypt_payload(nonce, ciphertext, dek)

    def crypto_shred_student(self, student_id: str) -> bool:
        """
        Crypto-shredding: Destroy student's DEK.
        Ciphertext in database and backups becomes permanently unrecoverable.
        """
        store_key = f"dek:student:{self.tenant_id}:{student_id}"
        if store_key in _KEY_STORE:
            del _KEY_STORE[store_key]
            logger.info("Crypto-shredded DEK for student %s in tenant %s", student_id, self.tenant_id)
            return True
        return False

    def crypto_shred_record(self, record_id: str) -> bool:
        """
        Crypto-shredding: Destroy specific T4 record's DEK.
        """
        store_key = f"dek:record:{self.tenant_id}:{record_id}"
        if store_key in _KEY_STORE:
            del _KEY_STORE[store_key]
            logger.info("Crypto-shredded DEK for T4 record %s", record_id)
            return True
        return False
