# Bonding Potion — Task List

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 14 November 2026 |
| **Based on** | [Game Design Document](Game%20Design%20Document.md) (GDD), [Technical Design Document](Technical%20Design%20Document.md) (TDD), [Art List](Art%20List.md), [Screen Layouts](Screen%20Layouts.md) |

All tasks except drawing the art. Art *integration* (placeholders, replacing files, checking art in the game) is included.

**Owner:** *Dev* = programming. *Design* = game designer (writing, data, balance, testing). *Art* = artist (only for checking art in the game, not drawing).
**Priority:** *Must* / *Should* / *Could*, as in GDD section 7.
**ID** is used in the "Depends on" column.

---

## 1. Project setup

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| S1 | Create the folder structure from TDD §3 (`src/`, `data/`, `assets/`, `lib/`, `tools/`) | Dev | Must | — | Folders exist in the repository. |
| S2 | Add Phaser 3 (minified) to `lib/` | Dev | Must | S1 | `lib/phaser.min.js` committed. |
| S3 | `index.html`, `style.css`, `src/main.js`: 1920 × 1080 canvas, FIT scaling, centred, letterbox colour | Dev | Must | S2 | Empty game scales correctly in a desktop browser and on a phone. |
| S4 | `tools/serve.ps1` local web server on port 8080 | Dev | Must | S1 | The game opens at `http://localhost:8080`. |
| S5 | Enable GitHub Pages (main / root) and check the URL | Dev | Must | S3 | `https://tvareena.github.io/bonding_potion/` shows the game. |
| S6 | Rotate-device message for portrait phones (CSS overlay, game paused) | Dev | Should | S3 | Portrait shows the message; landscape shows the game. |
| S7 | Web font: pick a free-licence font, add to `assets/fonts/`, load with `@font-face` before the game starts | Design + Dev | Should | S3 | Text uses the font; Arial is used if it fails to load. |

## 2. Data files

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| D1 | `data/assets.json`: every image from the Art List (65 files) with key, path, required size and group (TDD §5.7); 9-slice settings for `ui_textbox`, `ui_nameplate`, `ui_panel`; audio entries | Dev | Must | S1 | Every Art List file has an entry. |
| D2 | `data/layout.json`: all positions and sizes from Screen Layouts (title, dialogue, potion, ending card, panels) | Dev | Must | S1 | Numbers match Screen Layouts exactly. |
| D3 | `data/config.json`: element colours, text speeds, hint timings, resistance values, ending thresholds (TDD §5.5) | Dev | Must | S1 | All keys from TDD §5.5 present with defaults. |
| D4 | `data/potions.json`: 7 potions with book/cat recipes, guidance level, cat present, unlocks, flavour text (GDD §3.4) | Design | Must | — | Matches GDD §3.4; flavour line written for each potion. |
| D5 | `data/crystals.json`: 13 crystals with elements (GDD §3.3) | Design | Must | — | Matches GDD §3.3. |
| D6 | `data/characters.json`: heroine, chad, jaros, jaros_human with display names and image keys (one image per character) | Design | Must | — | File valid; names editable in one place. |
| D7 | `data/texts.json`: every player-visible text that isn't a line or a name (buttons, menus, hints, panels, ending names; TDD §5.8). Code uses only keys from it | Dev + Design | Must | S1 | Searching the code finds no player-visible English text. |

## 3. Placeholders and art pipeline

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| A1 | `tools/make_placeholders.ps1`: creates every missing image from `assets.json` at the right size (flat colour, border, asset name); never overwrites existing files; records each file with its checksum in `assets/placeholders.json` | Dev | Must | D1 | Running it fills `assets/images/` with 65 files and lists them in `placeholders.json`. |
| A2 | Generate and commit all placeholder images | Dev | Must | A1 | The game runs with no missing images. |
| A3 | Runtime fallback: a missing image becomes a generated rectangle of the expected size, with a console warning | Dev | Should | D1 | Deleting a file doesn't crash the game. |
| A4 | Short "How to replace art" note in the repository README (editor Art tab, or by hand: same name, same size, same folder; JPG for backgrounds) | Dev | Should | A2 | The artist can replace a file without asking. |
| A5 | Check each delivered art batch in the game: size, position, transparency, 9-slice stretching, the cat icon swing pivot, sprite head zone, cauldron/cat overlap | Art + Design | Must | A2 | No clipping, stretching artefacts or misalignment. |
| A6 | Compress PNGs and check total download size (≤ 30 MB, target 15 MB) | Dev | Should | A5 | Size measured and within budget. |

## 4. Core systems

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| C1 | `BootScene` and `PreloadScene`: load config, layout, assets, data, script; progress bar drawn in code | Dev | Must | S3, D1–D3 | All assets load; progress bar shows. |
| C2 | `ScriptParser`: sections (`== id`, `potion`, `ending`), lines with speaker, narration, commands (`@bg`, `@show`, `@hide`, `@music`, `@sfx`, `@wait`, `@on … [random]`); warnings for unknown items | Dev | Must | C1 | Parses the sample script from TDD §5.1; bad lines are skipped with a warning. |
| C3 | `GameState`: step index, book/cat choices, flags, session log; ending choice with thresholds from config | Dev | Must | D3 | Unit-checked with 0–6 cat choices → correct ending. |
| C4 | `StoryRunner`: walks sections in file order, opens Dialogue / Potion / Ending scenes, picks the ending section | Dev | Must | C2, C3 | Full flow from D1 to the ending runs with placeholder text. |
| C5 | `SaveSystem`: autosave at each step start; settings and seen endings stored separately; version check; safe when `localStorage` is unavailable | Dev | Should | C3 | Reloading the page and pressing Continue resumes at the saved step. |
| C6 | `AudioManager`: music with cross-fade, SFX, volumes, unlock on first input, silent if files are missing | Dev | Could | C1 | Music changes with `@music`; volumes apply. |

## 5. UI components

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| U1 | `Button`: image button with normal / hover / pressed (+ disabled), text label drawn on top; hover only with a mouse | Dev | Must | C1 | All image buttons use it. |
| U2 | `TextBox`: 9-slice box, name plate (hidden for narration), text wrapping and shrink-to-fit, typewriter with click-to-complete | Dev | Must | C1 | Lines up to ~3 rows fit in both textbox sizes. |
| U3 | `Portrait`: Heroine portrait with frame (one image) | Dev | Must | C1 | Portrait shows on both screens. |
| U4 | `TextMenu`: text-only items with invisible 120 × 40 hit areas, hover colour/underline; hides unimplemented items and re-aligns | Dev | Must | C1 | Menu matches Screen Layouts. |
| U5 | `Panel`: 9-slice panel at 360, 140 · 1200 × 800 over a dimmed screen | Dev | Should | C1 | Used by the overlay panels. |
| U6 | `IngredientMenu`: panel, tabs (Crystals / Potions), sort row, 3 × 5 grid of cells | Dev | Must | C1 | Layout matches Screen Layouts. |

## 6. Screens

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| T1 | `TitleScene`: background, logo image, menu panel and word-image buttons Start / Continue / Load / Settings / Credits on the left; Continue hidden without a save; confirm before overwriting a save; fade to D1 | Dev | Must | U1, C5 | Matches the main menu layout. |
| T2 | `DialogueScene`: background cross-fade, sprite show/hide with fades, textbox, portrait, cat icon, text menu, advance (click, tap, Space, Enter) | Dev | Must | U2–U4, C4 | D1 plays fully with placeholders. |
| T3 | Idle hint "Click to continue" / "Tap to continue" after 5 s; stops after 3 advances | Dev | Must | T2 | Works on desktop and touch. |
| T4 | Cat icon swing: ±8° around pivot 110, 196 while a `jaros` line is shown | Dev | Should | T2 | Swings only on Jaros lines. |
| T5 | `PotionScene` layout: recipe page with name, element icons and amounts, flavour; cauldron, liquid layer, counter; cat on the table (hidden in P6); Brew, Empty, Next (disabled until success); Menu text button; portrait and textbox | Dev | Must | U1–U3, U6, D4 | Matches the potion screen layout. |
| T6 | `EndingScene`: runs the ending section, then the ending card with illustration, ending name, "Ending X of 3", Title button; stores the seen ending | Dev | Must | C4, U1 | All three endings show the right card. |
| T7 | `OverlayScene`: Pause (Resume, Log, Settings, Title), Log (scrollable), Settings (text speed, music, sound, fullscreen), Confirm; opens with Esc or Menu | Dev | Should | U5 | Panels open and close from dialogue and potion screens; input below is blocked. |

## 7. Brewing gameplay

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| B1 | Drag crystals from cells to the cauldron drop zone; return to the cell if dropped elsewhere | Dev | Must | T5 | Drag and drop works with mouse and touch. |
| B2 | Tap-to-place: tap a crystal, then the cauldron | Dev | Should | B1 | Works on touch. |
| B3 | `Brewing`: element totals, counter update, liquid tint (weighted element colours) | Dev | Must | B1, D3 | Counter and tint match the added crystals. |
| B4 | Check rule: exact match with book → `book`; with cat → `cat`; else fizzle (GDD §3.4) | Dev | Must | B3 | All 12 recipes (6 book, 6 cat) succeed; anything else fizzles. |
| B5 | Fizzle: smoke, sound, random fizzle line, auto-empty | Dev | Must | B4 | Cauldron empty after a fizzle. |
| B6 | Success: sparkle, bottle flies to the Potions tab, success line, Next lights up and pulses, crystals locked | Dev | Must | B4 | Next only works after success. |
| B7 | Empty button | Dev | Must | B3 | Clears totals, counter and tint. |
| B8 | Crystal unlocks per potion (GDD §3.3) | Dev | Must | D4, D5 | Menu shows 3 / 6 / 8 / 11 / 13 crystals at P1 / P2 / P3 / P4 / P5–P6. |
| B9 | Sorting by element (toggle), default order single → double → triple | Dev | Should | U6 | Filters work and clear. |
| B10 | Potion 7: Crystals tab locked, bottles draggable, each used once, Empty returns them, success shows the 256 × 256 love potion in the centre | Dev | Must | B6 | P7 completes only with all six bottles. |
| B11 | Clicking the cat replays the `advice` event | Dev | Should | T5 | Works in P1–P5 and P7 (cat not shown in P6). |
| B12 | Potion-screen lines from script events (`start`, `advice`, `fizzle`, `success`, …); lines advance like dialogue; the last line stays on screen; puzzle stays playable | Dev | Must | C2, T5 | Events trigger the right lines. |

## 8. Guidance and resistance

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| R1 | Fit test: a crystal fits if no element would go above the book amount; re-run when totals change | Dev | Should | B3 | Correct for every potion and partial mix. |
| R2 | Level 1: recipe glow after 10 s without adding a crystal | Dev | Should | R1 | Glow appears in P1–P2. |
| R3 | Level 2: recipe lines glow, fitting cells outlined, heavy drag for non-fitting crystals | Dev | Should | R1 | Noticeable lag in P3–P4 for off-recipe crystals only. |
| R4 | Level 3: pulsing recipe, fitting crystals nudge; custom cursor with drift (PC); slipping (never twice in a row) | Dev | Should | R3 | P5–P6: drift and slips happen but the cat recipe can still be completed. |
| R5 | One-time comments: `resist_heavy` (first heavy drag), `resist_slip` (first slip) | Dev | Should | R3, R4, B12 | Each comment plays once per playthrough. |
| R6 | Tune resistance values in `config.json` after playtesting | Design | Should | R4, Q2 | Testers notice the resistance; nobody gets stuck. |

## 9. Tutorial

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| L1 | P1 tutorial sequence: recipe → elements → drag (waits for the first crystal) → Brew → cat's advice, each step with highlights and waiting for the player (GDD §3.7) | Dev | Should | B12, R2 | A new player completes P1 without outside help. |
| L2 | Write tutorial lines (`tutorial_recipe`, `tutorial_elements`, `tutorial_drag`, `tutorial_brew`, `advice`) | Design | Should | — | Lines in `script.txt`. |

## 10. Writing (script)

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| W1 | Decide final names for the Heroine and Chad; update `characters.json` | Design | Should | D6 | Names final. |
| W2 | Write the story events for D3 and D5 (open in GDD §2.3) | Design | Must | — | Beats agreed. |
| W3 | Write dialogue D1–D7 in the script format (TDD §5.1), with sprites and backgrounds | Design | Must | W2 | All dialogue sections play in the game. |
| W4 | Write potion-screen lines for P1–P7: `start`, `advice`, `fizzle` (several, random), `success`; P6 as the Heroine's memories of the cat | Design | Must | — | Every potion has at least start, advice, fizzle and success lines. |
| W5 | Write the resistance comments (`resist_heavy`, `resist_slip`) | Design | Should | — | Lines in the script. |
| W6 | Write the three endings (romance, friendship, bad, with the final line "But it's not what I wanted… at all…") and the ending names for the cards | Design | Must | — | All three ending sections play. |
| W7 | Proofread the whole script; check every line fits the textbox (about 3 rows) | Design | Should | W3–W6 | No overflow or shrunk text. |
| W8 | If the scenario arrives as a separate document: convert it into `script.txt` | Dev | Should | C2 | The game plays the new scenario. |

## 11. Audio (optional)

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| M1 | Find or commission free-licence music: shop, brewing, 3 ending moods | Design | Could | — | Files in `assets/audio/music/` with licences noted. |
| M2 | Find free-licence SFX: click, pick-up, splash, bubbling loop, success, fizzle, slip, meow, bottle clink | Design | Could | — | Files in `assets/audio/sfx/` with licences noted. |
| M3 | Hook music and SFX into scenes and the script | Dev | Could | C6, M1, M2 | Sounds play at the right moments; volumes work. |

## 12. Optional dialogue features

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| O1 | Log panel content (all lines of the session) | Dev | Should | T7 | Log shows every line seen. |
| O2 | Auto mode (pause from config) | Dev | Could | T2 | Lines advance by themselves; toggles off on click. |
| O3 | Skip mode (to the next potion or scene end) | Dev | Could | T2 | Skips correctly and stops at potions. |
| O4 | Manual Save / Load (one slot) | Dev | Could | C5 | Load returns to the saved step. |
| O5 | Seen-endings marks on the title screen | Dev | Could | T6 | Seen endings are shown. |

## 13. Content editor (TDD §13)

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| E1 | `editor.html` shell: tabs (Texts, Art), "Choose project folder" with File System Access API, remembered folder (IndexedDB), message in unsupported browsers | Dev | Should | S4 | Folder chosen once; works in Chrome and Edge; Firefox shows the message. |
| E2 | Safe saving: backups to `.backup/<date-time>/`, `.backup/` in `.gitignore`, unsaved-changes marks and leave-page warning | Dev | Should | E1 | Every overwrite leaves a backup; nothing is lost on accidental close. |
| E3 | Art tab grid: cards from `assets.json` grouped as in the Art List; thumbnail, name, required size, folder, Temporary/Final status; filters, search, progress counter | Dev | Should | E1, A1 | All 65 images listed with the right status. |
| E4 | Art replace: drag-and-drop or *Replace…*; format, size and transparency checks; Resize to fit / Crop to fill; save as PNG or JPG per path; update `placeholders.json` | Dev | Should | E2, E3 | A wrong-size image can be fixed and saved in two clicks; the game shows it after reload. |
| E5 | Art preview "Show in place" using `layout.json`; *Restore previous*; *Rescan* (detects files replaced by hand via checksum) | Dev | Could | E4, D2 | Preview matches the game layout; restore brings back the old file. |
| E6 | `ScriptWriter.js`: writes parsed sections back to `script.txt` in the TDD §5.1 format, keeping comments | Dev | Should | C2 | Parse → write → parse gives the same result on the full script. |
| E7 | Texts tab, Scenes: section list, row table (speaker, text, command rows with drop-downs), add/delete/duplicate/move rows, potion events with "random" checkbox | Dev | Should | E1, E6 | Any line can be changed and saved; the game plays the change after reload. |
| E8 | Texts tab, Characters / Potions & crystals / Interface texts: edit names, flavour lines and `texts.json`; add a character (adds its image entry and placeholder) | Dev | Should | E7, D7 | Renaming the Heroine in the editor changes it everywhere in the game. |
| E9 | Texts checks: line too long (measured with the game font, more than 3 rows), unknown speaker/background/event, empty lines, missing potion events | Dev | Should | E7 | Warnings appear next to the right rows. |
| E10 | Search across all texts; *Play from here* (`?debug=1&scene=<id>`); *Import text…* with a difference view | Dev | Could | E7, Q1 | Search jumps to the row; the game opens at the chosen section. |
| E11 | Short editor guide in the README (opening it, choosing the folder, saving, backups, publishing with GitHub Desktop) | Dev | Should | E4, E7 | The designer and the artist can use the editor without help. |
| E12 | Test the editor with the designer (texts) and the artist (art) | Design + Art | Should | E11 | Both can make a change that appears in the game. |

## 14. Debug and testing

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| Q1 | Debug mode `?debug=1`: overlay (step, choices, totals, FPS, warnings) and keys N, 1–7, B, C, R, F, X (TDD §8) | Dev | Should | C4, B4 | All keys work. |
| Q2 | Playtest with 2–3 people who haven't seen the game: puzzle difficulty, resistance feel, whether players notice the two ways to brew | Design | Must | B4, R4 | Notes collected; balance changes made in data files. |
| Q3 | Balance recipes and unlocks after playtesting (`potions.json`, `crystals.json`) | Design | Should | Q2 | Recipes feel progressively harder; no dead ends. |
| Q4 | Run the TDD §10 checklist on desktop Chrome, Firefox, Safari (or Edge), Android Chrome, iOS Safari | Design + Dev | Must | all Must tasks | Checklist passes. |
| Q5 | Check all three endings by playing (not only with debug keys) | Design | Must | W6, T6 | Each ending reached by real choices. |
| Q6 | Fix bugs found in Q2–Q5 | Dev | Must | Q2–Q5 | No open blocking bugs. |

## 15. Release

| ID | Task | Owner | Priority | Depends on | Done when |
|---|---|---|---|---|---|
| X1 | README: what the game is, how to play, how to run locally, how to edit the script and replace art (with the editor or by hand) | Dev | Should | — | README in the repository. |
| X2 | Favicon and page title in `index.html` | Dev | Could | A2 | Tab shows the title and icon. |
| X3 | Final deploy to GitHub Pages and a last check on the live URL (desktop + phone) | Dev | Must | Q6 | The live game plays start to finish. |
| X4 | Update documents if anything changed during development (GDD, TDD, Art List, Screen Layouts) | Design | Should | X3 | Documents match the game. |

---

## Suggested order for the one day

1. **Morning — skeleton:** S1–S5, D1–D6, A1–A2, C1–C4.
2. **Midday — playable loop:** U1–U4, U6, T1, T2, T3, T5, B1, B3–B8, B10, B12, T6. The game can be played start to finish.
3. **Afternoon — feel:** R1–R5, L1, T4, B2, B9, B11, U5, T7, O1, C5, Q1.
4. **Late afternoon — editor:** E1–E4 (Art tab first, so final art can go in quickly), then E6–E9, E11. E5, E10 only if time is left.
5. **Throughout (Design):** D4–D7, W1–W7, L2. Once the Texts tab works (E7), script writing can move into the editor.
6. **End of day:** Q2, Q4, Q5, Q6, E12, X3. Everything marked *Could* only if time is left.
