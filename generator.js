/* =========================================================
   SquiggleMath — worksheet studio (generator page)
   ========================================================= */
'use strict';

const {
  DIFFICULTIES,
  THEMES,
  ACTIVITY_INFO,
  ACTIVITY_GROUPS,
  generatorActivitiesFor,
  buildWorksheet,
  randomSeed,
  addThinkingSpace,
  SHEET_WIDTH,
  SHEET_HEIGHT,
} = window.SquiggleMath;

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const DEFAULT_ACTIVITY = {
  prek: 'mixed-prek',
  k: 'mixed10',
  g1: 'mixed20',
};

const LEVEL_HINTS = {
  prek: 'Tracing & counting',
  k: 'Add & subtract to 10',
  g1: 'Facts to 20 & more',
};

const state = {
  difficulty: 'prek',
  activity: 'mixed-prek',
  theme: 'dinos',
  problems: 10,
  includeKey: false,
  seed: randomSeed(),
  lastResult: null,
  lastConfig: null,
  toastTimer: null,
  resizeFrame: null,
  generateTimer: null,
  themeQuery: '',
};

const els = {
  form: $('#generator-form'),
  difficultyList: $('#difficulty-list'),
  activityPicker: $('#activity-picker'),
  activityCount: $('#activity-count'),
  problemPills: $('#problem-pills'),
  themeSearch: $('#theme-search'),
  themePicker: $('#theme-picker'),
  themeHint: $('#theme-hint'),
  answerKey: $('#answer-key'),
  generateButton: $('#generate-btn'),
  shuffleButton: $('#shuffle-btn'),
  canvas: $('#worksheet-canvas'),
  paperFrame: $('#paper-frame'),
  sheetStatus: $('#sheet-status'),
  printButton: $('#print-btn'),
  toast: $('#toast'),
  year: $('#year'),
};

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  const level = DIFFICULTIES[params.get('level')] ? params.get('level') : 'prek';
  const activities = generatorActivitiesFor(level);
  const requestedActivity = params.get('activity');
  const activity = activities.includes(requestedActivity) ? requestedActivity : (DEFAULT_ACTIVITY[level] || activities[0]);
  const theme = THEMES[params.get('theme')] ? params.get('theme') : 'dinos';
  const problems = clampNumber(params.get('problems'), 10, 1, 20);
  const seed = clampNumber(params.get('seed'), randomSeed(), 1, 2147483646);
  return { level, activity, theme, problems, seed, includeKey: params.get('key') === '1' };
}

function renderDifficulty() {
  els.difficultyList.innerHTML = Object.entries(DIFFICULTIES).map(([key, info]) => `
    <label class="difficulty-option">
      <input type="radio" name="difficulty" value="${key}" ${key === state.difficulty ? 'checked' : ''}>
      <span class="difficulty-card">
        <span class="difficulty-card__ages">${info.ages.replace('Ages ', '')}</span>
        <span class="difficulty-card__text">
          <strong>${info.label}</strong>
          <small>${LEVEL_HINTS[key]}</small>
        </span>
        <span class="difficulty-card__check" aria-hidden="true">✓</span>
      </span>
    </label>
  `).join('');
}

function renderActivities() {
  const activities = generatorActivitiesFor(state.difficulty);
  if (!activities.includes(state.activity)) {
    state.activity = DEFAULT_ACTIVITY[state.difficulty] || activities[0] || state.activity;
  }

  const groups = ACTIVITY_GROUPS
    .map((group) => ({ group, items: activities.filter((activity) => ACTIVITY_INFO[activity].group === group) }))
    .filter((group) => group.items.length);

  els.activityPicker.innerHTML = groups.map((group) => `
    <div class="activity-group">
      <p class="activity-group__label">${group.group}</p>
      <div class="activity-grid">
        ${group.items.map((activity) => {
          const info = ACTIVITY_INFO[activity];
          const active = activity === state.activity;
          return `<button type="button" class="activity-tile${active ? ' is-active' : ''}" data-activity="${activity}" aria-pressed="${active}">
            <span class="activity-tile__icon" aria-hidden="true">${info.icon}</span>
            <span class="activity-tile__text">
              <strong>${info.label}</strong>
              <small>${info.description}</small>
            </span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  if (els.activityCount) {
    els.activityCount.textContent = `${activities.length} activities`;
  }
}

function renderThemes() {
  const query = (els.themeSearch.value || '').trim().toLowerCase();
  const keys = Object.keys(THEMES).filter((key) => {
    if (!query) return true;
    const theme = THEMES[key];
    return theme.name.toLowerCase().includes(query) || theme.emoji.includes(query);
  });

  if (!keys.length) {
    els.themePicker.innerHTML = '<p class="picker-empty">No themes match that search.</p>';
  } else {
    els.themePicker.innerHTML = keys.map((key) => {
      const theme = THEMES[key];
      const active = key === state.theme;
      return `<button type="button" class="theme-tile${active ? ' is-active' : ''}" data-theme="${key}" aria-pressed="${active}" title="${theme.hint}">
        <span class="theme-tile__emoji" aria-hidden="true">${theme.emoji}</span>
        <span class="theme-tile__name">${theme.name}</span>
      </button>`;
    }).join('');
  }

  const theme = THEMES[state.theme] || THEMES.dinos;
  els.themeHint.textContent = theme.hint;
  els.themeHint.dataset.emoji = theme.emoji;
}

function syncProblemPills() {
  const radios = $$('input[name="problems"]', els.problemPills);
  radios.forEach((radio) => {
    radio.checked = Number(radio.value) === state.problems;
  });
}

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

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    els.toast.classList.remove('is-visible');
  }, 2800);
}

function generateWorksheet({ announce = false, spin = false } = {}) {
  const result = buildWorksheet({
    difficulty: state.difficulty,
    activity: state.activity,
    theme: state.theme,
    problems: state.problems,
    seed: state.seed,
    includeKey: state.includeKey,
  });

  state.lastResult = result;
  state.lastConfig = {
    difficulty: state.difficulty,
    activity: result.activity,
    theme: state.theme,
    problems: result.count,
    seed: result.seed,
    includeKey: state.includeKey && result.answers.length > 0,
  };

  els.canvas.innerHTML = result.html;
  addThinkingSpace(els.canvas);
  els.canvas.classList.remove('is-new');
  void els.canvas.offsetWidth;
  els.canvas.classList.add('is-new');

  const pageCopy = result.pageCount > 1 ? ` • ${result.pageCount} pages (with key)` : '';
  const info = ACTIVITY_INFO[result.activity] || {};
  const level = result.difficulty.shortBadge;
  els.sheetStatus.textContent = `${level} · ${result.count} ${info.unit || 'items'} · ${result.theme.emoji} ${result.theme.name}${pageCopy}`;

  scheduleFit();
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

  updateUrl();
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

function randomize() {
  const levels = Object.keys(DIFFICULTIES);
  state.difficulty = levels[Math.floor(Math.random() * levels.length)];
  const activities = generatorActivitiesFor(state.difficulty);
  state.activity = activities[Math.floor(Math.random() * activities.length)];
  const themeKeys = Object.keys(THEMES);
  state.theme = themeKeys[Math.floor(Math.random() * themeKeys.length)];
  state.problems = [5, 10, 15, 20][Math.floor(Math.random() * 4)];
  state.seed = randomSeed();
  renderDifficulty();
  renderActivities();
  renderThemes();
  syncProblemPills();
  generateWorksheet({ announce: true, spin: true });
}

function updateUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('level', state.difficulty);
    url.searchParams.set('activity', state.activity);
    url.searchParams.set('theme', state.theme);
    url.searchParams.set('problems', String(state.problems));
    url.searchParams.set('seed', String(state.seed));
    if (state.includeKey) url.searchParams.set('key', '1');
    else url.searchParams.delete('key');
    window.history.replaceState(null, '', url);
  } catch (error) {
    // ignore
  }
}

function bindEvents() {
  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    state.seed = randomSeed();
    generateWorksheet({ announce: true, spin: true });
  });

  els.difficultyList.addEventListener('change', (event) => {
    if (event.target && event.target.name === 'difficulty') {
      state.difficulty = event.target.value;
      renderActivities();
      state.seed = randomSeed();
      generateWorksheet();
    }
  });

  els.activityPicker.addEventListener('click', (event) => {
    const button = event.target.closest('[data-activity]');
    if (!button) return;
    state.activity = button.dataset.activity;
    renderActivities();
    generateWorksheet();
  });

  els.themePicker.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme]');
    if (!button) return;
    state.theme = button.dataset.theme;
    renderThemes();
    generateWorksheet();
  });

  els.themeSearch.addEventListener('input', () => {
    renderThemes();
  });

  els.problemPills.addEventListener('change', (event) => {
    if (event.target && event.target.name === 'problems') {
      state.problems = Number(event.target.value);
      generateWorksheet();
    }
  });

  els.answerKey.addEventListener('change', () => {
    state.includeKey = els.answerKey.checked;
    generateWorksheet();
  });

  els.printButton.addEventListener('click', openPrintPage);
  els.shuffleButton.addEventListener('click', randomize);

  window.addEventListener('resize', scheduleFit);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(els.canvas);
  }
}

function init() {
  const initial = readInitialState();
  state.difficulty = initial.level;
  state.activity = initial.activity;
  state.theme = initial.theme;
  state.problems = initial.problems;
  state.seed = initial.seed;
  state.includeKey = initial.includeKey;

  renderDifficulty();
  renderActivities();
  renderThemes();
  syncProblemPills();
  els.answerKey.checked = state.includeKey;

  bindEvents();
  generateWorksheet({ announce: false });

  if (els.year) els.year.textContent = new Date().getFullYear();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }
}

init();