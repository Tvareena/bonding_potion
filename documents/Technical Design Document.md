# Bonding Potion — Technical Design Document

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 14 November 2026 |
| **Based on** | [Game Design Document](Game%20Design%20Document.md), [Screen Layouts](Screen%20Layouts.md) |
| **Related** | [Art List](Art%20List.md) |
| **Repository** | https://github.com/Tvareena/bonding_potion |

---

## 1. Goals and constraints

| Requirement | How it's met |
|---|---|
| Runs in a browser on PC and mobile | HTML5 + JavaScript, WebGL with Canvas fallback |
| Hosted from the public GitHub repository | Static files only, served by GitHub Pages. No server code, no build step. |
| 1920 × 1080 reference | Fixed logical canvas, scaled to fit the window, letterboxed |
| Dialogue editable without code | All lines in one plain-text script file (`data/script.txt`); all other player-visible text in data files (`texts.json`, `characters.json`, `potions.json`, `crystals.json`). A built-in **content editor** (`editor.html`, section 13) edits all of it. |
| Puzzle data editable without code | Recipes, crystals and tuning values in JSON files under `data/` |
| Art replaceable file by file | Every image is a separate file listed in `data/assets.json`; temporary images exist from day one with final names and sizes. The editor's Art tab replaces them by drag-and-drop with size checks. |
| 1 day of work | Small, flat code structure; one library; no tooling to install |

---

## 2. Technology

| Area | Choice | Notes |
|---|---|---|
| Language | JavaScript (ES2020 modules) | No TypeScript, no bundler. |
| Engine | **Phaser 3** (latest stable 3.x) | Sprites, tweens, input and drag-and-drop, scaling, audio, asset loading. The minified file is committed to `lib/` so the game doesn't depend on a CDN. |
| Rendering | Phaser AUTO (WebGL, falls back to Canvas) | |
| Scaling | `Phaser.Scale.FIT` + `CENTER_BOTH`, 1920 × 1080 | Letterbox colour from config. |
| Storage | `localStorage` | Save, settings, seen endings. |
| Fonts | One web font in `assets/fonts/` (free licence, picked by the artist); fallback Arial | Loaded with CSS `@font-face` before the game starts. |
| Hosting | GitHub Pages from `main`, folder `/` (root) | URL: `https://tvareena.github.io/bonding_potion/` |

### 2.1 Browser support

Latest versions of Chrome, Edge, Firefox and Safari on desktop; Chrome on Android; Safari on iOS. Landscape orientation on phones.

### 2.2 Running locally

Browsers block loading data files from `file://`, so the game needs a local web server:
- **Option A:** `tools/serve.ps1`, a small PowerShell script that serves the project folder at `http://localhost:8080` (Windows, nothing to install).
- **Option B:** the VS Code "Live Server" extension.
- **Option C:** push to GitHub and test on GitHub Pages.

---

## 3. Project structure

```
bonding_potion/
├── index.html              # page, canvas container, font loading, rotate-device message
├── style.css
├── editor.html             # content editor (section 13), Chrome/Edge only
├── editor/
│   ├── editor.js           # folder access, tabs, saving, backups
│   ├── TextsTab.js
│   ├── ArtTab.js
│   └── editor.css
├── lib/
│   └── phaser.min.js
├── src/
│   ├── main.js             # Phaser config, scene list
│   ├── scenes/
│   │   ├── BootScene.js    # loads config + assets.json
│   │   ├── PreloadScene.js # loads all assets, progress bar, fallbacks
│   │   ├── TitleScene.js
│   │   ├── DialogueScene.js
│   │   ├── PotionScene.js
│   │   ├── EndingScene.js
│   │   └── OverlayScene.js # pause / log / settings / confirm panels
│   ├── systems/
│   │   ├── ScriptParser.js # script.txt → scenes and events (shared with the editor)
│   │   ├── ScriptWriter.js # scenes → script.txt (used by the editor)
│   │   ├── StoryRunner.js  # runs a scene's commands and lines
│   │   ├── GameState.js    # progress, choices, flags
│   │   ├── SaveSystem.js   # localStorage
│   │   ├── Brewing.js      # cauldron totals, check rule
│   │   ├── Resistance.js   # guidance and resistance behaviour
│   │   └── AudioManager.js
│   └── ui/
│       ├── TextBox.js      # textbox + name plate + typewriter
│       ├── Portrait.js
│       ├── TextMenu.js     # text-only menu items
│       ├── Button.js       # image button with states
│       ├── Panel.js        # 9-slice panel
│       └── IngredientMenu.js
├── data/
│   ├── script.txt          # all dialogue and potion-screen lines
│   ├── texts.json          # all other text shown to the player (UI, hints, ending names)
│   ├── credits.txt         # text of the Credits panel
│   ├── characters.json
│   ├── potions.json
│   ├── crystals.json
│   ├── config.json         # tuning, timings, colours
│   ├── layout.json         # positions and sizes of every element
│   └── assets.json         # asset keys → file paths
├── assets/
│   ├── images/             # see the Art List for every file
│   │   ├── backgrounds/
│   │   ├── characters/
│   │   ├── potion/
│   │   ├── crystals/
│   │   ├── elements/
│   │   ├── bottles/
│   │   ├── ui/
│   │   ├── effects/
│   │   └── endings/
│   ├── placeholders.json   # list of images that are still temporary (written by tools and the editor)
│   ├── audio/
│   │   ├── music/
│   │   └── sfx/
│   └── fonts/
├── .backup/                # previous versions of files the editor replaced (ignored by git)
├── tools/
│   ├── serve.ps1                # local server
│   └── make_placeholders.ps1    # creates temporary images from assets.json
└── documents/
```

---

## 4. Architecture

### 4.1 Scenes

| Scene | Responsibility |
|---|---|
| `BootScene` | Loads `config.json`, `layout.json`, `assets.json`; starts Preload. |
| `PreloadScene` | Loads every asset in `assets.json`, the data files and the script. Shows a progress bar (drawn in code). Missing images are replaced by a generated coloured rectangle of the expected size with the asset name on it, and a warning is logged. Parses the script. |
| `TitleScene` | Background, logo image, menu panel, word-image buttons Start / Continue / Load / Settings / Credits (layout `title.menuButtons`). Unlocks audio on the first click. |
| `DialogueScene` | Runs a dialogue section of the script with `StoryRunner`. |
| `PotionScene` | Runs one potion step: recipe, cauldron, menu, Brew/Empty, events from the script, resistance. |
| `EndingScene` | Runs the chosen ending section, then shows the ending card. |
| `OverlayScene` | Runs on top of other scenes. Pause, Log, Settings and Confirm panels. Pauses input of the scene below while open. |

### 4.2 Game flow

`StoryRunner` walks the sections of `script.txt` in file order:
1. Each `== dN` section → `DialogueScene`.
2. Each `== pN potion <id>` section → `PotionScene` with that potion.
3. After the last potion section, `GameState.ending()` picks the ending, and the matching `== ending <id>` section runs in `EndingScene`.

Changing the step order means moving sections in the script. The step number used for saving is the section's index.

### 4.3 Game state

```js
GameState = {
  stepIndex: 0,                    // index of the current script section
  choices: { fun: "cat", courage: "book", ... },  // only potions 1–6
  flags: { commentHeavy: false, commentSlip: false, tutorialDone: false },
  log: [ { speaker: "Jaros", text: "..." }, ... ]  // this session only
}

ending():
  cats = count of choices equal to "cat"
  if cats >= 5 → "romance"
  if cats >= 3 → "friendship"
  else         → "bad"
```

Thresholds are in `config.json` (`endings.romanceMin = 5`, `endings.friendshipMin = 3`).

### 4.4 Saving

Visual-novel style saving, all in `localStorage` (`src/systems/SaveSystem.js`):

| Key | Content | When written |
|---|---|---|
| `bonding_potion.save` | Save data (below), autosave | At the start of each step; removed after an ending |
| `bonding_potion.slot.1` … `.18` | Save data with a screenshot | When the player saves to that slot |
| `bonding_potion.settings` | `{ textSpeed, auto, autoSpeed, musicVolume, sfxVolume }` | On change |
| `bonding_potion.endings` | `["romance", ...]` | When an ending card is shown |

**Save data:** `{ version, time, kind, sectionId, row, endingId, text, state: { stepIndex, choices, flags }, session: { bg, heroineExpr, music }, shot }`
- `sectionId` + `row`: the script section and the index of the dialogue line on screen (`null` = start of the section; potion steps always restart from the beginning).
- `text`: the line on screen, shown on the slot card. `shot`: 320 × 180 JPEG data URL (about 10–20 KB).
- Slot count: `config.json → saveSlots { pages: 3, perPage: 6 }`.

**Screenshot:** opening a panel from the dialogue or potion screen first takes `renderer.snapshot()` of the game (so the panel isn't in the picture), shrinks it to 320 × 180 and keeps it until the player picks a slot.

**Loading** (`Flow.load`): restores `state` and `session`, then starts the section. The dialogue screen fast-forwards from the start of the section to `row` without showing lines: backgrounds, sprites and music are replayed instantly, then the saved line is shown. If the script changed, the position may shift slightly; the save still loads.

**Continue** loads the newest save (autosave or slot). `version` (`config.json → saveVersion`) is checked on load; saves from another version are ignored. Errors from `localStorage` (private browsing, storage full) are caught: the game still runs and the save screen says it couldn't save.

---

## 5. Data formats

### 5.1 Script file (`data/script.txt`)

Plain text, UTF-8. Written so a non-programmer can edit it or so a finished scenario document can be converted into it.

```
# Lines starting with # are comments.

== d1
@bg shop
@music shop
heroine: Another quiet morning in the shop.
@show chad
chad: Hey, potion girl. The usual.
heroine: R-right away!
@hide
jaros: You're staring again.

== p1 potion fun
@on start
jaros: So. You want to brew a love potion. Let me guess who for.
@on tutorial_recipe
jaros: That page is the recipe. Fun needs fire and earth.
@on tutorial_drag
jaros: Drag a crystal into the cauldron.
@on tutorial_brew
jaros: When it looks right, press Brew.
@on advice
jaros: The book's too cautious. Three fire, one earth. Trust me.
@on fizzle random
heroine: That's… not a potion.
jaros: Smells like a burnt sock.
@on success
heroine: It worked!

== ending romance
...
```

**Sections**

| Header | Meaning |
|---|---|
| `== <id>` | Dialogue section. |
| `== <id> potion <potionId>` | Potion step; `potionId` from `potions.json`. |
| `== ending <endingId>` | Ending section (`romance`, `friendship`, `bad`). |

**Lines**

| Form | Meaning |
|---|---|
| `speaker: text` | A line. `speaker` is an ID from `characters.json`. The name plate shows that character's display name. |
| `: text` | Narration (no name plate). |

**Commands**

| Command | Effect |
|---|---|
| `@bg <name>` | Cross-fade to background `bg_<name>`. |
| `@show <character>` | Show a character's half-body sprite (replaces the current one). |
| `@hide` | Hide the current sprite. |
| `@music <name>` / `@music off` | Change or stop music. |
| `@sfx <name>` | Play a sound. |
| `@wait <seconds>` | Pause. |
| `@on <event> [random]` | Potion sections only. The lines below play when `<event>` happens. With `random`, one line is picked each time instead of all. |

**Cat recipe bubble:** when the `advice` event plays, the potion screen shows `potions.json → cat` in a speech bubble (`ui_cat_bubble`, layout `potion.catBubble`) as icons with reduced ratio numbers. It stays visible until the screen is left.

**Potion events:** `start`, `tutorial_recipe`, `tutorial_elements`, `tutorial_drag`, `tutorial_brew`, `advice` (also played when the cat is clicked), `resist_heavy`, `resist_slip`, `fizzle`, `success`.

Unknown commands, speakers or images don't stop the game: they're skipped and reported in the browser console and the debug overlay.

### 5.2 `characters.json`

```json
{
  "heroine":     { "name": "Heroine", "kind": "portrait", "default": "neutral" },
  "chad":        { "name": "Chad",    "kind": "sprite",   "default": "neutral" },
  "jaros":       { "name": "Jaros",   "kind": "cat" },
  "jaros_human": { "name": "Jaros",   "kind": "sprite",   "default": "neutral" }
}
```

Renaming a character means changing `name` here. Each human character has **one image** (one emotion); `image` is its key in `assets.json`. A word between the speaker and the colon (`heroine happy:`) is ignored and reported as a warning. A new character needs an entry here, its image, and an entry in `assets.json`.

`kind: "cat"` lines make the cat icon swing (dialogue screen). On the potion screen the cat image doesn't move.

### 5.3 `potions.json`

```json
[
  { "id": "fun", "name": "Potion of Fun", "flavour": "A spark of fire on solid ground.",
    "book": { "fire": 1, "earth": 1 }, "cat": { "fire": 1, "earth": 1, "air": 1 },
    "guidance": 1, "catPresent": true, "tutorial": true,
    "crystals": ["ember_shard", "root_stone", "wisp_quartz", "lava_garnet"] },
  { "id": "gratitude", "...": "...", "guidance": 3, "catPresent": false },
  { "id": "love", "name": "Love Potion", "mix": ["fun", "courage", "trust", "hope", "confidence", "gratitude"],
    "guidance": 0, "catPresent": true }
]
```

`book` and `cat` are **ratios** (shown reduced on the recipe page, e.g. 2 : 4 → 1 : 2). Missing elements count as 0. `crystals` is the list of crystals in the menu for this potion (in this order); each potion has its own list. The full values are in the GDD, sections 3.3 and 3.4.

### 5.4 `crystals.json`

```json
[
  { "id": "ember_shard", "name": "Ember Shard", "elements": { "fire": 10 } },
  { "id": "marsh_jade",  "name": "Marsh Jade",  "elements": { "water": 10, "earth": 20 } }
]
```

Image key = `crystal_<id>`. The full list is in the GDD, section 3.3.

### 5.5 `config.json` (tuning)

| Key | Default | Meaning |
|---|---|---|
| `elements.colors` | fire `#E8C547`, water `#3A6FD8`, earth `#4E9A4B`, air `#8E5BC8` | Liquid tint and highlights. Temporary values; the artist picks the final ones. |
| `text.speeds` | slow 25, normal 45, fast 90 | Characters per second. |
| `text.autoSpeeds` | slow 2.0 s + 0.05 s/char, normal 1.2 + 0.03, fast 0.6 + 0.015 | Auto mode pause after a line, per Auto speed setting. Used on both dialogue and potion screens. |
| `hints.idleAdvance` | 5 s | "Click to continue" hint delay. |
| `hints.idleAdvanceMaxShows` | 3 | Stop showing it after this many advances. |
| `guidance.glowDelay` | 10 s | Level 1 recipe glow delay. |
| `resist.heavyLerp` | level 2: 0.25, level 3: 0.15 | Fraction of the distance the dragged crystal moves toward the pointer each frame (lower = heavier). |
| `resist.slipChance` | 0.5 | Chance an off-recipe drag slips (level 3). |
| `resist.slipDelay` | 0.3–0.7 s | Random time after drag start before a slip. |
| `resist.driftMax` | 60 px | Maximum cursor drift (level 3, PC). |
| `resist.driftSpeed` | 4 px per frame | How fast the cursor drifts. |
| `endings.romanceMin` / `friendshipMin` | 5 / 3 | Ending thresholds. |

### 5.6 `layout.json`

Positions and sizes of every on-screen element, using the same numbers as [Screen Layouts](Screen%20Layouts.md) (top-left x, y, width, height at 1920 × 1080). Code reads positions only from here, so a layout change doesn't touch code.

### 5.7 `assets.json`

```json
{
  "images": {
    "bg_shop":       { "path": "assets/images/backgrounds/bg_shop.jpg", "size": [1920, 1080], "group": "Backgrounds" },
    "heroine":       { "path": "assets/images/characters/heroine.png", "size": [320, 420], "group": "Heroine portrait" },
    "ui_textbox":    { "path": "assets/images/ui/ui_textbox.png", "size": [192, 192], "group": "UI frames", "nineSlice": [48, 48, 48, 48] }
  },
  "audio": { "music_shop": "assets/audio/music/shop.mp3" }
}
```

`size` is the required size from the Art List; the placeholder tool and the editor both use it. `group` sorts images in the editor's Art tab (same groups as the Art List). The full list of image keys and file names is in the [Art List](Art%20List.md). Changing a file's format (for example .png → .jpg) only needs an update here.

### 5.8 `texts.json`

Every piece of text the player sees that isn't a dialogue line and isn't a character, potion or crystal name. The code never contains player-visible text; it only uses keys from this file.

```json
{
  "title.start": "Start",
  "title.continue": "Continue",
  "title.settings": "Settings",
  "menu.log": "Log", "menu.auto": "Auto", "menu.skip": "Skip",
  "menu.save": "Save", "menu.load": "Load", "menu.settings": "Settings", "menu.menu": "Menu",
  "hint.click": "Click to continue",
  "hint.tap": "Tap to continue",
  "potion.brew": "Brew", "potion.empty": "Empty",
  "potion.tabCrystals": "Crystals", "potion.tabPotions": "Potions",
  "pause.resume": "Resume", "pause.title": "Title",
  "settings.textSpeed": "Text speed", "settings.music": "Music", "settings.sound": "Sound", "settings.fullscreen": "Fullscreen",
  "confirm.newGame": "Start a new game? Your progress will be lost.",
  "confirm.yes": "Yes", "confirm.no": "No",
  "ending.romance": "Spellbound", "ending.friendship": "A Friend in Black Fur", "ending.bad": "Be Careful What You Brew",
  "ending.counter": "Ending {n} of 3",
  "ending.toTitle": "Title",
  "rotate.message": "Please rotate your device"
}
```

`{n}` and similar markers are filled in by the game. Ending names here are suggestions.

**Where each kind of player-visible text lives:**

| Text | File |
|---|---|
| Dialogue and potion-screen lines | `script.txt` |
| Character display names | `characters.json` |
| Potion names and flavour lines | `potions.json` |
| Crystal names | `crystals.json` |
| Everything else (buttons, menus, hints, panels, ending names) | `texts.json` |
| Credits | `credits.txt` (plain text, shown centred and scrollable) |

---

## 6. Key systems

### 6.1 Dialogue

- `TextBox` shows the name plate (hidden for narration) and typewriter text. A click while typing completes the line; the next click advances.
- The line text area wraps text to its width (1440 px on the dialogue screen, 800 px on the potion screen). The script should keep lines to about 3 rows; longer lines are shrunk to fit.
- The cat icon swing is a tween on rotation (±8°, 0.6 s period) around its pivot (110, 196 in the image), running while a `jaros` line is shown.
- Buttons use three images (normal, hover, pressed; Next also has disabled). Hover is only shown with a mouse. Labels are drawn as text on top of the button image.
- `TextMenu` draws the menu as text objects with invisible 120 × 40 hit areas; hover/pressed is shown by a colour change and underline.
- The idle hint ("Click to continue" / "Tap to continue", chosen by whether the device has touch) is a blinking text at the bottom-right of the text area.

### 6.2 Brewing

```js
add(crystal):   totals[e] += crystal.elements[e] for each element
check():
  if sameRatio(totals, potion.book) → success("book")
  if sameRatio(totals, potion.cat)  → success("cat")
  → fizzle()
sameRatio(a, r): sumA = Σ a[e], sumR = Σ r[e]; sumA > 0 and for every element: a[e] × sumR === r[e] × sumA
  (whole-number cross-multiplication, no rounding; elements missing from r must be 0 in a)

love potion:
  check(): cauldron contains each id in potion.mix exactly once and nothing else
```

- Crystals are Phaser images with drag enabled. The cauldron has a drop zone (the top part of the cauldron image).
- Tap-to-place: tap a crystal (it's highlighted), then tap the cauldron.
- Liquid tint: weighted average of element colours by units, applied to `cauldron_liquid` with `setTint`. Empty → untinted.
- Element counter: up to four 64 × 64 element icons with numbers, centred in its area on the cauldron front.
- On success the result is written to `GameState.choices` (not for `love`), and the bottle image flies to the Potions tab.

### 6.3 Guidance and resistance (`Resistance.js`)

Active when `potion.guidance ≥ 1`.

- **Fit test** (`src/systems/Ratio.js`): a crystal is against the book if it contains an element with `book[e] = 0`, or if `ratioDistance(totals + crystal, book) > ratioDistance(totals, book)`, where `ratioDistance` is the sum over elements of `|a[e]/Σa − r[e]/Σr|`. On an empty cauldron only the first rule applies. Re-evaluated whenever the totals change.
- **Highlights:** level 1 glows the recipe after `glowDelay`; level 2 adds a pulsing outline on fitting cells; level 3 adds a small up-and-down nudge on fitting crystals. Done with tweens and a highlight image or Phaser's glow effect where WebGL is available.
- **Heavy drag:** for a non-fitting crystal, instead of jumping to the pointer each frame, the crystal moves `heavyLerp` of the way there.
- **Cursor drift (PC, level 3):** the potion screen hides the system cursor and draws `ui_cursor` at the pointer position plus a drift offset. While a non-fitting crystal is dragged, the offset grows toward the nearest fitting cell by `driftSpeed`, capped at `driftMax`. Drag and drop use the drawn cursor position. On touch devices the custom cursor is off.
- **Slip (level 3):** when a non-fitting drag starts, roll `slipChance`. On a hit, after a random `slipDelay` the crystal is released and tweens back to its cell, with a slip sound. The same crystal can't slip twice in a row.
- **Comments:** first heavy drag → `resist_heavy` event; first slip → `resist_slip` event. Flags in `GameState` make them play once per playthrough.

### 6.4 Audio

`AudioManager` wraps Phaser sound: one music channel with cross-fade, SFX with a volume setting. Formats: MP3 (with OGG optional). Audio starts only after the first user input. If audio files are missing the game runs silently.

### 6.5 Orientation and resize

`index.html` shows a "Please rotate your device" overlay with CSS when the window is taller than it is wide on touch devices. The game pauses while it's shown.

---

## 7. Temporary images (placeholders)

- `tools/make_placeholders.ps1` reads `assets.json` and the sizes listed in it, and creates every missing image as a PNG of the correct size: a flat colour, a thin border and the asset name written on it. Existing files are never overwritten. Every file it creates is added to `assets/placeholders.json` with its checksum (SHA-256), so a file replaced by hand can be detected.
- Temporary text inside the game reads as normal game text, never the word "placeholder".
- To replace a temporary image: use the editor's Art tab (section 13.3), or save a new file with the same name and size into the same folder by hand. In the manual case, remove its entry from `assets/placeholders.json` (or let the editor's "Rescan" do it) so progress counts stay right.

---

## 8. Debug mode

Open the game with `?debug=1` in the URL:

| Key | Action |
|---|---|
| (overlay) | Shows step ID, book/cat record, cauldron totals, FPS, script warnings |
| `N` | Skip to the next step |
| `1`–`7` | Jump to potion 1–7 |
| `B` / `C` | Fill the cauldron with the book / cat recipe |
| `R` / `F` / `X` | Jump to the romance / friendship / bad ending |
| `?debug=1&scene=<id>` | Start directly at a script section (used by the editor's "Play from here") |

Debug mode is off by default and doesn't affect saves unless a step is actually completed.

---

## 9. Performance

| Item | Budget |
|---|---|
| Total download | ≤ 30 MB (target 15 MB) |
| Backgrounds | JPG, quality ~85, about 300–600 KB each |
| Sprites and UI | PNG, compressed (for example with TinyPNG) |
| Frame rate | 60 fps on desktop, ≥ 30 fps on mid-range phones |

All assets load up front during Preload; the game is small enough that there's no loading mid-game.

---

## 10. Testing

**Manual checklist (each build):**
- All three endings reachable (using debug keys and by playing).
- Each potion can be brewed both ways; fizzle empties the cauldron; Empty works; Next stays disabled until success.
- Resistance: heavy drag at P3–P6, slip and drift at P5–P6, never blocks the cat recipe.
- P6 without the cat image; P7 only accepts the six bottles.
- Autosave and Continue resume at the right step; a new game clears progress.
- Script errors appear in the console; a broken line doesn't crash the game.
- Desktop Chrome/Firefox/Safari; Android Chrome; iOS Safari in landscape; rotate message in portrait.
- A missing image shows the generated fallback instead of crashing.

---

## 11. Deployment

1. Push to `main`.
2. In the repository settings: **Pages → Build and deployment → Deploy from a branch → `main` / root**.
3. The game is at `https://tvareena.github.io/bonding_potion/`. All paths in the code are relative, so the subfolder works.

---

## 12. Implementation order (1 day)

| # | Task | Priority |
|---|---|---|
| 1 | Project skeleton, Phaser, scaling, assets.json, placeholders | Must |
| 2 | Script parser + DialogueScene (lines, sprites, backgrounds, idle hint) | Must |
| 3 | PotionScene: recipe, menu, drag-and-drop, counter, Brew/Empty, check, fizzle/success, Next | Must |
| 4 | Story flow, GameState, endings, ending card with illustrations, Title | Must |
| 5 | GitHub Pages deploy | Must |
| 6 | Resistance + guidance; P1 tutorial; typewriter; cat swing; sorting; tap-to-place | Should |
| 7 | Overlay panels (Pause, Log); autosave + Continue | Should |
| 8 | Content editor: Art tab, then Texts tab (section 13) | Should |
| 9 | Auto, Skip, Save/Load, Settings, audio | Could |

---

## 13. Content editor (`editor.html`)

A separate page for the team to change texts and replace art without touching code or files by hand. It's plain HTML and JavaScript (no Phaser) and shares `ScriptParser.js` with the game.

### 13.1 How it works

- Open it the same way as the game: `http://localhost:8080/editor.html` (via `tools/serve.ps1`).
- **Choose project folder** once: the editor uses the browser's File System Access API (`showDirectoryPicker`) to read and write files in the `bonding_potion` folder. The folder handle is remembered (IndexedDB), so next time it only asks for permission again.
- **Works in Chrome and Edge only.** Firefox and Safari don't support writing to a folder; the editor shows a message there. The game itself isn't affected.
- Changes are written to the real project files. Publishing is still done with git (for example GitHub Desktop: commit, push).
- **Backups:** before a file is overwritten, the old version is copied to `.backup/<date-time>/<same path>`. `.backup/` is in `.gitignore`.
- **Unsaved changes** are marked on the tab; leaving the page with unsaved changes asks for confirmation.
- The editor is also published on GitHub Pages with the game, but it only works with a folder on your computer, so it can't change the live site.

### 13.2 Texts tab

| Section | What you can do |
|---|---|
| **Scenes** | A list of all script sections (D1–D7, P1–P7, endings). Selecting one shows its content as a table: *speaker* (drop-down from `characters.json`, or "narration"), *expression* (drop-down of that character's expressions, from `assets.json`), *text*. Commands (`@bg`, `@show`, `@hide`, `@music`…) appear as their own rows with drop-downs for their values. Rows can be added, deleted, duplicated and moved up/down. Potion sections are grouped by event (`start`, `advice`, `fizzle`…), with a "random" checkbox per event. |
| **Characters** | Edit display names; add a character (ID, name, kind). Adding a character also adds its image entry to `assets.json` and creates a placeholder for it. |
| **Potions & crystals** | Edit potion names, flavour lines and crystal names (not recipes: those stay in the data files to avoid breaking the balance by accident). |
| **Interface texts** | Every key of `texts.json` as a two-column table (key, text), grouped by screen. |
| **Search** | Find text across all of the above; click a result to jump to it. |

**Checks (shown as warnings, never blocking):**
- A line too long for the textbox: measured with the game font at the textbox width (1440 px dialogue, 800 px potion screen) and flagged if it would take more than 3 rows.
- Unknown speaker, background or event.
- Empty lines; a potion section without `start`, `advice`, `fizzle` or `success` lines.

**Buttons:** *Save* (writes `script.txt`, `texts.json`, `characters.json`, `potions.json`, `crystals.json`, whichever changed), *Revert* (reload from disk), *Play from here* (opens the game in a new tab at the selected section, using `?debug=1&scene=<id>`).

**Saving the script:** the editor parses `script.txt` into a list of sections and rows (comments are kept as rows), and `ScriptWriter.js` writes it back in the same format as TDD §5.1. The file stays readable and hand-editable.

**Importing a scenario:** *Import text…* accepts a plain-text file written in the script format (for example a finished scenario prepared outside the editor) and shows the differences before replacing the script.

### 13.3 Art tab

> **Status:** built as `editor.html` (Art tab only; the Texts tab is still to do). Differences from the plan below: an image's **Temporary / Final** status is decided by comparing its SHA-256 with `assets/placeholders.json` (the file isn't edited), so Rescan and Restore need no bookkeeping; files dropped anywhere on the page are matched to images by file name; the size dialog offers Fit, Crop and Stretch; "Show in place" is not built yet. Works from the live site too, since it only reads and writes the folder the user picks.

| Feature | Behaviour |
|---|---|
| **Grid** | Every image from `assets.json`, grouped as in the Art List. Each card: thumbnail, file name, required size, folder, status **Temporary** / **Final** (from `assets/placeholders.json`). |
| **Filters** | All / Temporary only / Final only; search by name; filter by group. |
| **Progress** | "41 of 65 final" overall and per group. |
| **Replace** | Drag a file onto a card (or click *Replace…*). The editor checks: format (PNG, JPG, WEBP accepted), size, transparency (warns if a sprite has no transparent pixels or a background has transparency). |
| **Wrong size** | If the size doesn't match, a dialog shows both sizes and offers: *Resize to fit* (keeps proportions, transparent margins), *Crop to fill* (keeps proportions, cuts the edges), or *Cancel*. Different aspect ratio → a clear warning. Resizing uses a high-quality canvas downscale. |
| **Format conversion** | Saved as PNG, or as JPG (quality 0.85) for backgrounds and illustrations, according to the path in `assets.json`, whatever format was dropped. |
| **Preview** | *Show in place* draws the screen layout from `layout.json` with the new image in its position (for example a portrait inside its frame and textbox), so overlaps are visible before saving. |
| **Save** | Writes the file to its path (old file goes to `.backup/`), removes it from `placeholders.json`, and marks the card **Final**. |
| **Undo** | *Restore previous* on a card brings back the last backed-up version. |
| **Rescan** | Re-reads the folder: images replaced by hand are detected (they no longer match the placeholder's stored checksum) and marked Final. |

### 13.4 Limits

- Only one person should edit the same project folder at a time.
- The editor doesn't change recipes, layout positions or tuning values; those stay in the JSON files (edited by hand by the designer).
- It doesn't commit or push to GitHub.
