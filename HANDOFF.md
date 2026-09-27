# DATUM: developer handoff notes

> **Starting a new Claude session?** Paste this:
> *"Read HANDOFF.md, README.md and CHANGELOG.md in the datum repo before doing anything, then tell me you're ready."*

Owner: **Dane** (stage designer, live events, Australia), dane@vektorprojects.com.
Repo: `dane-boulton/datum` (GitHub, private). Live site: **https://vektordatum.netlify.app** (Netlify builds from `main`).

---

## 1. How Dane likes to work

- **Workflow**
  - Develop on the session's working branch.
  - **Commit each change**, and push it to the working branch.
  - **Only push to `main` when Dane says "push".** `main` deploys straight to the live site.
- **Tone:** concise summaries and small, iterative changes. **Ask before large redesigns.** When a request has options, suggest them and let him pick; he often picks a subset.
- **Show your work**
  - After a visible change, send a test build (`site/index.html`, copied to a file such as `datum.html`) and screenshots.
  - Use Playwright to screenshot at desktop size (1300×900), phone size (390×800), phone landscape (844×390) and iPad (768×1024 and 1024×768).
  - Keep `CHANGELOG.md` updated (user-facing, newest first) and keep these notes current.
- **Pasted text:** he pastes errors and screenshots from Supabase, Netlify and Google. If he pastes a URL containing `#access_token=`, tell him it holds live sign-in tokens and how to revoke them. In future, ask him to share only the part before `#`.

## 2. What the app is

DATUM, the Production Markout Tool, is for arena floor markout. You import a CSV of chain motors (hoists), plot them, work through **Markout Rows** on a phone ticking marks off, edit data in the **Data** tab, and export a **PDF** markout sheet. It's an installable, offline-capable PWA on Netlify.

Optional cloud features run on Supabase: an invite-only sign-in wall, roles, cloud projects and sharing. See section 6.

## 3. Repo layout

| Path | What it is |
|---|---|
| `src/app.html` | **The whole app** (~2,500 lines of HTML, CSS and JS in one file). Edit this. |
| `scripts/build.mjs` | Build: inlines jsPDF, supabase-js (UMD), the brand icon and the cloud config into `site/index.html`, and stamps `site/sw.js`. |
| `src/sw.js.tpl`, `src/brand.b64` | Service worker template (network-first for pages, cache-first for its own assets); brand icon. |
| `site/` | What Netlify publishes. `index.html` and `sw.js` are generated and git-ignored. |
| `netlify.toml` | Build `npm install && node scripts/build.mjs`, publish `site`; functions in `netlify/functions`. |
| `netlify/functions/invite.mjs` | Server-side invite email function (section 6.5). |
| `supabase/schema.sql` | All database tables, functions, triggers and RLS policies. Idempotent; run it whole in the Supabase SQL Editor. |
| `supabase/test/` | `auth_stub.sql` (stands in for Supabase's `auth` schema) and `rls_test.sql` (35 access-rule checks). |
| `tests/` | `cloud.test.mjs` (56 UI checks, Playwright), `mock-supabase.js` (in-browser fake Supabase), `invite-fn.test.mjs` (17 checks of the function). |
| `docs/CLOUD_SETUP.md` | Dane's step-by-step setup guide: Supabase, Gmail SMTP, Google sign-in, Netlify. Update it whenever setup changes. |
| `samples/` | Sample CSVs (imperial and metric). |
| `CHANGELOG.md`, `README.md` | User-facing change notes; quick start. |
| `test` (root) | A stray one-line file from the GitHub placeholder commit. Harmless; delete it if Dane agrees. |

Dependencies: `jspdf` 4.2.1 and `@supabase/supabase-js` 2.117.2, pinned. Playwright is **not** a dependency, so Netlify doesn't download browsers.

## 4. Build and environment

- `npm install && npm run build`. The last line of the log says `cloud on (https://…supabase.co)` or `cloud off`.
- Cloud config comes from the env vars `SUPABASE_URL` and `SUPABASE_ANON_KEY`, or from `datum.config.json` (git-ignored; copy `datum.config.example.json`).
  - The URL is reduced to its origin, so a trailing `/` or `/rest/v1/` is harmless.
  - The config is injected as `window.DATUM_CLOUD={url,key}`, or `null` when cloud is off.
- **Cloud off** means no sign-in wall, no account button, and the app works fully locally. Handy for local work and screenshots.
- The netlify env var `SUPABASE_SERVICE_ROLE_KEY` is read **only** by the invite function. The build never touches it.
- Size is about 840 KB, because jsPDF and supabase-js are inlined so the app works offline.

## 5. App architecture (`src/app.html`)

The script is organised by comment banners `/* ===== … ===== */`. Search for them: constants, state, helpers, CSV, lengths, build data, symbols, rendering (rows, data, markout, plot), sidebar UI, import, PDF, projects, wiring, cloud, `init()`.

### State
- **`S`** is the app state:
  - `raw` (headers and rows as imported/edited), `map` (column indexes), `hoists` (parsed; **index-aligned with `raw.rows`**, including skipped rows), `rows` (Y rows for markout and PDF);
  - `opt` (units and orientation), `sheet` (PDF settings), `plot`, `mo` (Markout Rows);
  - `typeMap` (type → symbol), `funcMap` / `funcRing` (function → colour / ring);
  - `done` (Set of ticked IDs), `pending` (unapplied Data-tab edits), `skip` (Set of raw row indexes);
  - `cloud` (the linked cloud project, or null), logos, `sel`, `tab`.
- **`P`** is the plot camera: `cx`, `cy` (world mm) and `k` (px per mm). `W` and `H` are the plot size.
- **`C`** is cloud state: `sb` (Supabase client), `user`, `email`, `role`, `roleIssue`, save status.

### Data flow
- `refresh()` runs `rebuild()`, which parses rows into `S.hoists`, then `buildRows()` (groups by Y within `opt.tol`, splits sides by `opt.cth`). It then calls `renderSymUI()` and `renderAll()`, which renders Markout Rows, Data, the plot and a scheduled PDF preview, and saves via `saveStore()`.
- `tf(h)` applies the orientation transform (datum offset, flips, rotation) and gives `xs` (side X, negative = left) and `yu` (Y, positive = upstage).
- Units:
  - Internally, everything is **mm**. `parseLen()` reads mm, m or imperial strings.
  - `fmtDist()` and `fmtField()` format for display, in ft-in, decimal feet, mm or m.
  - `rawFromMm()` writes back in the CSV's input unit.
- **Editing:** Data-tab edits go into `S.pending`; `applyPending()` writes them to `S.raw`. `setRaw` / `ensureCol` add missing columns.
- **Skip:** a skipped hoist has `h.skip = true` and `h.ok = false`, so everything that filters on `h.ok` ignores it. `shiftSkip()` keeps the indexes right when rows are added or deleted.

### Storage (localStorage keys)
- `markoutTool.v1`: settings.
- `markoutTool.done.v1`: done marks.
- `markoutTool.logo.v1`: logos.
- `markoutTool.project.v1`: autosaved current project.
- Cloud: `markoutTool.cloudLink.v1` (S.cloud), `markoutTool.cloudDone.v1` (done marks per cloud project id), `markoutTool.cloudUser.v1` (cached role, used offline), `markoutTool.lastUser`.
- Project file: `Name.datum.json`, from `projectData(withLogos)`; `applyProject()` loads it.

### Features and where they live
- **Symbols and colours** (decisions already made):
  - Capacity symbols: 250 kg diamond, 320 pentagon, 500 triangle, 1000 circle, 2000 square, 2500 hexagon, 3000 octagon, all with a crosshair. lb values snap to the nearest kg. Also floor mark, corner marks, Chain Block ("Block and Fall"), Fall Arrest (heart).
  - Colours: Lighting red, Audio #ffd000, Cable Pick orange, Scenery light blue, Other green, Super Grid pink, Video purple, Generic light grey, Pre-Rig dark grey with a red ring.
  - **Automation types** come from the optional `Hoist Symbol` column (`S.map.hsym`), via `autoKind()`:
    - NAV/Navigator → `NAV`; Apex → `APEX`; Elevation → `ELEV`; Moveket/Movecat/V-Motion/VMK/VMC → `KES`; Auto/Automated/Varispeed → `AUTO` (checked last).
    - The result is stored as `h.auto` (a label or '') and drawn as a badge and as text under the symbol (`symParts` / `pdfSym` use `autoLabel`).
    - The function column plays no part: the old "Lighting Automated" handling (colour sharing and grouping) has been removed.
    - Legend names are in `AUTO_NAMES`: Automated Hoist, TAIT Nav Hoist, Kinesys APEX Hoist, Kinesys Elevation Hoist, MOVEKET V-Motion Hoist.
  - The Hoist Up modifier applies to hoists only.
  - Theme is charcoal/grey (no blue).
- **Legend** (`legendTypes`, `renderLegend`, PDF `legendLayout`):
  - Capacity symbols show their metric rating via `capLabel` (250 kg … 1 ton, 2 ton), and types sharing a symbol merge into one entry.
  - Order: small → large capacity, then chain block, fall arrest, floor, corners, then modifiers and functions.
- **Align X** (`alignX`, `showAlignSummary`):
  - Mirrored SR/SL pairs and same-X columns within a tolerance.
  - Modes: both / mirror / column. Keep: first / larger / average.
  - Proposes pending edits, and a pop-up lists old → new X with in/out amounts, merging groups that share a hoist.
- **Markout Rows** (`renderMoList(vis, scrollList)`):
  - The current row expands inline.
  - `scrollList === 'tap'`: the tapped row is pinned where it was on screen.
  - `true` (Next / Previous / others): the scroll position is kept, and the list scrolls only as far as needed if the open row passes the top or bottom edge.
  - Auto-advance, hide completed, focus by side.
  - Visual priority on cards and PDF cells: **X value > ID + symbol > badges**. In the PDF, `DIM_S = 1.18` and `ID_S = 0.82`, and the fit engine measures with them.
  - Card borders use the symbol colour (`--sc`). Rows with centre-column marks get `.hascl` / `.mo-mid.hascl`: the centre cell turns lighter grey (`--clhi`, `--clhi-a`, `--clhi-b`), collapsed and open. Automation badges are yellow like INVERT.
- **Plot** (`renderPlot`, `fitPlot`, gestures in `init`):
  - Pointer-event gestures: one-finger / mouse pan, **pinch zoom**, double-tap or double-click to zoom ×2.
  - `isCompact()` means the `COMPACT_MQ` media query matches: `(max-width:700px), (max-height:500px), (pointer:coarse) and (max-width:1100px)`. That is phones, short landscape screens and touch tablets. In compact mode:
    - the toolbar is Fit / + / − / **Key** / ⋯ (`.popts` holds the rest);
    - the legend is a bottom sheet (`#plotWrap.keyopen`);
    - labels are decluttered (skipped if they overlap symbols or other labels; the selected hoist always shows);
    - Fit uses a smaller padding.
  - The hoist info card (`renderInfo`) has **Mark done**. On compact screens it's a bottom card with ×.
  - Desktop is unchanged: floating legend with a Legend checkbox, all labels.
- **PDF** (`drawSheet(doc, measure)`, `buildSheet()`, `PdfRec`, `ScaledDoc`, `paintPage`):
  - `PdfRec` records draw operations so the canvas preview matches the PDF exactly.
  - The fit engine never clips text: it splits rows into 1/2, 2/2.
  - Logos are centred on the header text. Letter-spaced labels are centred with `ctext()`, because jsPDF's `align:'center'` ignores the character spacing.
  - The automatic footer reads "N hoists | N rows | Show name".
  - **Fit to one page** (`sheet.onePage`) draws through `ScaledDoc`, a larger virtual page scaled down. It binary-searches the largest scale where `drawSheet(…, true)` returns 1 page.
- **Responsive CSS:**
  - `max-width:900px` is the mobile drawer layout.
  - `max-width:520px` hides the brand.
  - `(max-height:500px) and (orientation:landscape)` gives a 44 px header, a toolbar floating over the plot, a one-line Markout bar, and PDF settings beside the preview.
  - `[hidden]` is forced to `display:none!important`.

## 6. Cloud (Supabase)

### 6.1 Live setup (as of 27 Sep 2026)
- **Supabase project ref:** `wonxsqykinhlhtqlxhfv` (https://wonxsqykinhlhtqlxhfv.supabase.co).
- **Site URL and Redirect URL:** `https://vektordatum.netlify.app` (it must include `https://`).
- **Google sign-in:** configured and working. Dane (account id `8127d106-e798-49da-ad1d-61a736360669`) signs in as **admin**.
- **Netlify env:** `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set. `SUPABASE_SERVICE_ROLE_KEY` (functions scope) is needed for invite emails; check it's there.
- **Email:** Gmail SMTP as datum@vektorprojects.com (guide Part 2). Unconfirmed whether Dane has finished this.
- **Last known database state:** Dane re-ran the schema to create the missing `projects` / `project_shares` tables and policies. Confirm with this; it should return 4 and 10:
  ```sql
  select (select count(*) from pg_tables where schemaname='public' and tablename in ('invites','profiles','projects','project_shares')) as tables,
         (select count(*) from pg_policies where schemaname='public') as rules;
  ```

### 6.2 Data model (`supabase/schema.sql`)
- **`invites`** (email, role, invited_by). Admin-only through RLS. It seeds `dane@vektorprojects.com` as admin.
- **`profiles`** (id = auth user id, email, role: viewer / editor / admin / disabled).
  - Created by the `on_auth_user_created` trigger, with the role taken from the invite.
  - Users read their own row; admins read and update all rows.
- **`projects`** (id, owner, owner_email, name, data jsonb, timestamps).
  - Readable by the owner or by anyone it's shared with; that needs a non-disabled role.
  - Editors and admins insert, update and delete their own. The `projects_touch` trigger pins owner and created_at.
- **`project_shares`** (project_id, email). The owner manages them; a recipient can read and delete their own row.
- **Invite-only enforcement:** the `before_auth_user_created` trigger calls `check_invite()`, which raises unless the email is in `invites`. This covers email and Google sign-ups; the client shows it as "Database error saving new user", which `authErr()` translates.
- **Helper functions** (security definer, `search_path = public`):
  - `my_role()` (returns 'disabled' if there's no profile), `my_email()` (from the JWT), `can_author()`, `has_access()`;
  - `owns_project()`, `shared_with_me()` (these avoid recursion between policies);
  - `is_invited(e)`;
  - `team()` (admin-only list with a `signed_in` flag from `auth.users.last_sign_in_at`).
- **RLS** is enabled right after each `create table`.

### 6.3 Client flow (the cloud section of `app.html`)
- **Start-up:** `cloudInit()` creates the client (`window.__datumSupabase` overrides it in tests), shows the gate in `wait` mode, and listens with `onAuthStateChange`, which calls `onAuth(session)`.
- **`onAuth`** does the following in order:
  1. Loads the role with `loadRole()`: `rpc('my_role')` first, falling back to a profiles select (to tell "no profile" from "disabled"), and one `refreshSession()` retry.
  2. If a different user signs in on the device, clears the local project.
  3. Handles problem states:
     - `disabled` → gate `off`;
     - no profile or an error → gate `problem`, with Try again and no technical details;
     - `user_metadata.datum_needs_password` → gate `newpw`, which appears after an emailed invite and can be skipped for Google.
  4. Otherwise calls `enterApp()`. Viewers with nothing open get the projects dialog.
- **Gate modes** (`showGate`): `in`, `setup` (first time: signUp; confirm email), `reset`, `newpw`, `wait`, `off`, `problem`.
- **Viewers** (`isViewer()`) are view-only everywhere.
  - `readOnly()` is also true for shared projects.
  - `roGuard()` blocks editing functions.
  - The `body.viewer .edonly` and `body.ro` CSS hide or lock controls.
- **Cloud projects:**
  - `cloudCreate` / `cloudOpen` / `cloudSave`: editors auto-save 2 s after a change (hooked into `autosaveSoon`), and `cloudPayload()` strips done marks.
  - `cloudSync()` runs on start-up and sign-in: it reloads a newer version, pushes unsynced edits, or detaches if access is lost.
  - Importing a CSV, opening a file or starting a new project calls `cloudDetach()`.
- **Dialogs:**
  - `showProjects` (My projects / Shared with me; open, share, rename, delete);
  - `showShare` (warns if the email isn't invited);
  - `showTeam` (invite, roles, remove / restore access, pending invites with Resend / Email invite / Cancel).

### 6.4 Roles in short
- **Viewer:** shared projects, ticks, PDF.
- **Editor:** plus import, edit, own cloud projects, share (shares are view-only).
- **Admin:** plus Team.
- **Disabled:** nothing.

### 6.5 Invite emails
- `sendInvite()` POSTs to `/.netlify/functions/invite` with the admin's access token.
  - The function verifies the token (`/auth/v1/user`), checks `profiles.role = 'admin'`, upserts the invite, then calls `/auth/v1/invite?redirect_to=…` with `data.datum_needs_password = true`.
  - Keys: an `sb_secret_…` key goes in the `apikey` header only; a legacy service_role JWT goes in both `apikey` and `Authorization`.
  - Results: 404 / 501 means the app falls back to a manual invite plus a mailto link; 422 means the account already exists.
- Emails go through Supabase **custom SMTP** (Gmail). Supabase's built-in email is test-only, so invites, confirmations and resets won't reach crew without it.

## 7. Testing

- **Setup:** Playwright uses Chromium at `/opt/pw-browsers/chromium`. Install it with `npm i --no-save playwright`.
- **Cloud UI** (about 3–4 minutes, so run it in the background):
  ```
  SUPABASE_URL=https://mock.supabase.co SUPABASE_ANON_KEY=mock npm run build && node tests/cloud.test.mjs
  ```
  **Don't rebuild `site/` while it runs**; that breaks the test. Rebuild with cloud off (`npm run build`) afterwards.
- **Invite function:** `node tests/invite-fn.test.mjs`.
- **Access rules on real Postgres:** Postgres 16 is installed in the sandbox. Keep the data dir outside the scratchpad; permissions there broke it before.
  ```
  D=/var/tmp/pgtest; mkdir -p $D; chown postgres $D
  su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $D/data -A trust -U postgres && /usr/lib/postgresql/16/bin/pg_ctl -D $D/data -o '-p 54329 -k $D' -l $D/log start"
  P="psql -h $D -p 54329 -U postgres -v ON_ERROR_STOP=1"; $P -c "create database t"
  $P -d t -f supabase/test/auth_stub.sql && $P -d t -f supabase/schema.sql && $P -d t -f supabase/test/rls_test.sql
  ```
  Also test the schema the way Supabase runs it, as a single request: `$P -d t -c "$(cat supabase/schema.sql)"`.
- **Quick manual checks:** build with cloud off and open `file:///…/site/index.html` in Playwright. Load `samples/Sample_Hoists.csv` and screenshot the sizes listed in section 1.

## 8. Problems we hit (and the fixes)

- **The Supabase SQL Editor rewrites scripts.**
  - It inserts "enable RLS" lines, and it misparsed `set search_path = public, auth`, which broke the run. Keep functions simple and enable RLS right after each table.
  - A partial run left the `projects` tables and **all policies** missing. The symptom: sign-in shows "not set up" even though `profiles` has the row, because RLS with no policies returns nothing. The fix is to re-run the whole schema in a **new** query and check tables = 4, rules = 10.
- **"requested path is invalid" after Google sign-in:** the Supabase Site URL was missing `https://`, so the redirect landed on `…supabase.co/vektordatum.netlify.app`.
- **Stale sessions** can send anonymous requests, which find no rows. `loadRole()` refreshes once and prefers `rpc('my_role')`.
- **Error details:** show nothing technical to users (IDs, project URL, raw DB errors). They go to the browser console only.

## 9. Open items and ideas

- Confirm the database check (section 6.1), the Gmail SMTP setup and `SUPABASE_SERVICE_ROLE_KEY` in Netlify. Then send a real invite end to end.
- Pinch and double-tap feel hasn't been tested on a real phone or iPad yet (only emulated).
- **Conflicts:** last write wins if one editor edits the same project on two devices at once.
- **Supabase free plan** may pause after about a week unused; restore it from the dashboard.
- **Declined by Dane:** a "Show this row on the plot" link from Markout Rows (too much clutter).
- **Possible later:** delete the stray `test` file; realtime updates for shared projects; hiding the side panel on desktop.
