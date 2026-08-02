/* Editor local: fuente HTML/LaTeX por diapositiva, ajustes y persistencia. */
(function () {
  'use strict';

  const STORAGE_KEY = 'a2ic.presentation.v1';
  const RUNTIME_ATTRS = new Set([
    'data-deck-slide',
    'data-deck-active',
    'data-deck-last-visible',
    'data-om-validate'
  ]);
  const BASE_TYPE = { title: 60, subtitle: 40, lead: 32, body: 28, small: 24 };
  const ACCENT_SOFT = {
    '#2a9d8f': '#8fcfc4',
    '#1f7d8c': '#9ccdd6',
    '#3f8a6e': '#9bd0bb',
    '#c98a2b': '#e7c887'
  };

  const deck = document.querySelector('deck-stage');
  if (!deck) return;

  const sourceById = new Map();
  let nextId = 1;
  let sourceDirty = false;
  let settings = {
    accent: document.documentElement.dataset.a2icAccent || '#2a9d8f',
    textScale: Number(document.documentElement.dataset.a2icTextScale) || 1,
    headingFont: document.documentElement.dataset.a2icHeadingFont || 'serif'
  };

  function slides() {
    return Array.from(deck.children).filter((node) => node.tagName === 'SECTION');
  }

  function freshId() {
    let id;
    do id = 'slide-' + String(nextId++).padStart(2, '0');
    while (slides().some((slide) => slide.dataset.editorId === id));
    return id;
  }

  function ensureId(slide) {
    if (!slide.dataset.editorId) slide.dataset.editorId = freshId();
    const match = slide.dataset.editorId.match(/(\d+)$/);
    if (match) nextId = Math.max(nextId, Number(match[1]) + 1);
    return slide.dataset.editorId;
  }

  function cleanAttributes(slide) {
    const attrs = {};
    Array.from(slide.attributes).forEach((attr) => {
      if (!RUNTIME_ATTRS.has(attr.name)) attrs[attr.name] = attr.value;
    });
    return attrs;
  }

  function recordFor(slide) {
    const id = ensureId(slide);
    return {
      id,
      attrs: cleanAttributes(slide),
      html: sourceById.get(id) ?? slide.innerHTML
    };
  }

  function makeSlide(record) {
    const slide = document.createElement('section');
    Object.entries(record.attrs || {}).forEach(([name, value]) => {
      if (!RUNTIME_ATTRS.has(name)) slide.setAttribute(name, value);
    });
    slide.dataset.editorId = record.id || freshId();
    slide.innerHTML = record.html || '';
    sourceById.set(slide.dataset.editorId, slide.innerHTML);
    return slide;
  }

  const originalRecords = slides().map((slide) => {
    const id = ensureId(slide);
    sourceById.set(id, slide.innerHTML);
    return recordFor(slide);
  });

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return value && Array.isArray(value.slides) ? value : null;
    } catch (error) {
      console.warn('[editor] No se pudieron leer los cambios guardados.', error);
      return null;
    }
  }

  const savedState = readState();
  if (savedState) {
    sourceById.clear();
    deck.replaceChildren(...savedState.slides.map(makeSlide));
    settings = { ...settings, ...(savedState.settings || {}) };
  }

  function applySettings() {
    const root = document.documentElement.style;
    const scale = Number(settings.textScale) || 1;
    document.documentElement.dataset.a2icAccent = settings.accent;
    document.documentElement.dataset.a2icTextScale = String(scale);
    document.documentElement.dataset.a2icHeadingFont = settings.headingFont;
    root.setProperty('--accent', settings.accent);
    root.setProperty('--accent-soft', ACCENT_SOFT[settings.accent] || '#8fcfc4');
    root.setProperty('--type-title', (BASE_TYPE.title * scale) + 'px');
    root.setProperty('--type-subtitle', (BASE_TYPE.subtitle * scale) + 'px');
    root.setProperty('--type-lead', (BASE_TYPE.lead * scale) + 'px');
    root.setProperty('--type-body', (BASE_TYPE.body * scale) + 'px');
    root.setProperty('--type-small', (BASE_TYPE.small * scale) + 'px');
    const heading = settings.headingFont === 'sans'
      ? "'IBM Plex Sans', sans-serif"
      : "'IBM Plex Serif', serif";
    root.setProperty('--heading-font', heading);
    document.querySelectorAll('h1.title,h2.title,.subtitle,.card h3').forEach((node) => {
      node.style.fontFamily = heading;
    });
  }
  applySettings();

  function renderMath(root) {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(root, {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      ignoredClasses: ['code', 'out'],
      throwOnError: false
    });
  }

  function refreshSlide(slide) {
    if (window.A2ICCharts) window.A2ICCharts.init();
    renderMath(slide);
    applySettings();
  }

  function currentSlide() {
    const all = slides();
    return all[Number.isInteger(deck.index) ? deck.index : 0] || all[0];
  }

  function createEditor() {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'a2ic-edit-toggle';
    toggle.dataset.editorUi = '';
    toggle.innerHTML = '<span class="dot"></span><span>Editar presentación</span>';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'a2ic-editor');

    const panel = document.createElement('aside');
    panel.id = 'a2ic-editor';
    panel.className = 'a2ic-editor';
    panel.dataset.editorUi = '';
    panel.dataset.open = 'false';
    panel.setAttribute('aria-label', 'Editor de la presentación');
    panel.innerHTML = `
      <div class="a2ic-editor__head">
        <div class="a2ic-editor__title">
          <strong>Editor de diapositivas</strong>
          <span>Los cambios se aplican sólo a esta copia local.</span>
        </div>
        <button class="a2ic-editor__icon-button" type="button" data-close aria-label="Cerrar editor">✕</button>
      </div>
      <div class="a2ic-editor__settings">
        <label>Color de acento
          <select data-accent>
            <option value="#2a9d8f">Verde petróleo</option>
            <option value="#1f7d8c">Azul petróleo</option>
            <option value="#3f8a6e">Verde bosque</option>
            <option value="#c98a2b">Ámbar</option>
          </select>
        </label>
        <label>Tipografía de títulos
          <select data-heading>
            <option value="serif">Serif</option>
            <option value="sans">Sans serif</option>
          </select>
        </label>
        <label style="grid-column:1/-1">Escala de texto · <span data-scale-value>100 %</span>
          <input data-scale type="range" min="0.85" max="1.12" step="0.01" value="1">
        </label>
      </div>
      <div class="a2ic-editor__source">
        <div class="a2ic-editor__source-head">
          <span class="a2ic-editor__slide-name" data-slide-name></span>
          <span class="a2ic-editor__badge">HTML + KaTeX</span>
        </div>
        <textarea data-source spellcheck="false" aria-label="HTML de la diapositiva activa"></textarea>
        <p class="a2ic-editor__help">Edita el contenido HTML. Escribe ecuaciones inline como <code>\\(x^2\\)</code> y ecuaciones en bloque como <code>\\[x^2\\]</code>.</p>
      </div>
      <div class="a2ic-editor__footer">
        <div class="a2ic-editor__actions">
          <button type="button" data-apply data-primary>Aplicar a la diapositiva</button>
          <button type="button" data-refresh>Actualizar datos y gráficos</button>
          <button type="button" data-save>Guardar en navegador</button>
          <button type="button" data-download>Descargar HTML</button>
          <button type="button" data-reset data-danger>Restaurar original</button>
        </div>
        <p class="a2ic-editor__status" data-status aria-live="polite"></p>
      </div>`;

    document.body.append(toggle, panel);

    const source = panel.querySelector('[data-source]');
    const slideName = panel.querySelector('[data-slide-name]');
    const status = panel.querySelector('[data-status]');
    const accent = panel.querySelector('[data-accent]');
    const heading = panel.querySelector('[data-heading]');
    const scale = panel.querySelector('[data-scale]');
    const scaleValue = panel.querySelector('[data-scale-value]');

    function setStatus(message, kind) {
      status.textContent = message;
      status.dataset.kind = kind || '';
    }

    function syncSource() {
      const slide = currentSlide();
      if (!slide) return;
      const id = ensureId(slide);
      if (!sourceById.has(id)) sourceById.set(id, slide.innerHTML);
      source.value = sourceById.get(id);
      slideName.textContent = slide.getAttribute('data-screen-label') || id;
      sourceDirty = false;
      setStatus('Diapositiva lista para editar.');
    }

    function syncSettingsControls() {
      accent.value = settings.accent;
      heading.value = settings.headingFont;
      scale.value = settings.textScale;
      scaleValue.textContent = Math.round(settings.textScale * 100) + ' %';
    }

    function openEditor(open) {
      panel.dataset.open = String(open);
      toggle.hidden = open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        syncSource();
        syncSettingsControls();
        source.focus();
      } else {
        deck.focus?.();
      }
    }

    function applyCurrent() {
      const slide = currentSlide();
      if (!slide) return false;
      const id = ensureId(slide);
      sourceById.set(id, source.value);
      slide.innerHTML = source.value;
      sourceDirty = false;
      refreshSlide(slide);
      setStatus('Cambios aplicados. Usa “Guardar” para conservarlos.', 'ok');
      return true;
    }

    function snapshot() {
      return {
        version: 1,
        savedAt: new Date().toISOString(),
        settings,
        slides: slides().map(recordFor)
      };
    }

    function save() {
      if (sourceDirty) applyCurrent();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
        setStatus('Guardado en este navegador.', 'ok');
      } catch (error) {
        console.error(error);
        setStatus('No se pudo guardar. Descarga el HTML como respaldo.', 'warn');
      }
    }

    function cleanClone() {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('[data-editor-ui]').forEach((node) => node.remove());
      const clonedSlides = Array.from(clone.querySelector('deck-stage').children)
        .filter((node) => node.tagName === 'SECTION');
      slides().forEach((slide, index) => {
        const target = clonedSlides[index];
        if (!target) return;
        const id = ensureId(slide);
        target.innerHTML = sourceById.get(id) ?? slide.innerHTML;
        RUNTIME_ATTRS.forEach((name) => target.removeAttribute(name));
      });
      return '<!DOCTYPE html>\n' + clone.outerHTML;
    }

    function download() {
      if (sourceDirty) applyCurrent();
      const blob = new Blob([cleanClone()], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'actividad-1-a2ic-editada.html';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setStatus('HTML descargado. Consérvalo junto a los archivos de esta carpeta.', 'ok');
    }

    async function refreshData() {
      const button = panel.querySelector('[data-refresh]');
      button.disabled = true;
      setStatus('Leyendo datos-presentacion.json…');
      try {
        const response = await fetch('datos-presentacion.json?actualizar=' + Date.now(), {
          cache: 'no-store'
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (!data || !Array.isArray(data.reserves) || !data.oracle) {
          throw new Error('formato de datos no reconocido');
        }
        if (!window.NB || typeof window.NB !== 'object') window.NB = {};
        Object.keys(window.NB).forEach((key) => delete window.NB[key]);
        Object.assign(window.NB, data);
        if (window.A2ICCharts) window.A2ICCharts.init();
        slides().forEach(renderMath);
        const stamp = data.meta?.updatedAt
          ? new Date(data.meta.updatedAt).toLocaleString('es-CL')
          : 'sin fecha';
        setStatus('Datos y gráficos actualizados · ' + stamp, 'ok');
      } catch (error) {
        console.error('[editor] No se pudieron actualizar los datos.', error);
        setStatus('No se pudo leer el JSON. Ejecuta el actualizador y abre la presentación mediante el servidor local.', 'warn');
      } finally {
        button.disabled = false;
      }
    }

    function restoreOriginal() {
      if (!window.confirm('¿Restaurar la presentación original y borrar los cambios guardados en este navegador?')) return;
      localStorage.removeItem(STORAGE_KEY);
      sourceById.clear();
      deck.replaceChildren(...originalRecords.map(makeSlide));
      settings = { accent: '#2a9d8f', textScale: 1, headingFont: 'serif' };
      applySettings();
      syncSettingsControls();
      setTimeout(() => {
        if (window.A2ICCharts) window.A2ICCharts.init();
        slides().forEach(renderMath);
        if (deck.goTo) deck.goTo(0);
        syncSource();
        setStatus('Presentación original restaurada.', 'ok');
      }, 0);
    }

    toggle.addEventListener('click', () => openEditor(true));
    panel.querySelector('[data-close]').addEventListener('click', () => openEditor(false));
    panel.querySelector('[data-apply]').addEventListener('click', applyCurrent);
    panel.querySelector('[data-refresh]').addEventListener('click', refreshData);
    panel.querySelector('[data-save]').addEventListener('click', save);
    panel.querySelector('[data-download]').addEventListener('click', download);
    panel.querySelector('[data-reset]').addEventListener('click', restoreOriginal);
    source.addEventListener('input', () => {
      sourceDirty = true;
      setStatus('Hay cambios sin aplicar.', 'warn');
    });

    accent.addEventListener('change', () => {
      settings.accent = accent.value;
      applySettings();
      setStatus('Color actualizado; guarda para conservarlo.', 'ok');
    });
    heading.addEventListener('change', () => {
      settings.headingFont = heading.value;
      applySettings();
      setStatus('Tipografía actualizada; guarda para conservarla.', 'ok');
    });
    scale.addEventListener('input', () => {
      settings.textScale = Number(scale.value);
      scaleValue.textContent = Math.round(settings.textScale * 100) + ' %';
      applySettings();
    });
    scale.addEventListener('change', () => setStatus('Escala actualizada; guarda para conservarla.', 'ok'));

    deck.addEventListener('slidechange', () => {
      if (panel.dataset.open === 'true') syncSource();
    });

    deck.addEventListener('deckchange', (event) => {
      const detail = event.detail || {};
      if (detail.action === 'duplicate' && detail.slide) {
        const origin = slides()[detail.from];
        const originSource = origin ? sourceById.get(ensureId(origin)) : detail.slide.innerHTML;
        detail.slide.dataset.editorId = freshId();
        sourceById.set(detail.slide.dataset.editorId, originSource || detail.slide.innerHTML);
      }
      setTimeout(() => {
        if (panel.dataset.open === 'true') syncSource();
      }, 0);
    });

    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() !== 'e' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      event.preventDefault();
      openEditor(panel.dataset.open !== 'true');
    });

    syncSettingsControls();
    syncSource();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createEditor);
  else createEditor();
})();
