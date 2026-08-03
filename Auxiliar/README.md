# Auxiliar

Material del auxiliar de EL4114 Optimización:

- [Enunciado publicado](./Enunciado.pdf), cuya fuente es `Latex-Enunciado/main.tex`;
- [Pauta publicada](./Pauta.pdf), cuya fuente es `Latex-Pauta/main.tex`.

Ambos documentos reutilizan ejercicios, soluciones e imágenes de `../Apunte/Latex/` mediante rutas relativas. Por eso no deben importarse como carpetas aisladas en Overleaf: sincroniza el repositorio completo.

El flujo LaTeX soportado es Overleaf. Selecciona el `main.tex` de la raíz como **Main document** y deja activa la línea `\import{Auxiliar/Latex-Enunciado/}{main.tex}` o `\import{Auxiliar/Latex-Pauta/}{main.tex}`, según el PDF que quieras editar. Consulta la [guía general](../README.md#trabajar-con-overleaf).

Después de enviar los cambios de Overleaf a `main`, GitHub Actions recompila y publica automáticamente ambos PDF.
