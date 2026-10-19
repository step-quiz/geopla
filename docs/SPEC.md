# Project 2 — Geoplà de Pick: specification

> Copied from `SPEC-step-quiz-9-projects.md` §7 (2026-10-18, approved scope). The shared rules of that document
> apply and are summarised here; decisions taken later are in [`STATE.md`](STATE.md), which overrides this file.
> Where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins.

## Shared rules (summary of the master spec §2–§4)

- Static only (HTML + CSS + vanilla JS), no build step, no backend. **Must work under `file://`** (double click):
  classic scripts with one namespace per file and the dual export wrapper, no ES modules, no `fetch`, no Workers.
- No network at runtime (no CDN, fonts, analytics). Privacy: no personal data; `localStorage` only, every access in
  `try/catch`, fully usable without storage. Keys `geopla:v1:<what>`.
- Everything the student sees is in Catalan; identifiers and comments in Catalan; agent docs in English.
- Content CC BY-NC-SA 4.0, code MIT (`LICENSE`, `LLICENCIA.md` from `step-quiz-commons/fitxers/`).
- Never `[skip ci]`, `[ci skip]` or `[cf-pages-skip]` in any commit message.
- Tests before delivery; tests recompute results independently of the code under test. Docs follow code.
- Seeded RNG (FNV-1a → mulberry32, from `prova1eso/assets/js/atzar.js`); never `Math.random` for anything
  reproducible. URL readers tolerate garbage.
- Pedagogy: one action per screen state, ≤ ~40 words of instructions, feedback names the mistake (≤ 2 messages),
  no gamification noise, every route ends in a "beauty moment", hints never give the answer.
- Interaction triad (drag, tap-then-tap, keyboard); Pointer Events with `setPointerCapture`; `touch-action: none`
  only on the board; targets ≥ 44 px touch / ≥ 24 px mouse; `aria-live` feedback; colour never the only carrier;
  animations ≤ 300 ms and off under `prefers-reduced-motion`; dark mode via tokens; print black on white, A4 15 mm.
- Cache busting with `?v=<content hash>` (`tools/versio.py`), checked by a test.
- Catalan maths typography: decimal comma (inputs accept `,` and `.`), `·` and `:`, `«…»`, typographic `’`.

## Project 2: Geoplà de Pick

**Repo:** `geopla`. **Curriculum:** 1r–2n ESO area, polygons, counting; PI profile for 1r ESO adapted groups.

### 7.1 Pedagogical intent

The student discovers Pick's theorem, `A = I + B/2 − 1`, by counting and tabulating, not by being told. The beauty moment is that a formula built from two counts gives the area of *any* lattice polygon. The limits are explored as well: holes, and 3D (Reeve's tetrahedron).

### 7.2 Board and polygon construction

- An `n × n` grid of pegs at integer coordinates: default `n = 11`; `?perfil=pi` gives `n = 6` with 44 px pegs.
- **Building.**
  - Tap pegs to add vertices.
  - Tap the first vertex, or press Enter, to close the polygon.
  - Drag a vertex to move it (it snaps to pegs).
  - Backspace removes the last vertex.
  - Keyboard: arrows move a focus ring over pegs; Enter adds a vertex.
- **Validation** (exact integer arithmetic only; no floating point anywhere in the geometry):
  - at least 3 distinct vertices;
  - no zero-length edge and no repeated vertex;
  - simple polygon: non-adjacent edges do not intersect, and adjacent edges share only their endpoint. Use integer orientation tests (cross products) with collinear-overlap handling.
- **Quantities.**
  - `2A = |Σ (x_i·y_{i+1} − x_{i+1}·y_i)|` (an integer; display `A` as an integer or `x,5`).
  - `B = Σ gcd(|Δx|, |Δy|)` over the edges.
  - `I` is computed **by counting**: for each lattice point inside the bounding box, first test whether it lies on an edge (then it counts towards B), otherwise apply the even–odd or winding test.
  - The app never derives `I` from Pick: that relation is what the student must discover, and the tests use it to cross-check.

### 7.3 Student tasks and phases

Each phase unlocks after `k` correct items (default 3). Every completed polygon adds a row `(B, I, A)` to the student's table, which stays visible.

| Phase | Polygons | How the student gets A |
|---|---|---|
| F1 | Axis-aligned rectangles | base × height (unit squares shown) |
| F2 | Right triangles with legs on the grid | half of the rectangle |
| F3 | Any triangle | Bounding rectangle minus right triangles; the tool draws the box and corner triangles with leg lengths and the student fills in the computation |
| F4 | Any simple polygon | Decomposition: the student draws cut lines, or uses F3 |
| F5 | Guided investigation | «Fes polígons amb I = 0 i B diferents. Què passa amb A?», then «Fixa B = 4 i canvia I». Then the student **types a formula** in `B` and `I` |
| F6 | Prediction | Given a polygon, predict `A` with your formula before counting |
| F7 | Beyond | A polygon with one hole: the formula fails, so find the correction (`A = I + B/2 − 1 + h` for `h` holes). Then a static illustration of Reeve's tetrahedron: in 3D no such formula in `I` and `B` exists |

- **Counting tasks.** Tapping a peg cycles «res → vora → dins → res», with a number badge showing the running count, or the student types the counts. Checking happens only on «Comprova», never live.
- **Area input.** Accept `6,5`, `6.5` and `13/2`.

### 7.4 Formula checker (F5)

- **Parser.** A safe expression parser (shunting-yard; **no `eval`**). It accepts numbers with a decimal comma or point, variables `B`, `I` (later `H`), `+ − · * / :` and parentheses. It allows implicit multiplication between a number and a variable or parenthesis (`0,5B`, `2(I+1)`).
- **Check.** Evaluate the formula with exact rationals (numerator/denominator pairs) on:
  - every row of the student's table;
  - 50 random simple lattice polygons.
- **Feedback.** On failure, show **one counterexample polygon** drawn on the board with its `B`, `I`, true `A` and the formula's value. This is falsification as a learning moment. On success, the beauty moment: the theorem's name, Georg Pick (1899), and a one-line note.

### 7.5 PI profile

- 6 × 6 board and phases F1–F3 only.
- Pictogram or icon support for «vora / dins».
- Larger fonts, no formula phase, and celebration that is calm (a check mark and a short word).

### 7.6 Tests

- **Random polygon generator.** Pick random lattice points, sort them by angle around their centroid (star-shaped and simple), and reject polygons with collinear consecutive edges or duplicates.
- **Pick cross-check on 10 000 random polygons:** counted `I` must equal `A − B/2 + 1`. This validates the area, boundary and interior code against each other.
- Self-intersection detector on crafted cases: bow-tie, touching vertex, collinear overlap.
- Parser: precedence, decimal comma, implicit multiplication, rejection of anything else.
- Phase state machine.

### 7.7 Acceptance criteria

- [ ] All geometry uses integers only.
- [ ] F1–F7 playable.
- [ ] The table persists in storage and can be printed.
- [ ] A4 printable dot-grid sheet (selectable `n`).
- [ ] PI profile reachable by URL.

**Open questions for the user:**
- Should F7 (holes, 3D) be in v1?
- Should the table be exportable (CSV) for a class discussion?
