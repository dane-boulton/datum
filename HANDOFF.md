# DATUM - handoff notes for a new session

Owner: Dane (stage designer, live events, Australia). Tell the new session to read this file and README.md first.

## What this is
DATUM - Production Markout Tool. A single-file HTML/JS app for arena floor markout: import a CSV of chain motors, plot them, work through Markout Rows on a phone (tick marks off), edit data, export a PDF markout sheet. Hosted on Netlify as an installable, offline-capable PWA. All app code is in `src/app.html`; `npm run build` inlines jsPDF and the icon into `site/index.html`.

## CSV columns
Hoist Type (auto-mapped to a "Capacity" column if present) -> symbol; Hoist Function -> colour; Hoist ID; Hoist Position (Hoist Up/Down); Origin X / Origin Y; optional Load kg. Units auto-detected (mm, or imperial like -64'3.319"). Parser accepts .5", 6-1/2", 1/2", missing closing quote, unicode fractions.

## Key decisions already made
- Symbols by capacity: 250kg diamond, 320kg pentagon, 500kg triangle, 1000kg circle, 2000kg square, 2500kg hexagon, 3000kg octagon (all with crosshair); lb values snap to nearest kg. 0.125t removed. Also floor mark, corner marks DSL/DSR/USL/USR, Chain Block (matches "Block and Fall"), Fall Arrest (heart).
- Colours: Lighting red, Audio yellow (#ffd000), Cable Pick orange, Scenery light blue, Other green, Super Grid pink, Video purple, Generic light grey, Pre-Rig dark grey + red ring. "Lighting" and "Lighting Automated" share one colour/legend entry. Words Auto/Automated/Automation add an "AUTO" text label under the symbol (text only, no box) and an Auto badge in rows.
- Hoist Up modifier (fill / arrow / both) applies to hoists only, not floor marks/corners/fall arrest/chain block.
- Legend order: hoists small->large capacity, chain blocks, fall arrest, floor marks, corner marks, modifiers.
- Single "Datum Offset" X/Y setting that follows display units. No rotate/side-assign/swap-label buttons; Flip X does side swap. Side labels show just SR/SL etc.
- Markout Rows: list scrolls down, current row expands inline; compact rows; done ticks, hide-completed, reset.
- PDF export page: live preview identical to PDF; fit engine guarantees no clipped text (splits a Y row into 1/2, 2/2 when needed); editable sheet label (default FLOOR MARKOUT), show logo (left, before title), user logo (right), header band text colour.
- Save/load: project file `Name.datum.json` (data, edits, settings, done marks, logos) + autosave to browser localStorage.
- Align X (Data tab): finds mirrored SR/SL pairs and same-X columns whose X is within a tolerance (default 1") and proposes aligned values as pending edits; user reviews then Apply.
- Theme: charcoal/grey (no blue). Icons: white diamond glyph on grey gradient.

## Hosting / workflow
- Repo: dane-boulton/datum on GitHub (private), Netlify builds via `netlify.toml` (`npm install && node scripts/build.mjs`, publish `site`).
- Commit each change. Test with Playwright (chromium at /opt/pw-browsers/chromium) against `python3 -m http.server -d site`.
- The user prefers concise summaries and iterative changes; ask before large redesigns.
