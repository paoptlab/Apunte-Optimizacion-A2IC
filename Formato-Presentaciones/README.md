# RP — Presentaciones Reveal.js

Fuentes de las presentaciones de resolución de problemas de EL4114. Ambos decks usan Reveal.js, el mismo tema A2IC, tipografías y KaTeX locales, y un compilador común a PDF.

| Tema | Presentación | PDF |
|---|---|---|
| Optimización bajo incertidumbre | [`optimizacion-bajo-incertidumbre/index.html`](./optimizacion-bajo-incertidumbre/index.html) | [`Optimizacion-bajo-incertidumbre.pdf`](../RP-Modelos-Avanzados/Optimizacion-bajo-incertidumbre.pdf) |
| Modelamiento MILP | [`modelamiento-milp/index.html`](./modelamiento-milp/index.html) | [`Modelamiento-MILP.pdf`](../RP-Modelamiento/Modelamiento-MILP.pdf) |

## Entorno y dependencias

Las dependencias se administran dentro del entorno mamba `actividad1-a2ic`. Para reproducir o actualizar el entorno:

```bash
micromamba env update -n actividad1-a2ic -f Formato-Presentaciones/environment.yml
micromamba activate actividad1-a2ic
cd Formato-Presentaciones
npm install
```

`package-lock.json` fija la versión de Reveal.js. `node_modules` se genera con `npm install` y no se guarda en Git.

## Vista previa en VS Code

La extensión oficial **Live Preview** de Microsoft (`ms-vscode.live-server`) está recomendada y configurada para este proyecto mediante `.vscode/extensions.json` y `.vscode/settings.json`.

1. Abre la raíz del repositorio en VS Code.
2. Abre el `index.html` de la presentación que quieras editar.
3. Abre la paleta de comandos con `Ctrl+Shift+P`.
4. Ejecuta **Live Preview: Show Preview**.

La vista se actualiza cada vez que guardas el HTML, CSS o JavaScript. Optimización bajo incertidumbre es la ruta inicial configurada; para ver Modelamiento MILP basta con abrir su `index.html` y volver a ejecutar el mismo comando.

Controles de Reveal.js:

- flechas o espacio: avanzar y retroceder;
- `Esc`: vista general de diapositivas;
- `S`: vista del presentador y notas;
- `F`: pantalla completa.

## Compilar a PDF

Con el entorno activo, compila ambos PDF desde la raíz del repositorio:

```bash
python Formato-Presentaciones/compilar_presentacion.py --tema todos
```

También puedes compilar uno solo con `--tema incertidumbre` o `--tema modelamiento`. El script inicia un servidor local temporal, abre la vista `?print-pdf` de Reveal.js con Brave/Chromium y valida la cabecera y el número de páginas del resultado.

Los destinos son:

- `RP-Modelos-Avanzados/Optimizacion-bajo-incertidumbre.pdf` (17 páginas);
- `RP-Modelamiento/Modelamiento-MILP.pdf` (25 páginas).

Desde `Formato-Presentaciones` también están disponibles `npm run pdf`, `npm run pdf:incertidumbre` y `npm run pdf:modelamiento`.

## Actualizar los resultados de optimización bajo incertidumbre

El notebook `RP-Modelos-Avanzados/Modelos-avanzados-solucion.ipynb` es la fuente de los datos y gráficos. Para regenerar `nb-data.js`:

```bash
python Formato-Presentaciones/actualizar_presentacion.py
```

Para actualizar los datos y recompilar el PDF en una operación:

```bash
python Formato-Presentaciones/actualizar_presentacion.py --pdf
```

Este paso requiere `numpy`, `gurobipy` y una licencia válida de Gurobi. El script respeta `GRB_LICENSE_FILE` y también acepta `--licencia /ruta/a/gurobi.lic`.

## Estructura mínima

- `optimizacion-bajo-incertidumbre/index.html`: deck de optimización estocástica;
- `modelamiento-milp/index.html`: deck de formulación MILP;
- `shared/deck.css`: tema y composiciones comunes;
- `shared/presentation-init.js`: configuración compartida de Reveal.js y KaTeX;
- `optimizacion-bajo-incertidumbre/charts.js` y `nb-data.js`: gráficos y datos del tema;
- `compilar_presentacion.py`: compilador PDF común;
- `actualizar_presentacion.py`: actualización de datos de optimización bajo incertidumbre;
- `config_presentaciones.py`: registro de decks y destinos.
