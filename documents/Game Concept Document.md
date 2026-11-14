# Bonding Potion — Game Concept Document

| | |
|---|---|
| **Version** | 1.0 (concept) |
| **Date** | 14 November 2026 |
| **Based on** | Early Concept Document |
| **Repository** | https://github.com/Tvareena/bonding_potion |

> Character names (Heroine, Chad) are working names. Dialogue lines are not final: the build must let the team add, change and remove lines and characters by editing a script file, without touching code. The few lines in this document mark story beats and can be rewritten.

## 1. Overview

### 1.1 High concept

A young potion seller tries to brew a love potion, which means brewing six other potions first. The recipe book says one thing. Her aunt's sarcastic black cat says something slightly different, and the game itself keeps pushing her back toward the book. Whose advice she follows decides who drinks the love potion at the end.

### 1.2 Key facts

| Item | Value |
|---|---|
| Working title | Bonding Potion |
| Genre | 2D puzzle game + visual novel (story-driven potion brewing) |
| Platforms | Browser on PC and mobile (HTML5), hosted from the public GitHub repository (GitHub Pages) |
| Reference resolution | 1920 × 1080, landscape; scaled to fit the screen, letterboxed if needed |
| Language | English |
| Session length | About 15–25 minutes for one playthrough; 3 endings encourage replays |
| Target audience | Casual players who like visual novels, cozy games and light puzzles; teens and adults |
| Team and time | 1 artist, 1 game designer, 1 working day |

### 1.3 Design pillars

- **Easy to brew.** The puzzle is readable at a glance: four elements, coloured crystals, one cauldron. Difficulty comes from amounts and ratios, not hidden rules.
- **A choice the game doesn't announce.** The player is never asked "book or cat?". They show it by what they brew. The game counts their choices without saying so.
- **The game pushes back.** The interface itself (highlights, a stubborn cursor, ingredients slipping out of the hand) leans toward the "proper" recipe. It's noticeable and the Heroine comments on it, but it never makes the cat's way impossible.
- **A short story with charm.** Short dialogue scenes between puzzles, a witty cat, and a romance that slowly shows its true colours.

### 1.4 Unique selling points

- Puzzle choices *are* the dialogue choices: the ending comes from how you brew, not from a menu.
- The "the interface resists you" mechanic makes it physically felt that the "right" path isn't necessarily the right one.
- A cat companion who gets more important to the Heroine (and to the player) with every potion.

## 2. Story

### 2.1 Premise

The Heroine works as a potion seller in her aunt's potion shop. She is in love with Chad, a customer who doesn't return her feelings. She decides to brew a love potion. According to the recipe book, a love potion is made by mixing six other potions: Fun, Courage, Trust, Hope, Confidence and Gratitude. Jaros, the black cat who is her aunt's familiar, tries to talk her out of it, but still watches over her and helps her brew, offering advice that differs slightly from the book.

### 2.2 Characters

| Character | Role | Description |
|---|---|---|
| Heroine *(working name)* | Protagonist, player character | A young potion seller working in her aunt's shop. Kind, hopeful, a little naive and stubborn. Always shown as a portrait to the left of the textbox. |
| Chad *(working name)* | Love interest | A handsome customer of the shop. Charming at first, but selfish and cruel. The player notices it before the Heroine does. Shown as a half-body sprite. |
| Jaros | Companion, secret love interest | A black cat, the aunt's familiar. Sarcastic and grumpy, but caring. Against the love potion plan, yet he helps anyway. Actually a wizard under an evil curse (revealed only in two of the endings). Appears as a head icon in dialogue scenes and as a full cat on the table during brewing. |
| Jaros, human form | Ending character | The wizard freed from the curse. Shown as a half-body sprite in the Romance and Friendship endings. |
| The Aunt | Off-screen character | A potion maker and the owner of the shop and the recipe book. Only mentioned in dialogue; she never appears on screen. |

### 2.3 Story structure

The game alternates dialogue scenes and potion puzzles: 8 dialogue scenes and 7 potions. The order of potions is final as listed. The structure and puzzle data are still kept in data files, so changes stay easy.

| Step | Type | Story beat |
|---|---|---|
| D1 | Dialogue | Introduces the Heroine, Chad and the premise. The Heroine decides to brew a love potion. Includes the click/tap tutorial. |
| P1 | Potion: Fun | The Heroine moves to the workshop and Jaros is introduced. Tutorial: the cat explains elements, ingredients and how to brew. |
| D2 | Dialogue | Chad appears again. The player can tell from the dialogue that he isn't kind; the Heroine doesn't notice. |
| P2 | Potion: Courage | Brewing with the cat. Story events for this step are still to be written. |
| D3 | Dialogue | Story events for this step are still to be written. |
| P3 | Potion: Trust | Brewing with the cat. |
| D4 | Dialogue | The Heroine realises Chad is a bad person, but hopes the love potion will change him. |
| P4 | Potion: Hope | Brewing with the cat. |
| D5 | Dialogue | Story events for this step are still to be written. |
| P5 | Potion: Confidence | Brewing with the cat. |
| D6 | Dialogue | Jaros makes a last attempt to talk her out of it. They argue. She: "So you think I'm stupid?" He: "Yes, if you can't see that one doesn't need a love potion to fall in love with someone like you." She: "You called me… Wait, what did you say?" The cat leaves, angry and embarrassed. |
| P6 | Potion: Gratitude | The cat is absent. The Heroine remembers his earlier advice and may follow it; his suggestions appear as her recollections. |
| D7 | Dialogue | The Heroine and Jaros make peace. She goes on to brew the love potion, though she has doubts. |
| P7 | Potion: Love | The six finished potions are mixed together. This step has no choice. |
| D8 | Dialogue: ending | One of three endings (see 2.4). |

### 2.4 Endings

Each of potions 1–6 is brewed either **by the book** or **by the cat's advice**. The game counts how many were brewed the cat's way (0–6) and doesn't show the count. Potion 7 has no choice and doesn't affect the count.

| Cat's-way potions | Ending | What happens |
|---|---|---|
| 5–6 | Romance ending (happy) | Jaros drinks the potion before the Heroine can stop him and turns into a human: a wizard under an evil curse. They've built a strong bond while brewing, and she happily forgets Chad. |
| 3–4 | Friendship ending | Jaros drinks the potion and turns into a human wizard. They don't fall in love, but he's grateful for her help. She changes her mind and gives up on winning Chad. |
| 0–2 (4+ by the book) | Bad ending | The Heroine gives the love potion to Chad. He falls in love, but because he's cruel and selfish it becomes a nightmare instead of a happy ending. Her final line: "But it's not what I wanted… at all…" |

## 3. Gameplay

### 3.1 Core loop

1. **Read** a dialogue scene (click or tap to advance).
2. **Brew** the next potion: read the recipe, listen to the cat, drag ingredients into the cauldron, watch the element levels change, press Brew.
3. **Result:** success (matches the book or the cat), or a fizzle and a retry.
4. The finished potion goes to the shelf and the story continues. Repeat until the love potion, then the ending.

### 3.2 Elements

Every potion and ingredient is made of four elements. Each element has a simple single-colour shape so it reads well on small screens and for colour-blind players.

| Element | Shape | Colour |
|---|---|---|
| Fire | Triangle | Yellow |
| Water | Circle | Blue |
| Earth | Square | Green |
| Air | Rhombus | Purple |

### 3.3 Brewing rules

- Each ingredient is a crystal that adds a fixed number of element units (for example Lava Garnet = 1 Fire + 1 Earth).
- The cauldron shows the current total of each element as a row of element icons with counts, updated as each ingredient is added.
- The recipe page lists the exact amount of each element (shown as element icons) and a short flavour text.
- Ingredients are unlimited. The player can drop in as many as they want.
- Pressing **Brew** (the ladle next to the cauldron) checks the mix. The game secretly compares it against both the book recipe and the cat's version.
  - Matches the book: success, and the potion is recorded as "book".
  - Matches the cat's version: success, and the potion is recorded as "cat".
  - Matches neither: the cauldron fizzles, a character makes a short comment, and the cauldron is emptied so the player can try again. Nothing is lost.
- There's also an **Empty cauldron** button for starting over at any time.
- Both successful results look the same to the player (same success effect), so the choice isn't flagged.
- Difficulty grows through the number of elements in a recipe, their ratio, and the total amount, plus a wider choice of multi-element ingredients that make exact amounts harder to hit.

### 3.4 Potion recipes

The amounts below are a first proposal to be balanced in playtesting. The cat's version always uses the same elements as the book, so its advice feels like a small tweak, never nonsense.

| # | Potion | Book recipe | Cat's advice | Difficulty notes |
|---|---|---|---|---|
| 1 | Fun | Fire 2, Earth 2 (1:1) | Fire 3, Earth 1 | Tutorial. Two elements, small amounts. |
| 2 | Courage | Water 2, Air 4 (1:2) | Water 3, Air 3 | Two elements, uneven ratio. |
| 3 | Trust | Water 4, Earth 2 (2:1) | Water 3, Earth 3 | Two elements, larger amounts; double crystals introduced. |
| 4 | Hope | Fire 2, Air 2, Water 1 | Fire 1, Air 3, Water 1 | First three-element recipe. |
| 5 | Confidence | Earth 3, Air 2, Fire 2 | Earth 2, Air 2, Fire 3 | Three elements, bigger total. |
| 6 | Gratitude | Fire 2, Earth 2, Air 2, Water 2 | Fire 1, Earth 3, Air 1, Water 3 | All four elements; the cat isn't there to help. |
| 7 | Love | One of each of the six finished potions, in any order | — | No elements. The finished potions are used as ingredients. |

### 3.5 Ingredients

A proposed set of crystals, unlocked gradually so the ingredient menu doesn't overwhelm the player. Names and shapes are suggestions for the artist.

| Crystal | Elements | Available from | Look |
|---|---|---|---|
| Ember Shard | Fire 1 | Potion 1 | Small yellow triangular shard |
| Root Stone | Earth 1 | Potion 1 | Small green cube |
| Tide Pearl | Water 1 | Potion 2 | Blue round crystal |
| Wisp Quartz | Air 1 | Potion 2 | Small purple rhombus |
| Lava Garnet | Fire 1, Earth 1 | Potion 1 | Yellow and green cluster |
| Storm Opal | Water 1, Air 1 | Potion 2 | Blue and purple cluster |
| Deep Sapphire | Water 2 | Potion 3 | Large blue crystal |
| Marsh Jade | Water 1, Earth 1 | Potion 3 | Blue and green cluster |
| Sun Citrine | Fire 1, Air 1 | Potion 4 | Yellow and purple cluster |
| Blaze Ruby | Fire 2 | Potion 4 | Large yellow crystal |
| Sky Amethyst | Air 2 | Potion 4 | Large purple crystal |
| Mountain Amber | Earth 2 | Potion 5 | Large green crystal |
| Dusk Prism | Fire 1, Air 1, Earth 1 | Potion 5 | Three-coloured prism |

The ingredient menu has two tabs: **Crystals** and **Potions** (finished potions, used in step 7). Crystals can be sorted by element (all crystals containing Fire, Water, and so on) or by size (single, double, triple).

### 3.6 Guidance and resistance

The cat's advice contradicts the recipe slightly. As the story goes on, the game pushes harder for the book recipe. The resistance is strong enough to notice and for the Heroine to comment on, but it never blocks the cat's way.

| Potions | Guidance toward the book | Resistance to other choices |
|---|---|---|
| 1–2 | Light hint: the recipe page gently glows when the player hesitates. | None. |
| 3–4 | Recipe lines and matching crystals in the menu are highlighted. | Off-recipe crystals feel "heavy": dragging them lags behind the cursor or finger. |
| 5–6 | Strong highlights, a pulsing recipe, and the needed crystals nudge forward on the shelf. | The cursor drifts toward recipe crystals; off-recipe crystals sometimes slip out of the hand and fall back to the shelf, even while the button is held. The Heroine remarks on it (for example, "Why does this one keep slipping?"). |

- An "off-recipe" crystal is one that would push any element above the book amount.
- Slipping happens at most once per crystal in a row, so the player can always succeed on the second try.
- On mobile, cursor drift is replaced by drag lag and slipping; the feeling should stay the same.
- In potion 6 the cat is absent: his advice appears as the Heroine's own recollection, and the resistance stays at full strength.

### 3.7 Tutorial

- **Dialogue tutorial:** the game opens on a dialogue. If the player does nothing for about 5 seconds, a small blinking hint appears: "Click to continue" (on touch devices: "Tap to continue").
- **Brewing tutorial (potion 1):** Jaros explains it in character: what the elements are, how to read the recipe, how to drag a crystal into the cauldron, and where to press Brew. He also gives his first contradicting advice, to show that there are two ways.

### 3.8 Controls

| Action | PC | Mobile |
|---|---|---|
| Advance dialogue | Left click, Space or Enter | Tap |
| Add ingredient | Drag the crystal into the cauldron | Drag, or tap the crystal and then tap the cauldron |
| Brew / Empty | Click the button | Tap the button |
| Open menu | Menu buttons, Esc | Menu buttons |

## 4. Screens and interface

Exact placement and sizes for the artist are in [Screen Layouts](Screen%20Layouts.md).

### 4.1 Screen flow

Title screen → Dialogue scene ⇄ Potion screen (repeats 7 times) → Ending scene → Ending card ("Ending X of 3") → Title screen.

### 4.2 Dialogue screen

A standard visual novel layout.

- A full-screen background.
- A semi-transparent textbox along the bottom, with the speaker's name and the line.
- The Heroine's portrait in a frame to the left of the textbox, overlapping it (one image).
- Other characters appear as half-body sprites in the centre, behind and above the textbox.
- A cat head icon in the top-right corner (only outside brewing). It swings slightly while one of Jaros's lines is shown.
- A row of small text-only menu buttons in the bottom-right of the textbox, under the line: Log, Auto, Skip, Save, Load, Settings. They have no background; the player sees and clicks just the words. For the 1-day build, Save, Load and Settings can be cut (see section 6).

![Dialogue screen layout sketch](../concept_images/dialogue%20window%20scheme.jpg)

*Figure 1. Dialogue screen layout sketch (concept_images/dialogue window scheme.jpg).*

### 4.3 Potion screen

The layout follows the sketch below. Puzzle elements must never be covered by the textbox. The sketch has the textbox running across the cauldron and the ingredient menu, so the proposed layout moves the textbox below the cauldron and the menu to the right. The sketch also shows a separate speech bubble for the cat; there is none. All lines on this screen, including Jaros's, appear in the textbox with the speaker's name, the same way as on the dialogue screen.

![Potion screen layout sketch](../concept_images/potion%20making%20puzzle%20window%20scheme.jpg)

*Figure 2. Potion screen layout sketch (concept_images/potion making puzzle window scheme.jpg).*

| Element | Proposed area (x, y, width × height) | Notes |
|---|---|---|
| Recipe book page | 40, 40, 560 × 580 | Potion name, element amounts as icons, flavour text. Lines can be highlighted. |
| Next arrow | 1760, 40, 120 × 120 | Leave the screen after a successful brew (and open the menu before that). |
| Cat on the table | 1140, 230, 340 × 520 | Behind the cauldron. A single pose; empty in potion 6. |
| Cauldron | 600, 300, 620 × 500 | Drop target. The liquid colour changes with the mix; the element counter sits on its front. |
| Brew and Empty buttons | 1240, 760 and 1240, 870, 220 × 90 (each) | Stacked next to the cauldron. |
| Ingredient menu | 1480, 230, 420 × 820 | Tabs (Crystals / Potions), sorting, grid of 3 columns. |
| Heroine portrait | Frame 40, 650, 320 × 420; portrait 40, 650, 320 × 420 | Same frame and portrait files as in dialogue. |
| Textbox | 380, 840, 840 × 200 (name plate 400, 810, 300 × 56) | Lines of all characters (the Heroine and Jaros) with the speaker's name, plus fizzle messages. Advancing is optional; the puzzle stays playable. |

### 4.4 Other screens

- **Title screen:** logo and buttons (Start, Continue if save is implemented, Settings) on the left; the right side shows the background illustration.
- **Ending card:** the ending's name and "Ending X of 3", with a button that returns to the title.
- **Log:** a scrollable list of past lines.
- **Settings:** text speed, music and sound volume.

## 5. Art and audio

### 5.1 Art direction

Hand-drawn 2D. Character art is expressive, with simple silhouettes. The colour palette is not decided yet: colours in the layout sketches are not final.

### 5.2 Art asset list (preliminary)

Every image in the game is a separate file in the assets folder, with a clear name and fixed size, so the artist can replace a temporary image by dropping a new file with the same name. The full, final list is in the [Art List](Art%20List.md); this table is the early version. All sprites are PNG with transparency unless noted.

| Asset | Size (px) | Count | Notes |
|---|---|---|---|
| Background: dialogue (shop) | 1920 × 1080 | 1–2 | JPG or PNG. Shop interior; optionally a street or doorway for Chad's scenes. |
| Background: potion screen (workshop table) | 1920 × 1080 | 1 | The table surface where the cat sits. |
| Heroine portrait | 320 × 420 | 1 | One image, one emotion. Fits the frame left of the textbox. |
| Portrait frame | 320 × 420 | 1 | Separate so portraits can be swapped. |
| Character sprite: Chad (half-body) | 900 × 1000 | 1 | One image, one emotion. |
| Character sprite: Jaros, human (half-body) | 900 × 1000 | 1 | One image, one emotion. |
| Cat head icon (dialogue) | 220 × 220 | 1 | The swinging animation is done in code. |
| Cat on the table (potion screen) | 340 × 520 | 1 | One pose, sitting behind the cauldron. |
| Cauldron | 620 × 500 | 1 | Plus a separate liquid layer (500 × 140, light grey, tinted in code). |
| Ingredient (draggable crystal) | 128 × 128 | 13 | Also used, scaled down, as the menu icon, so no separate inventory icon is needed. |
| Element icon | 64 × 64 | 4 | Yellow triangle, blue circle, green square, purple rhombus. |
| Finished potion bottle | 128 × 128 | 6 | One per potion, with the element colours. |
| Love potion bottle | 256 × 256 | 1 | Shown large when the final potion is made. |
| Recipe book page | 560 × 580 | 1 | Text is drawn in code. |
| Textbox, name plate | Scalable (9-slice) | 2 | Frames that stretch to fit. |
| Buttons: main menu (Start, Continue, Settings) | 400 × 100 | 3 | Normal and pressed states. |
| Buttons: Brew, Empty | 220 × 90 | 2 | Normal and pressed states. |
| Next arrow | 120 × 120 | 1 | Normal and pressed states. |
| Title screen background and logo | 1920 × 1080, 800 × 320 | 2 | The background carries an illustration on the right; logo and buttons sit on the left. |
| Ending illustrations | 1920 × 1080 | 3 | One per ending (required). |
| Effects: bubbles, sparkles, fizzle smoke | 256 × 256 | 3 | Simple sprite frames or particles. |

### 5.3 Audio (optional for the 1-day build)

- Music: one calm shop theme, one brewing theme, and one track per ending mood.
- Sound effects: crystal drop and splash, bubbling, successful brew, fizzle, cat meow, click.

## 6. Scope and production

### 6.1 Scope for a 1-day build

One working day is very tight for this content, so features are prioritised. "Must" gives a complete playable game from start to all three endings.

| Priority | Features |
|---|---|
| Must | Dialogue screen with click/tap advance and idle hint; script loaded from an editable file; potion screen with recipe, cat advice, drag-and-drop, element counter, Brew and Empty; all 7 potions; hidden choice counter; 3 endings; temporary art for every asset in the list; browser build on GitHub Pages. |
| Should | Escalating guidance and resistance; cat head icon swing; ingredient sorting; touch tap-to-place; Log. |
| Could | Auto and Skip; Save and Load; Settings; music and sound effects; ending illustrations; ending gallery. |

### 6.2 Content and data

- **Script file:** all dialogue lives in one plain text or JSON script file: speaker, line, portrait expression, which sprite to show, background, and cat icon behaviour. The team can rewrite scenes, add characters, and send a finished scenario without code changes.
- **Potion data:** recipes, cat versions, ingredient lists and the order of potions are in a data file, so balancing and reordering need no programming.
- **Art:** temporary images exist for every asset from the start, named and sized as in the art list, so they can be replaced one by one.
- Temporary text shown in the game is written as plausible in-game text, never the word "placeholder".

### 6.3 Technology (to be detailed in the TDD)

- HTML5 and JavaScript, playable in modern desktop and mobile browsers.
- Hosted with GitHub Pages from the public repository.
- 1920 × 1080 reference canvas, scaled to the window; landscape only (portrait phones are asked to rotate).

### 6.4 Risks

| Risk | Mitigation |
|---|---|
| 1 day isn't enough for all content and art | Follow the Must/Should/Could scope; ship with temporary art; keep scenes short. |
| Resistance feels like a bug, not a story device | The Heroine and the cat comment on it in character; it builds up gradually; it never blocks success. |
| Players don't realise there are two ways to brew | The potion 1 tutorial shows the cat's advice explicitly; the cat repeats it in every potion. |
| Puzzle too easy or too hard | Recipe amounts are in a data file and can be tuned after a short playtest. |
| Drag and drop on small phone screens | Tap-to-select-then-tap-cauldron as an alternative; large touch targets. |

## 7. Open questions

- Final names for the Heroine and Chad.
- Story events for dialogue scenes D3 and D5, and for brewing steps 2–5.
- Next document: the Technical Design Document (TDD), followed by the full art list.
