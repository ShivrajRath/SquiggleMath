/* =========================================================
   SquiggleMath — client-side worksheet engine
   No frameworks, no backend, no dependencies.

   How it fits together:
   1. PREMADE holds fixed "recipes" for the library cards. Each
      recipe has a seed, so a pre-made sheet looks identical every
      time it is opened (like a real printed resource).
   2. buildWorksheet() turns any recipe/config into questions and
      renders a printable A4 .worksheet element.
   3. The custom generator reads the form, creates a fresh random
      seed, and calls the same builder. Randomness is handled by a
      tiny seeded PRNG (mulberry32) so every sheet is repeatable
      from its recipe.
   4. Printing clones the active sheet into #print-area. A dedicated
      @media print block hides the whole site and shows only that
      clone at A4 size.
   ========================================================= */

'use strict';

/* ---------- small DOM helpers ---------- */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const SHEET_WIDTH = 794; // 210mm at 96dpi — our on-screen A4 canvas
const SHEET_HEIGHT = 1123; // 297mm at 96dpi
const MAX_PROBLEMS = 20;

/* =========================================================
   Configuration data
   ========================================================= */

const DIFFICULTIES = {
  prek: {
    label: 'Pre-K',
    ages: 'Ages 3–4',
    badge: 'Pre-K • Ages 3–4',
    shortBadge: 'Pre-K',
  },
  k: {
    label: 'Kindergarten',
    ages: 'Ages 5–6',
    badge: 'Kindergarten • Ages 5–6',
    shortBadge: 'Kindergarten',
  },
  g1: {
    label: '1st Grade',
    ages: 'Ages 6–7',
    badge: '1st Grade • Ages 6–7',
    shortBadge: '1st Grade',
  },
};

const THEMES = {
  dinos: {
    name: 'Dinos',
    emoji: '🦖',
    styleName: 'Dino',
    accent: '#2f8f5b',
    soft: '#e3f8ea',
    deco: ['🦕', '🌿', '🥚'],
    characters: ['Rex', 'Dina', 'Trixie'],
    who: 'dino',
    items: ['leaves', 'dino eggs', 'ferns'],
    hint: 'Roar! Little dinos will love this one.',
  },
  space: {
    name: 'Space',
    emoji: '🚀',
    styleName: 'Space',
    accent: '#5a5bd6',
    soft: '#ecebff',
    deco: ['🚀', '🪐', '⭐'],
    characters: ['Ava', 'Cosmo', 'Nova'],
    who: 'astronaut',
    items: ['stars', 'moon rocks', 'meteors'],
    hint: '3… 2… 1… blast off into maths!',
  },
  monsters: {
    name: 'Monsters',
    emoji: '👾',
    styleName: 'Monster',
    accent: '#a447c7',
    soft: '#f8e9ff',
    deco: ['👾', '🎃', '👻'],
    characters: ['Milo', 'Ziggy', 'Nia'],
    who: 'monster',
    items: ['googly eyes', 'candies', 'bouncy balls'],
    hint: 'Friendly monsters, zero scary maths.',
  },
  ocean: {
    name: 'Ocean',
    emoji: '🐳',
    styleName: 'Ocean',
    accent: '#0e86a8',
    soft: '#e0f6fb',
    deco: ['🐙', '🐠', '🫧'],
    characters: ['Finn', 'Coral', 'Bubbles'],
    who: 'ocean explorer',
    items: ['shells', 'pearls', 'bubbles'],
    hint: 'Dive in for a splash of number fun.',
  },
};

/* Pre-made library recipes ------------------------------------------------
   activity:
     trace | count | shapes | compare | mixed-prek
     add10 | sub10 | mixed10 | bonds | tally
     add20 | sub20 | mixed20 | missing | word
   seed: makes the worksheet deterministic (stable pre-made resource).     */

const PREMADE = [
  {
    id: 'prek-trace',
    category: 'prek',
    title: 'Trace & Race',
    activity: 'trace',
    problems: 10,
    theme: 'dinos',
    seed: 314152,
    tags: ['Number tracing', 'Fine motor'],
    blurb: 'Big dashed numbers 1–10 with room to trace, then try all alone.',
    subtitle: 'Start at the dot, follow the dashes, and race to the end!',
  },
  {
    id: 'prek-count',
    category: 'prek',
    title: 'Count the Critters',
    activity: 'count',
    problems: 10,
    theme: 'ocean',
    seed: 271828,
    tags: ['Counting', 'Number writing'],
    blurb: 'Count the ocean friends and write the matching number in each box.',
    subtitle: 'Count the sea friends, then write how many you found.',
  },
  {
    id: 'prek-shapes',
    category: 'prek',
    title: 'Shape Safari',
    activity: 'shapes',
    problems: 12,
    theme: 'monsters',
    seed: 161803,
    tags: ['Shapes', 'Counting'],
    blurb: 'Spot circles, squares, triangles, and stars, then count them up.',
    subtitle: 'Meet the shape crew. Count each group and write the number.',
  },
  {
    id: 'prek-compare',
    category: 'prek',
    title: 'Big or Small?',
    activity: 'compare',
    problems: 8,
    theme: 'dinos',
    seed: 141421,
    tags: ['Size comparison', 'Visual skills'],
    blurb: 'Circle the bigger friend in each pair — or the smaller one!',
    subtitle: 'Look closely. Which one is bigger? Which one is smaller?',
  },
  {
    id: 'k-add',
    category: 'k',
    title: 'Add It Up!',
    activity: 'add10',
    problems: 10,
    theme: 'dinos',
    seed: 202401,
    tags: ['Addition', 'Sums to 10'],
    blurb: 'Friendly single-digit sums with plenty of space to write answers.',
    subtitle: 'Add the two groups. Write the answer in the box.',
  },
  {
    id: 'k-sub',
    category: 'k',
    title: 'Take It Away!',
    activity: 'sub10',
    problems: 10,
    theme: 'ocean',
    seed: 202402,
    tags: ['Subtraction', 'Within 10'],
    blurb: 'Simple take-away facts that build confidence with small numbers.',
    subtitle: 'Cross out, count what is left, and write the answer.',
  },
  {
    id: 'k-bonds',
    category: 'k',
    title: 'Number Bond Buddies',
    activity: 'bonds',
    problems: 12,
    theme: 'monsters',
    seed: 202403,
    tags: ['Number bonds', 'Fact fluency'],
    blurb: 'Find the missing part in each friendly number bond.',
    subtitle: 'The whole is at the top. What part is hiding below?',
  },
  {
    id: 'k-tally',
    category: 'k',
    title: 'Tally Up!',
    activity: 'tally',
    problems: 10,
    theme: 'space',
    seed: 202404,
    tags: ['Tally marks', 'Counting'],
    blurb: 'Count the tally marks in each box and write the matching number.',
    subtitle: 'Count the tallies. Remember: a bundle of five has a cross!',
  },
  {
    id: 'g1-add',
    category: 'g1',
    title: 'Super Sums to 20',
    activity: 'add20',
    problems: 15,
    theme: 'space',
    seed: 202501,
    tags: ['Addition', 'Facts to 20'],
    blurb: 'A galaxy of addition facts with sums all the way up to 20.',
    subtitle: 'Add carefully. Every answer is 20 or less.',
  },
  {
    id: 'g1-sub',
    category: 'g1',
    title: 'Subtraction Cadets',
    activity: 'sub20',
    problems: 15,
    theme: 'monsters',
    seed: 202502,
    tags: ['Subtraction', 'Within 20'],
    blurb: 'Take-away practice with numbers up to 20 — no borrowing needed.',
    subtitle: 'Subtract the second number from the first. Show your answer.',
  },
  {
    id: 'g1-missing',
    category: 'g1',
    title: 'Missing Number Mysteries',
    activity: 'missing',
    problems: 10,
    theme: 'dinos',
    seed: 202503,
    tags: ['Missing addends', 'Logic'],
    blurb: 'Some numbers have disappeared! Use what you know to find them.',
    subtitle: 'A sneaky number has vanished from every equation. Can you find it?',
  },
  {
    id: 'g1-word',
    category: 'g1',
    title: 'Word Problem Wizards',
    activity: 'word',
    problems: 8,
    theme: 'ocean',
    seed: 202504,
    tags: ['Word problems', 'Reading + math'],
    blurb: 'Eight splashy story problems with space to show the answer.',
    subtitle: 'Read each little story, then work out the answer.',
  },
];

/* =========================================================
   Tiny seeded random number generator
   Same seed -> same worksheet. Different seed -> new sheet.
   ========================================================= */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed) {
  const random = mulberry32(seed || 1);
  return {
    next: random,
    int(min, max) {
      return Math.floor(random() * (max - min + 1)) + min;
    },
    pick(list) {
      return list[Math.floor(random() * list.length)];
    },
    chance(probability) {
      return random() < probability;
    },
    shuffle(list) {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1;
}

/* =========================================================
   Shared HTML helpers
   ========================================================= */

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function brandSquiggle(size = 30) {
  return `<svg viewBox="0 0 52 52" width="${size}" height="${size}" fill="none" aria-hidden="true">
    <rect width="52" height="52" rx="14" fill="${'#ffd447'}"/>
    <path d="M8 31c7-18 12 11 19-6s10 11 18-4" stroke="#1f2a44" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
}

function dashedGlyph(number, className = 'trace-glyph') {
  const text = String(number);
  const fontSize = text.length > 1 ? 46 : 58;
  return `<svg class="${className}" viewBox="0 0 70 70" aria-hidden="true">
    <text x="35" y="56" text-anchor="middle" font-family="Quicksand, sans-serif" font-weight="700"
      font-size="${fontSize}" fill="none" stroke="currentColor" stroke-width="2.2"
      stroke-dasharray="4 3.4" stroke-linecap="round">${text}</text>
  </svg>`;
}

const SHAPE_COLORS = ['accent', 'pink', 'blue', 'yellow'];

function shapeSvg(kind, colorIndex = 0) {
  const colorToken = SHAPE_COLORS[colorIndex % SHAPE_COLORS.length];
  const color = colorToken === 'accent'
    ? 'var(--ws-accent)'
    : colorToken === 'pink'
      ? '#e8559c'
      : colorToken === 'blue'
        ? '#268fbf'
        : '#e8a70f';
  if (kind === 'circle') {
    return `<svg class="ws-shape" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="${color}"/></svg>`;
  }
  if (kind === 'square') {
    return `<svg class="ws-shape" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="2" fill="${color}"/></svg>`;
  }
  if (kind === 'triangle') {
    return `<svg class="ws-shape" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 22 21H2z" fill="${color}"/></svg>`;
  }
  return `<svg class="ws-shape" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1.8 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8z" fill="${color}"/></svg>`;
}

/* =========================================================
   Library cards
   ========================================================= */

function miniPreview(sheet) {
  const theme = THEMES[sheet.theme] || THEMES.dinos;
  const activity = sheet.activity;

  if (activity === 'trace') {
    return `<div class="mini-trace-row">${dashedGlyph(1, 'mini-trace-svg')}${dashedGlyph(2, 'mini-trace-svg')}${dashedGlyph(3, 'mini-trace-svg')}<span class="mini-trace-line"></span></div>
      <div class="mini-trace-row">${dashedGlyph(4, 'mini-trace-svg')}${dashedGlyph(5, 'mini-trace-svg')}<span class="mini-trace-line"></span></div>
      <div class="mini-trace-row">${dashedGlyph(6, 'mini-trace-svg')}<span class="mini-trace-line"></span></div>`;
  }

  if (activity === 'count' || activity === 'mixed-prek') {
    const icon = theme.emoji;
    return `<div class="mini-count"><span class="mini-count__emojis">${icon.repeat(4)}</span><span class="mini-count__box"></span></div>
      <div class="mini-count"><span class="mini-count__emojis">${icon.repeat(6)}</span><span class="mini-count__box"></span></div>
      <div class="mini-count"><span class="mini-count__emojis">${icon.repeat(3)}</span><span class="mini-count__box"></span></div>`;
  }

  if (activity === 'shapes') {
    return `<div class="mini-shapes">${shapeSvg('circle', 0)}${shapeSvg('circle', 0)}${shapeSvg('circle', 0)}${shapeSvg('square', 1)}<span class="mini-shape mini-shape--star">★</span></div>
      <div class="mini-shapes">${shapeSvg('triangle', 2)}${shapeSvg('triangle', 2)}${shapeSvg('square', 1)}${shapeSvg('circle', 0)}</div>
      <div class="mini-shapes">${shapeSvg('square', 1)}${shapeSvg('triangle', 2)}</div>`;
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

  // Equation sheets: add10, sub10, add20, sub20, mixed20
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

  return `<button class="sheet-card" type="button" data-sheet-id="${escapeHtml(sheet.id)}">
    <span class="sheet-card__preview" aria-hidden="true">
      <span class="mini-paper">
        <span class="mini-paper__top"><span>SquiggleMath</span><span aria-hidden="true">${theme.emoji}</span></span>
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
      <span class="sheet-card__cta"><span>Open &amp; print</span><span class="arrow" aria-hidden="true">→</span></span>
    </span>
  </button>`;
}

function renderLibrary() {
  $$('.printables-grid').forEach((grid) => {
    const category = grid.dataset.category;
    grid.innerHTML = PREMADE
      .filter((sheet) => sheet.category === category)
      .map(sheetCardMarkup)
      .join('');
  });
}

/* =========================================================
   Question generators
   ========================================================= */

function defaultActivityFor(difficulty) {
  if (difficulty === 'prek') return 'mixed-prek';
  if (difficulty === 'k') return 'mixed10';
  return 'mixed20';
}

function defaultTitle(activity, theme) {
  const titles = {
    'mixed-prek': `${theme.styleName} Trace & Count`,
    trace: 'Trace & Write',
    count: 'Count & Write',
    shapes: 'Shape Count',
    compare: 'Big or Small?',
    mixed10: `${theme.styleName} Add & Subtract`,
    add10: 'Add It Up!',
    sub10: 'Take It Away!',
    bonds: 'Number Bond Buddies',
    tally: 'Tally Up!',
    mixed20: `${theme.styleName} Math Facts`,
    add20: 'Super Sums to 20',
    sub20: 'Subtraction Practice',
    missing: 'Missing Number Mysteries',
    word: 'Word Problem Wizards',
  };
  return titles[activity] || 'SquiggleMath Worksheet';
}

function defaultSubtitle(activity, theme) {
  const subtitles = {
    'mixed-prek': 'Trace the numbers, then count each group.',
    trace: 'Follow the dashed numbers, then try writing them on your own.',
    count: 'Count the pictures and write how many you see.',
    shapes: 'Count each shape group and write the total.',
    compare: 'Look at each pair. Which one is bigger or smaller?',
    mixed10: 'Addition and subtraction with friendly numbers up to 10.',
    add10: 'Add the numbers and write the answer.',
    sub10: 'Take the second number away from the first.',
    bonds: 'Find the missing part of each number bond.',
    tally: 'Count the tally marks and write the number.',
    mixed20: `A ${theme.name.toLowerCase()} adventure in addition, subtraction, and missing numbers.`,
    add20: 'Add carefully — every answer is 20 or less.',
    sub20: 'Subtract carefully — every answer stays above zero.',
    missing: 'A sneaky number has vanished from each equation. Can you find it?',
    word: 'Read each little story, then work out the answer.',
  };
  return subtitles[activity] || 'A little maths adventure from SquiggleMath.';
}

function defaultInstruction(activity) {
  const instructions = {
    'mixed-prek': 'Trace each number. Then count the pictures and write how many in the box.',
    trace: 'Trace each dashed number, then try writing it yourself.',
    count: 'Count the pictures in each box. Write the number in the box.',
    shapes: 'Count the shapes in each group. Write the total in the box.',
    compare: 'Read the prompt. Circle the bigger or smaller picture.',
    mixed10: 'Add or subtract. Write each answer in the box.',
    add10: 'Add the numbers. Write each answer in the box.',
    sub10: 'Subtract the numbers. Write each answer in the box.',
    bonds: 'Find the missing part of each number bond.',
    tally: 'Count the tally marks. Write the number in the box.',
    mixed20: 'Solve each problem. Then find the missing numbers in the dashed boxes.',
    add20: 'Add the numbers. Write each answer in the box.',
    sub20: 'Subtract the numbers. Write each answer in the box.',
    missing: 'Find the missing number. Write it in the dashed box.',
    word: 'Read the story. Write your answer on the line.',
  };
  return instructions[activity] || '';
}

function addWithin(maxSum, rng) {
  const a = rng.int(1, maxSum - 1);
  const b = rng.int(1, maxSum - a);
  return { a, b, op: '+', result: a + b, answer: a + b, missing: null };
}

function subtractWithin(maxNumber, rng) {
  const a = rng.int(3, maxNumber);
  const b = rng.int(1, a - 2);
  return { a, b, op: '−', result: a - b, answer: a - b, missing: null };
}

function missingProblem(rng) {
  const kind = rng.pick(['addend', 'minuend', 'subtrahend']);

  if (kind === 'addend') {
    const result = rng.int(4, 20);
    const a = rng.int(1, result - 1);
    return { a, b: null, op: '+', result, answer: result - a, missing: 'b' };
  }

  const a = rng.int(5, 20);
  const b = rng.int(1, a - 2);

  if (kind === 'minuend') {
    return { a: null, b, op: '−', result: a - b, answer: a, missing: 'a' };
  }

  return { a, b: null, op: '−', result: a - b, answer: b, missing: 'b' };
}

function equationProblem(kind, rng) {
  if (kind === 'add10') return addWithin(10, rng);
  if (kind === 'sub10') return subtractWithin(10, rng);
  if (kind === 'add20') return addWithin(20, rng);
  if (kind === 'sub20') return subtractWithin(20, rng);
  if (kind === 'missing') return missingProblem(rng);
  if (kind === 'mixed10') {
    return rng.chance(0.5) ? addWithin(10, rng) : subtractWithin(10, rng);
  }
  // Mixed grade-one facts: mostly add/subtract, with a sprinkling of missing numbers.
  const roll = rng.next();
  if (roll < 0.22) return missingProblem(rng);
  if (roll < 0.61) return addWithin(20, rng);
  return subtractWithin(20, rng);
}

function buildEquationProblems(activity, count, rng) {
  const problems = [];
  for (let i = 0; i < count; i += 1) {
    let problem;
    if (activity === 'mixed10') {
      const kind = i === 0 ? 'add10' : i === 1 ? 'sub10' : rng.chance(0.5) ? 'add10' : 'sub10';
      problem = equationProblem(kind, rng);
    } else if (activity === 'mixed20') {
      if (i === 0) problem = equationProblem('add20', rng);
      else if (i === 1) problem = equationProblem('sub20', rng);
      else if (i === 2) problem = equationProblem('missing', rng);
      else problem = equationProblem('mixed20', rng);
    } else {
      problem = equationProblem(activity, rng);
    }
    problems.push(problem);
  }
  return problems;
}

/* ---------- content builders ---------- */

function blockTitle(letter, title, hint = '') {
  return `<h2 class="ws-block__title"><span class="ws-block__badge">${letter}</span>${escapeHtml(title)}${hint ? `<span class="ws-block__hint">${escapeHtml(hint)}</span>` : ''}</h2>`;
}

function traceRowMarkup(number, theme, large = false) {
  const copies = large ? 4 : 4;
  return `<div class="trace-row">
    <span class="trace-row__key">${number}</span>
    <span class="trace-row__copies">${Array.from({ length: copies }, () => dashedGlyph(number)).join('')}</span>
    <span class="trace-row__write"></span>
    <span class="trace-row__deco" aria-hidden="true">${theme.emoji}</span>
  </div>`;
}

function traceBlock(numbers, theme, { compact = false, letter = 'A' } = {}) {
  return `<section class="ws-block">
    ${blockTitle(letter, 'Trace & write', `${numbers[0]}–${numbers[numbers.length - 1]}`)}
    <div class="trace-grid ${compact ? 'trace-grid--compact' : 'trace-grid--large'}">
      ${numbers.map((number) => traceRowMarkup(number, theme, !compact)).join('')}
    </div>
  </section>`;
}

function countCardMarkup(count, icon) {
  return `<div class="count-card">
    <div class="count-card__emojis" aria-hidden="true">${icon.repeat(count)}</div>
    <div class="count-card__footer">
      <span class="count-card__prompt">How many?</span>
      <span class="count-card__box" aria-hidden="true"></span>
    </div>
  </div>`;
}

function countBlock(items, { dense, roomy, letter = 'A', title = 'Count & write' } = {}) {
  const gridClass = dense ? 'count-grid--dense' : roomy ? 'count-grid--roomy' : '';
  return `<section class="ws-block">
    ${blockTitle(letter, title, `${items.length} groups`)}
    <div class="count-grid ${gridClass}">
      ${items.map((item) => countCardMarkup(item.count, item.icon)).join('')}
    </div>
  </section>`;
}

function makeCountItems(count, theme, rng) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const icon = rng.chance(0.7) ? theme.emoji : rng.pick(theme.deco);
    items.push({ count: rng.int(2, 9), icon });
  }
  return items;
}

function buildTraceContent(count, theme, rng) {
  const total = Math.min(Math.max(count, 5), 10);
  const numbers = Array.from({ length: total }, (_, i) => i + 1);
  return {
    body: traceBlock(numbers, theme),
    answers: [],
    answersNote: 'Tracing sheets do not need an answer key.',
  };
}

function buildCountContent(count, theme, rng) {
  const items = makeCountItems(count, theme, rng);
  return {
    body: countBlock(items, {
      roomy: count <= 10,
      dense: count > 10,
      title: 'Count & write',
    }),
    answers: items.map((item) => String(item.count)),
    answersNote: 'Answers are listed in worksheet order.',
  };
}

function buildShapesContent(count, theme, rng) {
  const kinds = ['circle', 'square', 'triangle', 'star'];
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const kind = rng.pick(kinds);
    const shapes = rng.int(3, 8);
    const color = rng.int(0, 3);
    items.push({ kind, shapes, color });
  }

  const body = `<section class="ws-block">
    ${blockTitle('A', 'Shape count', `${count} groups`)}
    <div class="shape-grid ${count > 10 ? 'shape-grid--dense' : ''}">
      ${items.map((item) => `<div class="shape-card">
        <div class="shape-card__shapes" aria-hidden="true">
          ${Array.from({ length: item.shapes }, () => shapeSvg(item.kind, item.color)).join('')}
        </div>
        <div class="shape-card__footer">
          <span class="shape-card__prompt">How many?</span>
          <span class="shape-card__box" aria-hidden="true"></span>
        </div>
      </div>`).join('')}
    </div>
  </section>`;

  return {
    body,
    answers: items.map((item) => String(item.shapes)),
    answersNote: 'Answers show the number of shapes in each card.',
  };
}

function buildCompareContent(count, theme, rng) {
  const symbols = [theme.emoji, ...theme.deco];
  const cards = [];
  for (let i = 0; i < count; i += 1) {
    const withBigFirst = rng.chance(0.5);
    const askBigger = i % 2 === 0;
    const symbol = rng.pick(symbols);
    const big = `<span class="compare-item compare-item--big" aria-hidden="true">${symbol}</span>`;
    const small = `<span class="compare-item compare-item--small" aria-hidden="true">${symbol}</span>`;
    cards.push(`<div class="compare-card">
      <span class="compare-card__prompt">Circle the <strong>${askBigger ? 'bigger' : 'smaller'}</strong> one</span>
      <span class="compare-card__pair">${withBigFirst ? big + small : small + big}</span>
    </div>`);
  }

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Big or small?', `${count} pairs`)}
      <div class="compare-grid ${count > 10 ? 'compare-grid--dense' : ''}">${cards.join('')}</div>
    </section>`,
    answers: [],
    answersNote: 'Ask your child to explain which picture is bigger or smaller.',
  };
}

function equationMarkup(problem, index) {
  const blank = '<i class="eq-blank eq-blank--missing" aria-hidden="true"></i>';
  const left = problem.missing === 'a' ? blank : problem.a;
  const right = problem.missing === 'b' ? blank : problem.b;
  const showResult = problem.missing !== null && problem.missing !== 'result';
  return `<li class="problem">
    <span class="problem__num">${index + 1}</span>
    <span class="equation"><span>${left}</span><b class="op">${problem.op}</b><span>${right}</span><b class="op">=</b>${showResult ? `<span>${problem.result}</span>` : '<i class="eq-blank" aria-hidden="true"></i>'}</span>
  </li>`;
}

function buildEquationContent(activity, count, theme, rng) {
  const problems = buildEquationProblems(activity, count, rng);
  const titles = {
    mixed10: 'Add & subtract',
    add10: 'Add it up',
    sub10: 'Take it away',
    mixed20: 'Solve & write',
    add20: 'Add it up',
    sub20: 'Subtraction',
    missing: 'Find the missing number',
  };
  const dense = count > 10;

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', titles[activity] || 'Solve & write', `${count} problems`)}
      <ol class="problem-grid ${dense ? 'problem-grid--dense' : ''}">
        ${problems.map(equationMarkup).join('')}
      </ol>
    </section>`,
    answers: problems.map((problem) => String(problem.answer)),
    answersNote: 'Answers are listed in worksheet order.',
  };
}

function bondMarkup(whole, part, missingSide) {
  const showLeft = missingSide === 'right' ? part : null;
  const showRight = missingSide === 'left' ? part : null;
  const valueLeft = showLeft === null
    ? '<text x="42" y="100" text-anchor="middle" fill="#8390a8" font-size="18">?</text>'
    : `<text x="42" y="100" text-anchor="middle">${showLeft}</text>`;
  const valueRight = showRight === null
    ? '<text x="118" y="100" text-anchor="middle" fill="#8390a8" font-size="18">?</text>'
    : `<text x="118" y="100" text-anchor="middle">${showRight}</text>`;
  const leftClass = missingSide === 'left' ? 'bond-blank' : '';
  const rightClass = missingSide === 'right' ? 'bond-blank' : '';

  return `<svg class="bond-svg" viewBox="0 0 160 124" aria-hidden="true">
    <line x1="80" y1="40" x2="42" y2="76"/>
    <line x1="80" y1="40" x2="118" y2="76"/>
    <circle cx="80" cy="30" r="23"/>
    <text x="80" y="37" text-anchor="middle">${whole}</text>
    <circle class="${leftClass}" cx="42" cy="96" r="23"/>
    ${valueLeft}
    <circle class="${rightClass}" cx="118" cy="96" r="23"/>
    ${valueRight}
  </svg>`;
}

function buildBondsContent(count, theme, rng) {
  const bonds = [];
  for (let i = 0; i < count; i += 1) {
    const whole = rng.int(5, 10);
    const part = rng.int(1, whole - 1);
    const missingPart = whole - part;
    const missingSide = rng.chance(0.5) ? 'left' : 'right';
    bonds.push({ whole, part, missingPart, missingSide });
  }

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Number bonds', `${count} bonds`)}
      <div class="bond-grid ${count > 10 ? 'bond-grid--dense' : ''}">
        ${bonds.map((bond) => `<div class="bond-card">${bondMarkup(bond.whole, bond.part, bond.missingSide)}</div>`).join('')}
      </div>
    </section>`,
    answers: bonds.map((bond) => String(bond.missingPart)),
    answersNote: 'The answer is the missing part of each number bond.',
  };
}

function tallyMarks(number) {
  const groups = [];
  let left = number;
  while (left >= 5) {
    groups.push(5);
    left -= 5;
  }
  if (left > 0) groups.push(left);
  return groups.map((size) => `<span class="tally-group ${size === 5 ? 'tally-group--five' : ''}">${'<b></b>'.repeat(size)}</span>`).join('');
}

function buildTallyContent(count, theme, rng) {
  const values = [];
  for (let i = 0; i < count; i += 1) values.push(rng.int(3, 15));

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Tally count', `${count} cards`)}
      <div class="tally-grid ${count > 10 ? 'tally-grid--dense' : ''}">
        ${values.map((value, index) => `<div class="tally-card">
          <span class="tally-card__num">${index + 1}</span>
          <span class="tally-set" aria-hidden="true">${tallyMarks(value)}</span>
          <span class="tally-card__box" aria-hidden="true"></span>
        </div>`).join('')}
      </div>
    </section>`,
    answers: values.map(String),
    answersNote: 'Answers are the totals of the tally marks.',
  };
}

function buildWordContent(count, theme, rng) {
  const problems = [];
  const total = Math.min(count, 8);
  const addTemplates = [
    (c, f, a, b, item) => `${c} the ${theme.who} has ${a} ${item}. ${f} brings ${b} more. How many ${item} are there altogether?`,
    (c, f, a, b, item) => `${c} the ${theme.who} finds ${a} ${item} in the morning and ${b} in the afternoon. How many ${item} in all?`,
    (c, f, a, b, item) => `There are ${a} ${item} in ${c}'s basket. ${f} adds ${b} more. How many ${item} are there now?`,
  ];
  const subTemplates = [
    (c, f, a, b, item) => `${c} the ${theme.who} has ${a} ${item}. ${b} ${item} are taken away. How many are left?`,
    (c, f, a, b, item) => `${c} spots ${a} ${item}. Then ${b} of them disappear. How many ${item} can ${c} still see?`,
    (c, f, a, b, item) => `A box holds ${a} ${item}. ${f} takes out ${b}. How many ${item} stay in the box?`,
  ];

  for (let i = 0; i < total; i += 1) {
    const character = rng.pick(theme.characters);
    const friends = theme.characters.filter((name) => name !== character);
    const friend = friends.length ? rng.pick(friends) : 'A friend';
    const item = rng.pick(theme.items);
    const kind = i % 2 === 0 ? 'add' : 'sub';
    let text;
    let answer;
    let emoji;

    if (kind === 'add') {
      const a = rng.int(2, 10);
      const b = rng.int(2, Math.max(2, 20 - a));
      answer = a + b;
      emoji = theme.emoji;
      text = addTemplates[(i / 2) % addTemplates.length](character, friend, a, b, item);
    } else {
      const a = rng.int(6, 20);
      const b = rng.int(2, a - 2);
      answer = a - b;
      emoji = theme.deco[1];
      text = subTemplates[Math.floor(i / 2) % subTemplates.length](character, friend, a, b, item);
    }

    problems.push({ text, answer, emoji });
  }

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Story problems', `${problems.length} stories`)}
      <ol class="word-list">
        ${problems.map((problem, index) => `<li class="word-problem">
          <span class="word-problem__num">${index + 1}</span>
          <div class="word-problem__body">
            <p class="word-problem__text"><span class="word-problem__emoji" aria-hidden="true">${problem.emoji}</span><span>${escapeHtml(problem.text)}</span></p>
            <span class="word-problem__answer"><span>Answer</span><i></i></span>
          </div>
        </li>`).join('')}
      </ol>
      <div class="word-workbox">
        <div class="word-workbox__head"><span aria-hidden="true">✏️</span><span>Show your thinking — draw a picture for one of the stories</span></div>
        <div class="word-workbox__area" aria-hidden="true"></div>
      </div>
    </section>`,
    answers: problems.map((problem) => String(problem.answer)),
    answersNote: 'Answers are listed in story order.',
  };
}

function buildMixedPreKContent(count, theme, rng) {
  const traceNumbers = [1, 2, 3, 4, 5];
  const items = makeCountItems(count, theme, rng);
  const body = [
    traceBlock(traceNumbers, theme, { compact: true, letter: 'A' }),
    countBlock(items, {
      roomy: count <= 10,
      dense: count > 10,
      letter: 'B',
      title: 'Count & write',
    }),
  ].join('');

  return {
    body,
    answers: items.map((item) => String(item.count)),
    answersNote: 'Answer key covers the counting section. Tracing needs no key.',
  };
}

function createContent(activity, count, theme, rng) {
  if (activity === 'mixed-prek') return buildMixedPreKContent(count, theme, rng);
  if (activity === 'trace') return buildTraceContent(count, theme, rng);
  if (activity === 'count') return buildCountContent(count, theme, rng);
  if (activity === 'shapes') return buildShapesContent(count, theme, rng);
  if (activity === 'compare') return buildCompareContent(count, theme, rng);
  if (activity === 'bonds') return buildBondsContent(count, theme, rng);
  if (activity === 'tally') return buildTallyContent(count, theme, rng);
  if (activity === 'word') return buildWordContent(count, theme, rng);
  return buildEquationContent(activity, count, theme, rng);
}

/* =========================================================
   Worksheet markup
   ========================================================= */

function worksheetHead(theme, difficulty) {
  return `<div class="ws-topline">
    <div class="ws-brand">${brandSquiggle(30)}<span>SquiggleMath</span></div>
    <span class="ws-theme-pill"><span aria-hidden="true">${theme.emoji}</span> ${theme.name}</span>
  </div>`;
}

function worksheetMeta() {
  return `<div class="ws-meta">
    <span class="ws-meta__item"><span>Name</span><i></i></span>
    <span class="ws-meta__item ws-meta__item--date"><span>Date</span><i></i></span>
  </div>`;
}

function worksheetMarkup({ title, subtitle, instruction, body, theme, difficulty, pageLabel }) {
  return `<article class="worksheet" style="--ws-accent:${theme.accent};--ws-accent-soft:${theme.soft};">
    ${worksheetHead(theme, difficulty)}
    <header class="ws-title">
      <p class="ws-kicker">${escapeHtml(difficulty.badge)}</p>
      <h1 class="ws-heading">${escapeHtml(title)}</h1>
      <p class="ws-sub">${escapeHtml(subtitle)}</p>
    </header>
    ${worksheetMeta()}
    <p class="ws-instruction"><span aria-hidden="true">✏️</span><span>${escapeHtml(instruction)}</span></p>
    <div class="ws-body">${body}</div>
    <div class="ws-reward">
      <span>All done? Colour a star for every try!</span>
      <span class="ws-reward__stars" aria-hidden="true">☆ ☆ ☆ ☆ ☆</span>
    </div>
    <footer class="ws-footer"><span>${theme.emoji} SquiggleMath</span><span>${escapeHtml(pageLabel)}</span></footer>
  </article>`;
}

function answerKeyMarkup({ answers, title, theme, difficulty, answersNote, pageLabel }) {
  return `<article class="worksheet worksheet--key" style="--ws-accent:${theme.accent};--ws-accent-soft:${theme.soft};">
    ${worksheetHead(theme, difficulty)}
    <header class="ws-title">
      <p class="ws-kicker">For grown-ups</p>
      <h1 class="ws-heading">Answer key</h1>
      <p class="ws-sub">${escapeHtml(title)}</p>
    </header>
    <div class="key-meta"><span><strong>${escapeHtml(difficulty.badge)}</strong></span><span>${answers.length} answers</span><span>${theme.emoji} ${theme.name}</span></div>
    <div class="ws-body">
      <div class="key-grid">
        ${answers.map((answer, index) => `<span class="key-item"><b>${index + 1}</b><span>${escapeHtml(answer)}</span></span>`).join('')}
      </div>
      <p class="key-note">${escapeHtml(answersNote)} ${answersNote.endsWith('.') ? '' : '.'} Give lots of high-fives and take a wiggle break whenever it helps!</p>
    </div>
    <footer class="ws-footer"><span>${theme.emoji} SquiggleMath</span><span>${escapeHtml(pageLabel)}</span></footer>
  </article>`;
}

/* Sparse sheets get a dotted "extra thinking" area so the printable never
   ends in a large empty gap. Word-problem sheets already include a workbox. */
function addThinkingSpace(root) {
  if (!root) return;
  root.querySelectorAll('.worksheet:not(.worksheet--key)').forEach((sheet) => {
    if (sheet.querySelector('.word-workbox') || sheet.querySelector('.ws-workzone')) return;
    const body = sheet.querySelector('.ws-body');
    if (!body) return;
    const gap = Number.parseFloat(getComputedStyle(body).rowGap) || 0;
    const children = [...body.children];
    const used = children.reduce((total, child) => total + child.offsetHeight, 0);
    const free = body.clientHeight - used - gap * Math.max(0, children.length - 1);
    if (free < 170) return;

    const workzone = document.createElement('div');
    workzone.className = 'ws-workzone';
    workzone.innerHTML = '<div class="ws-workzone__head"><span aria-hidden="true">✏️</span><span>Extra thinking space — doodle, count, or show your work.</span></div><div class="ws-workzone__area" aria-hidden="true"></div>';
    body.appendChild(workzone);
  });
}

function buildWorksheet(config) {
  const difficulty = DIFFICULTIES[config.difficulty || config.category] || DIFFICULTIES.prek;
  const theme = THEMES[config.theme] || THEMES.dinos;
  const activity = config.activity || defaultActivityFor(config.difficulty || config.category);
  const requestedCount = Number.parseInt(config.problems, 10);
  const count = Math.max(1, Math.min(Number.isFinite(requestedCount) ? requestedCount : 10, MAX_PROBLEMS));
  const seed = Number(config.seed) || randomSeed();
  const rng = createRng(seed);
  const title = config.title || defaultTitle(activity, theme);
  const subtitle = config.subtitle || defaultSubtitle(activity, theme);
  const instruction = config.instruction || defaultInstruction(activity);
  const content = createContent(activity, count, theme, rng);
  const answers = content.answers || [];
  const includeKey = Boolean(config.includeKey) && answers.length > 0;
  const totalPages = includeKey ? 2 : 1;

  let html = worksheetMarkup({
    title,
    subtitle,
    instruction,
    body: content.body,
    theme,
    difficulty,
    pageLabel: totalPages > 1 ? `Page 1 of ${totalPages}` : 'Print & play',
  });

  if (includeKey) {
    html += answerKeyMarkup({
      answers,
      title,
      theme,
      difficulty,
      answersNote: content.answersNote,
      pageLabel: `Page 2 of ${totalPages}`,
    });
  }

  return {
    html,
    title,
    activity,
    difficulty,
    theme,
    count,
    seed,
    answers,
    pageCount: totalPages,
  };
}

/* =========================================================
   App state + elements
   ========================================================= */

const state = {
  lastResult: null,
  printTitleBefore: null,
  modalSheet: null,
  modalResult: null,
  lastFocused: null,
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
  modal: $('#preview-modal'),
  modalTitle: $('#modal-title'),
  modalEyebrow: $('#modal-eyebrow'),
  modalDesc: $('#modal-desc'),
  modalCanvas: $('#modal-canvas'),
  modalFrame: $('#modal-frame'),
  modalClose: $('#modal-close'),
  modalPrint: $('#modal-print'),
  modalCustomize: $('#modal-customize'),
  printArea: $('#print-area'),
  toast: $('#toast'),
  year: $('#year'),
};

/* =========================================================
   Fit a fixed A4 canvas into its responsive frame
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

function fitAllPapers() {
  fitPaper(els.paperFrame, els.canvas);
  if (els.modal.classList.contains('is-open')) {
    fitPaper(els.modalFrame, els.modalCanvas);
  }
}

function scheduleFit() {
  if (state.resizeFrame) cancelAnimationFrame(state.resizeFrame);
  state.resizeFrame = requestAnimationFrame(() => {
    fitAllPapers();
    state.resizeFrame = null;
  });
}

/* =========================================================
   Theme + form helpers
   ========================================================= */

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

function setRadioValue(name, value) {
  const input = els.generatorForm.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

function nearestProblemOption(value) {
  const options = [5, 10, 15, 20];
  return options.reduce((closest, option) => (
    Math.abs(option - value) < Math.abs(closest - value) ? option : closest
  ), options[0]);
}

/* =========================================================
   Generate a custom worksheet
   ========================================================= */

function generateWorksheet({ announce = false, spin = false } = {}) {
  const settings = readGeneratorSettings();
  const result = buildWorksheet({
    ...settings,
    seed: randomSeed(),
  });

  state.lastResult = result;
  els.canvas.innerHTML = result.html;
  addThinkingSpace(els.canvas);
  els.canvas.classList.remove('is-new');
  // Restart the little paper entrance animation on every fresh sheet.
  void els.canvas.offsetWidth;
  els.canvas.classList.add('is-new');

  const pageCopy = result.pageCount > 1 ? ` • ${result.pageCount} pages (with key)` : '';
  const level = result.difficulty.shortBadge;
  els.sheetStatus.textContent = `${level} · ${result.count} problems · ${result.theme.name}${pageCopy}`;

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
   Preview modal
   ========================================================= */

function openPreview(sheetId) {
  const sheet = PREMADE.find((item) => item.id === sheetId);
  if (!sheet) return;

  const difficulty = DIFFICULTIES[sheet.category];
  const theme = THEMES[sheet.theme] || THEMES.dinos;
  const result = buildWorksheet({
    ...sheet,
    difficulty: sheet.category,
    includeKey: false,
  });

  state.modalSheet = sheet;
  state.modalResult = result;
  state.lastFocused = document.activeElement;

  els.modalTitle.textContent = sheet.title;
  els.modalEyebrow.textContent = `${difficulty.badge} • ${theme.name}`;
  els.modalDesc.textContent = sheet.blurb;
  els.modalCanvas.innerHTML = result.html;

  els.modal.classList.add('is-open');
  els.modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  addThinkingSpace(els.modalCanvas);

  requestAnimationFrame(() => {
    fitPaper(els.modalFrame, els.modalCanvas);
    els.modalClose.focus();
  });
}

function closePreview() {
  if (!els.modal.classList.contains('is-open')) return;
  els.modal.classList.remove('is-open');
  els.modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (state.lastFocused && typeof state.lastFocused.focus === 'function') {
    state.lastFocused.focus({ preventScroll: true });
  }
  state.modalSheet = null;
  state.modalResult = null;
}

function trapModalFocus(event) {
  if (event.key !== 'Tab' || !els.modal.classList.contains('is-open')) return;
  const focusable = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', els.modal)
    .filter((element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* =========================================================
   Printing
   The active worksheet(s) are cloned into #print-area.
   A dedicated print stylesheet hides everything else.
   ========================================================= */

function activeSheets() {
  if (els.modal.classList.contains('is-open')) {
    return { sheets: $$('.worksheet', els.modalCanvas), title: state.modalResult?.title || 'Worksheet' };
  }
  return { sheets: $$('.worksheet', els.canvas), title: state.lastResult?.title || 'Worksheet' };
}

function preparePrintArea() {
  const { sheets, title } = activeSheets();
  if (!sheets.length) return;
  if (state.printTitleBefore === null) {
    state.printTitleBefore = document.title;
  }
  document.title = `${title} | SquiggleMath`;

  // Clone only worksheet nodes: the on-screen scaling transform is not copied.
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
  if (state.printTitleBefore !== null) {
    document.title = state.printTitleBefore;
    state.printTitleBefore = null;
  }
}

function printActiveWorksheet() {
  const { sheets } = activeSheets();
  if (!sheets.length) {
    showToast('Generate a worksheet first ✏️');
    return;
  }
  preparePrintArea();
  window.print();
}

/* =========================================================
   Modal "Try this level" flow
   ========================================================= */

function loadPreviewSettingsIntoGenerator() {
  const sheet = state.modalSheet;
  if (!sheet) return;

  setRadioValue('difficulty', sheet.category);
  setRadioValue('problems', String(nearestProblemOption(sheet.problems)));
  els.themeSelect.value = sheet.theme;
  els.answerKey.checked = false;
  updateThemePreview();
  closePreview();

  generateWorksheet({ announce: false });
  $('#generator').scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Settings loaded — here is a fresh sheet! ✨');
}

/* =========================================================
   Event wiring + init
   ========================================================= */

function bindEvents() {
  // Pre-made library cards open a clean, print-ready preview.
  document.addEventListener('click', (event) => {
    const card = event.target.closest('[data-sheet-id]');
    if (card) openPreview(card.dataset.sheetId);
  });

  els.generatorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    generateWorksheet({ announce: true, spin: true });
  });

  els.themeSelect.addEventListener('change', updateThemePreview);

  els.printButton.addEventListener('click', printActiveWorksheet);
  els.modalPrint.addEventListener('click', printActiveWorksheet);
  els.modalCustomize.addEventListener('click', loadPreviewSettingsIntoGenerator);

  $$('[data-close-modal]', els.modal).forEach((element) => {
    element.addEventListener('click', closePreview);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePreview();
    trapModalFocus(event);
  });

  window.addEventListener('resize', scheduleFit);

  // Support the browser's own Ctrl/Cmd+P too.
  window.addEventListener('beforeprint', preparePrintArea);
  window.addEventListener('afterprint', cleanupPrintArea);

  window.addEventListener('scroll', () => {
    els.header.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  // Refit if worksheet content changes size (font load, reflow, etc.).
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(els.canvas);
    observer.observe(els.modalCanvas);
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

