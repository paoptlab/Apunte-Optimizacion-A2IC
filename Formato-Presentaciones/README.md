# RP — Presentaciones Reveal.js

Fuentes de las presentaciones de resolución de problemas de EL4114. Ambos decks usan Reveal.js, el mismo tema A2IC, tipografías y KaTeX locales, y un compilador común a PDF.

Estas presentaciones HTML no forman parte del flujo LaTeX de Overleaf ni de la generación automática de PDF LaTeX. Los PDF enlazados aquí son versiones publicadas que se actualizan con las herramientas locales descritas en este documento.

| Tema | Presentación | PDF publicado |
|---|---|---|
| Optimización bajo incertidumbre | [`optimizacion-bajo-incertidumbre/index.html`](./optimizacion-bajo-incertidumbre/index.html) | [`Optimizacion-bajo-incertidumbre.pdf`](../RP-Modelos-Avanzados/Optimizacion-bajo-incertidumbre.pdf) |
| Modelamiento MILP | [`modelamiento-milp/index.html`](./modelamiento-milp/index.html) | [`Modelamiento-MILP.pdf`](../RP-Modelamiento/Modelamiento-MILP.pdf) |

## Entorno y dependencias

El entorno computacional canónico para notebooks y presentaciones es [`../environment.yml`](../environment.yml). Desde la raíz:

```bash
micromamba create -f environment.yml
micromamba activate apunte-optimizacion-a2ic
npm ci --prefix Formato-Presentaciones
```

También se puede actualizar un entorno ya creado con `micromamba env update -f environment.yml --prune`. `package-lock.json` fija Reveal.js 6.0.1; usa `npm ci` para instalar exactamente esa resolución. `node_modules` no se guarda en Git.

La exportación a PDF requiere además un navegador Brave, Chromium o Google Chrome disponible en el sistema. El entorno instala Poppler; si `pdfinfo` está disponible, el script valida también el número de páginas.

## Vista previa en VS Code

La extensión oficial **Live Preview** de Microsoft (`ms-vscode.live-server`) está recomendada y configurada mediante `.vscode/extensions.json` y `.vscode/settings.json`.

1. Abre la raíz del repositorio en VS Code.
2. Abre el `index.html` de la presentación que quieras editar.
3. Ejecuta **Live Preview: Show Preview** desde `Ctrl+Shift+P`.

La vista se actualiza al guardar HTML, CSS o JavaScript. Controles de Reveal.js:

- flechas o espacio: avanzar y retroceder;
- `Esc`: vista general;
- `S`: vista del presentador y notas;
- `F`: pantalla completa.

## Compilar a PDF

Con el entorno activo, desde la raíz:

```bash
python Formato-Presentaciones/compilar_presentacion.py --tema todos
```

También puedes compilar uno solo con `--tema incertidumbre` o `--tema modelamiento`. El script inicia un servidor local temporal, abre la vista `?print-pdf` con el navegador y valida el resultado.

Los destinos son:

- `RP-Modelos-Avanzados/Optimizacion-bajo-incertidumbre.pdf` (17 páginas);
- `RP-Modelamiento/Modelamiento-MILP.pdf` (25 páginas).

Desde `Formato-Presentaciones` también están disponibles `npm run pdf`, `npm run pdf:incertidumbre` y `npm run pdf:modelamiento`.

## Actualizar los resultados de optimización bajo incertidumbre

El notebook `RP-Modelos-Avanzados/Modelos-avanzados-solucion.ipynb` es la fuente de los datos y gráficos. Para regenerar `nb-data.js`:

```bash
python Formato-Presentaciones/actualizar_presentacion.py
```

Para actualizar datos y PDF en una operación:

```bash
python Formato-Presentaciones/actualizar_presentacion.py --pdf
```

Este paso requiere NumPy, `gurobipy` 13.0.2 y una licencia válida de Gurobi. El script respeta `GRB_LICENSE_FILE` y acepta `--licencia /ruta/a/gurobi.lic`.

## Estructura mínima

- `optimizacion-bajo-incertidumbre/index.html`: deck de optimización estocástica;
- `modelamiento-milp/index.html`: deck de formulación MILP;
- `shared/deck.css`: tema y composiciones comunes;
- `shared/presentation-init.js`: configuración compartida de Reveal.js y KaTeX;
- `optimizacion-bajo-incertidumbre/charts.js` y `nb-data.js`: gráficos y datos;
- `compilar_presentacion.py`: compilador PDF común;
- `actualizar_presentacion.py`: actualización de datos;
- `config_presentaciones.py`: registro de decks y destinos.

Consulta el [README general](../README.md) para el catálogo completo y el flujo soportado con Overleaf.
