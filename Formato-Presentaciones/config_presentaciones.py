#!/usr/bin/env python3
"""Registro común de las presentaciones y sus artefactos derivados."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Presentacion:
    tema: str
    nombre: str
    carpeta: Path
    pdf: Path
    notebook: Path | None = None


PRESENTACIONES = {
    "incertidumbre": Presentacion(
        tema="incertidumbre",
        nombre="Optimización bajo incertidumbre",
        carpeta=ROOT / "optimizacion-bajo-incertidumbre",
        pdf=(
            ROOT.parent
            / "RP-Modelos-Avanzados"
            / "Optimizacion-bajo-incertidumbre.pdf"
        ),
        notebook=(
            ROOT.parent
            / "RP-Modelos-Avanzados"
            / "Modelos-avanzados-solucion.ipynb"
        ),
    ),
    "modelamiento": Presentacion(
        tema="modelamiento",
        nombre="Modelamiento MILP",
        carpeta=ROOT / "modelamiento-milp",
        pdf=ROOT.parent / "RP-Modelamiento" / "Modelamiento-MILP.pdf",
    ),
}

OPCIONES_TEMA = ("incertidumbre", "modelamiento", "todos")


def seleccionar_presentaciones(tema: str | None) -> tuple[Presentacion, ...]:
    """Resuelve el selector CLI; por defecto usa optimización bajo incertidumbre."""
    selector = tema or "incertidumbre"
    if selector == "todos":
        return tuple(PRESENTACIONES.values())
    try:
        return (PRESENTACIONES[selector],)
    except KeyError as exc:
        raise ValueError(f"Tema no reconocido: {selector}") from exc
