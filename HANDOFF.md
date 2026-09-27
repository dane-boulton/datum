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
- Align X shows a summary pop-up of each change (old/new X, in/out amount) with Apply / Review in table / Discard.
- Data tab Skip checkbox per row (S.skip, raw row indices, shifted on add/delete, saved in projects): skipped rows stay in data/CSV export but are left off plot, rows, PDF, legend, warnings, Align X.
- PDF: logos centred vertically on the header text; auto footer ends with the show name; "Fit to one page" scales the whole sheet (ScaledDoc wrapper + search for the largest scale that gives one page).
- Legend shows metric ratings for capacity symbols (250 kg ... 1 ton, 2 ton) and merges types sharing a symbol; other types keep their names.
- Cloud (Supabase; see docs/CLOUD_SETUP.md): when SUPABASE_URL / SUPABASE_ANON_KEY are set at build, the whole app sits behind a sign-in screen. Accounts are invite only (public.invites + before-insert trigger on auth.users); admin is dane@vektorprojects.com (seeded in schema.sql). Roles in public.profiles: viewer (shared projects only, fully view only: no import/edit), editor (own projects, share by email, view-only shares), admin (editor + Team: invite, roles, remove access), disabled. Done marks stay on the device. S.cloud is the linked project; editors' changes auto-save after 2 s. A different user signing in on a device gets a cleared screen. Without the settings the app builds with no sign-in (for local work).

## Hosting / workflow
- Repo: dane-boulton/datum on GitHub (private), Netlify builds via `netlify.toml` (`npm install && node scripts/build.mjs`, publish `site`).
- Commit each change. Test with Playwright (chromium at /opt/pw-browsers/chromium) against `python3 -m http.server -d site`. Install playwright with `npm i --no-save playwright` (not a dependency, so Netlify does not download browsers).
- Cloud tests: `supabase/test/rls_test.sql` (access rules on local Postgres) and `tests/cloud.test.mjs` (UI against tests/mock-supabase.js; build with SUPABASE_URL=https://mock.supabase.co SUPABASE_ANON_KEY=mock first).
- The user prefers concise summaries and iterative changes; ask before large redesigns.
