# Bonding Potion — Game Design Document

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 14 November 2026 |
| **Based on** | [Game Concept Document](Game%20Concept%20Document.md), [Screen Layouts](Screen%20Layouts.md) |
| **Related** | [Technical Design Document](Technical%20Design%20Document.md), [Art List](Art%20List.md) |
| **Repository** | https://github.com/Tvareena/bonding_potion |

> Character names (Heroine, Chad) are working names. Dialogue lines are not final. Every line, speaker and scene change lives in an editable script file (see the TDD), so the scenario can be rewritten without code changes. The lines quoted here only mark story beats.

---

## 1. Game summary

**Bonding Potion** is a short 2D browser game that mixes a visual novel with potion-brewing puzzles. A young potion seller brews six potions to make a love potion for the man she likes. For each potion she can follow the recipe book or the slightly different advice of Jaros, her aunt's black cat. The game never asks her to choose. It notices what she brews, and the interface quietly pushes her toward the book. How many potions she brews the cat's way decides which of three endings she gets.

| Item | Value |
|---|---|
| Genre | Visual novel + puzzle |
| Platforms | Browser on PC and mobile (landscape), hosted on GitHub Pages |
| Reference resolution | 1920 × 1080, scaled to fit, letterboxed |
| Language | English |
| Playtime | 15–25 minutes per playthrough, 3 endings |
| Input | Mouse and keyboard; touch |
| Team and time | 1 artist, 1 game designer, 1 working day |

### 1.1 Design pillars

1. **Easy to brew.** Four elements, coloured crystals, one cauldron. Difficulty comes from amounts and ratios, never hidden rules.
2. **A choice the game doesn't announce.** The player shows their choice by brewing. There is no "book or cat?" menu and no visible score.
3. **The game pushes back.** Highlights, a stubborn cursor and slipping crystals lean toward the book. It's noticeable and commented on in the story, but the cat's way is never blocked.
4. **A short story with charm.** Short scenes between puzzles, a witty cat, and a romance that slowly shows its true colours.

---

## 2. Story and characters

### 2.1 Premise

The Heroine sells potions in her aunt's shop. She is in love with Chad, a customer who doesn't return her feelings. The aunt's recipe book says a love potion is made by mixing six potions: Fun, Courage, Trust, Hope, Confidence and Gratitude. Jaros, the aunt's black cat familiar, thinks it's a terrible idea, but he stays with her while she brews and offers advice that differs slightly from the book.

### 2.2 Characters

| ID | Name | Role | How shown | Images |
|---|---|---|---|---|
| `heroine` | Heroine *(working name)* | Protagonist | Portrait to the left of the textbox, on every screen | one image (one emotion) |
| `chad` | Chad *(working name)* | Love interest; charming at first, then shows he's selfish and cruel | Half-body sprite, dialogue screen | one image (one emotion) |
| `jaros` | Jaros | The aunt's black cat familiar; sarcastic, grumpy, caring. Secretly a wizard under a curse | Cat head icon (dialogue screen), cat on the table (potion screen) | one image each |
| `jaros_human` | Jaros (human form) | The freed wizard, in two endings | Half-body sprite, dialogue screen | one image (one emotion) |
| — | The Aunt | Potion maker, owner of the shop and the book | **Never appears on screen**, only mentioned | — |

### 2.3 Story structure

The game is a fixed sequence of 15 steps plus an ending. The order is final.

| Step | Type | Content |
|---|---|---|
| D1 | Dialogue | Introduces the Heroine, Chad and the premise. She decides to brew a love potion. Dialogue tutorial. |
| P1 | Potion: **Fun** | Jaros is introduced. Brewing tutorial, told by the cat. |
| D2 | Dialogue | Chad visits again; the player can tell he isn't kind, but the Heroine doesn't notice. |
| P2 | Potion: **Courage** | Brewing with the cat. |
| D3 | Dialogue | *Story events still to be written.* |
| P3 | Potion: **Trust** | Brewing with the cat. |
| D4 | Dialogue | The Heroine realises Chad is a bad person, but hopes the love potion will change him. |
| P4 | Potion: **Hope** | Brewing with the cat. |
| D5 | Dialogue | *Story events still to be written.* |
| P5 | Potion: **Confidence** | Brewing with the cat. |
| D6 | Dialogue | The argument. Jaros makes a last attempt to stop her. She: "So you think I'm stupid?" He: "Yes, if you can't see that one doesn't need a love potion to fall in love with someone like you." She: "You called me… Wait, what did you say?" He leaves, angry and embarrassed. |
| P6 | Potion: **Gratitude** | The cat is gone. His advice comes back to her as memories. |
| D7 | Dialogue | They make peace. She goes on with the love potion, but has doubts. |
| P7 | Potion: **Love** | The six finished potions are mixed. No choice here. |
| D8 | Dialogue: ending | One of three endings (2.4), then the ending card. |

### 2.4 Endings

Every potion from 1 to 6 is recorded as **book** or **cat** (see 3.4). Potion 7 isn't counted. The count is never shown to the player.

| Cat count | Ending ID | Ending | Summary |
|---|---|---|---|
| 5–6 | `romance` | Romance (happy) | Jaros drinks the potion before she can stop him and becomes human: a wizard under a curse. They've grown close while brewing, and she happily forgets Chad. |
| 3–4 | `friendship` | Friendship | Jaros drinks the potion and becomes human. No romance, but he's grateful. She gives up on Chad. |
| 0–2 | `bad` | Nightmare (bad) | She gives the potion to Chad. He falls in love, but he's cruel and selfish, and it turns into a nightmare. Final line: "But it's not what I wanted… at all…" |

After the ending scene the **ending card** shows the ending's name and "Ending X of 3" (romance = 1, friendship = 2, bad = 3), with a button back to the title. Endings the player has seen are remembered in the save (3.10).

---

## 3. Gameplay

### 3.1 Core loop

1. Read a dialogue scene (click or tap to advance).
2. On the potion screen: read the recipe, listen to the cat, drag crystals into the cauldron, watch the element counter.
3. Press **Brew**. The mix matches the book → success (book). Matches the cat → success (cat). Neither → fizzle, the cauldron empties, try again.
4. After success the bottle goes to the shelf, the **Next** arrow lights up, and the story continues.

### 3.2 Elements

| Element | Shape | Colour | Liquid tint |
|---|---|---|---|
| Fire | Triangle | Yellow | yellow |
| Water | Circle | Blue | blue |
| Earth | Square | Green | green |
| Air | Rhombus | Purple | purple |

The shapes make elements readable for colour-blind players. Exact colour values are set by the artist; the game reads them from a config file.

### 3.3 Crystals (ingredients)

Crystals are unlimited. Each adds fixed element units. **Each potion has its own set of crystals** (`potions.json → crystals`): the first potions use simple crystals; later potions drop some simple ones and bring uneven mixes, so matching a ratio takes more thought.

| ID | Crystal | Fire | Water | Earth | Air |
|---|---|---|---|---|---|
| `ember_shard` | Ember Shard | 10 | | | |
| `root_stone` | Root Stone | | | 10 | |
| `wisp_quartz` | Wisp Quartz | | | | 10 |
| `tide_pearl` | Tide Pearl | | 10 | | |
| `lava_garnet` | Lava Garnet | 10 | | 10 | |
| `storm_opal` | Storm Opal | | 10 | | 10 |
| `deep_sapphire` | Deep Sapphire | | 30 | | |
| `marsh_jade` | Marsh Jade | | 10 | 20 | |
| `sun_citrine` | Sun Citrine | 20 | | | 10 |
| `blaze_ruby` | Blaze Ruby | 30 | | | |
| `sky_amethyst` | Sky Amethyst | | | | 30 |
| `mountain_amber` | Mountain Amber | | | 30 | |
| `dusk_prism` | Dusk Prism | 20 | | 10 | 10 |

| Potion | Crystals in the menu |
|---|---|
| P1 Fun | Ember Shard, Root Stone, Wisp Quartz, Lava Garnet |
| P2 Courage | Ember Shard, Root Stone, Wisp Quartz, Tide Pearl, Storm Opal |
| P3 Trust | Ember Shard, Root Stone, Tide Pearl, Lava Garnet, Deep Sapphire, Marsh Jade |
| P4 Hope | Ember Shard, Root Stone, Wisp Quartz, Tide Pearl, Storm Opal, Lava Garnet, Sun Citrine, Blaze Ruby |
| P5 Confidence | Root Stone, Wisp Quartz, Tide Pearl, Marsh Jade, Sun Citrine, Sky Amethyst, Mountain Amber, Dusk Prism |
| P6 Gratitude | Tide Pearl, Lava Garnet, Storm Opal, Deep Sapphire, Marsh Jade, Blaze Ruby, Sky Amethyst, Mountain Amber, Dusk Prism |

### 3.4 Recipes and the hidden check

Recipes are **ratios**, not amounts. The recipe page shows the book recipe as element icons in a row with the ratio numbers below them (for example 2 : 3 : 2).

Every cat recipe **adds an element the book doesn't use** (Gratitude can't: its book recipe already uses all four, so the cat changes only the proportions). That makes the cat's way clearly "against the book", which the resistance catches (3.6).

| # | ID | Potion | Book ratio | Cat's ratio | Cat's extra element | Fewest crystals (book / cat) |
|---|---|---|---|---|---|---|
| 1 | `fun` | Fun | Fire 1 : Earth 1 | Fire 1 : Earth 1 : Air 1 | Air | 1 / 2 |
| 2 | `courage` | Courage | Water 1 : Air 2 | Water 1 : Air 2 : Fire 1 | Fire | 2 / 3 |
| 3 | `trust` | Trust | Water 2 : Earth 1 | Water 2 : Earth 1 : Fire 1 | Fire | 2 / 3 |
| 4 | `hope` | Hope | Fire 2 : Air 2 : Water 1 | Fire 2 : Air 2 : Water 1 : Earth 1 | Earth | 2 / 3 |
| 5 | `confidence` | Confidence | Fire 2 : Earth 3 : Air 2 | Fire 2 : Earth 3 : Air 2 : Water 1 | Water | 3 / 3 |
| 6 | `gratitude` | Gratitude | 1 : 1 : 1 : 1 (all four) | Fire 1 : Water 3 : Earth 3 : Air 1 | — (proportions only) | 2 / 4 |
| 7 | `love` | Love | One of each finished potion 1–6 | — | — | — |

The last column was checked by searching every combination of each potion's crystals: all 12 recipes can be made.

**Check rule (potions 1–6).** On Brew, the game compares the **ratio** of the four elements in the cauldron with the book ratio and the cat's ratio. Amounts don't matter, only proportions; elements not in a recipe must be 0. Example: a 1 : 1 recipe succeeds with 30 fire and 30 water (two 10-fire crystals plus one "10 fire + 30 water" crystal).
- Same ratio as the book → success, recorded as `book`.
- Same ratio as the cat → success, recorded as `cat`.
- Otherwise → fizzle.

Both successes look and sound the same.

**Potion 7.** The **Potions** tab is active and the **Crystals** tab is locked. The cauldron must contain each of the six finished bottles exactly once (in any order). Brew → the love potion appears large on screen (256 × 256 bottle), and the game moves to D8. Adding a bottle twice isn't possible, since each bottle leaves the shelf when used. Empty puts them back.
### 3.5 Brewing interactions

| Action | Result |
|---|---|
| Drag a crystal onto the cauldron | Splash; the crystal **floats on the surface** (bobbing gently); its units are added; the ratio on the cauldron and the liquid colour update. |
| Click / tap a floating crystal or bottle | It goes back to the shelf and its units are removed, without emptying the rest. |
| Hover over a crystal or bottle (shelf or floating) | Info box: name and composition. Crystals show element amounts (e.g. Marsh Jade: water 10, earth 20); bottles show their ratio. On touch screens the info shows when an item is tapped (selected). |
| Drop a crystal anywhere else | It flies back to its cell. |
| Brew (with something in the cauldron) | Check (3.4) → success or fizzle. Brew does nothing on an empty cauldron. |
| Empty | Everything floating sinks and the cauldron is cleared (in P7 the bottles go back to the shelf). |
| Fizzle | Smoke effect and sound, a short line from the Heroine or the cat, the cauldron empties automatically. |
| Success | Sparkle effect, the bottle appears and moves to the Potions tab, a short line, the **Next** arrow lights up: a pulsing glow behind it, and it swings gently back and forth (±10°, like the cat head icon on the dialogue screen; its size doesn't change). Crystals can no longer be added. |
| Next | Goes to the next dialogue. Disabled (dimmed) until success. |

The **ratio on the cauldron** shows the current mix in the same format as the recipe and the cat's bubble: element icons in a row with the reduced ratio below (e.g. 30 fire + 20 water + 20 air → 3 : 2 : 2), and under each ratio number, smaller, the actual amount of that element (30, 20, 20). It updates whenever something is added or removed; it's empty for an empty cauldron. In P7 it shows the bottles in the cauldron.

The **liquid colour** blends the element colours on the colour wheel and keeps them bright, so any mix (book, cat or anything else) looks clear and pleasant, never murky.

### 3.6 Guidance and resistance

The game "wants" the book recipe. It helps more and pushes back harder as the story goes on. Each potion has a guidance level.

| Level | Potions | Guidance | Resistance |
|---|---|---|---|
| 1 | P1, P2 | After 10 s without adding a crystal, the recipe page glows softly. | None. |
| 2 | P3, P4 | Recipe elements whose share is still too small glow; crystals that follow the book get a soft outline in the menu. | **Heavy drag**: an off-recipe crystal lags behind the pointer while dragged. |
| 3 | P5, P6 | Strong glow, the recipe pulses, fitting crystals nudge forward in their cells. | Heavy drag, plus **cursor drift** (PC) and **slipping** (3.6.1). The Heroine comments the first time. |
| — | P7 | None. | None. |

**Off-recipe crystal** ("against the book"), either:
- it contains an element the book recipe doesn't use (the cat's extra element), or
- adding it moves the mix **further from the book ratio** than it is now.

This is checked again on every drag, so the same crystal can be fine at one moment and off-recipe the next. Building toward the book ratio sometimes needs a step that is briefly further away; that step is resisted too, but never blocked.

#### 3.6.1 Resistance rules

- **Heavy drag** (levels 2–3): the dragged crystal follows the pointer slowly, like it's heavy.
- **Cursor drift** (level 3, PC only): in the potion screen the game draws its own cursor. While an off-recipe crystal is dragged, the cursor slides slightly toward the nearest fitting crystal in the menu.
- **Slipping** (level 3): an off-recipe crystal may fall out of the hand and fly back to its cell, even while the button is held. It never slips twice in a row for the same crystal, so the second try always works.
- **Comments:** the first heavy drag in P3 and the first slip in P5 trigger a Heroine line (for example "Why is this one so heavy?" / "Why does it keep slipping?"). Each comment plays once per playthrough.
- Mobile gets heavy drag and slipping; cursor drift is PC-only.
- In P6 the cat is gone; his advice shows as the Heroine's recollection ("Jaros would say… one fire, three water, three earth, one air."). Resistance stays at level 3.

Exact timings and chances are in the TDD (config values) and tuned in playtesting. The goal: annoying enough to notice, never enough to stop the player.

### 3.7 Tutorial

**Dialogue (D1):** if the player doesn't advance for 5 seconds, a blinking hint appears at the bottom-right of the text area: "Click to continue" (on touch devices: "Tap to continue"). It disappears on the next advance and doesn't return after the first 3 advances.

**Brewing (P1):** a scripted sequence told by Jaros in the textbox. Each step waits for the player:
1. The recipe: what Fun needs (the recipe page highlights).
2. Elements and crystals: the counter and the menu highlight.
3. "Drag a crystal into the cauldron." Waits for the first crystal.
4. "When it matches, press Brew." Brew highlights.
5. Jaros's first advice: "The book's too cautious. Three fire, one earth. Trust me." This shows there are two ways.
After the tutorial, the player brews freely.

### 3.8 Dialogue features

| Feature | Behaviour | Priority |
|---|---|---|
| Advance | Click, tap, Space or Enter. While text is typing, the first click finishes the line instantly. Works the same on the dialogue and potion screens (3.9). | Must |
| Typewriter text | Lines appear letter by letter; speed set in Settings. | Should |
| Cat icon swing | The cat head icon rocks gently while a Jaros line is shown. | Should |
| Log | Opens a panel with all lines seen in this session, scrollable. | Should |
| Auto | Toggle (also in Settings). Lines advance by themselves after they finish; the pause depends on line length and the **Auto speed** setting (slow / normal / fast). One setting for the whole game, remembered between sessions. | Should |
| Skip | Toggle. Fast-forwards dialogue until the next potion screen or the end of the scene. | Could |
| Save / Load | Open the save and load screens (3.10). | Should |
| Settings | Opens the settings panel (4.6). | Could |

The six menu items are text-only (no button art), under the text in the textbox. **The potion screen has the same menu**, in its own textbox. Items that aren't implemented in the build are hidden, and the rest move right.

### 3.9 Potion screen dialogue

- All lines (Heroine, Jaros, recollections) appear in the potion screen textbox with the speaker's name.
- Lines are triggered by events from the script: start of the potion, the cat's advice, first resistance, fizzle, success.
- **The cat's recipe bubble.** When Jaros gives his advice, a speech bubble pops up above him showing his alternative recipe the same way the book does: element icons in a row with the ratio numbers below (for example 2 : 1 : 3 : 2). It stays until the player leaves the screen, so the book's recipe and the cat's can be compared at a glance. Clicking the cat repeats his advice line and the bubble bounces.
- His spoken advice is a short remark without numbers ("Try my way. A drop of water keeps confidence from turning into pride.").
- In P6 the cat is gone: the bubble still appears (slightly faded) when the Heroine remembers his recipe. P7 has no bubble.
- Other lines (resistance comments, fizzles, success) show in the textbox as usual; the last line stays until a new one replaces it or the player leaves.
- There is no Heroine "hint" line when the player is idle; only the recipe glows.
- Lines advance exactly like on the dialogue screen: a click or tap on the textbox or on any free spot (not a crystal, button or tab), or Space / Enter. In Auto mode they advance by themselves. The "Click to continue" hint works the same way.
- The puzzle stays playable while a line is waiting.
- Jaros's advice for the current potion is repeated on request: clicking the cat on the table makes him say his advice again.

### 3.10 Progress and saving

Saving works like a standard visual novel. Everything is stored in the browser.

- **Save slots:** 18 slots on 3 pages of 6. Each slot shows a screenshot, slot number, date and time, the scene name ("Scene 3", a potion name or an ending name) and the line on screen.
- **Saving** (dialogue menu **Save**, or **Save** in the pause panel) stores the exact position: on the dialogue screen the current line, with background and sprite; on the potion screen the potion (it restarts from its beginning when loaded). Saving over a used slot asks for confirmation.
- **Loading** (dialogue menu **Load**, **Load** in the pause panel, or **Load** on the title screen) opens the same slot screen with an extra **Auto** page for the autosave. Loading during play asks for confirmation ("Unsaved progress will be lost").
- **Autosave:** at the start of every step.
- **Continue** on the title screen loads the most recent save (autosave or slot). It's hidden if there are no saves.
- **Start** begins a new game and replaces the autosave (with confirmation if one exists). Save slots are kept.
- After an ending the autosave is cleared; save slots stay.
- **Seen endings** and settings are stored separately and survive a new game.

### 3.11 Editing content (team tool)

The team gets a separate **content editor** page (not part of the game the player sees), described in TDD §13:
- **Texts tab:** change dialogue lines, speakers and scene commands; character names; potion and crystal names and flavour lines; all interface texts (buttons, menus, hints, ending names). Warns about lines too long for the textbox.
- **Art tab:** see which images are still temporary, and replace them with final art by drag-and-drop, with size checks and automatic resizing.

It works in Chrome or Edge on a computer with the project folder. Player-visible text never lives in the game code.

### 3.12 Failure and difficulty

There is no way to lose. Fizzles cost nothing. The player can retry any number of times. The difficulty curve comes from more elements, larger totals and more crystals to choose from (see 3.3, 3.4).

---

## 4. Screens

Exact positions and sizes are in [Screen Layouts](Screen%20Layouts.md) and the [Art List](Art%20List.md).

### 4.1 Screen flow

```
Title ──Start / Continue / Load──▶ D1 ▶ P1 ▶ D2 ▶ P2 ▶ … ▶ D7 ▶ P7 ▶ D8 (ending) ▶ Ending card ──▶ Title
  ├─Credits──▶ Credits panel
  └─Settings──▶ Settings panel
```

Esc (PC) opens the pause panel on dialogue and potion screens: Resume, Save, Load, Log, Settings, Title.

### 4.2 Title screen

Background picture on the right; logo and up to five buttons on the left: Start, Continue (only if there is a save), Load, Credits, Settings. A short fade to the first scene on Start.

### 4.3 Dialogue screen

Background, centred half-body sprite (0–1 at a time), semi-transparent textbox with name plate, Heroine portrait on the left, cat head icon top-right, text-only menu inside the textbox. Characters fade in and out when shown or hidden; backgrounds cross-fade.

### 4.4 Potion screen

Recipe page (top-left), Next arrow (top-right), cat on the table behind the cauldron with his recipe bubble above him, cauldron in the centre with the element counter, Brew and Empty buttons, ingredient menu on the right (tabs Crystals/Potions, sort row, 3 × 5 grid), Heroine portrait and textbox at the bottom-left, with the same text menu as dialogue (Log, Auto, Skip, Save, Load, Settings) under the text.

**Sorting:** the sort row has four element icons. Tapping one shows only crystals that contain that element (tap again to clear). Default order: single-element, then double, then triple.

### 4.5 Ending card

Over the ending illustration (one per ending, 1920 × 1080): ending name, "Ending X of 3" in the centre, and a **Title** button at the bottom centre.

### 4.6 Panels

One panel style (stretchable) for all of these, centred on screen:
- **Pause:** two columns: Resume, Save, Load / Log, Settings, Title.
- **Save / Load:** page buttons (Load also has **Auto**), a 3 × 2 grid of slot cards, Close (3.10).
- **Log:** scrollable list of "Name: line".
- **Credits:** scrollable, centred text from `data/credits.txt`.
- **Settings:** text speed (slow / normal / fast), Auto (off / on), Auto speed (slow / normal / fast), music volume, sound volume, fullscreen toggle.
- **Confirm:** questions such as "Start a new game? Your progress will be lost.", "Overwrite this save?", "Load this save?". Yes / No.

### 4.7 Mobile

- Landscape only. In portrait the game shows "Please rotate your device".
- Buttons are at least 90 px tall at the reference resolution. The text-only menu items are smaller (120 × 40 click areas), so check them on a real phone.
- Crystals can be dragged, or tapped and then the cauldron tapped.

---

## 5. Audio

| Type | Content | Priority |
|---|---|---|
| Music | Shop theme (dialogue), brewing theme (potion screen), one track per ending mood (3) | Could |
| SFX | Click, crystal pick-up, splash, bubbling loop, brew success, fizzle, slip, meow, bottle clink, cat swing (soft) | Could |

Music and SFX volumes are separate. Audio starts after the first click/tap (browser rule).

---

## 6. Art direction

Hand-drawn 2D. Expressive characters with simple silhouettes. The colour palette is not decided yet; colours in the layout drawings are not final. All requirements, sizes and positions are in the [Art List](Art%20List.md).

---

## 7. Scope

| Priority | Features |
|---|---|
| **Must** | Title (Start); dialogue screen with advance and idle hint; script file; potion screen with recipe, drag-and-drop, counter, Brew, Empty, fizzle, success, Next; all 7 potions; hidden book/cat record; 3 endings + ending card with ending illustrations; temporary art for every asset; GitHub Pages build. |
| **Should** | Guidance and resistance (all levels); P1 tutorial sequence; typewriter text; cat icon swing; sorting; tap-to-place; Log; pause panel; save slots, Load and Continue; Auto with speed setting; Credits; content editor (Texts and Art tabs). |
| **Could** | Skip, audio, seen-endings marks. |

---

## 8. Open questions

- Final names for the Heroine and Chad.
- Story events for D3 and D5 and the potion-screen lines for P2–P5.
- Whether the title screen marks endings the player has already seen.
