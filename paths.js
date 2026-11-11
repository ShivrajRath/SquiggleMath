/* =========================================================
   SquiggleMath — guided learning paths
   Four weeks per age, three short sessions each. Progress is
   stored locally; every session opens a stable print recipe.
   ========================================================= */

'use strict';

(function () {
  const SM = window.SquiggleMath;
  if (!SM) {
    const fallback = document.getElementById('path-summary');
    if (fallback) fallback.textContent = 'The path data could not load. Please refresh the page.';
    return;
  }

  const { DIFFICULTIES, THEMES, ACTIVITY_INFO } = SM;
  const STORAGE_KEY = 'squigglemath.paths.v1';
  const AGE_ORDER = ['prek', 'k', 'g1'];

  const PATHS = {
    prek: {
      title: 'First Marks',
      emoji: '🖍️',
      blurb: 'Pencil control, counting to five, colours and shapes — a gentle first lap with plenty of room for little hands.',
      minutes: 8,
      tip: 'Short and happy beats long and tired. Stop while it still feels like play.',
      weeks: [
        {
          title: 'Making marks',
          focus: 'Pencil grip, tracing and one-to-one counting',
          icon: '✏️',
          sessions: [
            { activity: 'prewrite', theme: 'dinos', problems: 5, note: 'Big wavy and zigzag paths — staying on the line is a bonus.' },
            { activity: 'trace', theme: 'farm', problems: 5, note: 'Trace one number, then try the next one alone.' },
            { activity: 'count', theme: 'ocean', problems: 4, note: 'Touch each picture once as you count.' },
          ],
        },
        {
          title: 'Colours & shapes',
          focus: 'Colour names, shape spotting and size words',
          icon: '🎨',
          sessions: [
            { activity: 'colors', theme: 'candy', problems: 5, note: 'Name the colour out loud before you colour.' },
            { activity: 'shapes', theme: 'bugs', problems: 4, note: 'Count the sides with a finger.' },
            { activity: 'compare', theme: 'safari', problems: 4, note: 'Use the words bigger and smaller.' },
          ],
        },
        {
          title: 'Look & find',
          focus: 'Visual discrimination, number spotting and position words',
          icon: '🔍',
          sessions: [
            { activity: 'numberhunt', theme: 'space', problems: 5, note: 'Circle the number, then say its name.' },
            { activity: 'samediff', theme: 'jungle', problems: 4, note: 'Talk about what is the same first.' },
            { activity: 'position', theme: 'farm', problems: 4, note: 'Act it out with a toy if you can.' },
          ],
        },
        {
          title: 'Count & play',
          focus: 'Count, colour, patterns and a mixed celebration',
          icon: '⭐',
          sessions: [
            { activity: 'dots', theme: 'garden', problems: 5, note: 'Colour exactly as many dots as the number says.' },
            { activity: 'patterns', theme: 'circus', problems: 4, note: 'Say the pattern out loud before you draw.' },
            { activity: 'mixed-prek', theme: 'dinos', problems: 5, note: 'A little bit of everything you have practised.' },
          ],
        },
      ],
    },
    k: {
      title: 'Number Explorers',
      emoji: '🧩',
      blurb: 'Numbers to ten, teen numbers and first addition, with pictures there whenever your child needs them.',
      minutes: 12,
      tip: 'Let your child use counters or fingers. Understanding matters more than speed.',
      weeks: [
        {
          title: 'Numbers to 10',
          focus: 'Counting, tallies and one more / one less',
          icon: '🔢',
          sessions: [
            { activity: 'count', theme: 'ocean', problems: 8, note: 'Count in a tidy line, not a wiggly one.' },
            { activity: 'tally', theme: 'space', problems: 8, note: 'Bundle five tallies with a cross.' },
            { activity: 'beforeafter', theme: 'monsters', problems: 8, note: 'Say the number before and after out loud.' },
          ],
        },
        {
          title: 'Make ten & teens',
          focus: 'Ten-frames, teen numbers and ordering',
          icon: '🔟',
          sessions: [
            { activity: 'maketen', theme: 'candy', problems: 8, note: 'Use the empty boxes to see how many more.' },
            { activity: 'teen', theme: 'robots', problems: 8, note: 'Find the full ten first, then count the extras.' },
            { activity: 'numberorder', theme: 'garden', problems: 8, note: 'Say the numbers in order as you write.' },
          ],
        },
        {
          title: 'Add & take away',
          focus: 'First addition, subtraction and mixed facts to 10',
          icon: '➕',
          sessions: [
            { activity: 'add10', theme: 'farm', problems: 8, note: 'Use fingers or counters if you need them.' },
            { activity: 'sub10', theme: 'pets', problems: 8, note: 'Cross out the ones you take away.' },
            { activity: 'mixed10', theme: 'dinos', problems: 8, note: 'Read the sign before you start each line.' },
          ],
        },
        {
          title: 'Shapes & data',
          focus: 'Measuring, 2D/3D shapes and a picture graph',
          icon: '📊',
          sessions: [
            { activity: 'measure', theme: 'camping', problems: 6, note: 'Line up one end before you compare.' },
            { activity: 'shapesort', theme: 'construction', problems: 6, note: 'Feel the shape: flat or solid?' },
            { activity: 'graph', theme: 'zoo', problems: 8, note: 'Count the pictures in each row.' },
          ],
        },
      ],
    },
    g1: {
      title: 'Fact Fluency',
      emoji: '🚀',
      blurb: 'Facts to twenty, place value, money and fractions — four weeks of confident Grade 1 practice.',
      minutes: 15,
      tip: 'Ask “how did you work that out?” — explaining is where the learning sticks.',
      weeks: [
        {
          title: 'Facts to 20',
          focus: 'Addition, subtraction and mixed facts within twenty',
          icon: '⚡',
          sessions: [
            { activity: 'add20', theme: 'space', problems: 12, note: 'Try making ten first.' },
            { activity: 'sub20', theme: 'ocean', problems: 12, note: 'Count back or think of the missing part.' },
            { activity: 'mixed20', theme: 'dinos', problems: 12, note: 'Check the sign on every line.' },
          ],
        },
        {
          title: 'Place value',
          focus: 'Tens and ones, ten more / ten less and number lines',
          icon: '🏢',
          sessions: [
            { activity: 'place100', theme: 'robots', problems: 10, note: 'Say how many tens and ones.' },
            { activity: 'moreless', theme: 'trains', problems: 10, note: 'The tens digit changes; the ones digit stays.' },
            { activity: 'numberline', theme: 'garden', problems: 10, note: 'Start at the first number, then hop.' },
          ],
        },
        {
          title: 'Money, time & balance',
          focus: 'Coins, clocks and equal equations',
          icon: '🪙',
          sessions: [
            { activity: 'money', theme: 'bakery', problems: 10, note: 'Count the biggest coins first.' },
            { activity: 'time', theme: 'weather', problems: 10, note: 'The short hand shows the hour.' },
            { activity: 'balance', theme: 'candy', problems: 12, note: 'Both sides must be worth the same.' },
          ],
        },
        {
          title: 'Fractions & data',
          focus: 'Fractions of shapes and sets, plus graph reading',
          icon: '🍕',
          sessions: [
            { activity: 'fractionsset', theme: 'icecream', problems: 12, note: 'Shade only the part the fraction asks for.' },
            { activity: 'fractions', theme: 'pizza', problems: 10, note: 'Count the equal parts first.' },
            { activity: 'graph', theme: 'zoo', problems: 10, note: 'Read the question before counting.' },
          ],
        },
      ],
    },
  };

  const els = {
    tabs: document.getElementById('path-age-tabs'),
    summary: document.getElementById('path-summary'),
    weeks: document.getElementById('path-panel'),
    reset: document.getElementById('path-reset'),
    live: document.getElementById('path-live'),
  };

  const state = {
    level: initialLevel(),
    progress: loadProgress(),
  };

  let liveTimer = null;

  function initialLevel() {
    const requested = new URLSearchParams(window.location.search).get('level');
    return PATHS[requested] ? requested : 'prek';
  }

  function allSessions(level) {
    return PATHS[level].weeks.flatMap((week, weekIndex) =>
      week.sessions.map((session, sessionIndex) => ({
        ...session,
        id: `${level}-w${weekIndex + 1}-s${sessionIndex + 1}`,
        weekIndex,
        weekTitle: week.title,
        info: ACTIVITY_INFO[session.activity] || {
          label: session.activity,
          short: session.activity,
          unit: 'tasks',
          group: 'Practice',
          icon: '✏️',
        },
        themeInfo: THEMES[session.theme] || { name: session.theme, emoji: '✨' },
      }))
    );
  }

  function validIds(level) {
    return new Set(allSessions(level).map((session) => session.id));
  }

  function doneSet(level) {
    const valid = validIds(level);
    return new Set((state.progress[level] || []).filter((id) => valid.has(id)));
  }

  function countDone(level) {
    return doneSet(level).size;
  }

  function loadProgress() {
    let parsed = {};
    try {
      parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (error) {
      parsed = {};
    }

    const progress = {};
    for (const level of AGE_ORDER) {
      const valid = validIds(level);
      const saved = Array.isArray(parsed[level]) ? parsed[level] : [];
      progress[level] = [...new Set(saved.filter((id) => valid.has(id)))];
    }
    return progress;
  }

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
    } catch (error) {
      /* Private mode or a full store — progress still works for this visit. */
    }
  }

  function seedFor(id) {
    let hash = 2166136261;
    for (let index = 0; index < id.length; index += 1) {
      hash ^= id.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (Math.abs(hash) % 2147483000) + 1;
  }

  function sessionHref(level, session) {
    const params = new URLSearchParams({
      level,
      activity: session.activity,
      theme: session.theme,
      problems: String(session.problems),
      seed: String(seedFor(session.id)),
    });
    return `worksheet.html?${params.toString()}`;
  }

  function renderTabs() {
    els.tabs.innerHTML = AGE_ORDER.map((level) => {
      const diff = DIFFICULTIES[level];
      const active = level === state.level;
      return `
        <button
          class="path-age-tab path-age-tab--${level}"
          type="button"
          role="tab"
          id="path-tab-${level}"
          aria-selected="${active}"
          aria-controls="path-panel"
          tabindex="${active ? '0' : '-1'}"
          data-level="${level}"
        >
          <span class="path-age-tab__emoji" aria-hidden="true">${diff.emoji}</span>
          <span class="path-age-tab__name">${diff.label}
            <span class="path-age-tab__ages">${diff.ages} · <span data-age-count="${level}">${countDone(level)}/${allSessions(level).length}</span></span>
          </span>
        </button>
      `;
    }).join('');
  }

  function updateTabCounts() {
    els.tabs.querySelectorAll('[data-age-count]').forEach((node) => {
      const level = node.dataset.ageCount;
      node.textContent = `${countDone(level)}/${allSessions(level).length}`;
    });
  }

  function renderSummary() {
    const level = state.level;
    const path = PATHS[level];
    const diff = DIFFICULTIES[level];
    const sessions = allSessions(level);
    const done = doneSet(level);
    const completed = sessions.filter((session) => done.has(session.id)).length;
    const percent = Math.round((completed / sessions.length) * 100);
    const allDone = completed === sessions.length;
    const next = sessions.find((session) => !done.has(session.id)) || sessions[0];
    const nextLevel = AGE_ORDER[AGE_ORDER.indexOf(level) + 1];

    const action = allDone
      ? `
        <div class="path-complete">
          <span class="path-complete__star" aria-hidden="true">⭐</span>
          <div><strong>Path complete!</strong><small>12 sessions of big little wins.</small></div>
        </div>
        <a class="path-summary__next" href="${nextLevel ? `?level=${nextLevel}` : 'worksheets.html'}">
          ${nextLevel ? `Try the ${DIFFICULTIES[nextLevel].label} path` : 'Browse more Grade 1 sheets'} <span aria-hidden="true">→</span>
        </a>
      `
      : `
        <a class="btn btn--primary path-continue" href="${sessionHref(level, next)}" target="_blank" rel="noopener">
          ${completed ? 'Continue' : 'Start'} with ${next.info.short} <span aria-hidden="true">→</span>
        </a>
      `;

    els.summary.className = `path-summary path-summary--${level}`;
    els.summary.dataset.level = level;
    els.summary.innerHTML = `
      <div class="path-summary__main">
        <div class="path-ring" style="--pct:${percent}" role="img" aria-label="${completed} of ${sessions.length} sessions complete">
          <span>${percent}%</span>
        </div>
        <div class="path-summary__copy">
          <p class="path-kicker">${diff.emoji} ${diff.label} guided path</p>
          <h2>${path.title}</h2>
          <p class="path-summary__blurb">${path.blurb}</p>
          <p class="path-summary__meta">4 weeks · ${completed} of ${sessions.length} done · about ${path.minutes} min each</p>
        </div>
      </div>
      <div class="path-summary__side">
        ${action}
        <p class="path-summary__tip"><span aria-hidden="true">💡</span> ${path.tip}</p>
      </div>
    `;
  }

  function renderWeeks() {
    const level = state.level;
    const done = doneSet(level);
    els.weeks.dataset.level = level;
    els.weeks.setAttribute('aria-labelledby', `path-tab-${level}`);
    els.weeks.innerHTML = PATHS[level].weeks.map((week, weekIndex) => {
      const sessions = week.sessions.map((session, sessionIndex) => {
        const id = `${level}-w${weekIndex + 1}-s${sessionIndex + 1}`;
        const info = ACTIVITY_INFO[session.activity] || {
          label: session.activity,
          short: session.activity,
          unit: 'tasks',
          group: 'Practice',
          icon: '✏️',
        };
        const theme = THEMES[session.theme] || { name: session.theme, emoji: '✨' };
        const isDone = done.has(id);
        return `
          <li class="path-session${isDone ? ' is-done' : ''}">
            <label class="path-check">
              <input
                type="checkbox"
                data-session="${id}"
                data-label="${info.label}"
                ${isDone ? 'checked' : ''}
                aria-label="Mark ${info.label} complete"
              >
            </label>
            <span class="path-session__icon" aria-hidden="true">${info.icon}</span>
            <div class="path-session__body">
              <p class="path-session__title">${info.label}<span class="path-session__theme">${theme.emoji} ${theme.name}</span></p>
              <p class="path-session__note">${session.note}</p>
              <p class="path-session__meta">${info.group} · ${session.problems} ${info.unit} · ~${PATHS[level].minutes} min</p>
            </div>
            <a class="path-session__open" href="${sessionHref(level, { ...session, id })}" target="_blank" rel="noopener" aria-label="${info.label} worksheet (opens print page)">
              Open sheet <span aria-hidden="true">↗</span>
            </a>
          </li>
        `;
      }).join('');

      const doneCount = week.sessions.filter((session, sessionIndex) =>
        done.has(`${level}-w${weekIndex + 1}-s${sessionIndex + 1}`)
      ).length;
      const complete = doneCount === week.sessions.length;

      return `
        <article class="path-week${complete ? ' is-complete' : ''}" aria-labelledby="path-week-${weekIndex + 1}">
          <header class="path-week__head">
            <span class="path-week__icon" aria-hidden="true">${week.icon}</span>
            <div class="path-week__copy">
              <p class="path-week__kicker">Week ${weekIndex + 1}</p>
              <h3 id="path-week-${weekIndex + 1}">${week.title}</h3>
              <p>${week.focus}</p>
            </div>
            <span class="path-week__count">${complete ? `⭐ ${doneCount}/${week.sessions.length}` : `${doneCount}/${week.sessions.length} done`}</span>
          </header>
          <ol class="path-sessions">${sessions}</ol>
        </article>
      `;
    }).join('');
  }

  function renderAll() {
    document.body.dataset.level = state.level;
    document.title = `${PATHS[state.level].title} — ${DIFFICULTIES[state.level].label} path | SquiggleMath`;
    renderTabs();
    renderSummary();
    renderWeeks();
  }

  function selectLevel(level, focusTab) {
    if (!PATHS[level] || level === state.level) return;
    state.level = level;

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('level', level);
      window.history.replaceState(null, '', url);
    } catch (error) {
      /* file:// can refuse history changes; the page still works. */
    }

    renderAll();
    if (focusTab) {
      const activeTab = document.getElementById(`path-tab-${level}`);
      if (activeTab) activeTab.focus();
    }
  }

  function updateWeek(weekEl) {
    const boxes = [...weekEl.querySelectorAll('input[data-session]')];
    const done = boxes.filter((box) => box.checked).length;
    const complete = done === boxes.length;
    weekEl.classList.toggle('is-complete', complete);
    boxes.forEach((box) => {
      box.closest('.path-session').classList.toggle('is-done', box.checked);
    });
    const count = weekEl.querySelector('.path-week__count');
    if (count) count.textContent = complete ? `⭐ ${done}/${boxes.length}` : `${done}/${boxes.length} done`;
  }

  function announce(message) {
    if (!els.live) return;
    window.clearTimeout(liveTimer);
    els.live.textContent = '';
    liveTimer = window.setTimeout(() => {
      els.live.textContent = message;
    }, 40);
  }

  els.weeks.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-session]');
    if (!input) return;

    const level = state.level;
    const done = doneSet(level);
    if (input.checked) done.add(input.dataset.session);
    else done.delete(input.dataset.session);
    state.progress[level] = [...done];
    persist();

    const weekEl = input.closest('.path-week');
    if (weekEl) updateWeek(weekEl);
    renderSummary();
    updateTabCounts();

    const total = allSessions(level).length;
    announce(`${input.dataset.label} ${input.checked ? 'marked done' : 'marked not done'}. ${countDone(level)} of ${total} sessions complete.`);
  });

  els.tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-level]');
    if (button) selectLevel(button.dataset.level, true);
  });

  els.tabs.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...els.tabs.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;

    event.preventDefault();
    let next = current;
    if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    tabs[next].focus();
    tabs[next].click();
  });

  els.reset.addEventListener('click', () => {
    const level = state.level;
    const label = DIFFICULTIES[level].label;
    const confirmed = window.confirm(`Clear your ${label} path progress? This cannot be undone.`);
    if (!confirmed) return;

    state.progress[level] = [];
    persist();
    renderAll();
    announce(`${label} path progress cleared.`);
    els.reset.focus();
  });

  renderAll();
})();
