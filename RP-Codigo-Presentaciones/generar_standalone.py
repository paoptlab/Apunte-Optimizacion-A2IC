#!/usr/bin/env python3
"""Crea una copia HTML autónoma a partir de index.html y sus recursos locales."""

from __future__ import annotations

import argparse
import base64
import mimetypes
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DEFAULT_DECK = ROOT / "presentacion-actividad-1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Regenera standalone.html sin recursos externos.")
    parser.add_argument("--carpeta", type=Path, default=DEFAULT_DECK)
    parser.add_argument("--salida", type=Path)
    return parser.parse_args()


def mime_for(path: Path) -> str:
    overrides = {
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
        ".js": "text/javascript",
    }
    return overrides.get(path.suffix.lower()) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def data_uri(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_for(path)};base64,{encoded}"


def inline_css_urls(css: str, stylesheet: Path, deck: Path) -> str:
    pattern = re.compile(r"url\(\s*(['\"]?)([^)'\"]+)\1\s*\)", re.IGNORECASE)

    def replace(match: re.Match[str]) -> str:
        reference = match.group(2).strip()
        if reference.startswith(("data:", "http:", "https:", "#")):
            return match.group(0)
        resolved = (stylesheet.parent / reference.split("?", 1)[0].split("#", 1)[0]).resolve()
        try:
            resolved.relative_to(deck.resolve())
        except ValueError as exc:
            raise RuntimeError(f"Recurso CSS fuera de la presentación: {reference}") from exc
        if not resolved.is_file():
            raise FileNotFoundError(f"No existe el recurso CSS: {resolved}")
        return f'url("{data_uri(resolved)}")'

    return pattern.sub(replace, css)


def ensure_local(deck: Path, reference: str) -> Path:
    path = (deck / reference.split("?", 1)[0].split("#", 1)[0]).resolve()
    try:
        path.relative_to(deck.resolve())
    except ValueError as exc:
        raise RuntimeError(f"Recurso fuera de la presentación: {reference}") from exc
    if not path.is_file():
        raise FileNotFoundError(f"No existe el recurso local: {path}")
    return path


def build(deck: Path) -> str:
    index = deck / "index.html"
    html = index.read_text(encoding="utf-8")

    stylesheet_pattern = re.compile(
        r'<link\b(?=[^>]*\brel=["\']stylesheet["\'])(?=[^>]*\bhref=["\']([^"\']+)["\'])[^>]*>',
        re.IGNORECASE,
    )

    def stylesheet(match: re.Match[str]) -> str:
        reference = match.group(1)
        path = ensure_local(deck, reference)
        css = inline_css_urls(path.read_text(encoding="utf-8"), path, deck)
        return f"<style data-inline-source=\"{reference}\">\n{css}\n</style>"

    html = stylesheet_pattern.sub(stylesheet, html)

    script_pattern = re.compile(
        r'<script\b([^>]*?)\bsrc=["\']([^"\']+)["\']([^>]*)>\s*</script>',
        re.IGNORECASE,
    )

    def script(match: re.Match[str]) -> str:
        before, reference, after = match.groups()
        path = ensure_local(deck, reference)
        source = path.read_text(encoding="utf-8").replace("</script", "<\\/script")
        attrs = (before + after).strip()
        attrs = (" " + attrs) if attrs else ""
        return f'<script{attrs} data-inline-source="{reference}">\n{source}\n</script>'

    html = script_pattern.sub(script, html)

    asset_pattern = re.compile(
        r'(?P<prefix>\b(?:src|href)=["\'])(?P<ref>[^"\']+)(?P<suffix>["\'])',
        re.IGNORECASE,
    )

    def asset(match: re.Match[str]) -> str:
        reference = match.group("ref")
        if reference.startswith(("data:", "http:", "https:", "#", "blob:")):
            return match.group(0)
        path = ensure_local(deck, reference)
        return match.group("prefix") + data_uri(path) + match.group("suffix")

    return asset_pattern.sub(asset, html)


def main() -> int:
    args = parse_args()
    deck = args.carpeta.expanduser().resolve()
    output = args.salida.expanduser().resolve() if args.salida else deck / "standalone.html"
    content = build(deck)
    temporary = output.with_name(output.name + ".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(output)
    print(f"HTML autónomo: {output} ({output.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
