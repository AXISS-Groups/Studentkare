"""
services.upload_files — the one place an uploaded file's size, type and name are checked.

The type comes from the file's own bytes (its magic number), never from the
extension or the Content-Type the client declared: both are whatever the sender
chose. Virus scanning stays with ``services.security_scanner`` and is called by
each route after these checks.
"""
from __future__ import annotations

import re
from typing import BinaryIO

from fastapi import HTTPException

PDF = "application/pdf"
PNG = "image/png"
JPEG = "image/jpeg"
WEBP = "image/webp"
HEIC = "image/heic"
HEIF = "image/heif"
TIFF = "image/tiff"
ICO = "image/x-icon"
SVG = "image/svg+xml"

# Formats the vault and lab reports have always taken.
DOCUMENT_TYPES = frozenset({PDF, PNG, JPEG})

# ISO-BMFF brands: HEVC-coded HEIC, and the generic HEIF image brands an iPhone
# or Android camera may write as the major brand.
_HEIC_BRANDS = {b"heic", b"heix", b"heim", b"heis", b"hevc", b"hevx", b"hevm", b"hevs"}
_HEIF_BRANDS = {b"mif1", b"msf1", b"mif2"}

# Mime type -> file extension, so a stored name matches what the bytes are.
EXTENSIONS = {PDF: "pdf", PNG: "png", JPEG: "jpg", WEBP: "webp", HEIC: "heic", HEIF: "heif", TIFF: "tiff"}


def sniff_mime(content: bytes) -> str | None:
    """The file's real type from its leading bytes, or None if it is not one we know."""
    if content.startswith(b"%PDF-"):
        return PDF
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return PNG
    if content.startswith(b"\xff\xd8\xff"):
        return JPEG
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return WEBP
    if len(content) >= 12 and content[4:8] == b"ftyp":
        brand = content[8:12]
        if brand in _HEIC_BRANDS:
            return HEIC
        if brand in _HEIF_BRANDS:
            return HEIF
        return None
    if content.startswith((b"II*\x00", b"MM\x00*")):
        return TIFF
    if content.startswith((b"\x00\x00\x01\x00", b"\x00\x00\x02\x00")):  # ICO, CUR
        return ICO
    return None


# Elements/attributes that let an SVG carry a payload instead of just a picture.
_SVG_DANGEROUS_TAGS = re.compile(
    r"<\s*(script|foreignObject|iframe|embed|object|set|animate)\b.*?(?:/\s*>|>.*?<\s*/\s*\1\s*>)",
    re.IGNORECASE | re.DOTALL,
)
_SVG_EVENT_ATTR = re.compile(r"\s+on[a-z]+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", re.IGNORECASE)
_SVG_JS_URI = re.compile(r"(href|xlink:href)\s*=\s*(\"|')\s*javascript:[^\"']*\2", re.IGNORECASE)
_SVG_ROOT_TAG = re.compile(r"<svg[\s>]", re.IGNORECASE)
_SVG_DOCTYPE_ENTITY = re.compile(r"<!DOCTYPE[^>]*\[.*?\]\s*>", re.IGNORECASE | re.DOTALL)


def sniff_and_sanitize_svg(content: bytes) -> bytes | None:
    """If `content` looks like an SVG, strip anything that would make it a
    script carrier (inline <script>, foreignObject/iframe/embed/object, SMIL
    `<set>`/`<animate>` attribute hijacking, `on*` event handlers, `javascript:`
    URIs, and a DOCTYPE with an internal entity subset) and return the result.
    Returns None if this isn't recognisable as SVG at all — an SVG whose
    payload *is* its only content (all tags stripped) still comes back as
    sanitized markup, not a reject, same as any other format here only
    checking the type, not the content.
    """
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        return None
    head = text[:4096]
    if "<svg" not in head.lower() and "<?xml" not in head.lower():
        return None
    if not _SVG_ROOT_TAG.search(text):
        return None
    cleaned = _SVG_DOCTYPE_ENTITY.sub("", text)
    cleaned = _SVG_DANGEROUS_TAGS.sub("", cleaned)
    cleaned = _SVG_EVENT_ATTR.sub("", cleaned)
    cleaned = _SVG_JS_URI.sub("", cleaned)
    return cleaned.encode("utf-8")


def read_capped(file: BinaryIO, max_bytes: int, message: str) -> bytes:
    """Read at most one byte past the limit, so an oversized upload is refused without reading all of it."""
    content = file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(413, message)
    return content


def declared_type_matches(content: bytes, declared: str | None, allowed: frozenset[str]) -> bool:
    """The older routes' rule: the declared type is allowed and the bytes really are that type."""
    return bool(declared) and declared in allowed and sniff_mime(content) == declared


def safe_filename(name: str | None, fallback: str) -> str:
    """A display name with no path and nothing a Content-Disposition header could be broken by."""
    base = (name or fallback).replace("\\", "/").split("/")[-1]
    return re.sub(r"[^a-zA-Z0-9._ -]", "_", base)[:180] or fallback
