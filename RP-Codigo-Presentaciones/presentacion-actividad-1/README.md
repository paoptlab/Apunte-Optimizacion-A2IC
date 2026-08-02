# Actividad 1 A2IC — presentación HTML

Presentación interactiva de 17 diapositivas sobre optimización bajo incertidumbre. Las ecuaciones se escriben en LaTeX y se renderizan con KaTeX 0.16.9 incluido localmente, por lo que las fórmulas no requieren Internet.

## PDF

[Ver o descargar la presentación en PDF](../../RP-Modelos-Avanzados/Actividad-1-A2IC.pdf). GitHub puede previsualizar este archivo directamente desde el repositorio. Por organización, el PDF compilado se guarda junto al RP de Modelos Avanzados; las fuentes editables permanecen en `RP-Presentaciones`.

## Visualizar

Desde la raíz del repositorio:

```bash
python3 -m http.server 8000 --directory RP-Presentaciones/presentacion-actividad-1
```

Luego abre `http://localhost:8000/`. También puedes abrir `index.html` directamente, aunque un servidor local evita restricciones del navegador.

`standalone.html` es una copia autónoma y sin conexión para visualización. La versión editable es `index.html`.

## Actualizar resultados desde el notebook

El notebook [`Modelos-avanzados-solucion.ipynb`](../../RP-Modelos-Avanzados/Modelos-avanzados-solucion.ipynb) es la fuente de verdad. Después de cambiar datos, semillas o modelos, guarda el notebook y ejecuta desde la raíz del repositorio:

```bash
python RP-Presentaciones/actualizar_presentacion.py
```

El comando vuelve a ejecutar sólo las celdas numéricas necesarias —sin las celdas de instalación de Colab ni los gráficos Plotly— y actualiza:

- `datos-presentacion.json`, que permite recargar los resultados manualmente en una presentación ya abierta;
- `nb-data.js`, que carga los resultados al abrir la presentación;
- `standalone.html`, la copia autónoma.

Debe ejecutarse con un entorno Python que contenga `numpy` y `gurobipy`, y con una licencia de Gurobi válida. Se respeta `GRB_LICENSE_FILE`; también puedes indicarla explícitamente:

```bash
python RP-Presentaciones/actualizar_presentacion.py --licencia /ruta/a/gurobi.lic
```

Si la presentación está abierta mediante el servidor local, pulsa `E` y luego **Actualizar datos y gráficos**. El botón vuelve a leer el JSON sin recargar la página, por lo que conserva las ediciones de texto que aún están en el navegador. Por seguridad del navegador esta recarga no funciona al abrir `index.html` mediante `file://`.

Para actualizar los datos y recompilar el PDF en una sola operación:

```bash
python RP-Presentaciones/actualizar_presentacion.py --pdf
```

La compilación PDF requiere Brave, Chromium o Google Chrome. También puede ejecutarse de forma independiente con `python RP-Presentaciones/compilar_presentacion.py`; por defecto deja el archivo en `RP-Modelos-Avanzados/Actividad-1-A2IC.pdf`.

## Editar

- Pulsa **Editar presentación** (o la tecla `E`).
- El panel muestra el HTML de la diapositiva activa.
- Usa `\\(...\\)` para ecuaciones inline y `\\[...\\]` para ecuaciones en bloque.
- **Aplicar a la diapositiva** actualiza la vista.
- **Guardar en navegador** conserva los cambios mediante `localStorage`.
- **Descargar HTML** crea una copia editada; mantenla en esta carpeta para que encuentre CSS, JavaScript y logos.

También puedes editar directamente:

- `index.html`: contenido y orden de las diapositivas.
- `deck.css`: diseño visual y composición.
- `charts.js`: gráficos SVG e interacciones.
- `datos-presentacion.json` y `nb-data.js`: datos generados; conviene actualizarlos mediante el script en vez de editarlos a mano.
- `editor.js` y `editor.css`: editor integrado.

## Controles de presentación

- Flechas, `Page Up` / `Page Down`, espacio: navegar.
- `Home` / `End`: primera o última diapositiva.
- `1`–`9` y `0`: saltar a una diapositiva.
- `R`: volver al inicio.
- `E`: abrir o cerrar el editor.
- El menú de miniaturas permite reordenar, duplicar, omitir o eliminar diapositivas.
- Imprimir desde el navegador genera una página por diapositiva.
