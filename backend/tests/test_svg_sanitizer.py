"""Static SVG allowlist after XML namespace/entity decoding."""
from xml.etree import ElementTree

import pytest

from services.upload_files import sniff_and_sanitize_svg

NS = "http://www.w3.org/2000/svg"


@pytest.mark.parametrize("payload", [
    '<script>payload()</script>',
    f'<s:script xmlns:s="{NS}">payload()</s:script>',
    '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">payload</div></foreignObject>',
    '<style>@import "https://external.test/style.css";</style>',
    '<animateTransform attributeName="transform"/>',
    '<set attributeName="href" to="javascript:payload()"/>',
    '<image href="https://external.test/pixel"/>',
    '<g xmlns="urn:foreign"><path d="M0 0"/></g>',
])
def test_active_and_foreign_elements_are_removed(payload):
    sanitized = sniff_and_sanitize_svg(f'<svg xmlns="{NS}">{payload}<path d="M0 0h10v10z"/></svg>'.encode())
    assert sanitized is not None
    root = ElementTree.fromstring(sanitized)  # noqa: S314 — sanitizer output, no untrusted XML
    assert [element.tag for element in root] == [f"{{{NS}}}path"]
    assert b"payload" not in sanitized and b"external.test" not in sanitized


@pytest.mark.parametrize("attrs", [
    'onload="payload()"',
    'style="fill:url(https://external.test/image)"',
    'href="jav&#x61;script:payload()"',
    'href="data:image/svg+xml,payload"',
    'href="https://external.test/image"',
    'xlink:href="java&#10;script:payload()"',
    'fill="url(https://external.test/image)"',
    r'fill="u\72l(https://external.test/image)"',
    'e:href="payload" xmlns:e="urn:foreign"',
])
def test_event_encoded_and_nonlocal_attributes_are_removed(attrs):
    sanitized = sniff_and_sanitize_svg(f'<svg xmlns="{NS}" xmlns:xlink="http://www.w3.org/1999/xlink"><use {attrs}/></svg>'.encode())
    assert sanitized is not None
    root = ElementTree.fromstring(sanitized)  # noqa: S314 — sanitizer output
    assert root[0].attrib == {}


def test_prefixed_root_static_geometry_gradient_and_local_use_survive():
    source = f'''<s:svg xmlns:s="{NS}" viewBox="0 0 10 10">
      <s:defs><s:linearGradient id="paint"><s:stop offset="0" stop-color="red"/></s:linearGradient>
      <s:path id="shape" d="M0 0h10v10z"/></s:defs>
      <s:use href="#shape" fill="url(#paint)"/><s:text>&lt;safe&gt;</s:text>
    </s:svg>'''.encode()
    result = sniff_and_sanitize_svg(source)
    assert result is not None
    root = ElementTree.fromstring(result)  # noqa: S314 — sanitizer output
    assert root.attrib["viewBox"] == "0 0 10 10"
    assert root[1].attrib == {"href": "#shape", "fill": "url(#paint)"}
    assert root[2].text == "<safe>"
    assert sniff_and_sanitize_svg(result) == result


@pytest.mark.parametrize("content", [
    b"", b"\xff\xfeinvalid", b"<svg>", b"<html><svg/></html>", b'<svg xmlns="urn:foreign"/>',
    b'<!DOCTYPE svg SYSTEM "https://external.test/dtd"><svg/>',
    b'<!DOCTYPE svg [<!ENTITY secret SYSTEM "file:///private">]><svg>&secret;</svg>',
    b'<svg>&undeclared;</svg>',
])
def test_invalid_non_svg_dtd_and_entities_are_refused(content):
    assert sniff_and_sanitize_svg(content) is None


def test_deep_markup_fails_closed():
    assert sniff_and_sanitize_svg(b"<svg>" + b"<g>" * 2000 + b"</g>" * 2000 + b"</svg>") is None
