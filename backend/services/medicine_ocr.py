"""Reading the printed text on a photo of a medicine strip or box (Medicine information).

Plan tier1-medicine-info-2026-10-22, D-MI-10. No maintained on-device OCR fits
both the Expo app and the web, so the photo is read on our own server by the
Tesseract engine, with no third party. It is off until a super admin (after the
AI-constitution owner and the DPO sign) turns ``medicine_ocr`` on, and this
module says honestly which state it is in:

* ``NOT_CONFIGURED`` — the integration is off;
* ``UNAVAILABLE`` — it is on, but the Tesseract program is not installed here;
* ``READY`` — photos can be read.

The photo is passed to Tesseract on standard input and the text read back on
standard output: it is never written to disk, stored or logged, and neither is
the text. This only extracts text. It never identifies a medicine from how a
tablet looks; matching the text to the database, and the person confirming
the match, happen elsewhere (services/medicine_info.py).
"""
from __future__ import annotations

import shutil
import subprocess

from services.integration_config import INTEGRATIONS_DB

PROVIDER = "medicine_ocr"
NOT_CONFIGURED = "NOT_CONFIGURED"
UNAVAILABLE = "UNAVAILABLE"
READY = "READY"


class ReaderUnavailable(Exception):
    def __init__(self, state: str):
        super().__init__(state)
        self.state = state


class ReadFailed(Exception):
    """The reader ran but could not read this photo. Carries no photo content."""


def _binary() -> str | None:
    cfg = INTEGRATIONS_DB.get(PROVIDER, {})
    return shutil.which(str(cfg.get("binary") or "tesseract"))


def status() -> dict:
    cfg = INTEGRATIONS_DB.get(PROVIDER, {})
    if not cfg.get("enabled"):
        return {"provider": PROVIDER, "state": NOT_CONFIGURED}
    if _binary() is None:
        return {"provider": PROVIDER, "state": UNAVAILABLE}
    return {"provider": PROVIDER, "state": READY}


def _run(binary: str, image: bytes, timeout: int) -> str:
    try:
        done = subprocess.run([binary, "stdin", "stdout", "--psm", "11"], input=image, capture_output=True,  # noqa: S603
                              timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ReadFailed("reader did not finish") from exc
    if done.returncode != 0:
        raise ReadFailed("reader refused the image")
    return done.stdout.decode("utf-8", errors="ignore")


def read_text(image: bytes, timeout: int) -> str:
    """The printed text on the photo. Raises ReaderUnavailable or ReadFailed."""
    current = status()["state"]
    if current != READY:
        raise ReaderUnavailable(current)
    binary = _binary()
    if binary is None:
        raise ReaderUnavailable(UNAVAILABLE)
    return _run(binary, image, timeout)
