# Bonding Potion

A short 2D browser game: a visual novel with potion-brewing puzzles. A young potion seller brews six potions to make a love potion. For each one she can follow the recipe book or the advice of Jaros, her aunt's black cat. How she brews decides which of three endings she gets.

Design documents are in [`documents/`](documents/): Game Concept, Game Design (GDD), Technical Design (TDD), Art List, Screen Layouts, Task List.

## Play

- **Online:** `https://tvareena.github.io/bonding_potion/` (after GitHub Pages is turned on, see below).
- **On your computer:** the game must be opened through a small local web server (browsers block the data files when you double-click `index.html`).
  - Windows, nothing to install: in the project folder run
    ```
    powershell -ExecutionPolicy Bypass -File tools\serve.ps1
    ```
    then open <http://localhost:8080/>. Stop it with Ctrl+C.
  - Or use the VS Code "Live Server" extension.

Controls: click / tap / Space / Enter to continue dialogue (on every screen; Auto mode and its speed are in Settings); drag crystals into the cauldron (or tap a crystal, then tap the cauldron); Esc or "Menu" for the pause panel.

Saving works like a visual novel: **Save** / **Load** in the dialogue menu or the pause panel, 18 slots with screenshots, plus an autosave at every step. **Continue** on the title screen loads the newest save. Saves are stored in the browser.

## Publish on GitHub Pages

1. Commit and push to `main` (for example with GitHub Desktop).
2. On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)`** → Save.
3. After a minute the game is at `https://tvareena.github.io/bonding_potion/`.

## Change the story and texts

All text lives in data files. No code changes are needed.

### With the script editor (recommended)

1. Open **http://localhost:8080/script-editor.html** (run `tools/serve.ps1` first) or **https://tvareena.github.io/bonding_potion/script-editor.html**, in **Chrome or Edge**.
2. Click **Choose project folder…** and select your `bonding_potion` folder (next time: **Reconnect**).
3. Pick a scene on the left. For every row you can:
   - change the text, **who says it** (or narration with no name) and the **emotion** (which image of the character is shown);
   - **add** rows (`+` on a row, or the buttons under the list), **delete**, **duplicate**, and **reorder** them (drag `⋮⋮`, or ↑ ↓);
   - make characters **appear** (Show character, with an emotion) and **leave** (Hide character), change background, music, sound and pauses;
   - set **Only if…**: the row is used only when a potion was brewed with the cat's or the book recipe, or the cat's recipe was used a number of times.
   Press **Enter** in a text to start the next line for the same speaker.
4. Potion screens are grouped by **moment** (screen opens, cat's advice, fizzle, success…). "Say only one random line" picks one line each time.
5. **Characters** tab: rename characters (the name above the textbox) and add **emotions**. A new emotion creates a temporary image (e.g. `heroine_happy.png`) that you then replace in the Art editor.
6. **Save** (Ctrl+S) writes `data/script.txt` (old version kept in `.backup/`). **▶ Play this scene** opens the game at that scene; **Test choices…** lets you pretend earlier potions were brewed with the cat's or book recipe, to check conditions. (Play shows your saved changes only when the editor is opened from `localhost`; from the GitHub Pages link it opens the online game, which updates after you push.)

Undo / Redo work for everything until you close the page.

### By hand

| What | File |
|---|---|
| Dialogue, potion-screen lines, endings | `data/script.txt` |
| Character names | `data/characters.json` |
| Potion names and flavour lines | `data/potions.json` |
| Crystal names | `data/crystals.json` |
| Buttons, menus, hints, panel texts, ending names | `data/texts.json` |
| Credits | `data/credits.txt` |

**Script format** (`data/script.txt`, full description in TDD §5.1):

```
== d1                       a dialogue scene
@bg shop                    background (bg_shop)
@show chad                  show a character in the middle (@show chad angry: with an emotion)
heroine: Text.              a line
heroine happy: Text.        a line with an emotion (image heroine_happy; usual image if it doesn't exist)
: Text.                     narration (no name)
[trust=cat] jaros: Text.    only if the Trust potion was brewed with the cat's recipe
[cat>=3, hope=book] : Text. only if the cat's recipe was used 3+ times AND Hope used the book recipe
@hide                       hide the character

== p1 potion fun            a potion step
@on start                   lines for an event…
heroine: The Potion of Fun!
@on fizzle random           "random" picks one line each time
heroine sad: Oops.
jaros: Burnt sock.

== ending romance           ending scenes: romance, friendship, bad
```

Potion events: `start`, `advice` (also when the cat is clicked), `fizzle`, `success`, `resist_heavy`, `resist_slip`, and for potion 1 the tutorial: `tutorial_recipe`, `tutorial_elements`, `tutorial_drag`, `tutorial_brew`.

Moving sections in the file changes the order of the story. Mistakes don't crash the game: they're listed in the browser console (F12) and in debug mode.

## Replace the art

Every image already exists as a temporary picture with its final name and size (list: `documents/Art List.md`).

### With the art editor (recommended)

1. Open **https://tvareena.github.io/bonding_potion/editor.html** in **Chrome or Edge** on your computer (or `http://localhost:8080/editor.html` when running locally).
2. Click **Choose project folder…**, select your `bonding_potion` folder (the one from GitHub Desktop) and allow editing. Next time the editor remembers it: just click **Reconnect**.
3. Drop a finished image onto its card, or drop many files anywhere on the page: files named like the Art List (`heroine.png`, `crystal_marsh_jade.png`, …) are matched automatically.
4. The editor:
   - checks the size; if it's wrong, it shows **Fit / Crop / Stretch** previews so you choose;
   - saves under the right name and folder, as PNG (or JPG for backgrounds and endings);
   - warns if a sprite has no transparent pixels (background layer not hidden?);
   - copies the old file to `.backup/<date-time>/` first (not uploaded to GitHub). **Restore previous** undoes a replacement.
5. Each card shows **Temporary** or **Final**; the bar on top counts final images. **Show → Temporary only** lists what's left.
6. In **GitHub Desktop**, commit and **Push origin**. The live game updates in about a minute.

The editor only changes files in the folder you pick; nothing is uploaded until you push. Firefox and Safari can't save to a folder, so use Chrome or Edge for the editor (the game itself works everywhere).

### By hand

Save the new file **with the same name, the same size, into the same folder** (backgrounds and ending illustrations as `.jpg`, everything else as `.png` with transparency), then commit and push.

To recreate any missing temporary images:
```
powershell -ExecutionPolicy Bypass -File tools\make_placeholders.ps1
```
It never overwrites final art: with `-Refresh` it only redraws images that are still unchanged temporary ones.
## Fonts

The title screen logo and buttons are images (`assets/images/ui/ui_logo.png`, `ui_title_*.png`), so they need no font. The settings `font.titleFamily` / `fontFiles` in `data/config.json` are only needed if some other text should use a special font. To load a font file:
1. Put the file (`.ttf`, `.otf` or `.woff2`) into `assets/fonts/`, for example `assets/fonts/title.ttf`.
2. In `data/config.json` set
   ```json
   "fontFiles": [ { "family": "BondingTitle", "url": "assets/fonts/title.ttf" } ],
   ```
   and change `"titleFamily"` to `"BondingTitle, 'Courier New', monospace"`.

Check that the font's licence allows using it in a web game.

## Sound

There are no sound files yet; the game runs silently. To add them, put the files into `assets/audio/` and list them in `data/assets.json` → `audio`, for example `"music_shop": "assets/audio/music/shop.mp3"`. The expected names are listed there.

## Tuning

`data/config.json`: element colours, text speeds, hint timings, resistance strength (heavy drag, slip chance, cursor drift), ending thresholds.
`data/potions.json`: recipes as ratios (book and cat versions), guidance level, and the crystals available in each potion.
`data/crystals.json`: how many units of each element every crystal adds.
`data/layout.json`: positions and sizes of everything on screen (same numbers as `documents/Screen Layouts.md`).

## Debug mode

Open the game with `?debug=1` (for example `http://localhost:8080/?debug=1`):

| Key | Action |
|---|---|
| N | Next step |
| 1–7 | Jump to potion 1–7 |
| B / C | Fill the cauldron with the book / cat recipe |
| R / F / X | Jump to the romance / friendship / bad ending |

`?scene=d3` (or `p4`, `ending_bad`…) starts directly at that part of the script.

## Project structure

```
index.html, style.css     page
lib/phaser.min.js         Phaser 3.90.0 game library
src/                      game code (scenes, systems, ui)
data/                     script, texts, recipes, layout, settings, asset list
assets/                   images (temporary until final art), audio, fonts
tools/                    local server, temporary-image generator
documents/                design documents
```
