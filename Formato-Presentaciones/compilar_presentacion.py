#!/usr/bin/env python3
"""Compila presentaciones Reveal.js a PDF mediante Chromium/Brave headless."""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import subprocess
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import quote

from config_presentaciones import (
    OPCIONES_TEMA,
    ROOT,
    seleccionar_presentaciones,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compila una presentación Reveal.js a PDF."
    )
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument(
        "--tema",
        choices=OPCIONES_TEMA,
        help="Tema que se compila; admite ambos con «todos».",
    )
    selection.add_argument(
        "--carpeta",
        type=Path,
        help="Carpeta personalizada dentro de Formato-Presentaciones.",
    )
    parser.add_argument("--salida", type=Path)
    parser.add_argument("--navegador", type=Path, help="Ejecutable Chromium/Chrome/Brave.")
    parser.add_argument(
        "--espera",
        type=float,
        default=8.0,
        help="Presupuesto de tiempo virtual para JavaScript y fuentes, en segundos.",
    )
    return parser.parse_args()


def find_browser(explicit: Path | None) -> str:
    if explicit:
        path = explicit.expanduser().resolve()
        if not path.is_file():
            raise SystemExit(f"No existe el navegador indicado: {path}")
        return str(path)
    names = ("brave-browser", "brave", "chromium", "chromium-browser", "google-chrome")
    for name in names:
        found = shutil.which(name)
        if found:
            return found
    for path in (Path("/opt/brave.com/brave/brave"), Path("/usr/bin/google-chrome")):
        if path.is_file():
            return str(path)
    raise SystemExit("No se encontró Brave, Chromium ni Google Chrome para compilar el PDF.")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format: str, *args: Any) -> None:
        return


def validate_pdf(path: Path, expected_pages: int) -> None:
    if not path.is_file():
        raise RuntimeError(f"El navegador no creó el PDF temporal: {path}")
    if path.stat().st_size < 10_000:
        raise RuntimeError(
            f"El navegador produjo un PDF incompleto ({path.stat().st_size:,} bytes)."
        )
    if not path.read_bytes().startswith(b"%PDF-"):
        raise RuntimeError("El archivo generado no tiene una cabecera PDF.")

    pdfinfo = shutil.which("pdfinfo")
    if not pdfinfo:
        return
    result = subprocess.run(
        [pdfinfo, str(path)], capture_output=True, text=True, check=True
    )
    pages_line = next(
        (line for line in result.stdout.splitlines() if line.startswith("Pages:")), None
    )
    if pages_line and int(pages_line.split(":", 1)[1]) != expected_pages:
        raise RuntimeError(
            f"El PDF tiene {pages_line.split(':', 1)[1].strip()} páginas; "
            f"se esperaban {expected_pages}."
        )


def validate_target(deck: Path) -> tuple[Path, int]:
    reveal = ROOT / "node_modules" / "reveal.js" / "dist" / "reveal.js"
    if not reveal.is_file():
        raise SystemExit(
            "Falta Reveal.js. Active actividad1-a2ic y ejecute "
            "`npm install` dentro de Formato-Presentaciones."
        )
    index = deck / "index.html"
    if not index.is_file():
        raise SystemExit(f"No se encontró {index}")
    try:
        deck_route = deck.relative_to(ROOT.resolve())
    except ValueError as exc:
        raise SystemExit(
            f"La carpeta debe estar dentro de {ROOT} para acceder a los recursos compartidos."
        ) from exc
    expected_pages = index.read_text(encoding="utf-8").count("<section")
    return deck_route, expected_pages


def compile_target(
    deck_route: Path,
    output: Path,
    expected_pages: int,
    browser: str,
    wait_seconds: float,
    port: int,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="a2ic-pdf-", dir=output.parent) as temporary_dir:
        temporary_pdf = Path(temporary_dir) / output.name
        route = quote(deck_route.as_posix(), safe="/")
        url = f"http://127.0.0.1:{port}/{route}/index.html?print-pdf"
        command = [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-background-networking",
            "--no-first-run",
            "--no-default-browser-check",
            "--no-sandbox",
            "--incognito",
            "--no-pdf-header-footer",
            "--run-all-compositor-stages-before-draw",
            f"--virtual-time-budget={max(1000, int(wait_seconds * 1000))}",
            f"--print-to-pdf={temporary_pdf}",
            url,
        ]
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True,
        )
        try:
            stdout, stderr = process.communicate(timeout=max(30, wait_seconds + 20))
        except subprocess.TimeoutExpired as exc:
            os.killpg(process.pid, signal.SIGTERM)
            process.communicate(timeout=5)
            raise RuntimeError("El navegador excedió el tiempo máximo al imprimir.") from exc
        if process.returncode != 0:
            detail = (stderr or stdout).strip()
            raise RuntimeError(f"El navegador no pudo imprimir la presentación: {detail}")
        validate_pdf(temporary_pdf, expected_pages)
        temporary_pdf.replace(output)

    print(f"PDF: {output} ({output.stat().st_size:,} bytes, {expected_pages} páginas)")


def main() -> int:
    args = parse_args()
    if args.carpeta:
        if not args.salida:
            raise SystemExit("--carpeta requiere indicar también --salida.")
        targets = ((args.carpeta.expanduser().resolve(), args.salida.expanduser().resolve()),)
    else:
        selected = seleccionar_presentaciones(args.tema)
        if args.salida and len(selected) != 1:
            raise SystemExit("--salida sólo puede usarse con una presentación.")
        targets = tuple(
            (
                item.carpeta.resolve(),
                args.salida.expanduser().resolve() if args.salida else item.pdf.resolve(),
            )
            for item in selected
        )

    validated = []
    for deck, output in targets:
        deck_route, expected_pages = validate_target(deck)
        validated.append((deck_route, output, expected_pages))
    browser = find_browser(args.navegador)

    handler = partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = int(server.server_address[1])

    try:
        for deck_route, output, expected_pages in validated:
            compile_target(
                deck_route,
                output,
                expected_pages,
                browser,
                args.espera,
                port,
            )
    finally:
        server.shutdown()
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
