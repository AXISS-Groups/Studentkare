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
from xml.etree import ElementTree

from defusedxml import ElementTree as safe_xml
from defusedxml.common import DefusedXmlException
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


# A static picture vocabulary. Everything else (including CSS, SMIL, foreign
# namespaces, links and externally loaded images) is omitted, not guessed safe.
_SVG_NAMESPACE = "http://www.w3.org/2000/svg"
_XLINK_NAMESPACE = "http://www.w3.org/1999/xlink"
_SVG_ELEMENTS = frozenset({
    "svg", "g", "defs", "symbol", "use", "path", "rect", "circle", "ellipse",
    "line", "polyline", "polygon", "text", "tspan", "textPath", "title", "desc",
    "linearGradient", "radialGradient", "stop", "clipPath", "mask", "pattern",
})
_SVG_ATTRIBUTES = frozenset({
    "id", "viewBox", "preserveAspectRatio", "width", "height", "x", "y", "x1", "y1",
    "x2", "y2", "dx", "dy", "cx", "cy", "r", "rx", "ry", "fx", "fy", "fr",
    "d", "points", "transform", "fill", "fill-rule", "fill-opacity", "stroke",
    "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit",
    "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "opacity", "clip-rule",
    "clip-path", "clipPathUnits", "mask", "maskUnits", "maskContentUnits",
    "gradientUnits", "gradientTransform", "spreadMethod", "offset", "stop-color",
    "stop-opacity", "patternUnits", "patternContentUnits", "patternTransform",
    "font-family", "font-size", "font-weight", "font-style", "text-anchor",
    "dominant-baseline", "letter-spacing", "word-spacing", "textLength", "lengthAdjust",
})
_SVG_FRAGMENT = re.compile(r"#[a-zA-Z_][a-zA-Z0-9_.:-]*\Z")
_SVG_LOCAL_URL = re.compile(r"url\(\s*['\"]?(#[a-zA-Z_][a-zA-Z0-9_.:-]*)['\"]?\s*\)\Z")


def _svg_name(name: str) -> tuple[str, str]:
    if name.startswith("{"):
        namespace, local = name[1:].split("}", 1)
        return namespace, local
    return "", name


def _static_svg_element(element: ElementTree.Element) -> ElementTree.Element | None:
    namespace, local = _svg_name(element.tag)
    if namespace not in ("", _SVG_NAMESPACE) or local not in _SVG_ELEMENTS:
        return None
    clean = ElementTree.Element(f"{{{_SVG_NAMESPACE}}}{local}")
    for name, value in element.attrib.items():
        attr_namespace, attr = _svg_name(name)
        if attr == "href" and attr_namespace in ("", _XLINK_NAMESPACE):
            if _SVG_FRAGMENT.fullmatch(value):
                clean.set("href", value)
        elif not attr_namespace and attr in _SVG_ATTRIBUTES:
            if "\\" in value or ("url" in value.lower() and not _SVG_LOCAL_URL.fullmatch(value)):
                continue
            clean.set(attr, value)
    clean.text = element.text
    clean.tail = element.tail
    for child in element:
        sanitized = _static_svg_element(child)
        if sanitized is not None:
            clean.append(sanitized)
    return clean


def sniff_and_sanitize_svg(content: bytes) -> bytes | None:
    """Parse without DTD/entities and rebuild only the SVG's static picture.

    XML resolves namespace prefixes and encoded attributes before validation.
    Malformed/non-SVG/DTD input is refused; scripts, events, styles, animation
    and non-local references never reach the output.
    """
    try:
        root = safe_xml.fromstring(content, forbid_dtd=True, forbid_entities=True, forbid_external=True)
    except (ElementTree.ParseError, DefusedXmlException, ValueError):
        return None
    namespace, local = _svg_name(root.tag)
    if namespace not in ("", _SVG_NAMESPACE) or local != "svg":
        return None
    try:
        clean = _static_svg_element(root)
    except RecursionError:
        return None
    return ElementTree.tostring(clean, encoding="utf-8") if clean is not None else None


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
