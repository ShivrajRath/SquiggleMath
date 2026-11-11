/* =========================================================
   SquiggleMath — worksheet studio (generator page)

   Age-first flow: pick a band, a skill, a theme and an amount
   of practice. Every control re-renders the live A4 preview.
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

const LEVEL_HINTS = {
  prek: 'First marks, counting to 5, colours',
  k: 'Numbers to 10, adding, shapes',
  g1: 'Facts to 20, place value, data',
};

const STARTER_ACTIVITIES = ['prewrite', 'mixed-prek', 'count', 'maketen', 'add10', 'balance', 'add20', 'word'];

const state = {
  difficulty: 'prek',
  activity: 'mixed-prek',
  theme: 'dinos',
  group: 'all',
  problems: 5,
  includeKey: false,
  seed: randomSeed(),
  lastResult: null,
  lastConfig: null,
  toastTimer: null,
  resizeFrame: null,
  generateTimer: null,
};

const els = {
  form: $('#generator-form'),
  ageCards: $('#age-cards'),
  ageHint: $('#age-hint'),
  skillFilter: $('#skill-filter'),
  activityPicker: $('#activity-picker'),
  activityCount: $('#activity-count'),
  activityHint: $('#activity-hint'),
  problemPills: $('#problem-pills'),
  problemHint: $('#problem-hint'),
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
  teacherCard: $('#teacher-card'),
  ageRibbon: $('#age-ribbon'),
};

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  const level = DIFFICULTIES[params.get('level')] ? params.get('level') : 'prek';
  const band = DIFFICULTIES[level];
  const activities = generatorActivitiesFor(level);
  const requestedActivity = params.get('activity');
  const activity = activities.includes(requestedActivity) ? requestedActivity : (band.defaultActivity || activities[0]);
  const theme = THEMES[params.get('theme')] ? params.get('theme') : 'dinos';
  const problems = clampNumber(params.get('problems'), band.defaultProblems, 1, band.maxProblems);
  const seed = clampNumber(params.get('seed'), randomSeed(), 1, 2147483646);
  const group = ACTIVITY_GROUPS.includes(params.get('group')) ? params.get('group') : 'all';
  return { level, activity, theme, problems, seed, group, includeKey: params.get('key') === '1' };
}

/* ---------- renderers ---------- */

function renderAgeCards() {
  els.ageCards.innerHTML = Object.entries(DIFFICULTIES).map(([key, info]) => {
    const active = key === state.difficulty;
    return `<label class="age-card${active ? ' is-active' : ''}">
      <input type="radio" name="difficulty" value="${key}" ${active ? 'checked' : ''}>
      <span class="age-card__emoji" aria-hidden="true">${info.emoji}</span>
      <span class="age-card__body">
        <span class="age-card__title">${info.label}</span>
        <span class="age-card__ages">${info.ages}</span>
        <span class="age-card__focus">${LEVEL_HINTS[key]}</span>
      </span>
      <span class="age-card__check" aria-hidden="true">✓</span>
    </label>`;
  }).join('');

  const band = DIFFICULTIES[state.difficulty];
  els.ageHint.textContent = band.promise;
}

function currentActivities() {
  const activities = generatorActivitiesFor(state.difficulty);
  return state.group === 'all'
    ? activities
    : activities.filter((activity) => ACTIVITY_INFO[activity].group === state.group);
}

function renderSkillFilter() {
  const activities = generatorActivitiesFor(state.difficulty);
  const groups = ACTIVITY_GROUPS
    .map((group) => ({ group, count: activities.filter((activity) => ACTIVITY_INFO[activity].group === group).length }))
    .filter((group) => group.count > 0);

  if (state.group !== 'all' && !groups.some((group) => group.group === state.group)) {
    state.group = 'all';
  }

  els.skillFilter.innerHTML = [
    `<button type="button" class="skill-chip${state.group === 'all' ? ' is-active' : ''}" data-group="all" aria-pressed="${state.group === 'all'}">All skills <span>${activities.length}</span></button>`,
    ...groups.map(({ group, count }) => `<button type="button" class="skill-chip${state.group === group ? ' is-active' : ''}" data-group="${group}" aria-pressed="${state.group === group}">${group} <span>${count}</span></button>`),
  ].join('');
}

function renderActivities() {
  const activities = currentActivities();
  if (!activities.includes(state.activity)) {
    state.activity = activities[0] || DIFFICULTIES[state.difficulty].defaultActivity;
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
          const starter = STARTER_ACTIVITIES.includes(activity) && info.starter !== false;
          return `<button type="button" class="activity-tile${active ? ' is-active' : ''}" data-activity="${activity}" aria-pressed="${active}">
            <span class="activity-tile__icon" aria-hidden="true">${info.icon}</span>
            <span class="activity-tile__text">
              <span class="activity-tile__name"><strong>${info.label}</strong>${starter ? '<em class="activity-tile__flag">Start here</em>' : ''}</span>
              <small>${info.description}</small>
            </span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  const count = currentActivities().length;
  els.activityCount.textContent = `${count} ${count === 1 ? 'activity' : 'activities'}`;

  const info = ACTIVITY_INFO[state.activity];
  els.activityHint.textContent = info ? `${info.unit[0].toUpperCase()}${info.unit.slice(1)} · ${info.description}` : '';
}

function renderThemes() {
  const query = (els.themeSearch.value || '').trim().toLowerCase();
  const keys = Object.keys(THEMES).filter((key) => {
    if (!query) return true;
    const theme = THEMES[key];
    return theme.name.toLowerCase().includes(query) || theme.emoji.includes(query);
  });

  els.themePicker.innerHTML = keys.length
    ? keys.map((key) => {
      const theme = THEMES[key];
      const active = key === state.theme;
      return `<button type="button" class="theme-tile${active ? ' is-active' : ''}" data-theme="${key}" aria-pressed="${active}" title="${theme.hint}">
        <span class="theme-tile__emoji" aria-hidden="true">${theme.emoji}</span>
        <span class="theme-tile__name">${theme.name}</span>
      </button>`;
    }).join('')
    : '<p class="picker-empty">No themes match that search.</p>';

  const theme = THEMES[state.theme] || THEMES.dinos;
  els.themeHint.textContent = theme.hint;
}

function renderProblemPills() {
  const band = DIFFICULTIES[state.difficulty];
  const choices = band.problemChoices;
  if (!choices.includes(state.problems)) {
    state.problems = choices.includes(band.defaultProblems) ? band.defaultProblems : choices[0];
  }

  els.problemPills.innerHTML = choices.map((value) => `
    <label>
      <input type="radio" name="problems" value="${value}" ${value === state.problems ? 'checked' : ''}>
      <span>${value}${value === choices[choices.length - 1] ? '' : ''}</span>
    </label>
  `).join('');

  const unit = (ACTIVITY_INFO[state.activity] || {}).unit || 'problems';
  els.problemHint.textContent = state.difficulty === 'prek'
    ? `${state.problems} big ${unit} — plenty of room for little hands.`
    : `${state.problems} ${unit} · about ${band.session.toLowerCase()}`;
}

function renderTeacherCard() {
  const band = DIFFICULTIES[state.difficulty];
  const info = ACTIVITY_INFO[state.activity] || {};
  els.teacherCard.innerHTML = `
    <p class="teacher-card__kicker">For the grown-up</p>
    <p class="teacher-card__focus">${band.focus}</p>
    <p class="teacher-card__skill">${info.label || 'Math practice'} · ${band.label} ${band.ages.toLowerCase()}</p>
    <ul class="teacher-card__list">
      <li><span aria-hidden="true">🕒</span>${band.session}</li>
      <li><span aria-hidden="true">🖍️</span>${band.materials}</li>
    </ul>
    <p class="teacher-card__tip"><strong>Try saying:</strong> ${band.talk}</p>
    <p class="teacher-card__tip teacher-card__tip--soft">${band.tip}</p>
  `;
}

function renderAgeRibbon(result) {
  const band = DIFFICULTIES[state.difficulty];
  const unit = (ACTIVITY_INFO[result.activity] || {}).unit || 'problems';
  els.ageRibbon.innerHTML = `
    <span class="age-ribbon__badge">${band.label}</span>
    <span>${band.ages}</span>
    <span aria-hidden="true">·</span>
    <span>${result.count} ${unit}</span>
    <span aria-hidden="true">·</span>
    <span>${band.session}</span>
  `;
}

/* ---------- preview ---------- */

function syncProblemPills() {
  $$('input[name="problems"]', els.problemPills).forEach((radio) => {
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

  const info = ACTIVITY_INFO[result.activity] || {};
  const pageCopy = result.pageCount > 1 ? ` · ${result.pageCount} pages with key` : '';
  els.sheetStatus.textContent = `${result.difficulty.label} · ${info.label || 'Practice'} · ${result.count} ${info.unit || 'items'} · ${result.theme.emoji} ${result.theme.name}${pageCopy}`;
  renderAgeRibbon(result);
  renderTeacherCard();

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
  if (!opened) showToast('Allow pop-ups to open the print page 🖨️');
}

function randomize() {
  const levels = Object.keys(DIFFICULTIES);
  state.difficulty = levels[Math.floor(Math.random() * levels.length)];
  const band = DIFFICULTIES[state.difficulty];
  const activities = generatorActivitiesFor(state.difficulty);
  state.activity = activities[Math.floor(Math.random() * activities.length)];
  const themeKeys = Object.keys(THEMES);
  state.theme = themeKeys[Math.floor(Math.random() * themeKeys.length)];
  state.problems = band.problemChoices[Math.floor(Math.random() * band.problemChoices.length)];
  state.group = 'all';
  state.seed = randomSeed();
  renderAll();
  generateWorksheet({ announce: true, spin: true });
}

function updateUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('level', state.difficulty);
    url.searchParams.set('activity', state.activity);
    url.searchParams.set('theme', state.theme);
    url.searchParams.set('problems', String((state.lastConfig && state.lastConfig.problems) || state.problems));
    url.searchParams.set('seed', String(state.seed));
    if (state.group !== 'all') url.searchParams.set('group', state.group);
    else url.searchParams.delete('group');
    if (state.includeKey) url.searchParams.set('key', '1');
    else url.searchParams.delete('key');
    window.history.replaceState(null, '', url);
  } catch (error) {
    // ignore
  }
}

function renderAll() {
  renderAgeCards();
  renderSkillFilter();
  renderActivities();
  renderThemes();
  renderProblemPills();
  renderTeacherCard();
}

function bindEvents() {
  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    state.seed = randomSeed();
    generateWorksheet({ announce: true, spin: true });
  });

  els.ageCards.addEventListener('change', (event) => {
    if (event.target && event.target.name === 'difficulty') {
      state.difficulty = event.target.value;
      const band = DIFFICULTIES[state.difficulty];
      state.problems = band.defaultProblems;
      state.group = 'all';
      state.activity = band.defaultActivity;
      renderAll();
      state.seed = randomSeed();
      generateWorksheet();
    }
  });

  els.skillFilter.addEventListener('click', (event) => {
    const button = event.target.closest('[data-group]');
    if (!button) return;
    state.group = button.dataset.group;
    const activities = currentActivities();
    if (!activities.includes(state.activity) && activities.length) state.activity = activities[0];
    renderSkillFilter();
    renderActivities();
    renderProblemPills();
    generateWorksheet();
  });

  els.activityPicker.addEventListener('click', (event) => {
    const button = event.target.closest('[data-activity]');
    if (!button) return;
    state.activity = button.dataset.activity;
    renderActivities();
    renderProblemPills();
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
      renderProblemPills();
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
  state.group = initial.group;
  state.includeKey = initial.includeKey;

  renderAll();
  els.answerKey.checked = state.includeKey;

  bindEvents();
  generateWorksheet({ announce: false });

  if (els.year) els.year.textContent = new Date().getFullYear();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }
}

init();
