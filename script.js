/* =========================================================
   SquiggleMath — home page interactions
   The worksheet engine lives in engine.js. This file only
   handles the library, the generator and the print-page links.
   ========================================================= */

'use strict';

const {
  DIFFICULTIES,
  THEMES,
  ACTIVITY_INFO,
  catalogFor,
  activitiesFor,
  buildWorksheet,
  createRng,
  randomSeed,
  escapeHtml,
  dashedGlyph,
  shapeSvg,
  addThinkingSpace,
  SHEET_WIDTH,
  SHEET_HEIGHT,
} = window.SquiggleMath;

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const LEVELS = ['prek', 'k', 'g1'];
const PAGE_SIZE = 12;

/* =========================================================
   Library cards
   ========================================================= */

function miniPreview(sheet) {
  const theme = THEMES[sheet.theme] || THEMES.dinos;
  const activity = sheet.activity;
  const rng = createRng(sheet.seed);

  if (activity === 'trace') {
    const start = Array.isArray(sheet.range) ? sheet.range[0] : 1;
    const numbers = [start, start + 1, start + 2, start + 3, start + 4].slice(0, 5);
    return `<div class="mini-trace-row">${numbers.slice(0, 3).map((number) => dashedGlyph(number, 'mini-trace-svg')).join('')}<span class="mini-trace-line"></span></div>
      <div class="mini-trace-row">${numbers.slice(3).map((number) => dashedGlyph(number, 'mini-trace-svg')).join('')}<span class="mini-trace-line"></span></div>
      <div class="mini-trace-row">${dashedGlyph(start, 'mini-trace-svg')}<span class="mini-trace-line"></span></div>`;
  }

  if (activity === 'mixed-prek') {
    const start = Array.isArray(sheet.range) ? sheet.range[0] : 1;
    const count = rng.int(3, 7);
    return `<div class="mini-trace-row">${[start, start + 1, start + 2].map((number) => dashedGlyph(number, 'mini-trace-svg')).join('')}<span class="mini-trace-line"></span></div>
      <div class="mini-trace-row">${dashedGlyph(start + 3, 'mini-trace-svg')}<span class="mini-trace-line"></span></div>
      <div class="mini-count"><span class="mini-count__emojis">${theme.emoji.repeat(count)}</span><span class="mini-count__box"></span></div>`;
  }

  if (activity === 'count') {
    const counts = [rng.int(2, 5), rng.int(4, 7), rng.int(3, 6)];
    const icon = theme.emoji;
    return counts.map((count) => `<div class="mini-count"><span class="mini-count__emojis">${icon.repeat(count)}</span><span class="mini-count__box"></span></div>`).join('');
  }

  if (activity === 'shapes') {
    const kinds = ['circle', 'square', 'triangle', 'star'];
    const rows = [0, 1, 2].map(() => {
      const count = rng.int(2, 5);
      const kind = rng.pick(kinds);
      const color = rng.int(0, 3);
      return `<div class="mini-shapes">${Array.from({ length: count }, () => shapeSvg(kind, color)).join('')}</div>`;
    });
    return rows.join('');
  }

  if (activity === 'compare') {
    return `<div class="mini-compare"><em style="font-size:20px">${theme.emoji}</em><em style="font-size:12px">${theme.emoji}</em><span class="mini-compare__hint"></span></div>
      <div class="mini-compare"><em style="font-size:11px">${theme.deco[1]}</em><em style="font-size:19px">${theme.deco[1]}</em><span class="mini-compare__hint"></span></div>
      <div class="mini-compare"><em style="font-size:21px">${theme.deco[2]}</em><em style="font-size:12px">${theme.deco[2]}</em><span class="mini-compare__hint"></span></div>`;
  }

  if (activity === 'bonds') {
    return `<svg class="mini-bond" viewBox="0 0 150 110" fill="none">
      <path d="M75 30 45 72M75 30l30 42" stroke="rgba(31,42,68,.3)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="75" cy="27" r="19" fill="#fff" stroke="currentColor" stroke-width="2"/>
      <circle cx="45" cy="74" r="19" fill="#fff" stroke="currentColor" stroke-width="2"/>
      <circle cx="105" cy="74" r="19" fill="rgba(0,0,0,.02)" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/>
      <text x="75" y="33" text-anchor="middle" font-family="Quicksand, sans-serif" font-weight="700" font-size="16" fill="#1f2a44">8</text>
      <text x="45" y="80" text-anchor="middle" font-family="Quicksand, sans-serif" font-weight="700" font-size="16" fill="#1f2a44">3</text>
    </svg>`;
  }

  if (activity === 'tally') {
    const tallyGroup = '<span class="mini-tally-group"><b></b><b></b><b></b><b></b><b></b></span>';
    return `<div class="mini-tally-row"><span class="mini-tally">${tallyGroup}${tallyGroup}</span><span class="mini-count__box"></span></div>
      <div class="mini-tally-row"><span class="mini-tally">${tallyGroup}</span><span class="mini-count__box"></span></div>
      <div class="mini-tally-row"><span class="mini-tally">${tallyGroup}${tallyGroup}</span><span class="mini-count__box"></span></div>`;
  }

  if (activity === 'word') {
    return `<div class="mini-story"><span>${theme.emoji}</span><span>${theme.characters[0]} has 8 ${theme.items[0]} and finds 5 more. How many now?<i class="mini-story__line"></i></span></div>
      <div class="mini-story"><span>${theme.deco[1]}</span><span>There are 14 ${theme.items[1]}. 6 float away. How many are left?<i class="mini-story__line"></i></span></div>`;
  }

  if (activity === 'missing') {
    return `<div class="mini-eq mini-eq--missing"><span>7 + <i class="mini-blank"></i> = 12</span></div>
      <div class="mini-eq"><span>15 − 6 =</span><span></span></div>
      <div class="mini-eq mini-eq--missing"><span><i class="mini-blank"></i> + 4 = 11</span></div>
      <div class="mini-eq"><span>9 + 8 =</span><span></span></div>`;
  }

  const isSubtraction = activity === 'sub10' || activity === 'sub20';
  return `<div class="mini-eq"><span>${isSubtraction ? '9 − 4 =' : '3 + 4 ='}</span><span></span></div>
    <div class="mini-eq"><span>${isSubtraction ? '12 − 6 =' : '7 + 2 ='}</span><span></span></div>
    <div class="mini-eq"><span>${isSubtraction ? '18 − 9 =' : '8 + 9 ='}</span><span></span></div>
    <div class="mini-eq"><span>${isSubtraction ? '15 − 3 =' : '5 + 6 ='}</span><span></span></div>`;
}

function sheetCardMarkup(sheet) {
  const theme = THEMES[sheet.theme] || THEMES.dinos;
  const tags = sheet.tags
    .map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`)
    .join('');

  return `<a class="sheet-card" href="worksheet.html?id=${encodeURIComponent(sheet.id)}" target="_blank" rel="noopener"
    data-sheet-id="${escapeHtml(sheet.id)}"
    aria-label="Open ${escapeHtml(sheet.title)} — ${escapeHtml(sheet.tags[0])} — in a new print page">
    <span class="sheet-card__preview" aria-hidden="true">
      <span class="sheet-card__number">No. ${String(sheet.number).padStart(3, '0')}</span>
      <span class="mini-paper">
        <span class="mini-paper__top"><span>SquiggleMath</span><span>${theme.emoji}</span></span>
        <span class="mini-paper__title">${escapeHtml(sheet.title)}</span>
        <span class="mini-paper__board">${miniPreview(sheet)}</span>
        <span class="mini-paper__footer"></span>
      </span>
      <span class="theme-pill">${theme.emoji} ${theme.name}</span>
    </span>
    <span class="sheet-card__body">
      <span class="sheet-card__tags">${tags}</span>
      <span class="sheet-card__title">${escapeHtml(sheet.title)}</span>
      <span class="sheet-card__desc">${escapeHtml(sheet.blurb)}</span>
      <span class="sheet-card__cta"><span>Open print page</span><span class="arrow" aria-hidden="true">↗</span></span>
    </span>
  </a>`;
}

/* =========================================================
   Library: filters + progressive reveal
   ========================================================= */

const libraryState = {};

function filteredSheets(category) {
  const current = libraryState[category];
  const sheets = catalogFor(category);
  if (current.filter === 'all') return sheets;
  return sheets.filter((sheet) => sheet.activity === current.filter);
}

function renderLibraryLevel(category) {
  const current = libraryState[category];
  const all = catalogFor(category);
  const sheets = filteredSheets(category);
  const grid = $(`.printables-grid[data-category="${category}"]`);
  const tools = $(`.library-tools[data-tools="${category}"]`);
  const moreWrap = $(`.library-more[data-more-wrap="${category}"]`);
  const countEl = $(`[data-count="${category}"]`);

  if (!grid || !tools || !moreWrap) return;

  grid.innerHTML = sheets.slice(0, current.visible).map(sheetCardMarkup).join('');

  const filterButtons = [
    { key: 'all', label: 'All', count: all.length },
    ...activitiesFor(category).map((activity) => ({
      key: activity,
      label: ACTIVITY_INFO[activity].short,
      count: all.filter((sheet) => sheet.activity === activity).length,
    })),
  ];

  tools.innerHTML = `<div class="filter-chips" role="group" aria-label="Filter ${DIFFICULTIES[category].label} worksheets by skill">
    ${filterButtons.map((filter) => {
      const active = current.filter === filter.key;
      return `<button class="filter-chip${active ? ' is-active' : ''}" type="button"
        data-filter-category="${category}" data-filter="${filter.key}" aria-pressed="${active}">
        ${escapeHtml(filter.label)} <span>${filter.count}</span>
      </button>`;
    }).join('')}
  </div>
  <p class="library-count">Showing <strong>${Math.min(current.visible, sheets.length)}</strong> of ${sheets.length}</p>`;

  const remaining = sheets.length - current.visible;
  moreWrap.hidden = remaining <= 0;
  if (remaining > 0) {
    const next = Math.min(PAGE_SIZE, remaining);
    moreWrap.innerHTML = `<button class="btn btn--ghost btn--small" type="button" data-more="${category}">
        Show ${next} more <span aria-hidden="true">↓</span>
      </button>
      <button class="library-show-all" type="button" data-show-all="${category}">Show all ${sheets.length}</button>`;
  }

  if (countEl) countEl.textContent = `· ${all.length} worksheets`;
}

function renderLibrary() {
  LEVELS.forEach((category) => {
    libraryState[category] = { filter: 'all', visible: PAGE_SIZE };
    renderLibraryLevel(category);
  });
}

/* =========================================================
   Fit the fixed A4 canvas into its responsive frame
   ========================================================= */

function fitPaper(frame, canvas) {
  if (!frame || !canvas) return;
  const available = frame.clientWidth;
  if (!available) return;

  const scale = Math.min(1, available / SHEET_WIDTH);
  const unscaledHeight = Math.max(canvas.scrollHeight, SHEET_HEIGHT);
  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = 'top left';
  canvas.style.left = `${Math.max(0, (available - SHEET_WIDTH * scale) / 2)}px`;
  frame.style.height = `${Math.ceil(unscaledHeight * scale)}px`;
}

function scheduleFit() {
  if (state.resizeFrame) cancelAnimationFrame(state.resizeFrame);
  state.resizeFrame = requestAnimationFrame(() => {
    fitPaper(els.paperFrame, els.canvas);
    state.resizeFrame = null;
  });
}

/* =========================================================
   Generator
   ========================================================= */

const state = {
  lastResult: null,
  lastConfig: null,
  toastTimer: null,
  resizeFrame: null,
  generateTimer: null,
};

const els = {
  header: $('.site-header'),
  generatorForm: $('#generator-form'),
  canvas: $('#worksheet-canvas'),
  paperFrame: $('#paper-frame'),
  sheetStatus: $('#sheet-status'),
  printButton: $('#print-btn'),
  generateButton: $('#generate-btn'),
  themeSelect: $('#theme-select'),
  themeEmoji: $('#theme-emoji'),
  themeHint: $('#theme-hint'),
  answerKey: $('#answer-key'),
  toast: $('#toast'),
  year: $('#year'),
};

function updateThemePreview() {
  const theme = THEMES[els.themeSelect.value] || THEMES.dinos;
  els.themeEmoji.textContent = theme.emoji;
  els.themeHint.textContent = theme.hint;
}

function readGeneratorSettings() {
  const formData = new FormData(els.generatorForm);
  return {
    difficulty: String(formData.get('difficulty') || 'prek'),
    problems: Number(formData.get('problems') || 10),
    theme: String(formData.get('theme') || 'dinos'),
    includeKey: formData.get('answerKey') === 'on',
  };
}

function generateWorksheet({ announce = false, spin = false } = {}) {
  const settings = readGeneratorSettings();
  const result = buildWorksheet({
    ...settings,
    seed: randomSeed(),
  });

  state.lastResult = result;
  state.lastConfig = {
    difficulty: settings.difficulty,
    activity: result.activity,
    theme: settings.theme,
    problems: result.count,
    seed: result.seed,
    includeKey: settings.includeKey && result.answers.length > 0,
  };

  els.canvas.innerHTML = result.html;
  addThinkingSpace(els.canvas);
  els.canvas.classList.remove('is-new');
  // Restart the little paper entrance animation on every fresh sheet.
  void els.canvas.offsetWidth;
  els.canvas.classList.add('is-new');

  const pageCopy = result.pageCount > 1 ? ` • ${result.pageCount} pages (with key)` : '';
  const level = result.difficulty.shortBadge;
  els.sheetStatus.textContent = `${level} · ${result.count} problems · ${result.theme.name}${pageCopy}`;

  fitPaper(els.paperFrame, els.canvas);
  scheduleFit();
  // We refit once webfonts are ready, because text metrics can shift.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }

  if (spin) {
    els.generateButton.classList.remove('is-spinning');
    void els.generateButton.offsetWidth;
    els.generateButton.classList.add('is-spinning');
    clearTimeout(state.generateTimer);
    state.generateTimer = setTimeout(() => {
      els.generateButton.classList.remove('is-spinning');
    }, 650);
  }

  if (announce) {
    const messages = [
      'Fresh worksheet served! 🎉',
      'A brand-new sheet, just for you ✨',
      'Shuffled up and ready to print 🖨️',
      'New sheet, new little wins 🌟',
    ];
    showToast(messages[Math.floor(Math.random() * messages.length)]);
  }
}

function buildPrintUrl(config) {
  const params = new URLSearchParams({
    level: config.difficulty,
    activity: config.activity,
    theme: config.theme,
    problems: String(config.problems),
    seed: String(config.seed),
  });
  if (config.includeKey) params.set('key', '1');
  return `worksheet.html?${params.toString()}`;
}

function openPrintPage() {
  if (!state.lastConfig) {
    showToast('Generate a worksheet first ✏️');
    return;
  }
  const opened = window.open(buildPrintUrl(state.lastConfig), '_blank', 'noopener');
  if (!opened) {
    showToast('Allow pop-ups to open the print page 🖨️');
  }
}

/* =========================================================
   Toast
   ========================================================= */

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    els.toast.classList.remove('is-visible');
  }, 2800);
}

/* =========================================================
   Event wiring + init
   ========================================================= */

function bindEvents() {
  document.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      const category = filter.dataset.filterCategory;
      if (libraryState[category]) {
        libraryState[category].filter = filter.dataset.filter;
        libraryState[category].visible = PAGE_SIZE;
        renderLibraryLevel(category);
      }
      return;
    }

    const more = event.target.closest('[data-more]');
    if (more) {
      const category = more.dataset.more;
      if (libraryState[category]) {
        libraryState[category].visible += PAGE_SIZE;
        renderLibraryLevel(category);
      }
      return;
    }

    const showAll = event.target.closest('[data-show-all]');
    if (showAll) {
      const category = showAll.dataset.showAll;
      if (libraryState[category]) {
        libraryState[category].visible = filteredSheets(category).length;
        renderLibraryLevel(category);
      }
    }
  });

  els.generatorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    generateWorksheet({ announce: true, spin: true });
  });

  els.themeSelect.addEventListener('change', updateThemePreview);
  els.printButton.addEventListener('click', openPrintPage);

  window.addEventListener('resize', scheduleFit);

  window.addEventListener('scroll', () => {
    els.header.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  // Refit if worksheet content changes size (font load, reflow, etc.).
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(els.canvas);
  }
}

function init() {
  renderLibrary();
  updateThemePreview();
  if (els.year) els.year.textContent = new Date().getFullYear();
  bindEvents();
  generateWorksheet({ announce: false });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }
}

init();
