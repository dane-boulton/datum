# DATUM User Manual

Production Markout Tool

## Quick start

DATUM turns a Vectorworks hoist export into a floor markout: a plot, a row-by-row checklist for marking the floor, and a printable PDF. It runs in a web browser at vektordatum.netlify.app and works on a laptop, iPad or phone.

1. **Export from Vectorworks.** Export the hoist worksheet as a CSV with the nine columns listed in the next section. Keep the header row; column order does not matter.
2. **Import.** Open DATUM, sign in, and drop the CSV on **1. Import CSV** (or click to choose it). The file name and row count appear under the box.
3. **Check the Data tab.** Rows with a problem (no ID, a coordinate that cannot be read, a duplicate ID or two marks in the same spot) are highlighted with a red or amber note in the Status column. Fix them in place and press **Apply changes**.
4. **Set the orientation.** In **2. Orientation & units**, set the datum and display units, and flip or rotate if the plot is the wrong way round. The Plot tab shows the result straight away.
5. **Mark out.** Open **Markout Rows** on an iPad or phone. Each row is one Y distance from the datum, with stage right marks on the left, stage left on the right and centre-line marks in the middle. Tap a mark when it is on the floor.
6. **Print.** Open **PDF Export**, fill in the sheet details and press **Export PDF**.
7. **Save.** Press **Save project** to keep the data, settings and completed marks. Signed-in users also save and share projects in the cloud.

## CSV fields from Vectorworks

Four columns are required: **Hoist ID**, **Hoist Symbol**, **Origin X** and **Origin Y**. The other five are optional but recommended. Columns are matched by header name, so order does not matter and extra columns are ignored.

| CSV header | Required | What DATUM does with it |
| --- | --- | --- |
| Hoist ID | Yes | The mark's label everywhere. Must be unique; blanks and duplicates are flagged. |
| Hoist Symbol | Yes | Read once on import into **Mark Type** (the symbol) and **Automation** (the badge). See below. |
| Function | No | Sets the symbol colour and groups the legend. |
| Hoist Position | No | "Hoist Up" draws the symbol inverted with an INVERT badge. "Hoist Down" or blank is normal. |
| Capacity (formatted) | No | Kept for reference in the Data tab and CSV export. Never used to choose the symbol. |
| Position | No | GRID / SUBHANG for hoists; a description for floor marks. See below. |
| Low Hook Weight Equivalent | No | Load in kg or lb, shown under each hoist (e.g. "450 kg" or "1000 lb"). |
| Origin X (formatted) | Yes | Distance across the stage from the centre line. |
| Origin Y (formatted) | Yes | Distance up or down stage from the datum. |

A minimal export looks like this:

```csv
Hoist ID,Capacity (formatted),Hoist Symbol,Function,Hoist Position,Position,Origin X (formatted),Origin Y (formatted),Low Hook Weight Equivalent
VX2,1000 kg,1 Ton TAIT Nav,Video,Hoist Up,GRID,"-12' - 7""","42' - 9""",450
USR,,USR Mark,Generic,,Main Stage,"-35' - 0""","50' - 0""",
```

### Hoist ID

The text printed beside every mark in the plot, Markout Rows and PDF. Keep IDs short (VX1, LX12). A row whose ID is **Datum** is not drawn; it can set the datum with **Use CSV Datum Row** (see Orientation).

### Hoist Symbol: mark type and automation

DATUM reads the Hoist Symbol text once, when the CSV is imported, and fills two editable columns. After import, change a mark in the Data tab's **Mark Type** and **Automation** boxes; the Hoist Symbol itself is not shown again.

**Mark Type** sets the symbol shape. The first rule that matches wins:

| Hoist Symbol contains | Mark Type |
| --- | --- |
| Fall Arrest | Fall Arrest |
| Block and Fall, Chain Block | Chain Block |
| Floor Mark | Floor Mark |
| USR, USL, DSR or DSL | That corner mark |
| 1/4 Ton | 250kg |
| 1/3 Ton | 320kg |
| 1/2 Ton | 500kg |
| 1 Ton, 2 Ton, 2.5 Ton, 3 Ton (or a kg / lb rating) | That size, snapped to the nearest standard rating |

Nothing matching leaves Mark Type blank; fill it in the Data tab.

**Automation** adds a badge and a legend entry. It is read from words in the same text:

| Hoist Symbol contains | Automation | Badge | Legend |
| --- | --- | --- | --- |
| Nav, Navigator | TAIT Nav | NAV | TAIT Nav Hoist |
| APEX | Kinesys APEX | APEX | Kinesys APEX Hoist |
| Elevation | Kinesys Elevation | ELEV | Kinesys Elevation Hoist |
| Moveket, V-Motion, VMK, VMC | Moveket V-Motion | KES | MOVEKET V-Motion Hoist |
| Auto, Automated, Automation, Varispeed | Automated | AUTO | Automated Hoist |
| none of these | blank (fixed speed) | none | none |

So "1 Ton TAIT Nav" becomes a 1 Ton symbol with a NAV badge, and "1/2 Ton Varispeed" becomes a 500kg symbol with an AUTO badge.

### Function

Function sets the colour of the symbol. Common functions get a standard colour: Lighting red, Audio yellow, Video purple, Scenery light blue, Cable Pick orange, Super Grid pink, Generic light grey, Other green, and Pre-Rig dark grey with a red ring. Any other function gets the next free colour. Change colours and rings in **3. Symbols & colours**.

### Hoist Position

Set to **Hoist Up** for motors rigged upside down (body up, hook down to the truss). These draw an inverted symbol with an INVERT badge; the style is set in **Hoist Up marker**. Floor marks, corner marks, fall arrests and chain blocks ignore this field.

### Capacity

The hoist's rated capacity, e.g. "1000 kg". It is kept and exported but has no effect on the symbol. The symbol comes from Hoist Symbol (Mark Type) only.

### Position: hoists vs floor marks

This field means different things for the two kinds of row.

- **Hoists, chain blocks and fall arrests:** enter **GRID** or **SUBHANG**. The **Show** filter (All hoists / Grid only / Subhang only) on the Plot, Markout Rows and PDF then shows one level at a time. A blank Position is always shown.
- **Floor marks and corner marks (USR, USL, DSR, DSL):** describe what is being marked, such as "Main Stage" or "Centre Line". This text is printed under the mark where a hoist shows its load. Marks are always shown, whatever the filter.

### Low Hook Weight Equivalent

The load on the hook, in kilograms or pounds. It is printed under each hoist in the unit it was exported in, e.g. "450 kg" or "1000 lb". Turn it off with **Show load** in PDF Export. Blank or non-numeric values show nothing.

DATUM decides the unit in this order:

1. A unit written in the cell, such as `1,250 lbs` or `450 kg`, is always used.
2. Otherwise the **Load values are in** setting (Orientation & units) applies: Kilograms or Pounds.
3. On Auto-detect (the default), a header such as "Low Hook Weight Equivalent (lbs)" means pounds, as does any cell in the column written in lb. Otherwise plain numbers are kilograms.

### Origin X and Origin Y

The plan position of each mark. Vectorworks text such as `-30' - 7"` or `42' - 9 1/2"` is always read as feet and inches. Plain numbers use the unit set in **CSV values are in** (auto-detect picks millimetres or metres).

- **Origin X** is across the stage. Negative X is stage right (left column), positive is stage left (right column), and values within the **Center Threshold** sit in the centre column.
- **Origin Y** is up and down stage. Positive Y is upstage of the datum, negative is downstage. Marks within the **Row Tolerance** of each other share one markout row.

## Orientation, units and datum

The **2. Orientation & units** panel decides where zero is, which way is upstage and how distances are written. Every change updates the plot, rows and PDF immediately.

| Option | What it does | Default |
| --- | --- | --- |
| CSV values are in | Unit of plain numbers in Origin X / Y. Feet-and-inches text is always read as feet and inches. | Auto-detect |
| Units | How distances are shown: Feet & Inches, Feet & decimal inches, Millimetres or Metres. | Feet & Inches |
| Round to | Fraction used for feet and inches: 1", 1/2", 1/4", 1/8" or 1/16". | 1/16" |
| Load values are in | Unit of plain numbers in Low Hook Weight Equivalent: Kilograms or Pounds. Values written with kg or lb keep their own unit. | Auto-detect |
| Row Tolerance (mm) | Marks whose Y values are this close share one markout row. | 50 |
| Center Threshold (mm) | Marks this close to X = 0 go in the centre column. | 1 |
| Rotation | Turns the plan 0, 90, 180 or 270 degrees about the datum. | 0 |
| Row Order | Top to Bottom lists upstage rows first; Bottom to Top starts downstage. | Top to Bottom |
| Side Sort | Within a row, list marks from the centre outwards or from the outside in. | Center to Outside |
| Flip X / Flip Y | Mirror left-right or up-down. | Off |
| Datum Offset X / Y | Moves zero to this point in the drawing's coordinates. | 0 |
| Top / Bottom / Left / Right Label | Words used for each direction. | UPSTAGE / DOWNSTAGE / SR / SL |

Four buttons set the datum quickly:

- **Zero Datum** puts zero back at the drawing's origin.
- **Auto Center Datum** puts zero in the middle of all marks.
- **Use CSV Datum Row** puts zero at the row whose Hoist ID or Mark Type is "Datum".
- **Reset Transforms** clears rotation, flips, offsets and labels.

## Plot tab

The Plot shows every mark in plan, as seen from the audience, with the datum crosshair at zero. Use it to check the import looks like the drawing before marking out.

- **Move around:** scroll or pinch to zoom, drag (or two-finger drag) to pan, double-tap to zoom in. **Fit** shows everything; **+** and **−** zoom in steps.
- **Select a mark:** click or tap it to open its card with ID, type, function, position and load. From the card you can tick it as marked.
- **Layers:** toggle **IDs**, **Coordinates**, **Grid** and **Legend**. On a phone these sit under the **···** button, and the legend opens from **Key**.
- **Show:** All hoists, Grid only or Subhang only (from each hoist's Position). Floor marks and corner marks always show.
- **Symbol size:** scales the symbols on the plot only.

### Symbols and colours

The **3. Symbols & colours** panel lists each Mark Type with its symbol and each Function with its colour. Pick a different symbol or colour from the list, or tick the ring box to draw a ring around a function's symbols (Pre-Rig has a red ring by default). **Hoist Up marker** chooses how inverted hoists are drawn: solid fill, an up-arrow badge, or both. **Auto-detect symbols from type names** resets each Mark Type to its standard symbol.

## Markout Rows tab

Markout Rows is the checklist used on the floor. Each row is one distance from the datum; the centre column shows it (e.g. UPSTAGE 42' - 9"), stage right marks are on the left and stage left marks on the right.

Each card shows the X distance from the centre line, the symbol, the Hoist ID, any INVERT or automation badge, and the load (or, for floor marks, the Position text). Marks on the centre line sit in the centre column, and that row is highlighted.

- **Tick a mark:** tap its card. Tap again to undo.
- **Move between rows:** **Previous** and **Next** at the bottom, or tap the **Row** counter to jump to the next row with unmarked marks.
- **Focus:** Both Sides, Stage Right Only or Stage Left Only. Useful when two people mark out one side each; centre-line marks show in both.
- **Show:** All hoists, Grid only or Subhang only.
- **Hide completed:** removes finished marks and rows.
- **Auto-advance:** moves to the next row once every mark in the current row is ticked.
- **Reset completed:** tap twice to clear all ticks.

Ticks are saved on the device you are using. They are kept in saved project files but are not shared through the cloud, so each person's progress is their own.

## PDF Export tab

The PDF is a printed version of Markout Rows: one row per Y distance, stage right on the left, the Y value in the centre column, and each mark's X distance, ID and load. The preview on the right updates as you change settings; **Export PDF** downloads it.

| Group | Settings |
| --- | --- |
| Sheet details | Sheet label, show, venue, datum note, date, revision, prepared by, footer text, title block on/off, show logo and user logo (with heights), logos on every page. |
| Page | Paper size, orientation, margin, **Fit to one page** (shrinks the whole sheet to one page). |
| Rows & fit | Row height, marks per row on each side, smallest text size, centre column width, and what to do when a row has too many marks: shrink text first, or split straight into extra rows. Split rows repeat the Y value marked 1/2, 2/2. |
| Text & symbols | Font, text size, Y value size, symbol size, line weight, **Show load**, tick boxes (none, empty, or ticked if marked). |
| Colours | Full colour, greyscale or black and white symbols, plus text, grid, centre line, header band and zebra row colours. **Reset colours** restores the defaults. |
| Content | Legend, header bands, **Unmarked only** (leaves out marks already ticked), and the Grid / Subhang **Show** filter. |

## Data tab

The Data tab is the imported CSV as an editable table, with each row's computed side, row distance and status. Use it to fix problems without going back to Vectorworks.

- **Edit:** type in any cell. Changed cells turn amber until you press **Apply changes** (or Enter); **Discard** throws them away.
- **Suggestions:** Mark Type, Automation and Function open a list of every option when you click them. Pick one or type your own.
- **Orientation:** a dropdown of Hoist Down, Hoist Up or blank.
- **Skip:** tick to leave a row off the plot, rows and PDF without deleting it.
- **Add, duplicate, delete:** **+ Add row** adds below the selected row; each row has duplicate and delete buttons (tap delete twice).
- **Status:** OK, Skipped, Datum row, or the problem (No ID, Bad Origin X, Bad Origin Y, Duplicate ID, Same position as another mark).
- **Export CSV** downloads the edited data. **Revert to imported CSV** (tap twice) undoes every edit.

### Align X

Align X finds marks whose X values are only slightly out and proposes tidy values. Set a **Tolerance** (e.g. 1"), then choose:

- **Mirrored pairs (SR/SL):** one stage right and one stage left mark in the same row, at nearly the same distance from centre, are made equal.
- **Same-X columns:** marks on one side at nearly the same X, in different rows, are lined up.
- **Mirrored + columns:** both.

The new value is the first mark in the list, the one farther from centre, or the average. A summary shows each change and how far it moves; **Apply changes**, **Discard**, or **Review in table** to check them first.

## Projects, cloud and sharing

Your current work is kept automatically in the browser. To keep it elsewhere or hand it on, save a project file or save it to the cloud.

- **Save project / Open project:** downloads or opens a `.datum.json` file holding the data, every setting, logos and completed ticks.
- **New / clear:** starts again from an empty project.
- **Cloud projects:** lists **My projects** and **Shared with me**. **Save to cloud** stores the current project under your account; open one to load it on any device.
- **Share:** from a cloud project you own, add a colleague's email. They see it under **Shared with me**. Remove them at any time.

DATUM is invite-only. An admin invites people from the **Team** screen, which emails them a link to set a password; they can also sign in with Google using the invited address.

| Role | Can do |
| --- | --- |
| Viewer | Open projects shared with them, tick marks, export PDFs. Cannot edit data or save to the cloud. |
| Editor | Everything a viewer can, plus import, edit, save, delete and share their own projects. |
| Admin | Everything an editor can, plus invite people, change roles and remove access. |

## Troubleshooting

| Problem | Fix |
| --- | --- |
| A message says a required column is missing | Check the export has Hoist ID, Origin X, Origin Y and Hoist Symbol headers, spelled as in the field table. |
| Bad Origin X / Bad Origin Y | The cell is blank or not a distance. Correct it in the Data tab, or skip the row. |
| Everything is tiny or huge | The unit was guessed wrong. Set **CSV values are in** to the unit Vectorworks exported. |
| Plot is mirrored or upside down | Use **Flip X**, **Flip Y** or **Rotation**, or check the Top/Bottom labels. |
| Two marks that should share a row are split | Raise **Row Tolerance**, or line them up with Align X. |
| A mark shows the wrong symbol | Change its **Mark Type** in the Data tab, or the symbol for that type in Symbols & colours. |
| A hoist is missing from Markout Rows | Check the **Show** filter (Grid only / Subhang only), **Focus**, **Hide completed** and the Skip box. |
| Can't edit or save | Your account is a Viewer. Ask an admin for Editor access. |
