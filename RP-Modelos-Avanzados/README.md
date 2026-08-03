# RP — Modelos avanzados

Material de la resolución de problemas sobre optimización bajo incertidumbre.

## Guía LaTeX

- [PDF publicado](./main.pdf)
- fuente principal: `Latex/main.tex`;
- selección en el `main.tex` raíz: `\import{RP-Modelos-Avanzados/Latex/}{main.tex}`.

El flujo LaTeX soportado es Overleaf. Importa el repositorio completo mediante GitHub Sync, usa el `main.tex` de la raíz como **Main document**, activa la línea indicada y configura pdfLaTeX con TeX Live 2025. Al enviar los cambios a `main`, GitHub Actions actualiza automáticamente `RP-Modelos-Avanzados/main.pdf`. Consulta la [guía general de Overleaf](../README.md#trabajar-con-overleaf).

## Notebooks

- [Actividad](./Modelos-avanzados.ipynb)
- [Solución](./Modelos-avanzados-solucion.ipynb)

Para Jupyter local, crea el entorno raíz `apunte-optimizacion-a2ic`, configura una licencia mediante `GRB_LICENSE_FILE` y reemplaza la celda específica de Google Colab por `import gurobipy as grb`. Cambia el renderer de Plotly de `"colab"` a `"notebook"` o `"browser"`. La licencia no se guarda en el repositorio.

## Presentación: Optimización bajo incertidumbre

- [PDF publicado](./Optimizacion-bajo-incertidumbre.pdf)
- [presentación HTML editable](../Formato-Presentaciones/optimizacion-bajo-incertidumbre/index.html)
- [instrucciones de visualización y edición](../Formato-Presentaciones/optimizacion-bajo-incertidumbre/README.md)

La presentación Reveal.js no se ejecuta en Overleaf. Desde la raíz del repositorio, los gráficos y cifras se regeneran desde el notebook solución con:

```bash
python Formato-Presentaciones/actualizar_presentacion.py --pdf
```

La presentación consume directamente el `nb-data.js` generado. Consulta [`Formato-Presentaciones`](../Formato-Presentaciones/README.md) para instalar dependencias y usar sus herramientas.
