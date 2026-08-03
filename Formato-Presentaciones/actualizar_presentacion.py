#!/usr/bin/env python3
"""Actualiza los datos de optimización bajo incertidumbre y los PDF A2IC."""

from __future__ import annotations

import argparse
import ast
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config_presentaciones import (
    OPCIONES_TEMA,
    PRESENTACIONES,
    ROOT,
    seleccionar_presentaciones,
)

DEFAULT_NOTEBOOK = PRESENTACIONES["incertidumbre"].notebook

CELL_MARKERS = (
    ("datos del sistema", ("# ---------------- DATOS DEL SISTEMA",)),
    ("modelo determinista", ("def resolver_uc_reserva(",)),
    ("resultados de reservas", ("# Resolver con distintos margenes de reserva",)),
    ("generador SAA", ("def generar_escenarios_SAA(",)),
    ("modelo estocástico", ("def resolver_uc(D_in",)),
    ("resultados SAA", ("# Resolver SAA con distintos N",)),
    ("oráculo OOS", ("# Generar escenarios de evaluacion out-of-sample",)),
    ("evaluación OOS", ("# Evaluar TODOS los modelos",)),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Actualiza datos y PDF A2IC.")
    parser.add_argument(
        "--tema",
        choices=OPCIONES_TEMA,
        help="Tema que se actualiza; por defecto usa optimización bajo incertidumbre.",
    )
    parser.add_argument(
        "--notebook",
        type=Path,
        help=f"Notebook de optimización bajo incertidumbre (por defecto: {DEFAULT_NOTEBOOK}).",
    )
    parser.add_argument(
        "--destino",
        type=Path,
        help="Carpeta personalizada; sólo puede usarse con un tema.",
    )
    parser.add_argument(
        "--licencia",
        type=Path,
        help="Ruta opcional a gurobi.lic; también se respeta GRB_LICENSE_FILE.",
    )
    parser.add_argument(
        "--pdf",
        action="store_true",
        help="Además recompila el PDF de cada tema seleccionado.",
    )
    parser.add_argument(
        "--salida-pdf",
        type=Path,
        help="Destino PDF personalizado; sólo puede usarse con un tema.",
    )
    return parser.parse_args()


def configure_license(explicit: Path | None) -> None:
    if explicit:
        license_path = explicit.expanduser().resolve()
        if not license_path.is_file():
            raise SystemExit(f"No existe la licencia indicada: {license_path}")
        os.environ["GRB_LICENSE_FILE"] = str(license_path)
        return

    if os.environ.get("GRB_LICENSE_FILE"):
        return

    # Conveniencias locales; fuera de este entorno simplemente se usa la
    # configuración normal de Gurobi.
    candidates = (ROOT / "gurobi.lic", Path("/mnt/Datos/gurobi.lic"))
    for candidate in candidates:
        if candidate.is_file():
            os.environ["GRB_LICENSE_FILE"] = str(candidate)
            print(f"Licencia Gurobi detectada: {candidate}")
            return


def code_cells(notebook: Path) -> list[str]:
    try:
        document = json.loads(notebook.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"No se encontró el notebook: {notebook}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"El notebook no contiene JSON válido: {exc}") from exc

    return [
        "".join(cell.get("source", []))
        for cell in document.get("cells", [])
        if cell.get("cell_type") == "code"
    ]


def select_sources(cells: list[str]) -> dict[str, str]:
    selected: dict[str, str] = {}
    for label, markers in CELL_MARKERS:
        matches = [source for source in cells if all(marker in source for marker in markers)]
        if len(matches) != 1:
            raise SystemExit(
                f"Se esperaba una celda para «{label}» y se encontraron {len(matches)}. "
                "Conserve el encabezado/marcador de esa celda al editar el notebook."
            )
        selected[label] = matches[0]
    return selected


def execute_notebook_sources(notebook: Path) -> tuple[dict[str, Any], dict[str, str]]:
    try:
        import numpy as np
        import gurobipy as grb
    except ImportError as exc:
        raise SystemExit(
            "Faltan dependencias. Ejecute este script con un Python que tenga "
            "numpy y gurobipy instalados."
        ) from exc

    selected = select_sources(code_cells(notebook))
    namespace: dict[str, Any] = {
        "__name__": "__actualizacion_presentacion__",
        "np": np,
        "grb": grb,
    }
    for label, _markers in CELL_MARKERS:
        source = selected[label]
        print(f"Ejecutando: {label}...")
        try:
            exec(compile(source, f"{notebook.name}::{label}", "exec"), namespace)
        except Exception as exc:
            raise RuntimeError(f"Falló la celda «{label}»: {exc}") from exc
    return namespace, selected


def literal_tuple_assignment(source: str, names: tuple[str, ...]) -> tuple[float, ...]:
    """Extrae una asignación literal como ``a, b = 1, 2`` desde una celda."""
    for node in ast.walk(ast.parse(source)):
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if not isinstance(target, (ast.Tuple, ast.List)):
            continue
        target_names = tuple(
            item.id for item in target.elts if isinstance(item, ast.Name)
        )
        if target_names == names:
            values = ast.literal_eval(node.value)
            return tuple(float(value) for value in values)
    raise RuntimeError(f"No se encontró la asignación literal de {', '.join(names)}")


def call_keyword(source: str, function_name: str, keyword: str) -> int | float | None:
    for node in ast.walk(ast.parse(source)):
        if not isinstance(node, ast.Call):
            continue
        called = node.func.id if isinstance(node.func, ast.Name) else None
        if called != function_name:
            continue
        for item in node.keywords:
            if item.arg == keyword:
                value = ast.literal_eval(item.value)
                if isinstance(value, (int, float)):
                    return value
    return None


def clean_number(value: Any) -> int | float:
    number = float(value)
    if abs(number) < 1e-9:
        return 0
    nearest = round(number)
    if abs(number - nearest) < 1e-10:
        return int(nearest)
    return number


def numeric_array(values: Any) -> list[int | float]:
    return [clean_number(value) for value in values]


def percent(alpha: float) -> int | float:
    return clean_number(float(alpha) * 100)


def assert_optimal(results: dict[Any, dict[str, Any]], label: str) -> None:
    failed = [key for key, result in results.items() if result.get("status") != "Optimal"]
    if failed:
        raise RuntimeError(f"Resultados no óptimos en {label}: {failed}")


def build_payload(ns: dict[str, Any], sources: dict[str, str], notebook: Path) -> dict[str, Any]:
    required = (
        "T", "G", "Pmin", "Pmax", "cvar", "cnl", "cstart", "VOLL",
        "D_base", "Psol_base", "alphas", "resultados_reserva", "Ns",
        "resultados_saa", "N_eval", "evaluacion", "WS",
    )
    missing = [name for name in required if name not in ns]
    if missing:
        raise RuntimeError("Faltan variables después de ejecutar el notebook: " + ", ".join(missing))

    T = list(ns["T"])
    G = list(ns["G"])
    alphas = sorted(float(value) for value in ns["alphas"])
    Ns = sorted(int(value) for value in ns["Ns"])
    reserves = ns["resultados_reserva"]
    saa = ns["resultados_saa"]
    evaluation = ns["evaluacion"]
    assert_optimal(reserves, "reservas")
    assert_optimal({N: saa[N]["res"] for N in Ns}, "SAA")

    low_alpha, high_alpha = alphas[0], alphas[-1]
    low_N, high_N = Ns[0], Ns[-1]
    generator_names = {
        "G1": "Carbón base",
        "G2": "Intermedia",
        "G3": "Peaker",
    }

    def commitment(result: dict[str, Any]) -> dict[str, list[int]]:
        return {
            g: [int(round(result["u"][(g, t)])) for t in T]
            for g in G
        }

    def dispatch(result: dict[str, Any]) -> dict[str, Any]:
        values = {
            g: numeric_array(result["p"][(g, t)] for t in T)
            for g in G
        }
        values.update(
            solar=numeric_array(result["ps"][t] for t in T),
            ens=numeric_array(result["ell"][t] for t in T),
            demand=numeric_array(ns["D_base"]),
        )
        return values

    sigma_D, sigma_S, rho = literal_tuple_assignment(
        sources["generador SAA"], ("sigma_D", "sigma_S", "rho")
    )
    training_seed = call_keyword(sources["resultados SAA"], "generar_escenarios_SAA", "seed")
    evaluation_seed = call_keyword(sources["oráculo OOS"], "generar_escenarios_SAA", "seed")

    reserve_rows = []
    for alpha in alphas:
        result = reserves[alpha]
        reserve_rows.append(
            {
                "alpha": percent(alpha),
                "cost": clean_number(result["obj"]),
                "onHours": int(sum(result["u"][(g, t)] for g in G for t in T)),
                "ens": clean_number(sum(result["ell"][t] for t in T)),
            }
        )

    insample_rows = []
    for N in Ns:
        result = saa[N]["res"]
        insample_rows.append(
            {
                "N": N,
                "cost": clean_number(result["obj"]),
                "onHours": int(sum(result["u"][(g, t)] for g in G for t in T)),
            }
        )

    oracle_rows = []
    for name, values in sorted(evaluation.items(), key=lambda item: item[1]["costo_oos"]):
        oracle_rows.append(
            {
                "name": name,
                "cost": clean_number(values["costo_oos"]),
                "ens": clean_number(values["ens_esperada"]),
                "gap": clean_number(values["gap_pct"]),
                "grp": "res" if name.startswith("Reserva") else "saa",
            }
        )

    high_samples = saa[high_N]["muestras"]
    payload = {
        "meta": {
            "schemaVersion": 2,
            "sourceNotebook": notebook.name,
            "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "trainingSeed": training_seed,
            "evaluationSeed": evaluation_seed,
            "N_eval": int(ns["N_eval"]),
            "reserveLowPct": percent(low_alpha),
            "reserveHighPct": percent(high_alpha),
            "sampleLowN": low_N,
            "sampleHighN": high_N,
            "scenarioSampleN": high_N,
        },
        "T": T,
        "gens": [
            {
                "id": g,
                "name": generator_names.get(g, g),
                "Pmin": clean_number(ns["Pmin"][g]),
                "Pmax": clean_number(ns["Pmax"][g]),
                "cvar": clean_number(ns["cvar"][g]),
                "cnl": clean_number(ns["cnl"][g]),
                "cstart": clean_number(ns["cstart"][g]),
            }
            for g in G
        ],
        "VOLL": clean_number(ns["VOLL"]),
        "D_base": numeric_array(ns["D_base"]),
        "Psol_base": numeric_array(ns["Psol_base"]),
        "cap": clean_number(sum(ns["Pmax"].values())),
        "Dmax": clean_number(max(ns["D_base"])),
        "Smax": clean_number(max(ns["Psol_base"])),
        "det": {
            "r0": dispatch(reserves[low_alpha]),
            "r20": dispatch(reserves[high_alpha]),
        },
        "commit": {
            "r0": commitment(reserves[low_alpha]),
            "r20": commitment(reserves[high_alpha]),
            "saa2": commitment(saa[low_N]["res"]),
            "saa100": commitment(saa[high_N]["res"]),
        },
        "reserves": reserve_rows,
        "saaInsample": insample_rows,
        "oracle": {"WS": clean_number(ns["WS"]), "rows": oracle_rows},
        "converge": {
            "N": Ns,
            "cost": [clean_number(evaluation[f"SAA N={N}"]["costo_oos"]) for N in Ns],
            "ens": [clean_number(evaluation[f"SAA N={N}"]["ens_esperada"]) for N in Ns],
        },
        "saaPts": [numeric_array(point) for point in high_samples],
        "saaSigma": {"D": sigma_D, "S": sigma_S, "rho": rho},
    }
    return payload


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(path)


def export_payload(payload: dict[str, Any], destination: Path) -> None:
    compact = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    atomic_write(destination / "nb-data.js", f"window.NB = {compact};\n")
    print(f"Datos JavaScript: {destination / 'nb-data.js'}")


def run_helper(script: Path, *arguments: str) -> None:
    command = [sys.executable, str(script), *arguments]
    subprocess.run(command, check=True)


def main() -> int:
    args = parse_args()
    selected = seleccionar_presentaciones(args.tema)
    if len(selected) != 1 and (args.destino or args.salida_pdf):
        raise SystemExit("--destino y --salida-pdf sólo pueden usarse con un tema.")

    includes_uncertainty = any(item.tema == "incertidumbre" for item in selected)
    if not includes_uncertainty and (args.notebook or args.licencia):
        raise SystemExit(
            "--notebook y --licencia sólo se aplican a Optimización bajo incertidumbre."
        )
    if not includes_uncertainty and not args.pdf:
        raise SystemExit("Modelamiento MILP no tiene datos externos; use --pdf para compilarlo.")

    targets = []
    for item in selected:
        deck = (
            args.destino.expanduser().resolve()
            if args.destino
            else item.carpeta.resolve()
        )
        pdf = (
            args.salida_pdf.expanduser().resolve()
            if args.salida_pdf
            else item.pdf.resolve()
        )
        targets.append((item, deck, pdf))

    if includes_uncertainty:
        uncertainty = next(
            target for target in targets if target[0].tema == "incertidumbre"
        )
        notebook = (
            args.notebook.expanduser().resolve()
            if args.notebook
            else DEFAULT_NOTEBOOK.resolve()
        )
        configure_license(args.licencia)
        namespace, sources = execute_notebook_sources(notebook)
        payload = build_payload(namespace, sources, notebook)
        export_payload(payload, uncertainty[1])

    if any(item.tema == "modelamiento" for item, _deck, _pdf in targets):
        print("Modelamiento MILP: no tiene datos externos.")

    if args.pdf:
        for _item, deck, pdf in targets:
            run_helper(
                ROOT / "compilar_presentacion.py",
                "--carpeta",
                str(deck),
                "--salida",
                str(pdf),
            )

    print("Actualización terminada correctamente.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit("Actualización cancelada.")
