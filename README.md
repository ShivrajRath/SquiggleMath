# SquiggleMath

A playful, print-ready math worksheet site for ages 3–7. SquiggleMath is a
single-page static site with a hand-picked printables library and a client-side
worksheet studio. No build step, no backend, no dependencies to install.

## What is inside

- **Printables library** grouped by age, with 180 worksheets for every age group
  (540 total), across 56 themes in the studio.
- **Worksheet Studio** with an age-first flow: pick Pre-K, Kindergarten or
  Grade 1, then a skill, a theme and an amount of practice. 60+ activity types,
  56 themes, optional answer key.
- **Age-matched worksheet design.** Pre-K sheets use 4–6 large items, two
  columns, chunky answer boxes and picture instructions. Kindergarten keeps
  picture support at 6–10 items. Grade 1 moves to 10–15 items with more
  independent work and a challenge prompt.
- **Standalone print pages** for every library sheet and generated worksheet:
  each opens in a new tab at full A4 size, with a print button and optional
  answer key.
- **A4 print styles** that print only the active worksheet, hide all site
  chrome, and preserve the playful theme colors.
- Responsive layout, keyboard-friendly controls, reduced-motion support.

## Skill areas

The library and studio group activities into seven areas:

1. **Getting ready** — pre-writing paths, colour hunt, same & different,
   position words, sorting bins.
2. **Early skills** — number tracing, counting, shapes, size comparison,
   patterns, ten-frames, dice, number hunt, dot counting.
3. **Number sense** — number bonds, tallies, make ten, teen numbers, number
   order, number patterns, ten more/ten less, place value, even & odd.
4. **Operations** — addition and subtraction to 10/20, picture sums, doubles,
   count on, balance the equation, fact families, two-digit practice.
5. **Measurement & data** — longer/shorter, measure with cubes, telling time,
   money, picture graphs.
6. **Geometry** — shape sorting, symmetry, fractions, 3D shapes, arrays.
7. **Stories** — themed word problems with a drawing workspace.

## Files

```text
.
├── index.html            # Landing page with printables library
├── worksheets.html       # Full browsable library
├── generator.html        # Worksheet studio
├── worksheet.html        # Standalone print page
├── engine.js             # Shared worksheet engine + age-band data
├── script.js             # Library interactions
├── generator.js          # Studio interactions
├── worksheet.js          # Print page logic
├── styles.css            # Design system + worksheet styles
├── generator.css         # Studio styles
├── worksheet.css         # Print page chrome
├── worksheet-ages.css    # Age bands + new activity layouts
├── docs/worksheet-design.md  # Early-education design contract
├── tools/audit.html      # Headless A4-fit audit
└── README.md
```

The Google Fonts request (Fredoka + Quicksand) is the only external resource.
Everything else is local.

## Age bands

| | Pre-K (3–4) | Kindergarten (5–6) | Grade 1 (6–7) |
|---|---|---|---|
| Items | 4–6 | 6–10 | 10–15 |
| Layout | 2 columns, big cards | 3 columns, picture support | 3–4 columns |
| Text | 13–15px + picture steps | 12–13px | 11–12px |
| Support | Grown-up corner, mascot cheer | Mascot cheer, 2 steps | Challenge prompt |
| Fine motor | Paths, tracing, colouring | Numeral writing | Written equations |

The engine caps item counts per band (`DIFFICULTIES[level].maxProblems`), so a
studio URL cannot produce a 20-item Pre-K sheet. Every sheet is designed to fit
one A4 page; enabling the answer key adds a second page.

## Run locally

From the project folder:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open <http://127.0.0.1:4173/>.

You can also open `index.html` directly in a browser, though using a local
server best matches how GitHub Pages serves the site.

## Print-fit audit

`tools/audit.html` renders every level × activity × theme combination at the
default and maximum item count, measures the A4 height, and lists any sheet that
overflows. Open it in a browser, or run:

```bash
google-chrome --headless=new --disable-gpu --dump-dom \
  --virtual-time-budget=8000 tools/audit.html
```

The audit checks structure, not final rendering: fonts and browser print
scaling can shift heights slightly, so always check a sample of real print
pages before publishing.

## Deploy to GitHub Pages

1. Push the repository to GitHub on the `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and the **/ (root)** folder, then save.
5. GitHub will publish the site at
   `https://<your-username>.github.io/SquiggleMath/`.

No GitHub Actions workflow or build command is needed.

## Printing notes

- Use the **Open print page** links and buttons inside the app. Each worksheet
  opens in its own full-size A4 page with a print button.
- For best results, enable **Background graphics** in the browser print dialog
  and set margins to **None** or **Default**.
- The layout is designed around A4, with browser scaling for US Letter.
- Pre-K sheets deliberately leave white space. That is fine-motor room, not a
  missing activity — the extra doodle zone fills any large gap.

## Customizing

- **Library sheets** live in the `CATALOG` generated by `buildCatalog()` in
  `engine.js`. Every age group has 180 recipes (10 skills × 3 layouts × 6
  themes). Each recipe has an `activity`, `problems`, `theme`, and fixed `seed`.
- **Age bands** are defined in `DIFFICULTIES` in `engine.js` (item caps, choice
  sets, session length, grown-up tips). Their visual scale lives in
  `worksheet-ages.css`.
- **Themes** live in `THEMES` in `engine.js`. Add a theme and it appears in the
  studio automatically.
- **Randomized sheets** use a small seeded PRNG (mulberry32). Pre-made sheets
  keep a fixed seed so their output is stable; custom sheets get a fresh seed
  every time.
- **Print sizes** are controlled in the `@media print` sections of `styles.css`
  and `worksheet-ages.css` (`@page` size and the 210mm worksheet canvas).
