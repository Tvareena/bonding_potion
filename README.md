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
@show chad smile            show a character sprite
heroine happy: Text.        a line; "happy" changes the Heroine's portrait
chad: Text.                 a line without changing the expression
: Text.                     narration (no name)
@hide                       hide the sprite

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

Every image already exists as a temporary picture with its final name and size (list: `documents/Art List.md`, or `data/assets.json`).

To put in final art: save the new file **with the same name, the same size, into the same folder** (backgrounds and ending illustrations as `.jpg`, everything else as `.png` with transparency). Reload the game.

Optional: remove the file's line from `assets/placeholders.json` (that list marks images that are still temporary).

To recreate any missing temporary images:
```
powershell -ExecutionPolicy Bypass -File tools\make_placeholders.ps1
```
It never overwrites existing files. With `-Refresh` it also redraws images that are still unchanged temporary ones.

## Sound

There are no sound files yet; the game runs silently. To add them, put the files into `assets/audio/` and list them in `data/assets.json` → `audio`, for example `"music_shop": "assets/audio/music/shop.mp3"`. The expected names are listed there.

## Tuning

`data/config.json`: element colours, text speeds, hint timings, resistance strength (heavy drag, slip chance, cursor drift), ending thresholds.
`data/potions.json`: recipes (book and cat versions), guidance level, which crystals unlock.
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
