(function () {
'use strict';

/* =========================================================
   SquiggleMath — shared worksheet engine
   No frameworks, no backend, no dependencies.

   Loaded by both the home page and the standalone print page:
   1. CATALOG is built deterministically: 120 recipes per age
      group (5 skills × 6 layouts × 4 themes). Each recipe has a
      fixed seed, so its print page always renders the same sheet.
   2. buildWorksheet() turns any recipe/config into questions and
      renders a printable A4 .worksheet element.
   3. The generator creates a fresh random seed and calls the same
      builder. Randomness is handled by a tiny seeded PRNG
      (mulberry32) so every sheet is repeatable from its recipe.
   4. The print page clones the active sheet into #print-area. A
      dedicated @media print block hides the page chrome and shows
      only the A4 worksheet.
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

/* =========================================================
   Printable catalogue
   Every age group gets 120 stable, unique recipes:
   5 skills × 6 layouts × 4 themes = 120 sheets per level.
   Each recipe has a fixed seed, so its print page always
   produces the same worksheet.
   ========================================================= */

const ACTIVITY_INFO = {
  trace: { label: 'Number tracing', short: 'Tracing', unit: 'numbers' },
  count: { label: 'Counting', short: 'Counting', unit: 'cards' },
  shapes: { label: 'Shapes & counting', short: 'Shapes', unit: 'groups' },
  compare: { label: 'Size comparison', short: 'Size', unit: 'pairs' },
  'mixed-prek': { label: 'Mixed pre-K', short: 'Mixed', unit: 'activities' },
  add10: { label: 'Addition to 10', short: 'Addition', unit: 'problems' },
  sub10: { label: 'Subtraction to 10', short: 'Subtraction', unit: 'problems' },
  mixed10: { label: 'Add & subtract to 10', short: 'Mixed', unit: 'problems' },
  bonds: { label: 'Number bonds', short: 'Bonds', unit: 'bonds' },
  tally: { label: 'Tally marks', short: 'Tally', unit: 'cards' },
  add20: { label: 'Addition to 20', short: 'Addition', unit: 'problems' },
  sub20: { label: 'Subtraction to 20', short: 'Subtraction', unit: 'problems' },
  mixed20: { label: 'Mixed facts to 20', short: 'Mixed', unit: 'problems' },
  missing: { label: 'Missing numbers', short: 'Missing', unit: 'problems' },
  word: { label: 'Word problems', short: 'Word problems', unit: 'stories' },
};

const LEVEL_PLAN = {
  prek: ['trace', 'count', 'shapes', 'compare', 'mixed-prek'],
  k: ['add10', 'sub10', 'mixed10', 'bonds', 'tally'],
  g1: ['add20', 'sub20', 'mixed20', 'missing', 'word'],
};

const CATALOG_THEMES = ['dinos', 'space', 'monsters', 'ocean'];

const TITLE_PATTERNS = {
  trace: ['Trace & Race', 'Rainbow Tracing', 'Pencil Parade', 'Number Trail', 'Write It, Trace It', 'Trace & Try'],
  count: ['Count the Critters', 'Count & Write', 'How Many?', 'Count the Crew', 'Spot & Count', 'Count the Collection'],
  shapes: ['Shape Safari', 'Shape Count', 'Shape Spotter', 'Shape Detective', 'Shape Party', 'Sort & Count'],
  compare: ['Big or Small?', 'Compare the Critters', 'Which One?', 'Size Safari', 'Big & Little', 'Look & Compare'],
  'mixed-prek': ['Trace, Count & Play', 'Little Learners', 'Pencil Warm-Up', 'Trace & Count', 'Warm-Up Wonders', 'Ready, Set, Count'],
  add10: ['Add It Up!', 'Sum Squad', 'Addition Adventures', 'Add & Write', 'Winning Sums', 'Add It Together'],
  sub10: ['Take It Away!', 'Subtract & Smile', 'Take-Away Time', 'Minus Magic', 'Subtraction Stars', 'How Many Left?'],
  mixed10: ['Add & Subtract', 'Plus & Minus', 'Mixed-Up Facts', 'Math Shuffle', 'Add or Subtract?', 'Fact Family Fun'],
  bonds: ['Number Bond Buddies', 'Bond Builders', 'Whole & Parts', 'Bond Detective', 'Find the Missing Part', 'Number Bonds'],
  tally: ['Tally Up!', 'Tally Time', 'Count the Tallies', 'Tally Tracker', 'Tally Marks', 'Tally & Write'],
  add20: ['Super Sums to 20', 'Addition Cadets', 'Sum It Up', 'Big Sums', 'Add to 20', 'Twenty and Below'],
  sub20: ['Subtraction Cadets', 'Take Away to 20', 'Minus Mission', 'Subtraction Station', 'Find the Difference', 'Subtract to 20'],
  mixed20: ['Math Facts Mission', 'Mixed Practice', 'Fact Fluency Fun', 'Add, Subtract & Solve', 'Grade One Shuffle', 'Math Adventure'],
  missing: ['Missing Number Mysteries', 'Find the Missing Number', 'Number Detectives', "What's Missing?", 'Mystery Numbers', 'Secret Number Search'],
  word: ['Word Problem Wizards', 'Story Problem Studio', 'Math Stories', 'Read & Solve', 'Story Sums', 'Word Problem Workshop'],
};

const BLURB_PATTERNS = {
  trace: [
    'Big dashed numbers to trace, then plenty of room to try each one alone.',
    'A gentle tracing warm-up that builds pencil control one number at a time.',
    'Follow the dashes, then finish the row with your very own numbers.',
    'A tidy number trail for little hands learning how digits are formed.',
    'Trace first, write second — a calm, confident number-writing workout.',
    'A full page of tracing practice with a friendly theme to keep it fun.',
  ],
  count: [
    'Count the pictures in each box, then write the matching number.',
    'A bright counting page with room for big, bold numbers.',
    'Count the friendly pictures and practise writing each total.',
    'One-to-one counting practice with a playful theme on every card.',
    'How many can you find? Count each group and fill in the box.',
    'A collection of counting cards that grows confidence with every row.',
  ],
  shapes: [
    'Spot circles, squares, triangles and stars, then count each group.',
    'A shape-spotting page that mixes counting with visual discrimination.',
    'Count the shapes in every card and write the total in the box.',
    'Shape recognition and counting practice in one colourful page.',
    'A shape detective challenge with friendly groups to count.',
    'Sort, spot and count the shapes hiding on every card.',
  ],
  compare: [
    'Circle the bigger friend in each pair — or the smaller one!',
    'A look-and-think page that builds size vocabulary and visual skills.',
    'Which one is bigger? Which one is smaller? Circle your answer.',
    'Compare each pair carefully and circle the picture that matches.',
    'A gentle size-comparison challenge with big, clear pictures.',
    'Look closely, compare the pair, and circle the right one.',
  ],
  'mixed-prek': [
    'A little tracing and a little counting — the perfect pre-K warm-up.',
    'Two friendly activities in one: trace the numbers, then count the pictures.',
    'A gentle mixed page that practises pencil control and one-to-one counting.',
    'Trace first, count second. A balanced little learners workout.',
    'A happy mix of number tracing and count-and-write practice.',
    'A ready-to-go pre-K page that warms up hands and counting brains.',
  ],
  add10: [
    'Friendly single-digit sums with plenty of space to write answers.',
    'A bright addition page for facts with sums of 10 or less.',
    'Add the two numbers and write each answer in the box.',
    'Simple addition practice that builds speed and confidence.',
    'A full set of friendly addition facts to 10.',
    'Add it up! Big numbers, clear boxes and no pressure.',
  ],
  sub10: [
    'Simple take-away facts that build confidence with small numbers.',
    'Subtraction practice within 10, with space to show every answer.',
    'Take the second number away and write what is left.',
    'A friendly first subtraction page with facts from 10 and below.',
    'Cross out, count what remains, and write the answer.',
    'A calm introduction to subtraction with small, friendly numbers.',
  ],
  mixed10: [
    'Addition and subtraction with friendly numbers up to 10.',
    'A balanced mix of plus and minus facts within 10.',
    'Add or subtract? Read the sign carefully, then write the answer.',
    'A shuffled set of addition and subtraction facts to 10.',
    'Keep both operations sharp with this mixed practice page.',
    'Plenty of plus and minus practice with numbers up to 10.',
  ],
  bonds: [
    'Find the missing part in each friendly number bond.',
    'The whole is at the top. Work out the part that is hiding below.',
    'A number-bond workout that builds part-part-whole thinking.',
    'Find the missing part and complete every bond.',
    'Whole numbers, missing parts and lots of good thinking.',
    'A page of number bonds to grow fact fluency and number sense.',
  ],
  tally: [
    'Count the tally marks in each box and write the matching number.',
    'Tally practice with bundles of five and friendly picture-free cards.',
    'Read the tallies, count carefully, and write each total.',
    'A tidy tally-mark page for quick counting and number writing.',
    'Count the groups of five, then add the leftovers.',
    'Tally up! A calm counting page with marks instead of pictures.',
  ],
  add20: [
    'A galaxy of addition facts with sums all the way up to 20.',
    'Addition practice to 20 with big numbers and clear answer boxes.',
    'Add carefully — every answer is 20 or less.',
    'A full page of grade-one addition facts to build fluency.',
    'Big-kid addition practice with sums up to 20.',
    'Add the numbers, show your thinking, and write the total.',
  ],
  sub20: [
    'Take-away practice with numbers up to 20 — no borrowing needed.',
    'Subtraction facts within 20 with plenty of room to work.',
    'Subtract the second number from the first and write the answer.',
    'A grade-one subtraction page that builds speed and confidence.',
    'Find the difference in every fact, all within 20.',
    'Calm, clear subtraction practice for numbers up to 20.',
  ],
  mixed20: [
    'A themed adventure in addition, subtraction and missing numbers.',
    'A balanced grade-one mix of plus, minus and missing-number facts.',
    'Solve every fact and watch for the sneaky dashed boxes.',
    'Mixed math facts to 20 for a confident, capable first grader.',
    'Add, subtract and find the missing number — all on one page.',
    'A shuffled set of grade-one facts with sums and differences to 20.',
  ],
  missing: [
    'Some numbers have disappeared! Use what you know to find them.',
    'A sneaky number has vanished from every equation. Can you find it?',
    'Find the missing number and write it in the dashed box.',
    'Missing addends and subtrahends to build real number sense.',
    'Use the answer to work backwards and uncover each hidden number.',
    'A number-detective page full of missing-number puzzles.',
  ],
  word: [
    'Eight splashy story problems with space to show the answer.',
    'Read each little story, then work out the answer.',
    'A page of short math stories that mix addition and subtraction.',
    'Read, think, and solve — with room to draw your thinking.',
    'Friendly story problems that connect reading with math.',
    'A word-problem workshop with space to show every answer.',
  ],
};

const PROBLEM_SETS = [5, 10, 15, 20, 10, 15];
const TRACE_RANGES = [[1, 5], [6, 10], [1, 10], [0, 9], [2, 7], [4, 10]];
const MIXED_RANGES = [[1, 5], [2, 6], [3, 7], [4, 8], [5, 9], [6, 10]];

const SPECIAL_COUNTS = {
  trace: (pattern) => TRACE_RANGES[pattern][1] - TRACE_RANGES[pattern][0] + 1,
  'mixed-prek': (pattern) => [5, 10, 15, 10, 5, 10][pattern],
  bonds: (pattern) => [8, 10, 12, 10, 15, 20][pattern],
  tally: (pattern) => [8, 10, 12, 15, 10, 20][pattern],
  word: (pattern) => [5, 6, 7, 8, 6, 7][pattern],
};

function problemCountFor(activity, pattern) {
  if (SPECIAL_COUNTS[activity]) return SPECIAL_COUNTS[activity](pattern);
  return PROBLEM_SETS[pattern];
}

function countLabelFor(entry) {
  if (entry.activity === 'trace') return `Numbers ${entry.range[0]}–${entry.range[1]}`;
  if (entry.activity === 'mixed-prek') return 'Trace + count';
  const unit = ACTIVITY_INFO[entry.activity].unit;
  return `${entry.problems} ${unit}`;
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

function buildCatalog() {
  const entries = [];
  const counters = { prek: 0, k: 0, g1: 0 };

  Object.entries(LEVEL_PLAN).forEach(([category, activities]) => {
    activities.forEach((activity) => {
      const info = ACTIVITY_INFO[activity];
      for (let pattern = 0; pattern < 6; pattern += 1) {
        for (let themeIndex = 0; themeIndex < CATALOG_THEMES.length; themeIndex += 1) {
          const themeKey = CATALOG_THEMES[themeIndex];
          const theme = THEMES[themeKey];
          const problems = problemCountFor(activity, pattern);
          const range = activity === 'trace'
            ? TRACE_RANGES[pattern]
            : activity === 'mixed-prek'
              ? MIXED_RANGES[pattern]
              : null;
          const suffix = String(pattern * 4 + themeIndex + 1).padStart(2, '0');
          counters[category] += 1;

          const entry = {
            id: `${category}-${activity}-${suffix}`,
            number: counters[category],
            category,
            activity,
            title: `${theme.styleName} ${TITLE_PATTERNS[activity][pattern]}`,
            problems,
            theme: themeKey,
            seed: hashSeed(`${category}|${activity}|${pattern}|${themeKey}|catalog-v2`),
            tags: [info.label, countLabelFor({ activity, problems, range })],
            blurb: `${theme.styleName} edition. ${BLURB_PATTERNS[activity][pattern]}`,
          };

          if (range && activity === 'trace') {
            entry.range = range;
            entry.subtitle = `Trace the numbers from ${range[0]} to ${range[1]}, then try writing them all alone.`;
          } else if (range) {
            entry.range = range;
          }

          entries.push(entry);
        }
      }
    });
  });

  return entries;
}

const CATALOG = buildCatalog();
const CATALOG_BY_CATEGORY = {
  prek: CATALOG.filter((entry) => entry.category === 'prek'),
  k: CATALOG.filter((entry) => entry.category === 'k'),
  g1: CATALOG.filter((entry) => entry.category === 'g1'),
};
const CATALOG_BY_ID = Object.fromEntries(CATALOG.map((entry) => [entry.id, entry]));

function catalogFor(category) {
  return CATALOG_BY_CATEGORY[category] || [];
}

function findSheet(id) {
  return CATALOG_BY_ID[id] || null;
}

function activitiesFor(category) {
  return LEVEL_PLAN[category] || [];
}

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

function makeFactPool(operation, maxNumber) {
  const pool = [];

  if (operation === 'add') {
    for (let a = 1; a < maxNumber; a += 1) {
      for (let b = 1; b <= maxNumber - a; b += 1) {
        pool.push({ a, b, op: '+', result: a + b, answer: a + b, missing: null });
      }
    }
    return pool;
  }

  for (let a = 3; a <= maxNumber; a += 1) {
    for (let b = 1; b <= a - 2; b += 1) {
      pool.push({ a, b, op: '−', result: a - b, answer: a - b, missing: null });
    }
  }
  return pool;
}

function makeMissingPool(maxNumber) {
  const pool = [];

  for (let result = 4; result <= maxNumber; result += 1) {
    for (let a = 1; a < result; a += 1) {
      pool.push({ a, b: null, op: '+', result, answer: result - a, missing: 'b' });
    }
  }

  for (let a = 5; a <= maxNumber; a += 1) {
    for (let b = 1; b <= a - 2; b += 1) {
      pool.push({ a: null, b, op: '−', result: a - b, answer: a, missing: 'a' });
      pool.push({ a, b: null, op: '−', result: a - b, answer: b, missing: 'b' });
    }
  }

  return pool;
}

/* A queue deals every fact once before reshuffling, so a sheet never
   repeats the same equation while its pool has unused facts left. */
function makeQueue(items, rng) {
  let deck = rng.shuffle(items);
  let index = 0;

  return function next() {
    if (index >= deck.length) {
      deck = rng.shuffle(items);
      index = 0;
    }
    return deck[index++];
  };
}

function takeFromPool(pool, count, rng) {
  const next = makeQueue(pool, rng);
  return Array.from({ length: count }, () => next());
}

function pickWeightedQueue(queues, weights, rng) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < queues.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return queues[i];
  }
  return queues[queues.length - 1];
}

function buildEquationProblems(activity, count, rng) {
  if (activity === 'add10') return takeFromPool(makeFactPool('add', 10), count, rng);
  if (activity === 'sub10') return takeFromPool(makeFactPool('sub', 10), count, rng);
  if (activity === 'add20') return takeFromPool(makeFactPool('add', 20), count, rng);
  if (activity === 'sub20') return takeFromPool(makeFactPool('sub', 20), count, rng);
  if (activity === 'missing') return takeFromPool(makeMissingPool(20), count, rng);

  if (activity === 'mixed10') {
    const nextAdd = makeQueue(makeFactPool('add', 10), rng);
    const nextSub = makeQueue(makeFactPool('sub', 10), rng);
    const startWithAdd = rng.chance(0.5);
    return Array.from({ length: count }, (_, index) => {
      const wantsAdd = (index % 2 === 0) === startWithAdd;
      return wantsAdd ? nextAdd() : nextSub();
    });
  }

  // Mixed grade-one facts: every sheet gets all three formats, then a
  // varied mix of addition, subtraction and missing-number puzzles.
  const queues = [
    makeQueue(makeFactPool('add', 20), rng),
    makeQueue(makeFactPool('sub', 20), rng),
    makeQueue(makeMissingPool(20), rng),
  ];
  const weights = [0.4, 0.4, 0.2];

  return Array.from({ length: count }, (_, index) => {
    if (index < queues.length) return queues[index]();
    return pickWeightedQueue(queues, weights, rng)();
  });
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

function traceBlock(numbers, theme, { compact = false, letter = 'A', hint = '' } = {}) {
  return `<section class="ws-block">
    ${blockTitle(letter, 'Trace & write', hint || `${numbers[0]}–${numbers[numbers.length - 1]}`)}
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
  const counts = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const icons = [theme.emoji, theme.emoji, ...theme.deco];
  const nextCount = makeQueue(counts, rng);
  const nextIcon = makeQueue(icons, rng);

  for (let i = 0; i < count; i += 1) {
    items.push({ count: nextCount(), icon: nextIcon() });
  }
  return items;
}

function buildTraceContent(count, theme, rng, range) {
  let start = 1;
  let end = Math.min(Math.max(count, 5), 10);
  if (Array.isArray(range) && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
    start = Math.max(0, range[0]);
    end = Math.min(10, Math.max(start, range[1]));
  }
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const scope = numbers.length === 1 ? `${numbers[0]}` : `${numbers[0]}–${numbers[numbers.length - 1]}`;
  return {
    body: traceBlock(numbers, theme, {
      compact: numbers.length > 7,
      hint: scope,
    }),
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
  const combos = [];

  // Every shape, colour and group size is dealt before repeating.
  kinds.forEach((kind) => {
    for (let shapes = 3; shapes <= 8; shapes += 1) {
      for (let color = 0; color < 4; color += 1) {
        combos.push({ kind, shapes, color });
      }
    }
  });

  const items = takeFromPool(combos, count, rng);

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
  const combos = [];

  symbols.forEach((symbol) => {
    [true, false].forEach((withBigFirst) => {
      [true, false].forEach((askBigger) => {
        combos.push({ symbol, withBigFirst, askBigger });
      });
    });
  });

  const nextCombo = makeQueue(combos, rng);
  const cards = [];

  for (let i = 0; i < count; i += 1) {
    const { symbol, withBigFirst, askBigger } = nextCombo();
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
  const pool = [];

  // Deal every whole/part/side combination before repeating any bond.
  for (let whole = 5; whole <= 10; whole += 1) {
    for (let part = 1; part < whole; part += 1) {
      ['left', 'right'].forEach((missingSide) => {
        pool.push({ whole, part, missingPart: whole - part, missingSide });
      });
    }
  }

  const bonds = takeFromPool(pool, count, rng);

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
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const selected = takeFromPool(values, count, rng);

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Tally count', `${count} cards`)}
      <div class="tally-grid ${count > 10 ? 'tally-grid--dense' : ''}">
        ${selected.map((value, index) => `<div class="tally-card">
          <span class="tally-card__num">${index + 1}</span>
          <span class="tally-set" aria-hidden="true">${tallyMarks(value)}</span>
          <span class="tally-card__box" aria-hidden="true"></span>
        </div>`).join('')}
      </div>
    </section>`,
    answers: selected.map(String),
    answersNote: 'Answers are the totals of the tally marks.',
  };
}

function buildWordContent(count, theme, rng) {
  const problems = [];
  const total = Math.min(count, 8);
  const addTemplates = [
    (c, f, a, b, item) => `${c} the ${theme.who} has ${a} ${item}. ${f} brings ${b} more. How many ${item} are there altogether?`,
    (c, f, a, b, item) => `${c} finds ${a} ${item} in the morning and ${b} in the afternoon. How many ${item} in all?`,
    (c, f, a, b, item) => `There are ${a} ${item} in ${c}'s basket. ${f} adds ${b} more. How many ${item} are there now?`,
    (c, f, a, b, item) => `${c} counts ${a} ${item} on the first page and ${b} on the second. How many ${item} altogether?`,
    (c, f, a, b, item) => `A box has ${a} ${item}. ${f} puts in ${b} more. How many ${item} are in the box now?`,
    (c, f, a, b, item) => `${c} the ${theme.who} spots ${a} ${item} near the door and ${b} near the window. How many ${item} did ${c} spot?`,
  ];
  const subTemplates = [
    (c, f, a, b, item) => `${c} the ${theme.who} has ${a} ${item}. ${b} ${item} are taken away. How many are left?`,
    (c, f, a, b, item) => `${c} spots ${a} ${item}. Then ${b} of them disappear. How many ${item} can ${c} still see?`,
    (c, f, a, b, item) => `A box holds ${a} ${item}. ${f} takes out ${b}. How many ${item} stay in the box?`,
    (c, f, a, b, item) => `${c} the ${theme.who} starts with ${a} ${item} and gives ${b} to ${f}. How many ${item} are left?`,
    (c, f, a, b, item) => `There are ${a} ${item} on the table. ${b} roll away. How many ${item} are still there?`,
    (c, f, a, b, item) => `${c} finds ${a} ${item}, but ${b} are lost on the way home. How many ${item} make it home?`,
  ];

  const nextAddTemplate = makeQueue(addTemplates, rng);
  const nextSubTemplate = makeQueue(subTemplates, rng);
  const nextCharacter = makeQueue(theme.characters, rng);
  const nextItem = makeQueue(theme.items, rng);
  const startWithAdd = rng.chance(0.5);
  const used = new Set();

  for (let i = 0; i < total; i += 1) {
    const kind = (i % 2 === 0) === startWithAdd ? 'add' : 'sub';
    const character = nextCharacter();
    const friends = theme.characters.filter((name) => name !== character);
    const friend = friends.length ? rng.pick(friends) : 'A friend';
    const item = nextItem();
    let a;
    let b;
    let answer;
    let key = '';
    let attempts = 0;

    do {
      if (kind === 'add') {
        a = rng.int(2, 12);
        b = rng.int(2, Math.max(2, Math.min(8, 20 - a)));
        answer = a + b;
      } else {
        a = rng.int(7, 20);
        b = rng.int(2, a - 3);
        answer = a - b;
      }
      key = `${kind}:${a}:${b}`;
      attempts += 1;
    } while (used.has(key) && attempts < 40);

    used.add(key);
    const template = kind === 'add' ? nextAddTemplate() : nextSubTemplate();
    const emoji = kind === 'add' ? theme.emoji : theme.deco[i % theme.deco.length];
    problems.push({ text: template(character, friend, a, b, item), answer, emoji });
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

function buildMixedPreKContent(count, theme, rng, options = {}) {
  const range = Array.isArray(options.range) ? options.range : [1, 5];
  const traceNumbers = [];
  for (let number = range[0]; number <= range[1] && traceNumbers.length < 5; number += 1) {
    traceNumbers.push(number);
  }
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

function createContent(activity, count, theme, rng, options = {}) {
  if (activity === 'mixed-prek') return buildMixedPreKContent(count, theme, rng, options);
  if (activity === 'trace') return buildTraceContent(count, theme, rng, options.range);
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
  const content = createContent(activity, count, theme, rng, config);
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
   Shared public API
   ========================================================= */

window.SquiggleMath = {
  DIFFICULTIES,
  THEMES,
  ACTIVITY_INFO,
  LEVEL_PLAN,
  CATALOG,
  CATALOG_BY_CATEGORY,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  MAX_PROBLEMS,
  catalogFor,
  activitiesFor,
  findSheet,
  buildWorksheet,
  createRng,
  randomSeed,
  escapeHtml,
  brandSquiggle,
  dashedGlyph,
  shapeSvg,
  tallyMarks,
  addThinkingSpace,
};

})();
