#!/usr/bin/env python3
"""Compila la presentación HTML a PDF mediante Chromium/Brave headless."""

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


ROOT = Path(__file__).resolve().parent
DEFAULT_DECK = ROOT / "presentacion-actividad-1"
DEFAULT_PDF = ROOT.parent / "RP-Modelos-Avanzados" / "Actividad-1-A2IC.pdf"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compila index.html a un PDF de diapositivas.")
    parser.add_argument("--carpeta", type=Path, default=DEFAULT_DECK)
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
    if not path.is_file() or path.stat().st_size < 10_000:
        raise RuntimeError("El navegador no produjo un PDF válido.")
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


def main() -> int:
    args = parse_args()
    deck = args.carpeta.expanduser().resolve()
    index = deck / "index.html"
    if not index.is_file():
        raise SystemExit(f"No se encontró {index}")
    output = args.salida.expanduser().resolve() if args.salida else DEFAULT_PDF
    browser = find_browser(args.navegador)
    expected_pages = index.read_text(encoding="utf-8").count("<section")

    handler = partial(QuietHandler, directory=str(deck))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = int(server.server_address[1])

    try:
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="a2ic-pdf-", dir=output.parent) as temporary_dir:
            temporary_pdf = Path(temporary_dir) / output.name
            url = f"http://127.0.0.1:{port}/index.html?pdf=1"
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
                f"--virtual-time-budget={max(1000, int(args.espera * 1000))}",
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
                stdout, stderr = process.communicate(timeout=max(30, args.espera + 20))
            except subprocess.TimeoutExpired as exc:
                os.killpg(process.pid, signal.SIGTERM)
                process.communicate(timeout=5)
                raise RuntimeError("El navegador excedió el tiempo máximo al imprimir.") from exc
            if process.returncode != 0:
                detail = (stderr or stdout).strip()
                raise RuntimeError(f"El navegador no pudo imprimir la presentación: {detail}")
            validate_pdf(temporary_pdf, expected_pages)
            temporary_pdf.replace(output)
    finally:
        server.shutdown()
        server.server_close()

    print(f"PDF: {output} ({output.stat().st_size:,} bytes, {expected_pages} páginas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
