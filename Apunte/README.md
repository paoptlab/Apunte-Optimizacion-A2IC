# Apunte general

Esta carpeta contiene el apunte principal de EL4114 Optimización.

- [PDF publicado](./main.pdf)
- fuente principal: `Latex/main.tex`;
- capítulos: `Latex/Secciones/`;
- banco de ejercicios y pautas: `Latex/Ejercicios/`;
- imágenes y recursos: `Latex/img/`.

El flujo LaTeX soportado es Overleaf. Importa el repositorio completo mediante GitHub Sync, selecciona el `main.tex` de la raíz como **Main document** y deja activa su línea `\import{Apunte/Latex/}{main.tex}`. No se mantiene actualmente una compilación LaTeX local. Consulta la [guía general](../README.md#trabajar-con-overleaf) para configurar y sincronizar el proyecto.

Después de enviar los cambios de Overleaf a `main`, GitHub Actions recompila y actualiza automáticamente `Apunte/main.pdf`.
