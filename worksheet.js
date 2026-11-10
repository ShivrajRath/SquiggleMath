/* =========================================================
   SquiggleMath — standalone print page
   Reads ?id=<catalogue id> (or a custom ?level=…&activity=…
   recipe), renders the A4 worksheet and prints only the sheet.
   ========================================================= */

'use strict';

const {
  DIFFICULTIES,
  THEMES,
  ACTIVITY_INFO,
  LEVEL_PLAN,
  MAX_PROBLEMS,
  catalogFor,
  findSheet,
  buildWorksheet,
  randomSeed,
  addThinkingSpace,
  SHEET_WIDTH,
} = window.SquiggleMath;

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const DEFAULT_ACTIVITY = {
  prek: 'mixed-prek',
  k: 'mixed10',
  g1: 'mixed20',
};

const state = {
  entry: null,
  result: null,
  includeKey: false,
  invalidId: false,
  titleBefore: null,
  resizeFrame: null,
  toastTimer: null,
};

const els = {
  frame: $('#print-frame'),
  canvas: $('#print-canvas'),
  printArea: $('#print-area'),
  title: $('#print-title'),
  eyebrow: $('#print-eyebrow'),
  meta: $('#print-meta'),
  key: $('#print-key'),
  keyWrap: $('#print-key-wrap'),
  keyLabel: $('#print-key-label'),
  printButton: $('#print-button'),
  toast: $('#print-toast'),
};

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function resolveEntry() {
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id');
  const catalogEntry = requestedId ? findSheet(requestedId) : null;

  if (catalogEntry) return { entry: catalogEntry, invalidId: false };

  const hasCustomRecipe = ['level', 'activity', 'theme', 'problems', 'seed'].some((key) => params.has(key));
  if (!requestedId && !hasCustomRecipe) {
    return { entry: findSheet('prek-trace-01'), invalidId: false };
  }

  const level = DIFFICULTIES[params.get('level')] ? params.get('level') : 'prek';
  const activities = LEVEL_PLAN[level] || LEVEL_PLAN.prek;
  const requestedActivity = params.get('activity');
  const activity = activities.includes(requestedActivity) ? requestedActivity : DEFAULT_ACTIVITY[level];
  const theme = THEMES[params.get('theme')] ? params.get('theme') : 'dinos';
  const problems = clampNumber(params.get('problems'), 10, 1, MAX_PROBLEMS);
  const seed = clampNumber(params.get('seed'), randomSeed(), 1, 2147483646);

  return {
    invalidId: Boolean(requestedId),
    entry: {
      category: level,
      difficulty: level,
      activity,
      theme,
      problems,
      seed,
      title: null,
      subtitle: null,
      tags: null,
      number: null,
      custom: true,
    },
  };
}

function countDescription(entry) {
  if (entry.activity === 'trace' && Array.isArray(entry.range)) {
    return `Numbers ${entry.range[0]}–${entry.range[1]}`;
  }
  if (entry.activity === 'mixed-prek') return 'Tracing + counting';
  return `${entry.problems} ${ACTIVITY_INFO[entry.activity].unit}`;
}

function syncHeader() {
  const { entry, result } = state;
  const theme = result.theme;
  const info = ACTIVITY_INFO[result.activity];

  document.title = `${result.title} | SquiggleMath`;
  els.title.textContent = result.title;
  els.eyebrow.textContent = `${result.difficulty.badge} • ${info.label}`;

  const bits = [];
  if (entry.custom) {
    bits.push('Custom worksheet');
  } else if (entry.number) {
    bits.push(`Sheet ${entry.number} of ${catalogFor(entry.category).length}`);
  }
  bits.push(`${theme.emoji} ${theme.name}`);
  bits.push(countDescription(entry));
  els.meta.textContent = bits.join(' • ');

  const hasAnswers = result.answers.length > 0;
  els.key.disabled = !hasAnswers;
  els.keyWrap.classList.toggle('is-disabled', !hasAnswers);
  els.key.checked = state.includeKey && hasAnswers;
  els.keyLabel.textContent = hasAnswers ? 'Answer key' : 'No answer key needed';
}

function scheduleFit() {
  if (state.resizeFrame) cancelAnimationFrame(state.resizeFrame);
  state.resizeFrame = requestAnimationFrame(() => {
    fitPreview();
    state.resizeFrame = null;
  });
}

function fitPreview() {
  const frame = els.frame;
  const canvas = els.canvas;
  if (!frame || !canvas) return;
  const available = frame.clientWidth;
  if (!available) return;

  const scale = Math.min(1, available / SHEET_WIDTH);
  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = 'top left';
  canvas.style.left = `${Math.max(0, (available - SHEET_WIDTH * scale) / 2)}px`;
  frame.style.height = `${Math.ceil(canvas.scrollHeight * scale)}px`;
}

function render() {
  const { entry } = state;
  const result = buildWorksheet({
    ...entry,
    difficulty: entry.category,
    includeKey: state.includeKey,
  });

  state.result = result;
  if (!result.answers.length) state.includeKey = false;
  if (!result.answers.length) updateUrl();

  els.canvas.innerHTML = result.html;
  addThinkingSpace(els.canvas);
  syncHeader();

  fitPreview();
  scheduleFit();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }
}

function updateUrl() {
  const url = new URL(window.location.href);
  if (state.includeKey) url.searchParams.set('key', '1');
  else url.searchParams.delete('key');
  window.history.replaceState(null, '', url);
}

function preparePrintArea() {
  if (!state.result) return;
  const sheets = $$('.worksheet', els.canvas);
  if (!sheets.length) return;

  if (state.titleBefore === null) state.titleBefore = document.title;
  document.title = `${state.result.title} | SquiggleMath`;

  els.printArea.innerHTML = '';
  sheets.forEach((sheet) => {
    const clone = sheet.cloneNode(true);
    clone.classList.add('print-sheet');
    clone.removeAttribute('style');
    const accent = sheet.style.getPropertyValue('--ws-accent');
    const soft = sheet.style.getPropertyValue('--ws-accent-soft');
    if (accent) clone.style.setProperty('--ws-accent', accent);
    if (soft) clone.style.setProperty('--ws-accent-soft', soft);
    els.printArea.appendChild(clone);
  });
}

function cleanupPrintArea() {
  els.printArea.innerHTML = '';
  if (state.titleBefore !== null) {
    document.title = state.titleBefore;
    state.titleBefore = null;
  }
}

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    els.toast.classList.remove('is-visible');
  }, 3200);
}

function bindEvents() {
  els.key.addEventListener('change', () => {
    state.includeKey = els.key.checked && state.result.answers.length > 0;
    updateUrl();
    render();
  });

  els.printButton.addEventListener('click', () => window.print());

  window.addEventListener('resize', scheduleFit);
  window.addEventListener('beforeprint', preparePrintArea);
  window.addEventListener('afterprint', cleanupPrintArea);

  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'p' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.closest('input, textarea, select, button, a')) return;
    event.preventDefault();
    window.print();
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(els.canvas);
  }
}

function init() {
  const resolved = resolveEntry();
  if (!resolved.entry) return;

  state.entry = resolved.entry;
  state.invalidId = resolved.invalidId;
  state.includeKey = new URLSearchParams(window.location.search).get('key') === '1';

  bindEvents();
  render();

  if (state.invalidId) {
    showToast('That worksheet link was not found — here is a favourite instead.');
  }
}

init();
