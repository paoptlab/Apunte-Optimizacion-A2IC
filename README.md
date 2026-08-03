# Apunte de Optimización A2IC — EL4114

Material docente del curso EL4114 Optimización: apunte general, ejercicios, auxiliares, resoluciones de problemas, notebooks y presentaciones.

## Estado del soporte

El flujo LaTeX soportado actualmente es **Overleaf + sincronización con GitHub**. No se mantiene por ahora una receta de compilación LaTeX local. Overleaf compila automáticamente el documento seleccionado mientras se edita y, cuando los cambios se envían a `main` en GitHub, GitHub Actions vuelve a generar y publicar los cinco PDF LaTeX del repositorio.

La sincronización entre Overleaf y GitHub no es continua: las operaciones **Pull GitHub changes** y **Push Overleaf changes to GitHub** se ejecutan manualmente desde Overleaf. Esta integración es una función Premium, también disponible para participantes de Overleaf Commons o suscripciones institucionales compatibles. Consulta la [documentación oficial de sincronización con GitHub](https://docs.overleaf.com/integrations-and-add-ons/git-integration-and-github-synchronization/github-synchronization).

## Material disponible

| Material | Fuente o selección | PDF publicado |
|---|---|---|
| Apunte general | `Apunte/Latex/main.tex` | [Apunte/main.pdf](./Apunte/main.pdf) |
| Enunciado auxiliar | `Auxiliar/Latex-Enunciado/main.tex` | [Auxiliar/Enunciado.pdf](./Auxiliar/Enunciado.pdf) |
| Pauta auxiliar | `Auxiliar/Latex-Pauta/main.tex` | [Auxiliar/Pauta.pdf](./Auxiliar/Pauta.pdf) |
| RP de modelamiento | `RP-Modelamiento/Latex/main.tex` | [RP-Modelamiento/main.pdf](./RP-Modelamiento/main.pdf) |
| RP de modelos avanzados | `RP-Modelos-Avanzados/Latex/main.tex` | [RP-Modelos-Avanzados/main.pdf](./RP-Modelos-Avanzados/main.pdf) |
| Presentación de modelamiento MILP | `Formato-Presentaciones/modelamiento-milp/index.html` | [RP-Modelamiento/Modelamiento-MILP.pdf](./RP-Modelamiento/Modelamiento-MILP.pdf) |
| Presentación de optimización bajo incertidumbre | `Formato-Presentaciones/optimizacion-bajo-incertidumbre/index.html` | [RP-Modelos-Avanzados/Optimizacion-bajo-incertidumbre.pdf](./RP-Modelos-Avanzados/Optimizacion-bajo-incertidumbre.pdf) |

[`main.tex`](./main.tex) es el único documento principal de Overleaf. Su comando `\documentoOverleaf` usa `\import` y ajusta las rutas de imágenes para conservar las referencias internas aunque las cinco fuentes reales estén en subcarpetas.

## Trabajar con Overleaf

### 1. Crear el proyecto vinculado

1. En Overleaf, vincula tu cuenta de GitHub desde la configuración de la cuenta.
2. Selecciona **New Project → Import from GitHub**.
3. Autoriza, si corresponde, el acceso de la aplicación de Overleaf a la organización `paoptlab`.
4. Si tienes permisos de escritura, importa `paoptlab/Apunte-Optimizacion-A2IC`. En caso contrario, crea un fork en tu cuenta e importa ese fork.

Overleaf no permite enlazar mediante GitHub Sync un proyecto de Overleaf ya existente con un repositorio de GitHub también existente. Para este repositorio se debe crear el proyecto usando **Import from GitHub**. Tampoco se deben subir sólo las carpetas `Auxiliar/Latex-*`: esos documentos reutilizan ejercicios e imágenes de `Apunte/` y necesitan conservar el árbol completo.

Quienes trabajen desde un fork envían los cambios de Overleaf a la rama predeterminada de su fork y luego abren un pull request hacia `paoptlab`. La publicación automática oficial ocurre en `main` después de integrar ese pull request.

### 2. Elegir qué documento compilar

En **Settings → Compiler** configura:

- **Compiler:** pdfLaTeX;
- **TeX Live:** 2025;
- **Main document:** `main.tex`, situado en la raíz.

Overleaf sólo mantiene un documento activo por proyecto. Para cambiarlo, edita `main.tex`: comenta la línea `\documentoOverleaf` actual y descomenta exactamente una de las otras cuatro. No cambies **Main document**, los dos argumentos de las opciones ni elimines `\RequirePackage{import}`. Los archivos HTML Reveal.js y los notebooks no se ejecutan en Overleaf.

### 3. Sincronizar sin conflictos

Flujo recomendado para cada sesión:

1. Ejecuta **Pull GitHub changes into Overleaf** antes de editar.
2. Modifica las fuentes y confirma que Overleaf recompila el documento activo.
3. Ejecuta **Push Overleaf changes to GitHub**, usando un mensaje de commit descriptivo.
4. Espera a que finalice la acción **Build LaTeX PDFs** en GitHub.
5. Vuelve a ejecutar **Pull GitHub changes into Overleaf** para incorporar el commit automático de los PDF.

Evita editar las mismas líneas simultáneamente en GitHub y Overleaf. Si Overleaf crea una rama por un conflicto, resuélvela mediante un pull request en GitHub y, una vez integrada, vuelve a hacer Pull desde Overleaf. La integración no soporta submódulos ni Git LFS —este repositorio no los usa— y sincroniza únicamente la rama predeterminada; las demás ramas y los pull requests se gestionan en GitHub.

## Generación automática de PDF

El workflow [`.github/workflows/build-pdfs.yml`](./.github/workflows/build-pdfs.yml) se ejecuta después de cada push que no modifique únicamente PDF en `main`. Usa pdfLaTeX y TeX Live 2025, la versión estable disponible en Overleaf, para validar el selector `main.tex` y compilar directamente las cinco fuentes de la tabla. Así verifica tanto la selección activa como todos los demás documentos y sus rutas.

Si cambió algún resultado, `github-actions[bot]` crea el commit:

```text
docs: update compiled LaTeX PDFs [skip ci]
```

Los dos PDF de las presentaciones Reveal.js son versiones publicadas, pero no forman parte de esta automatización LaTeX.

## Clonar el repositorio

Para descargar todos los materiales y trabajar con notebooks o presentaciones fuera de Overleaf:

```bash
git clone https://github.com/paoptlab/Apunte-Optimizacion-A2IC.git
cd Apunte-Optimizacion-A2IC
```

El archivo [`environment.yml`](./environment.yml) describe un entorno computacional compatible para el repositorio. No instala LaTeX ni cubre compilación local: los documentos `.tex` se compilan en Overleaf y en GitHub Actions.

Con micromamba:

```bash
micromamba create -f environment.yml
micromamba activate apunte-optimizacion-a2ic
npm ci --prefix Formato-Presentaciones
```

Con conda:

```bash
conda env create -f environment.yml
conda activate apunte-optimizacion-a2ic
npm ci --prefix Formato-Presentaciones
```

`npm ci` instala exactamente Reveal.js 6.0.1 según `package-lock.json`; `node_modules` no se versiona.

El entorno incluye Python 3.11, Node.js 22, JupyterLab 4, NumPy 2, Plotly 6, Poppler y `gurobipy` 13.0.2. Para abrir los notebooks:

```bash
jupyter lab RP-Modelos-Avanzados
```

Las celdas que importan `google.colab` o usan `/content/gurobi.lic` son exclusivas de Google Colab. En Jupyter local, configura primero una licencia mediante `GRB_LICENSE_FILE` y reemplaza esa celda por `import gurobipy as grb`; no omitas el import. Cambia también `pio.renderers.default = "colab"` por `"notebook"` o `"browser"`. La licencia nunca debe añadirse a Git.

Las herramientas HTML y sus instrucciones están documentadas en [Formato-Presentaciones/README.md](./Formato-Presentaciones/README.md).

## Estructura

- [`Apunte/`](./Apunte/README.md): capítulos, ejercicios, imágenes y PDF general;
- [`Auxiliar/`](./Auxiliar/README.md): enunciado y pauta que reutilizan el banco de ejercicios;
- [`RP-Modelamiento/`](./RP-Modelamiento/README.md): guía y presentación de modelamiento MILP;
- [`RP-Modelos-Avanzados/`](./RP-Modelos-Avanzados/README.md): guía, notebooks y presentación de optimización bajo incertidumbre;
- [`Formato-Presentaciones/`](./Formato-Presentaciones/README.md): fuentes Reveal.js y utilidades auxiliares;
- [`main.tex`](./main.tex): selector del documento que compila Overleaf;
- [`.github/workflows/build-pdfs.yml`](./.github/workflows/build-pdfs.yml): publicación automática de los PDF LaTeX.
