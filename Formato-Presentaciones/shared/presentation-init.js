/* Inicialización común de Reveal.js y KaTeX para todas las presentaciones. */
(function () {
  'use strict';

  function renderTex() {
    if (!window.renderMathInElement) return false;
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      ignoredClasses: ['code', 'out'],
      throwOnError: false
    });
    return true;
  }

  async function initialize() {
    if (!window.Reveal) {
      throw new Error('No se pudo cargar Reveal.js. Ejecuta npm install en Formato-Presentaciones.');
    }

    renderTex();

    const plugins = window.RevealNotes ? [window.RevealNotes] : [];
    const isPdfView = /(?:^|[?&])print-pdf(?:[=&]|$)/i.test(window.location.search);
    const nativeRequestAnimationFrame = window.requestAnimationFrame;
    let pdfReady = Promise.resolve();

    if (isPdfView) {
      // Chromium puede iniciar la impresión inmediatamente tras `load`. Reveal 6
      // prepara cada página en varios frames; en modo headless los completamos en
      // el mismo ciclo y esperamos su señal antes de declarar lista la vista.
      window.requestAnimationFrame = function (callback) {
        callback(window.performance.now());
        return 0;
      };
      pdfReady = new Promise(function (resolve) {
        window.Reveal.on('pdf-ready', resolve);
      });
    }

    try {
      await window.Reveal.initialize({
        width: 1920,
        height: 1080,
        margin: 0,
        center: false,
        hash: true,
        navigationMode: 'linear',
        controls: true,
        controlsTutorial: false,
        progress: true,
        slideNumber: false,
        transition: 'none',
        backgroundTransition: 'none',
        pdfMaxPagesPerSlide: 1,
        pdfSeparateFragments: false,
        plugins
      });

      await pdfReady;
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      window.Reveal.layout();
      document.documentElement.dataset.presentationReady = 'true';
    } finally {
      if (isPdfView) window.requestAnimationFrame = nativeRequestAnimationFrame;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.presentationReady = initialize();
    }, { once: true });
  } else {
    window.presentationReady = initialize();
  }
})();
