# SquiggleMath

A playful, print-ready math worksheet site for ages 3–7. SquiggleMath is a
single-page static site with a hand-picked printables library and a client-side
worksheet generator. No build step, no backend, no dependencies to install.

## What is inside

- **Pre-Made Printables Library** grouped by level:
  - Pre-K (ages 3–4): tracing, counting, shapes, and size comparison
  - Kindergarten (ages 5–6): addition/subtraction to 10, number bonds, tallies
  - 1st Grade (ages 6–7): addition/subtraction to 20, missing numbers, word problems
- **Worksheet Studio** with level, problem count (5/10/15/20), theme
  (Dinos, Space, Monsters, Ocean), and an optional answer key.
- **Print preview modal** for every pre-made sheet, with one-click print and a
  “Try this level” shortcut that loads its settings into the generator.
- **A4/US Letter print styles** that print only the active worksheet, hide all
  site chrome, and preserve the playful theme colors.
- Responsive layout, keyboard-friendly modal navigation, reduced-motion support,
  and a small “extra thinking space” area on sheets with room to spare.

## Files

```text
.
├── index.html    # Semantic page markup and print staging area
├── styles.css    # Design system, responsive layout, worksheet + print styles
├── script.js     # Library data, seeded random generator, renderers, interactions
└── README.md
```

The Google Fonts request (Fredoka + Quicksand) is the only external resource.
Everything else is local.

## Run locally

From the project folder:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open <http://127.0.0.1:4173/>.

You can also open `index.html` directly in a browser, though using a local
server best matches how GitHub Pages serves the site.

## Deploy to GitHub Pages

1. Push the repository to GitHub on the `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and the **/ (root)** folder, then save.
5. GitHub will publish the site at
   `https://<your-username>.github.io/SquiggleMath/`.

No GitHub Actions workflow or build command is needed.

## Printing notes

- Use the **Print worksheet** / **Print this worksheet** buttons inside the app.
  The active sheet is cloned into a print-only area before the browser print
  dialog opens, so navigation, controls, and the library are never printed.
- For best results, enable **Background graphics** in the browser print dialog
  and set margins to **None** or **Default**.
- The layout is designed around A4, with browser scaling for US Letter. Every
  worksheet fits on one page; enabling the answer key adds a second page.

## Customizing

- **Pre-made sheets** live in the `PREMADE` array near the top of `script.js`.
  Each recipe has an `activity`, `problems`, `theme`, and fixed `seed`.
- **Themes** and **levels** live in the `THEMES` and `DIFFICULTIES` objects in
  `script.js`; the CSS custom properties for worksheet accents are set when a
  sheet is rendered.
- **Randomized sheets** use a small seeded PRNG (mulberry32). Pre-made sheets
  keep a fixed seed so their output is stable; custom sheets get a fresh seed
  every time.
- **Print sizes** are controlled in the `@media print` section at the bottom of
  `styles.css` (`@page` size and the 210mm worksheet canvas).
