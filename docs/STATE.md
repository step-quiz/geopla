# Project 2 — Geoplà de Pick: living state

Agent-facing memory between sessions. English. Update it in the same commit as any change.
Spec: [`SPEC.md`](SPEC.md). Where they disagree, this file wins.

## Status (2026-10-18): v1 built, not yet published

| Part | Status |
|---|---|
| Integer geometry engine `js/motor/geometria.js` | DONE |
| Formula parser `js/motor/formula.js` (shunting-yard, exact rationals, no `eval`) | DONE |
| Phase machine `js/motor/fases.js` (F1–F7, PI profile) | DONE |
| UI: board (tap, drag, keyboard), counting, area scaffolds, formula, table, CSV, print | DONE |
| Dot-grid print sheet `imprimir.html` (n = 6, 8, 11; 1 cm pitch; one A4 page each) | DONE |
| Tests (`node tests/run-all.js`) | DONE, all green |
| Repo bootstrap on GitHub: workflows `unzip-upload.yml`, `tests.yml` | PENDING (user creates them in the web UI) |
| Cloudflare Pages project + `geopla.step-quiz.net` | PENDING (user) |
| Card in `ins/index.html`, row in `.github/profile/README.md` | PENDING (after first public release, user's OK) |

## Decisions approved by the user (2026-10-18)

1. F7 (holes, Reeve's tetrahedron) is in v1.
2. The table can be downloaded as CSV («Desa CSV»): `;` separator, decimal comma, UTF-8 BOM (opens in Excel/Sheets).
3. Each of F1–F4 and F6 unlocks the next phase after **3** correct items (`Fases.QUANTS`).

## Technical and pedagogical decisions (agent)

- **F3 accepts any triangle except an axis-legged right triangle** (that is F2). The tool draws the bounding box and
  the outside pieces: one right triangle per slanted edge plus, when a vertex is strictly inside the box, one
  rectangle (`Geometria.pecesCaixa`). The student types the box area, each piece and the result.
- **F4 is restricted to convex polygons with ≥ 4 vertices** (spec says "any simple polygon"). The polygon is cut
  into a fan of triangles from its first vertex; a «Mostra la caixa» button shows the F3 decomposition of each
  triangle. Free cut lines for non-convex polygons are a possible phase-2 feature.
- **F5 and F7: the tool gives the area** (`Àrea: … Aquí te la donem`) after the student counts B and I, so the
  investigation is about the pattern, not about computing areas again.
- **F5 goals:** 3 polygons with I = 0 and distinct B, then 3 with B = 4 and distinct I, then the formula. Polygons
  that do not fit the goal are still added to the table (they are data) but do not count.
- **Formula check:** first against the student's own table rows (F5: rows with h = 0), then 50 seeded random
  polygons (F7: random regions with 0, 1 or 2 holes). The first counterexample is drawn on the board with its B, I,
  true A and the formula's value. Table rows store the polygon so it can be redrawn.
- **F6 polygons** are seeded random polygons: seed = `F6|<per-browser seed>|<F6 count>|<table length>`. The
  per-browser seed (`geopla:v1:llavor`) only varies items between computers; nothing depends on it.
- **Counting feedback:** at most 2 messages. Named mistakes: only vertices counted; hole boundary forgotten;
  boundary counted as interior; points inside the hole counted. If the student used marks, wrongly marked pegs get
  a red ring (the missing ones are not shown, so the hint never gives the answer).
- **Floating point:** none in measurements. `Math.atan2` is used only to *order* random points in the generator;
  the result is then validated with integer predicates.
- **Touch targets:** each peg's whole cell is its hit area (nearest peg). On a 360 px phone the 11 × 11 board gives
  ≈ 26 px cells (board ≈ 302 px wide / 11.4 units: ≥ 24 px, the WCAG 2.5.8 minimum, but < 44 px); the PI profile
  (6 × 6) gives ≈ 47 px. Buttons and inputs ≥ 44 px.
- **CSP** in `_headers`: `connect-src 'none'`, no inline scripts or styles (`tests/repo.test.js` enforces both).
- **Reeve's tetrahedron** is an original SVG (cavalier perspective, r = 3, inside its 1 × 1 × 3 box).
- **Storage keys:** `geopla:v1:estat[-pi]`, `geopla:v1:taula[-pi]`, `geopla:v1:llavor`, `geopla:v1:avis-impressio`.
  Stored state is sanitised on load (`Fases.restaura`, `filaValida`); the table keeps the last 200 rows.

## Acceptance criteria (spec §7.7)

- [x] All geometry uses integers only.
- [x] F1–F7 playable (checked end to end in Chromium over `file://`).
- [x] The table persists in storage and can be printed (and downloaded as CSV).
- [x] A4 printable dot-grid sheet (selectable n).
- [x] PI profile reachable by URL (`?perfil=pi`).

## Verification done (2026-10-18)

- `node tests/run-all.js`: geometry 44, formulas and phases 63, repository 13 checks, `?v=` up to date, docs ↔ code.
- Browser (Playwright Chromium, `file://`): F1 ×3 with wrong count and perimeter-instead-of-area; F2 with incomplete
  marks; F3 with pieces not halved; F4 concave rejected, convex with decimal comma; F5 full investigation, wrong
  formula with counterexample, Pick accepted with `I + 0,5B - 1`; F6 ×3 with a wrong prediction; F7 ×2 with hole
  boundary forgotten, formula without H rejected, with H accepted; keyboard-only rectangle; PI profile; 360 px
  phone (no horizontal scroll); dark mode; garbage URL. No JS errors, no external requests.
- Print: each dot-grid size fits on one A4 page.

## Possible next steps

- Hint ladder (spec §5.1, optional for this project).
- F4 with free cut lines for non-convex polygons.
- Pictograms (ARASAAC) for «vora / dins» in the PI profile, if the user approves them (spec §5.4).
