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
  ACTIVITY_GROUPS,
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

/* The landing page is a shop window, so hand-pick one sheet from a spread of
   skills and themes for each level instead of taking the first four catalogue
   entries (which all share the same activity). */
const LANDING_PICKS = {
  prek: [
    { activity: 'trace', theme: 'ocean' },
    { activity: 'count', theme: 'safari' },
    { activity: 'shapes', theme: 'unicorns' },
    { activity: 'patterns', theme: 'space' },
  ],
  k: [
    { activity: 'add10', theme: 'monsters' },
    { activity: 'bonds', theme: 'space' },
    { activity: 'tally', theme: 'ocean' },
    { activity: 'maketen', theme: 'unicorns' },
  ],
  g1: [
    { activity: 'word', theme: 'safari' },
    { activity: 'place100', theme: 'space' },
    { activity: 'money', theme: 'ocean' },
    { activity: 'time', theme: 'monsters' },
  ],
};

function landingSheets(category) {
  const all = catalogFor(category);
  const picked = (LANDING_PICKS[category] || [])
    .map(({ activity, theme }) => all.find((sheet) => sheet.activity === activity && sheet.theme === theme))
    .filter(Boolean);

  // If the catalogue changes, top up with unused skills and themes so the row
  // never falls back to four near-identical cards.
  for (const sheet of all) {
    if (picked.length >= 4) break;
    if (picked.some((entry) => entry.activity === sheet.activity || entry.theme === sheet.theme)) continue;
    picked.push(sheet);
  }

  return picked;
}

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

  if (activity === 'colors') {
    const dots = ['#e05555', '#3c8fd0', '#e8b52a', '#4f9e4f'];
    return dots.slice(0, 3).map((colour) => `<div class="mini-count"><span class="mini-count__emojis">${Array.from({ length: rng.int(2, 4) }, () => `<span class="mini-colour-dot" style="--dot:${colour}"></span>`).join('')}</span><span class="mini-count__box"></span></div>`).join('');
  }

  if (activity === 'prewrite') {
    return `<div class="mini-prewrite"><svg viewBox="0 0 220 40" fill="none"><path d="M8 28 Q 30 6 52 28 T 96 28 T 140 28 T 184 28 T 212 24" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round"/></svg></div>
      <div class="mini-prewrite"><svg viewBox="0 0 220 40" fill="none"><path d="M8 30 L 34 12 L 60 30 L 86 12 L 112 30 L 138 12 L 164 30 L 190 12 L 212 22" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round"/></svg></div>
      <div class="mini-prewrite"><svg viewBox="0 0 220 40" fill="none"><path d="M8 30 Q 18 8 28 30 Q 38 8 48 30 Q 58 8 68 30 Q 78 8 88 30 Q 98 8 108 30 Q 118 8 128 30 Q 138 8 148 30 Q 158 8 168 30 Q 178 8 188 30 Q 198 8 208 30" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round"/></svg></div>`;
  }

  if (activity === 'maketen' || activity === 'teen') {
    const filled = rng.int(4, 8);
    return `<div class="mini-tenframe">${Array.from({ length: 10 }, (_, index) => `<span class="${index < filled ? 'is-filled' : ''}"></span>`).join('')}</div>
      <div class="mini-eq"><span>${filled} +</span><span></span></div>`;
  }

  if (activity === 'balance') {
    return `<div class="mini-eq"><span>7 + 2 =</span><span></span></div>
      <div class="mini-eq mini-eq--solo mini-eq--missing"><span>5 + <i class="mini-blank"></i> = 4 + <i class="mini-blank"></i></span></div>
      <div class="mini-eq mini-eq--solo mini-eq--missing"><span>3 + 3 = 1 + <i class="mini-blank"></i></span></div>`;
  }

  if (activity === 'symmetry') {
    return `<svg class="mini-symmetry" viewBox="0 0 120 100" fill="none"><path d="M60 84 C34 62 26 42 40 32 C52 24 60 34 60 44" stroke="currentColor" stroke-width="2.5" fill="rgba(31,42,68,.06)"/><line x1="60" y1="12" x2="60" y2="88" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"/></svg>`;
  }

  if (activity === 'measure') {
    return `<div class="mini-measure"><span style="width:82%"></span></div><div class="mini-measure"><span style="width:48%"></span></div><div class="mini-measure"><span style="width:66%"></span></div>`;
  }

  if (activity === 'patterns') {
    const kinds = ['circle', 'square', 'triangle', 'star'];
    return [0, 1, 2].map((row) => {
      const first = kinds[row % kinds.length];
      const second = kinds[(row + 1) % kinds.length];
      const sequence = [first, second, first, second, first];
      return `<div class="mini-pattern">${sequence.map((kind, index) => shapeSvg(kind, (row + index) % 4)).join('')}<span class="mini-pattern__blank"></span></div>`;
    }).join('');
  }

  if (activity === 'numberhunt') {
    return [0, 1].map((row) => {
      const target = row === 0 ? 7 : 8;
      return `<div class="mini-hunt">${[3, 5, 7, 8, 9].map((value) => {
        const number = value + row;
        return `<span class="${number === target ? 'is-target' : ''}">${number}</span>`;
      }).join('')}</div>`;
    }).join('');
  }

  if (activity === 'samediff') {
    return [0, 1, 2].map((row) => {
      const same = row % 2 === 0;
      const icons = same ? [theme.emoji, theme.emoji, theme.emoji] : [theme.emoji, theme.deco[1], theme.emoji];
      return `<div class="mini-samediff"><span>${icons.join('')}</span><span class="mini-samediff__box"></span></div>`;
    }).join('');
  }

  if (activity === 'shapesort') {
    return `<div class="mini-sort"><span class="mini-sort__label">Flat</span><span class="mini-sort__set">${shapeSvg('circle', 0)}${shapeSvg('triangle', 1)}${shapeSvg('square', 2)}</span></div>
      <div class="mini-sort"><span class="mini-sort__label">Solid</span><span class="mini-sort__set"><em>🧊</em><em>⚽</em><em>🎲</em></span></div>`;
  }

  if (activity === 'counton') {
    return [0, 1].map((row) => {
      const start = 4 + row * 3;
      return `<div class="mini-counton"><b>${start}</b><i>→</i><b>${start + 1}</b><i>→</i><b>${start + 2}</b><i>→</i><span class="mini-counton__blank"></span></div>`;
    }).join('');
  }

  if (activity === 'place100') {
    return [0, 1].map((row) => {
      const tens = row === 0 ? 3 : 2;
      const ones = row === 0 ? 4 : 6;
      return `<div class="mini-place"><span class="mini-place__rods">${'<i></i>'.repeat(tens)}</span><span class="mini-place__ones">${'<b></b>'.repeat(ones)}</span><span class="mini-count__box"></span></div>`;
    }).join('');
  }

  if (activity === 'money') {
    const rows = [
      [['25¢', 'gold'], ['10¢', 'gold'], ['5¢', 'silver']],
      [['10¢', 'gold'], ['1¢', 'copper'], ['1¢', 'copper']],
    ];
    return rows.map((coins) => `<div class="mini-money">${coins.map(([label, tone]) => `<span class="mini-coin mini-coin--${tone}">${label}</span>`).join('')}<span class="mini-count__box"></span></div>`).join('');
  }

  if (activity === 'time') {
    return [3, 7].map((hour, index) => {
      const minute = index === 0 ? 0 : 30;
      const minuteAngle = minute * 6;
      const hourAngle = (hour % 12) * 30 + minute * 0.5;
      const hand = (angle, length) => {
        const radians = (angle - 90) * (Math.PI / 180);
        return `${22 + Math.cos(radians) * length} ${22 + Math.sin(radians) * length}`;
      };
      return `<div class="mini-time">
        <svg class="mini-clock" viewBox="0 0 44 44" fill="none" aria-hidden="true">
          <circle cx="22" cy="22" r="18" fill="#fff" stroke="currentColor" stroke-width="1.6"/>
          <path d="M22 8v3.5M36 22h-3.5M22 36v-3.5M8 22h3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M22 22 ${hand(hourAngle, 9)}M22 22 ${hand(minuteAngle, 13)}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="22" cy="22" r="1.6" fill="currentColor"/>
        </svg>
        <span class="mini-time__digital">${hour}:${String(minute).padStart(2, '0')}</span>
        <span class="mini-count__box"></span>
      </div>`;
    }).join('');
  }

  if (activity === 'fractionsset') {
    return [3, 1].map((shaded) => {
      const quadrant = (index) => {
        const start = ((index * 90 - 90) * Math.PI) / 180;
        const end = (((index + 1) * 90 - 90) * Math.PI) / 180;
        const x1 = 22 + Math.cos(start) * 17;
        const y1 = 22 + Math.sin(start) * 17;
        const x2 = 22 + Math.cos(end) * 17;
        const y2 = 22 + Math.sin(end) * 17;
        return `<path d="M22 22 L${x1} ${y1} A17 17 0 0 1 ${x2} ${y2} Z" fill="currentColor" fill-opacity="${index < shaded ? 0.55 : 0}" stroke="currentColor" stroke-width="1.2"/>`;
      };
      return `<div class="mini-fraction"><svg class="mini-fraction__pie" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17" fill="#fff"/>${[0, 1, 2, 3].map(quadrant).join('')}</svg><span class="mini-count__box"></span></div>`;
    }).join('');
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
  let sheets = catalogFor(category);
  if (current.group !== 'all') {
    sheets = sheets.filter((sheet) => ACTIVITY_INFO[sheet.activity].group === current.group);
  }
  if (current.filter !== 'all') return sheets.filter((sheet) => sheet.activity === current.filter);
  return sheets;
}

function renderLibraryLevel(category) {
  const all = catalogFor(category);
  const grid = $(`.printables-grid[data-category="${category}"]`);
  const tools = $(`.library-tools[data-tools="${category}"]`);
  const moreWrap = $(`.library-more[data-more-wrap="${category}"]`);
  const countEl = $(`[data-count="${category}"]`);

  if (!grid) return;

  // Landing page: a small, varied showcase, no filters.
  if (!tools) {
    const limit = Number(grid.dataset.limit) || 4;
    grid.innerHTML = landingSheets(category).slice(0, limit).map(sheetCardMarkup).join('');
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

  const groups = ACTIVITY_GROUPS
    .map((group) => ({ group, count: all.filter((sheet) => ACTIVITY_INFO[sheet.activity].group === group).length }))
    .filter((group) => group.count > 0);

  if (current.group !== 'all' && !groups.some((group) => group.group === current.group)) {
    current.group = 'all';
  }

  const groupActivities = current.group === 'all'
    ? activitiesFor(category)
    : activitiesFor(category).filter((activity) => ACTIVITY_INFO[activity].group === current.group);

  if (current.filter !== 'all' && !groupActivities.includes(current.filter)) {
    current.filter = 'all';
  }

  tools.innerHTML = `<div class="filter-chips filter-chips--groups" role="group" aria-label="Filter ${DIFFICULTIES[category].label} worksheets by skill group">
    <button class="filter-chip${current.group === 'all' ? ' is-active' : ''}" type="button"
      data-filter-category="${category}" data-group-filter="all" aria-pressed="${current.group === 'all'}">
      All areas <span>${all.length}</span>
    </button>
    ${groups.map((group) => {
      const active = current.group === group.group;
      return `<button class="filter-chip${active ? ' is-active' : ''}" type="button"
        data-filter-category="${category}" data-group-filter="${group.group}" aria-pressed="${active}">
        ${escapeHtml(group.group)} <span>${group.count}</span>
      </button>`;
    }).join('')}
  </div>
  <div class="filter-chips" role="group" aria-label="Filter ${DIFFICULTIES[category].label} worksheets by activity">
    <button class="filter-chip filter-chip--sub${current.filter === 'all' ? ' is-active' : ''}" type="button"
      data-filter-category="${category}" data-filter="all" aria-pressed="${current.filter === 'all'}">
      All skills <span>${groupActivities.length ? all.filter((sheet) => ACTIVITY_INFO[sheet.activity].group === (current.group === 'all' ? ACTIVITY_INFO[sheet.activity].group : current.group)).length : 0}</span>
    </button>
    ${groupActivities.map((activity) => {
      const active = current.filter === activity;
      return `<button class="filter-chip filter-chip--sub${active ? ' is-active' : ''}" type="button"
        data-filter-category="${category}" data-filter="${activity}" aria-pressed="${active}">
        ${escapeHtml(ACTIVITY_INFO[activity].short)} <span>${all.filter((sheet) => sheet.activity === activity).length}</span>
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
    libraryState[category] = { filter: 'all', group: 'all', visible: PAGE_SIZE };
    renderLibraryLevel(category);
  });
}

/* =========================================================
   Event wiring + init
   ========================================================= */

function bindEvents() {
  document.addEventListener('click', (event) => {
    const groupFilter = event.target.closest('[data-group-filter]');
    if (groupFilter) {
      const category = groupFilter.dataset.filterCategory;
      if (libraryState[category]) {
        libraryState[category].group = groupFilter.dataset.groupFilter;
        libraryState[category].filter = 'all';
        libraryState[category].visible = PAGE_SIZE;
        renderLibraryLevel(category);
      }
      return;
    }

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