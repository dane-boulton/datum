# Changelog

All notable changes to DATUM. Newest first.

## 29 September 2026

### Mark Type and Automation columns
- **Read once on import.** Hoist Symbol is read once, when a CSV is imported, into two ordinary columns: **Mark Type** (250kg … 3 Ton, Chain Block, Fall Arrest, Floor Mark, USR/USL/DSR/DSL) and **Automation** (Automated, TAIT Nav, Kinesys APEX, Kinesys Elevation, Moveket V-Motion). It uses the same text rules as before.
- **Edited directly.** From then on you edit Mark Type and Automation in the Data tab, with suggestions. The Hoist Symbol and "Reads as" columns are no longer shown.
- **Old function names cleaned up.** Functions such as "Lighting Automated" or "Video Automation", in older projects or files, become "Lighting" / "Video", and "Automated" moves into the Automation column (unless the Hoist Symbol already set a type).
- **No Columns section.** The Columns mapping section has been removed from the side panel. Columns are matched automatically; if a required one (Hoist ID, Origin X, Origin Y, or Hoist Symbol/Mark Type) is missing, a message says which.

## 28 September 2026 (night)

### Tidier columns
- **Nine columns.** The Columns panel and the Data tab now use just the nine columns from the export:

  | CSV column | In DATUM |
  |---|---|
  | Hoist ID | ID |
  | Capacity (formatted) | Capacity (stored, not used) |
  | Hoist Symbol | Symbol type + automation |
  | Function | Function |
  | Hoist Position | Orientation |
  | Position | Label for floor and corner marks; GRID / SUBHANG for hoists, chain blocks and fall arrests |
  | Origin X (formatted) | Origin X |
  | Origin Y (formatted) | Origin Y |
  | Low Hook Weight Equivalent | Load |

- **Formatted columns preferred.** If a file has both "Origin X" and "Origin X (formatted)", or "Capacity" and "Capacity (formatted)", the formatted one is used automatically.
- **No extra columns.** Hoist Type and Hoist Automation are no longer separate columns; DATUM works them out from Hoist Symbol as it reads the data, so nothing extra is added to your data or exported CSV.
- **Data tab.** You edit **Hoist Symbol** directly (with suggestions such as 1/2 Ton, 1 Ton TAIT Nav, USR Mark). A read-only **Reads as** column shows how each one is understood, e.g. "1 Ton · TAIT Nav".
- **Older files and projects** that have a "Hoist Type" column still work: that column is read as the Hoist Symbol.
- **Sample files and template** use the exact export headers and column order.

## 28 September 2026 (evening)

### Grid and subhang hoists
- **Categories.** Hoists, chain blocks and fall arrests with **GRID** or **SUBHANG** in the **Position** column now belong to that category. A blank Position means the hoist is always shown.
- **New Show option: All hoists / Grid only / Subhang only.** It's one shared setting, with a selector in:
  - the plot toolbar (in the ⋯ menu on phones);
  - the Markout Rows bar;
  - PDF export (Content).

  Floor and corner marks, and hoists with no category, are always shown. The PDF footer notes "Grid only" or "Subhang only" when the filter is on. The selector only appears when the data has categories.

### Markout Rows focus
- **Renamed options:** focus options are now **Stage Right Only** and **Stage Left Only**. They follow Flip X.
- **Whole list:** the focus applies to the whole list, not just the open row. Collapsed rows show only that side, rows with nothing on that side or the centre line drop out, and row counts, progress, auto-advance and "next unmarked" all count that side only.

### Columns
- **Orientation:** the old "Hoist Position" (Hoist Up / Hoist Down) is now called **Orientation** in the app. Both headers are recognised on import.
- **Capacity:** a Capacity column is imported and stored as its own column (shown and editable in the Data tab), but it's **no longer used to work out the Hoist Type**, not even as a fallback. The type comes only from Hoist Symbol, or from a Hoist Type column in older files.
- **Samples** now put GRID or SUBHANG in Position for most hoists.

## 28 September 2026 (later)

### Hoist Type and Position from the CSV
- **Hoist Symbol sets the Hoist Type.** The Hoist Symbol text fills two fields on import: **Hoist Type** and **Hoist Automation**. Both are shown and edited in the Data tab. Type mapping:
  - 1/4 Ton → 250kg, 1/3 Ton → 320kg, 1/2 Ton → 500kg, 1 Ton, 2 Ton, 2.5 Ton, 3 Ton.
  - Block and Fall or Chain Block → Chain Block.
  - Fall Arrest, Floor Mark.
  - USR (or USR Mark), USL, DSL, DSR.
- (Superseded later the same day: Capacity is no longer used as a fallback for the type.)
- **New Position column.** It's collected for every row.
  - For **floor marks and USR/USL/DSR/DSL** it describes what's being marked (for example "Main Stage" or "Camera Riser"). It's shown instead of the load on Markout Rows cards, under the mark's ID on the plot, in the hoist card and in the PDF.
  - For hoists it's stored but not used yet.
- **Up / Down.** The Hoist Position (Up/Down) column is labelled "Up / Down" in the app so it isn't confused with Position.
- **Columns panel** lists Hoist Symbol first ("sets Type + Automation"), then Hoist Type, Hoist Automation, Function, ID, Up / Down, Position, X, Y, Load. Changing the Hoist Symbol column re-reads it.
- **Legend** capacity labels now match the type names (250kg, 1 Ton).
- **Samples and template** now look like the export software's output: numeric Capacity, Hoist Symbol such as "1/2 Ton", "1 Ton TAIT Nav" or "USR Mark", and Position for the marks.
- **Older CSVs** that already have a Hoist Type column (e.g. "1000.00 kg") still work as before.

## 28 September 2026

### Automation types (new Hoist Symbol column)
- Automated hoists now come from a new optional CSV column, **Hoist Symbol**, instead of the Hoist Function. The value decides the badge and the text shown under the symbol:
  - **Auto**, **Automated**, **Varispeed** or **Vari-Speed** give **AUTO** (generic). The Data tab suggests just "Automated" for these.
  - **NAV** or **Navigator** give **NAV** (TAIT Navigator).
  - **Apex** gives **APEX**.
  - **Elevation** gives **ELEV**.
  - **Moveket**, **V-Motion**, **VMK** or **VMC** (also "Movecat") give **KES**.
- If a word matches more than one type, the specific one wins: "TAIT Navigator Automated" shows NAV.
- The legend lists each type in use: **Automated Hoist**, **TAIT Nav Hoist**, **Kinesys APEX Hoist**, **Kinesys Elevation Hoist**, **MOVEKET V-Motion Hoist**.
- The column is picked up automatically, can be chosen under **Columns > Hoist Symbol**, and can be edited in the Data tab (**Symbol** column, with suggestions).
- The template CSV, the built-in sample and the sample files now include the column.
- **Functions are plain again.** Automation no longer comes from the Hoist Function, so "Lighting Automated"-style functions are gone from the app and the samples; use Lighting, Video and so on. A function containing "Automated" is now just an ordinary function with its own colour.

### Markout Rows
- **The X value is now the largest text** on each card, then the hoist ID and symbol, then the badges.
- **Card borders** take the colour of the hoist's symbol, and still turn green when marked done.
- **Centre-column rows:** when a row has a mark on the centre line, its centre-column cell is highlighted in a lighter grey, both collapsed and open, so it's hard to miss.
- **Automated cards** are now the same height as the others.
- **Badge colour:** automation badges (AUTO, NAV, APEX, ELEV) use the same yellow as INVERT.

### PDF export
- **X value first:** in each cell the X value is larger and the hoist ID smaller. The fit engine allows for the new sizes, so text is still never clipped.
- **Centred labels:** Upstage/Downstage in the centre column, and the band labels, are now properly centred.

## 27 September 2026

### Sign-in, accounts and cloud projects (new)

When cloud is set up (see `docs/CLOUD_SETUP.md`), DATUM sits behind a sign-in screen. Without the cloud settings, the app works as before, with no sign-in.

- **Sign-in required.** Nobody can use the app without signing in.
  - Sign in with email and password, or with **Continue with Google**.
  - **Forgot password?** emails a reset link.
- **Invite only.** Only email addresses an admin has invited can create an account, with email or with Google. Uninvited people are told they have not been invited.
- **Invite emails.** Admins invite people from **Cloud projects > Team**. The invite arrives from DATUM &lt;datum@vektorprojects.com&gt;. Its link signs the person in and asks them to choose a password; Google users can skip that step.
  - **Resend email** and **Cancel** work on pending invites.
  - **Email invite** still opens your own mail app with the sign-up steps, as a backup.
- **Roles.**
  - **Viewer:** opens projects shared with them, ticks off markout rows and exports PDFs. Viewers cannot import CSVs, edit data, save files or create projects.
  - **Editor:** can also create, edit, save and share projects.
  - **Admin:** can also invite people, change roles, and remove or restore access.
  - dane@vektorprojects.com is the admin.
- **Cloud projects.**
  - Editors use **Save to cloud** to save a project.
  - Changes then save automatically. The top bar shows **Saved**, **Saving…** or **Offline – will sync**.
  - Projects can be opened, renamed and deleted from **Cloud projects**.
- **Sharing.**
  - Editors share a project by email address. The people they share with get view-only access and see it under **Shared with me**.
  - Shared projects update to the owner's latest version whenever the app is opened.
  - If an editor shares with an email that isn't invited yet, the app warns them.
- **Done marks stay on each device.** Ticks are never uploaded, so each crew member keeps their own.
- **Offline.** Once signed in, the app and the last opened project keep working without signal. An editor's changes upload when the connection returns.
- **Shared devices.** When a different person signs in on the same device, the screen is cleared for them.
- **Sign-in problems explained.**
  - If sign-in cannot finish, the screen says why ("not set up yet" or "could not check your access"), with **Try again** and **Sign out**.
  - No technical details are shown to users.
  - **Access removed** only appears when an admin has actually removed someone.
- **Automatic retry.** If the database does not recognise a sign-in, the app refreshes the sign-in once and tries again.

### Plot on phones and tablets

- **Pinch to zoom** and **two-finger pan** on touch screens. **Double-tap** zooms in; double-click does the same on desktop.
- **Key button.** On phones, tablets and short landscape screens, the legend is hidden behind a **Key** button and opens as a sheet from the bottom. Close it with × or by tapping the plot.
- **Compact toolbar:** Fit, +, −, Key and a ⋯ menu for IDs, Coordinates, Grid and Symbol size.
- **Tighter Fit** on small screens, so the hoists fill the width.
- **Uncluttered labels.** On small screens, IDs that would overlap other labels or symbols are hidden, and more appear as you zoom in. The selected hoist always shows its label.
- **Hoist card.** Tapping a hoist shows its details with a **Mark done** button. On desktop the info box has the button too.
- **Legend height.** The legend can no longer grow past the top of the plot; it scrolls instead.

### Landscape layouts (phone and iPad)

- **Phone landscape:**
  - a slimmer header;
  - the plot toolbar floats over the plot, so the plot uses nearly the full height;
  - Markout Rows uses a one-line top bar;
  - PDF settings sit beside the preview instead of above it.
- **iPad:** uses the touch-friendly plot in both orientations.

### Markout Rows

- **Tapping a row** opens it where it is on screen, instead of jumping it to the top of the list.
- **Next and Previous** keep the list still and only scroll when the open row reaches the top or bottom edge.

### Data tab

- **Align X summary.** Running Align X opens a pop-up listing each matched group, showing each hoist's Origin X before and after, and how far it moves ("in" toward the centre line, "out" away from it).
  - Hoists matched as both a mirrored pair and a column appear once, in a combined group.
  - Choose **Apply changes**, **Review in table** or **Discard**.
- **Skip checkbox** on each row.
  - Skipped rows stay in the data and in CSV export.
  - They are left off the plot, Markout Rows, the PDF, the legend, the warnings count and Align X.
  - Skips are saved with the project, and **Revert to imported CSV** clears them.

### PDF export

- **Logos centred.** Show and user logos stay vertically centred on the header text as they get bigger.
- **Show name in footer.** The automatic footer ends with the show name instead of "Audience at bottom of page".
- **Fit to one page** (under Page). This tickbox shrinks the whole sheet, header included, onto one page of the chosen paper size and orientation. The preview shows the scale used.

### Legend

- **Metric ratings.** Hoist types show their metric rating (250 kg, 320 kg, 500 kg, 1 ton, 2 ton, 2.5 ton, 3 ton), even when the CSV uses lb.
- **Merged entries.** Types that share a symbol, such as 1100 lb and 500 kg, appear as one entry.
- Other types (chain blocks, fall arrest, floor and corner marks) keep their names.

### Setup and behind the scenes

- **Database and invites:**
  - `supabase/schema.sql` creates the tables, access rules and invite list. It is safe to run again, and every table has row level security switched on.
  - `netlify/functions/invite.mjs` sends invite emails. It checks the caller is an admin and keeps the secret key on the server.
- **Setup guide:** `docs/CLOUD_SETUP.md` gives step-by-step setup for Supabase, sending email as datum@vektorprojects.com through Google Workspace, Google sign-in, and Netlify.
- **Build:**
  - The build switches cloud on from the `SUPABASE_URL` and `SUPABASE_ANON_KEY` settings.
  - It tidies a pasted Supabase address automatically; a trailing slash or `/rest/v1/` used to break Google sign-in.
- **Tests:**
  - access rules on Postgres: `supabase/test/rls_test.sql`;
  - the invite function: `tests/invite-fn.test.mjs`;
  - the cloud screens: `tests/cloud.test.mjs`.
