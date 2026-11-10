/* =========================================================
   SquiggleMath — home page interactions (library only)
   The worksheet engine lives in engine.js. This file handles
   the printables library and its filters.
   ========================================================= */
'use strict';

const {
  DIFFICULTIES,
  THEMES,
  ACTIVITY_INFO,
  catalogFor,
  activitiesFor,
  createRng,
  escapeHtml,
  dashedGlyph,
  shapeSvg,
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

  if (activity === 'trace' || activity === 'mixed-prek') {
    const start = Array.isArray(sheet.range) ? sheet.range[0] : 1;
    const numbers = [start, start + 1, start + 2, start + 3, start + 4].slice(0, 5);
    return `<div class="mini-trace-row">${numbers.slice(0, 3).map((number) => dashedGlyph(number, 'mini-trace-svg')).join('')}<span class="mini-trace-line"></span></div>
      <div class="mini-trace-row">${numbers.slice(3).map((number) => dashedGlyph(number, 'mini-trace-svg')).join('')}<span class="mini-trace-line"></span></div>
      <div class="mini-trace-row">${dashedGlyph(start, 'mini-trace-svg')}<span class="mini-trace-line"></span></div>`;
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
  const all = catalogFor(category);
  const grid = $(`.printables-grid[data-category="${category}"]`);
  const tools = $(`.library-tools[data-tools="${category}"]`);
  const moreWrap = $(`.library-more[data-more-wrap="${category}"]`);
  const countEl = $(`[data-count="${category}"]`);

  if (!grid) return;

  // Landing page: show only a few cards, no filters.
  if (!tools) {
    const limit = Number(grid.dataset.limit) || 4;
    grid.innerHTML = all.slice(0, limit).map(sheetCardMarkup).join('');
    if (countEl) countEl.textContent = `· ${all.length} worksheets`;
    return;
  }

  const current = libraryState[category];
  const sheets = filteredSheets(category);

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
  const moreButton = $('[data-more]', moreWrap);
  if (moreButton) {
    const next = Math.min(PAGE_SIZE, remaining);
    moreButton.innerHTML = `Show ${next} more <span aria-hidden="true">↓</span>`;
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
    }
  });

  const header = $('.site-header');
  window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });
}

function init() {
  renderLibrary();
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
  bindEvents();
}

init();