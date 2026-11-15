import { G, T, ELEMENTS, font, rect, color, charName, potionById, crystalById, isTouchDevice, autoDelayMs } from '../core.js';
import { TextBox } from '../ui/TextBox.js';
import { Portrait } from '../ui/Portrait.js';
import { Button } from '../ui/Button.js';
import { TextMenu } from '../ui/TextMenu.js';
import { nineSlice } from '../ui/NineSlice.js';
import { Flow } from '../systems/StoryRunner.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { openOverlay } from './OverlayScene.js';
import { setupDebug } from '../systems/Debug.js';
import { reduceRatio, sameRatio, ratioDistance } from '../systems/Ratio.js';
import { condOk } from '../systems/Conditions.js';

const D = { bg: 0, recipe: 5, recipeHi: 6, recipeText: 7, glow: 8, cat: 10, cauldron: 20, liquid: 21, bubbles: 22, counter: 23,
  ui: 30, cell: 31, outline: 32, item: 33, portrait: 40, textbox: 42, tutorial: 80, fx: 90, held: 100, love: 110, tip: 900, cursor: 1000, floating: 22.5 };

// Potion-brewing screen (GDD §3, TDD §6.2–6.3).
export class PotionScene extends Phaser.Scene {
  constructor() { super('Potion'); }

  create(data) {
    this._leaving = false;
    this._debugJump = false;
    this.input.enabled = true;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.L = G.layout.potion;
    this.section = data.section;
    this.potion = potionById(this.section.potionId) || G.potions[0];
    this.isMix = Array.isArray(this.potion.mix);
    this.level = this.potion.guidance || 0;
    this.cfg = G.config;

    // State
    this.totals = { fire: 0, water: 0, earth: 0, air: 0 };
    this.added = [];            // ids of crystals or bottles in the cauldron
    this.done = false;
    this.tab = this.isMix ? 'potions' : 'crystals';
    this.filter = null;
    this.held = null;
    this.selected = null;
    this.lastSlipped = null;
    this.drift = { x: 0, y: 0 };
    this.mouseMode = false;
    this.lastAddTime = this.time.now;
    this.hintPlayed = false;
    this.queue = [];
    this.lineActive = false;
    this.lineTimer = null;
    this.idleTimer = null;
    this.hintTween = null;
    this.tutorialStep = 0;
    this.nudges = [];
    this.floating = [];
    this.tip = null;

    this.computeInventory();
    this.buildScene();
    this.refreshAll();

    // Input
    this.input.on('pointerdown', (p, over) => this.onPointerDown(p, over));
    this.input.on('pointerup', (p) => this.onPointerUp(p));
    this.input.on('pointermove', (p) => this.onPointerMove(p));
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-ESC', () => openOverlay(this, 'pause'));
      kb.on('keydown-SPACE', () => this.advanceLine(true));
      kb.on('keydown-ENTER', () => this.advanceLine(true));
      if (G.debug) {
        kb.on('keydown-B', () => this.debugFill('book'));
        kb.on('keydown-C', () => this.debugFill('cat'));
      }
    }
    this.events.once('shutdown', () => this.cleanup());
    this.events.on('pause', () => this.setCustomCursor(false));
    this.events.on('resume', () => {
      if (this.mouseMode) this.setCustomCursor(true);
      // Auto may have been switched in Settings.
      this.menu.get('auto').setActive(!!G.settings.auto);
      if (G.settings.auto && this.lineActive && !this.textbox.typing) this.lineDone();
      if (!G.settings.auto && this.lineTimer) { this.lineTimer.remove(); this.lineTimer = null; }
    });

    G.audio.music('brewing');
    this.time.delayedCall(400, () => this.startSequence());
    setupDebug(this, () => `potion ${this.potion.id}  level ${this.level}  totals ${ELEMENTS.map(e => e[0].toUpperCase() + this.totals[e]).join(' ')}  added [${this.added.join(',')}]`);
  }

  // ---------------------------------------------------------------- setup

  computeInventory() {
    const idx = G.potions.indexOf(this.potion);
    // Each potion lists its own crystals (potions.json → crystals), so later potions can drop the simple ones.
    let ids = this.potion.crystals;
    if (!Array.isArray(ids)) { // older data format: crystals unlock and stay
      ids = [];
      G.potions.slice(0, idx + 1).forEach(p => (p.unlocks || []).forEach(id => { if (!ids.includes(id)) ids.push(id); }));
    }
    this.unlocked = ids.map(crystalById).filter(Boolean);
    // Bottles made so far: every non-mix potion before this one.
    this.bottles = G.potions.slice(0, idx).filter(p => !p.mix).map(p => p.id);
  }

  buildScene() {
    const L = this.L;
    this.add.image(0, 0, 'bg_workshop').setOrigin(0, 0).setDisplaySize(1920, 1080).setDepth(D.bg);

    // Recipe page
    const rp = rect(L.recipe);
    this.add.image(rp.x, rp.y, 'recipe_page').setOrigin(0, 0).setDisplaySize(rp.w, rp.h).setDepth(D.recipe);
    this.recipeGlow = this.add.graphics().setDepth(D.glow).setAlpha(0);
    this.recipeGlow.lineStyle(10, color(this.cfg.colors.recipeHighlight), 1).strokeRoundedRect(rp.x - 6, rp.y - 6, rp.w + 12, rp.h + 12, 24);
    this.buildRecipe();

    // Cat
    const ct = rect(L.cat);
    this.cat = this.add.image(ct.x, ct.y, 'cat_table').setOrigin(0, 0).setDisplaySize(ct.w, ct.h).setDepth(D.cat);
    if (!this.potion.catPresent) this.cat.setVisible(false);
    else this.cat.setInteractive({ pixelPerfect: true }).on('pointerup', () => this.onCatClick());
    this.buildCatBubble();

    // Cauldron, liquid, counter
    // The liquid image covers the whole cauldron (same size), bubbles rise from the liquid surface.
    const cd = rect(L.cauldron), lq = rect(L.liquid), sf = rect(L.liquidSurface || L.liquid);
    this.add.image(cd.x, cd.y, 'cauldron').setOrigin(0, 0).setDisplaySize(cd.w, cd.h).setDepth(D.cauldron);
    this.liquid = this.add.image(lq.x, lq.y, 'cauldron_liquid').setOrigin(0, 0).setDisplaySize(lq.w, lq.h).setDepth(D.liquid);
    this.counter = this.add.container(0, 0).setDepth(D.counter);
    const dz = rect(L.dropZone);
    this.dropZone = new Phaser.Geom.Rectangle(dz.x, dz.y, dz.w, dz.h);

    // Particles
    this.bubbles = this.add.particles(0, 0, 'fx_bubble', {
      x: { min: sf.x + 50, max: sf.x + sf.w - 50 }, y: { min: sf.y + 40, max: sf.y + 90 },
      speedY: { min: -30, max: -70 }, scale: { start: 0.22, end: 0.05 }, alpha: { start: 0.9, end: 0 },
      lifespan: 1100, frequency: 140, emitting: false
    }).setDepth(D.bubbles);
    this.splash = this.add.particles(0, 0, 'fx_bubble', {
      speed: { min: 120, max: 300 }, angle: { min: 220, max: 320 }, gravityY: 600,
      scale: { start: 0.3, end: 0.05 }, lifespan: 700, emitting: false
    }).setDepth(D.fx);
    this.sparkles = this.add.particles(0, 0, 'fx_sparkle', {
      speed: { min: 150, max: 450 }, scale: { start: 0.55, end: 0 }, rotate: { min: 0, max: 360 },
      lifespan: 1000, emitting: false
    }).setDepth(D.fx);
    this.smoke = this.add.particles(0, 0, 'fx_smoke', {
      speed: { min: 40, max: 160 }, angle: { min: 220, max: 320 }, scale: { start: 0.8, end: 2.4 },
      alpha: { start: 0.85, end: 0 }, lifespan: 1300, emitting: false
    }).setDepth(D.fx);

    // Buttons
    const br = rect(L.brew), em = rect(L.empty), nx = rect(L.next);
    this.brewBtn = new Button(this, 'ui_button_small', br.x, br.y, br.w, br.h, T('potion.brew'), () => this.brew(), { handCursor: false }).setDepth(D.ui);
    this.emptyBtn = new Button(this, 'ui_button_small', em.x, em.y, em.w, em.h, T('potion.empty'), () => this.emptyCauldron(), { handCursor: false }).setDepth(D.ui);
    // Glow behind the Next arrow, shown after a successful brew (the arrow itself keeps its size).
    this.nextGlow = this.add.graphics().setDepth(D.ui - 1).setAlpha(0);
    this.nextGlow.fillStyle(color(this.cfg.colors.recipeHighlight), 1).fillRoundedRect(nx.x - 14, nx.y - 14, nx.w + 28, nx.h + 28, 26);
    this.nextBtn = new Button(this, 'ui_next', nx.x, nx.y, nx.w, nx.h, null, () => this.next(), { handCursor: false }).setDepth(D.ui).setEnabled(false);

    // Ingredient panel
    const pn = rect(L.panel);
    this.add.image(pn.x, pn.y, 'ui_ingredient_panel').setOrigin(0, 0).setDisplaySize(pn.w, pn.h).setDepth(D.ui);
    const t0 = rect(L.tabs[0]), t1 = rect(L.tabs[1]);
    this.tabCrystals = new Button(this, 'ui_tab', t0.x, t0.y, t0.w, t0.h, T('potion.tabCrystals'), () => this.setTab('crystals'), { handCursor: false, fontSize: 26 }).setDepth(D.cell);
    this.tabPotions = new Button(this, 'ui_tab', t1.x, t1.y, t1.w, t1.h, T('potion.tabPotions'), () => this.setTab('potions'), { handCursor: false, fontSize: 26 }).setDepth(D.cell);
    if (this.isMix) this.tabCrystals.setEnabled(false);

    // Sort row
    const sr = rect(L.sortRow), si = L.sortIcon;
    this.sortBg = this.add.rectangle(sr.x, sr.y, sr.w, sr.h, 0xffffff, 0.35).setOrigin(0, 0).setDepth(D.cell);
    this.sortIcons = ELEMENTS.map((e, i) => {
      const cx = sr.x + sr.w / 8 + i * sr.w / 4, cy = sr.y + sr.h / 2;
      const ring = this.add.circle(cx, cy, si / 2 + 6, color(this.cfg.colors.recipeHighlight), 0.9).setDepth(D.cell).setVisible(false);
      const img = this.add.image(cx, cy, 'element_' + e).setDisplaySize(si, si).setDepth(D.outline).setInteractive();
      img.on('pointerup', () => { this.filter = this.filter === e ? null : e; this.refreshGrid(); });
      return { e, img, ring };
    });

    // Grid cells
    const gr = L.grid;
    this.cells = [];
    for (let r = 0; r < gr.rows; r++) {
      for (let c = 0; c < gr.cols; c++) {
        const x = gr.x + c * gr.step, y = gr.y + r * gr.step;
        this.add.image(x, y, 'ui_cell').setOrigin(0, 0).setDisplaySize(gr.cell, gr.cell).setDepth(D.cell);
        this.cells.push({ x, y, cx: x + gr.cell / 2, cy: y + gr.cell / 2 });
      }
    }
    this.gridItems = [];
    this.outlines = this.add.graphics().setDepth(D.outline);

    // Heroine + textbox
    this.portrait = new Portrait(this, L.portraitFrame, L.portrait, D.portrait);
    this.textbox = new TextBox(this, {
      box: L.textbox, nameplate: L.nameplate, text: L.text,
      fontSize: this.cfg.font.potionLine, fontMin: this.cfg.font.potionLineMin, nameSize: this.cfg.font.potionName, depth: D.textbox,
      more: G.layout.dialogue.potionMore
    });
    this.textbox.clear();
    const tb = rect(L.textbox);
    this.add.zone(tb.x, tb.y, tb.w, tb.h).setOrigin(0, 0).setDepth(D.textbox + 5).setInteractive()
      .on('pointerup', () => this.onTextboxClick());
    // Same text-only menu as on the dialogue screen, under the text in the textbox.
    this.menu = new TextMenu(this, L.menu, [
      { id: 'log', label: T('menu.log'), onClick: () => openOverlay(this, 'log') },
      { id: 'auto', label: T('menu.auto'), onClick: () => this.toggleAuto() },
      { id: 'skip', label: T('menu.skip'), onClick: () => this.toggleSkip() },
      { id: 'save', label: T('menu.save'), onClick: () => openOverlay(this, 'save') },
      { id: 'load', label: T('menu.load'), onClick: () => openOverlay(this, 'load') },
      { id: 'settings', label: T('menu.settings'), onClick: () => openOverlay(this, 'settings') }
    ], D.textbox + 6);
    this.menu.get('auto').setActive(!!G.settings.auto);
    this.skip = false;
    const hp = G.layout.dialogue.potionHint;
    this.hint = this.add.text(hp[0], hp[1], T(isTouchDevice() ? 'hint.tap' : 'hint.click'),
      font(this.cfg.font.hint, { color: this.cfg.colors.menu, fontStyle: 'italic' })).setOrigin(1, 1).setDepth(D.textbox + 3).setVisible(false);

    // Tutorial highlight
    this.tutHi = this.add.graphics().setDepth(D.tutorial);
    this.tutHiTween = null;

    // Custom cursor (mouse only)
    this.cursorImg = this.add.image(0, 0, 'ui_cursor').setDepth(D.cursor).setVisible(false);
    const hs = L.cursorHotspot;
    this.cursorImg.setOrigin(hs[0] / this.cursorImg.width, hs[1] / this.cursorImg.height);
  }

  buildRecipe() {
    const L = this.L, c = this.cfg;
    const tt = rect(L.recipeTitle);
    this.add.text(tt.x + tt.w / 2, tt.y + tt.h / 2, this.potion.name,
      font(c.font.recipeTitle, { color: c.colors.recipeText, fontStyle: 'bold', align: 'center', wordWrap: { width: tt.w } })).setOrigin(0.5).setDepth(D.recipeText);
    this.recipeRows = [];
    const rr = L.recipeRows;
    if (this.isMix) {
      this.add.text(tt.x + tt.w / 2, rr.y + 10, T('potion.mixRecipe'),
        font(c.font.recipeFlavour + 4, { color: c.colors.recipeText, fontStyle: 'bold' })).setOrigin(0.5, 0).setDepth(D.recipeText);
      this.potion.mix.forEach((id, i) => {
        const x = tt.x + 80 + (i % 3) * 160, y = rr.y + 120 + Math.floor(i / 3) * 140;
        this.add.image(x, y, 'bottle_' + id).setDisplaySize(110, 110).setDepth(D.recipeText);
      });
    } else {
      // Element icons in a row, the ratio numbers below them (e.g. 2 : 3 : 2).
      const ratio = reduceRatio(this.potion.book);
      const els = c.elements.order.filter(e => ratio[e]);
      const R = L.recipeRatio;
      const n = els.length;
      const totalW = n * R.icon + (n - 1) * R.gap;
      const cx = rect(L.recipe).x + rect(L.recipe).w / 2;
      let x = cx - totalW / 2;
      els.forEach((e, i) => {
        const colX = x + R.icon / 2;
        const hi = this.add.rectangle(colX, R.y - 10, R.icon + 24, R.icon + R.numberGap + 70, color(c.colors.recipeHighlight), 0.75)
          .setOrigin(0.5, 0).setDepth(D.recipeHi).setAlpha(0);
        this.add.image(colX, R.y + R.icon / 2, 'element_' + e).setDisplaySize(R.icon, R.icon).setDepth(D.recipeText);
        this.add.text(colX, R.y + R.icon + R.numberGap, String(ratio[e]),
          font(c.font.recipeAmount, { color: c.colors.recipeText, fontStyle: 'bold' })).setOrigin(0.5, 0).setDepth(D.recipeText);
        if (i < n - 1) {
          this.add.text(x + R.icon + R.gap / 2, R.y + R.icon + R.numberGap, ':',
            font(c.font.recipeAmount, { color: c.colors.recipeText, fontStyle: 'bold' })).setOrigin(0.5, 0).setDepth(D.recipeText);
        }
        this.recipeRows.push({ e, hi });
        x += R.icon + R.gap;
      });
    }
    const fl = rect(L.recipeFlavour);
    this.add.text(fl.x + fl.w / 2, fl.y + fl.h / 2, this.potion.flavour || '',
      font(c.font.recipeFlavour, { color: c.colors.recipeText, fontStyle: 'italic', align: 'center', wordWrap: { width: fl.w } })).setOrigin(0.5).setDepth(D.recipeText);
  }

  /**
   * The cat's alternative recipe, shown in a speech bubble above him like the book shows its recipe:
   * element icons in a row with the ratio numbers below. Hidden until he gives his advice.
   * In P6 (cat absent) it shows as the Heroine's memory of it: same bubble, slightly faded.
   */
  buildCatBubble() {
    this.catBubble = null;
    if (this.isMix || !this.potion.cat) return;
    const B = this.L.catBubble, r = rect(B.rect), c = this.cfg;
    const box = this.add.container(r.x + r.w / 2, r.y + r.h).setDepth(D.cat + 1).setAlpha(0).setScale(0.6);
    // Container origin is the bottom-centre (tail end), so the pop-in grows out of the cat.
    // No cat on the table (P6): a bubble without the tail pointing at him (the Heroine's memory of his recipe).
    const noTail = !this.potion.catPresent;
    const bodyH = B.bodyH || 160;
    box.add(this.add.image(0, noTail ? -(r.h - bodyH) : 0, noTail ? 'ui_cat_bubble_memory' : 'ui_cat_bubble')
      .setOrigin(0.5, 1).setDisplaySize(r.w, noTail ? bodyH : r.h));
    const ratio = reduceRatio(this.potion.cat);
    const els = c.elements.order.filter(e => ratio[e]);
    const n = els.length;
    const totalW = n * B.icon + (n - 1) * B.gap;
    const top = -r.h + B.contentY;
    let x = -totalW / 2;
    els.forEach((e, i) => {
      const colX = x + B.icon / 2;
      box.add(this.add.image(colX, top + B.icon / 2, 'element_' + e).setDisplaySize(B.icon, B.icon));
      box.add(this.add.text(colX, top + B.icon + B.numberGap, String(ratio[e]),
        font(c.font.recipeAmount - 4, { color: c.colors.recipeText, fontStyle: 'bold' })).setOrigin(0.5, 0));
      if (i < n - 1) {
        box.add(this.add.text(x + B.icon + B.gap / 2, top + B.icon + B.numberGap, ':',
          font(c.font.recipeAmount - 4, { color: c.colors.recipeText, fontStyle: 'bold' })).setOrigin(0.5, 0));
      }
      x += B.icon + B.gap;
    });
    this.catBubble = box;
    this.catBubbleAlpha = this.potion.catPresent ? 1 : 0.8;
    this.catBubbleShown = false;
  }

  showCatBubble() {
    const b = this.catBubble;
    if (!b) return;
    this.tweens.killTweensOf(b);
    if (!this.catBubbleShown) {
      this.catBubbleShown = true;
      this.tweens.add({ targets: b, alpha: this.catBubbleAlpha, scale: 1, duration: 380, ease: 'Back.easeOut' });
    } else {
      // Already visible (the cat repeats his advice): a small bounce.
      b.setScale(1).setAlpha(this.catBubbleAlpha);
      this.tweens.add({ targets: b, scale: 1.08, duration: 140, yoyo: true, ease: 'Sine.easeOut' });
    }
  }

  // ---------------------------------------------------------------- inventory grid

  setTab(t) {
    if (t === 'crystals' && this.isMix) return;
    this.tab = t;
    this.clearSelection();
    this.refreshGrid();
  }

  gridList() {
    if (this.tab === 'potions') {
      const list = this.isMix ? this.potion.mix : this.bottles;
      return list.map(id => ({ type: 'bottle', id, key: 'bottle_' + id, usable: this.isMix && !this.added.includes(id) && !this.done, hidden: this.isMix && this.added.includes(id) }));
    }
    let list = this.unlocked.slice();
    if (this.filter) list = list.filter(c => c.elements[this.filter]);
    // Single-element first, then double, then triple; smaller amounts first; then data-file order.
    const order = (c) => this.unlocked.indexOf(c);
    const kinds = (c) => Object.keys(c.elements).length;
    const units = (c) => Object.values(c.elements).reduce((s, v) => s + v, 0);
    list.sort((a, b) => (kinds(a) - kinds(b)) || (units(a) - units(b)) || (order(a) - order(b)));
    return list.map(c => ({ type: 'crystal', id: c.id, key: 'crystal_' + c.id, crystal: c, usable: !this.done }));
  }

  refreshGrid() {
    this.gridItems.forEach(it => it.img.destroy());
    this.nudges.forEach(t => t.stop());
    this.nudges = [];
    this.gridItems = [];
    const gr = this.L.grid;
    const list = this.gridList();
    list.forEach((item, i) => {
      if (i >= this.cells.length || item.hidden) return;
      const cell = this.cells[i];
      const img = this.add.image(cell.cx, cell.cy, item.key).setDisplaySize(gr.item, gr.item).setDepth(D.item);
      if (!item.usable && item.type === 'bottle' && !this.isMix) img.setAlpha(0.9);
      img.setInteractive(); // hover info for every item; only usable ones can be picked up
      const entry = Object.assign({ img, cell, baseY: cell.cy }, item);
      img.on('pointerdown', (p) => { if (entry.usable) this.beginPress(entry, p); });
      img.on('pointerover', (p) => { if (!p.wasTouch && !this.held) this.showTip(entry, 'grid'); });
      img.on('pointerout', () => { if (!this.selected) this.hideTip(); });
      this.gridItems.push(entry);
    });
    this.tabCrystals.setSelected(this.tab === 'crystals');
    this.tabPotions.setSelected(this.tab === 'potions');
    const showSort = this.tab === 'crystals';
    this.sortBg.setVisible(showSort);
    this.sortIcons.forEach(s => { s.img.setVisible(showSort); s.ring.setVisible(showSort && this.filter === s.e); });
    this.refreshGuidance();
  }

  // ---------------------------------------------------------------- brewing logic

  /**
   * Does this crystal follow the book? (Guidance and resistance, GDD §3.6.)
   * Against the book if it contains an element the book recipe doesn't use,
   * or if adding it moves the mix further from the book ratio.
   */
  fits(crystal) {
    if (!crystal) return true;
    const book = this.potion.book || {};
    if (ELEMENTS.some(e => (crystal.elements[e] || 0) > 0 && !book[e])) return false;
    if (this.units() === 0) return true;
    const after = {};
    ELEMENTS.forEach(e => { after[e] = this.totals[e] + (crystal.elements[e] || 0); });
    return ratioDistance(after, book) <= ratioDistance(this.totals, book) + 1e-9;
  }

  addItem(entry) {
    if (this.done) return;
    if (entry.type === 'crystal') {
      ELEMENTS.forEach(e => { this.totals[e] += entry.crystal.elements[e] || 0; });
    }
    this.added.push(entry.id);
    this.lastAddTime = this.time.now;
    this.hideGlow();
    const fl = this.spawnFloat(entry);
    this.splash.explode(14, fl.x, fl.y);
    G.audio.sfx('splash');
    this.refreshAll();
    if (this.tutorialStep === 3 && this.onFirstAdd) { const cb = this.onFirstAdd; this.onFirstAdd = null; cb(); }
  }

  units() { return ELEMENTS.reduce((s, e) => s + this.totals[e], 0); }

  /** True if the cauldron has the recipe's ratio (amounts don't matter: 30 fire : 30 water = 1 : 1). */
  equals(recipe) {
    return sameRatio(this.totals, recipe);
  }

  brew() {
    if (this.done || this.added.length === 0 || this._leaving) return;
    let result = null;
    if (this.isMix) {
      const need = this.potion.mix;
      const ok = this.added.length === need.length && need.every(id => this.added.includes(id));
      result = ok ? 'mix' : null;
    } else if (this.equals(this.potion.book)) result = 'book';
    else if (this.equals(this.potion.cat)) result = 'cat';
    if (result) this.success(result); else this.fizzle();
  }

  success(result) {
    this.done = true;
    this.clearSelection();
    if (result !== 'mix') G.state.choices[this.potion.id] = result;
    // Drop any unfinished tutorial steps and pending lines; the success lines take over.
    if (this.tutorialStep > 0 && this.tutorialStep < 5) { this.tutorialStep = 5; G.state.flags.tutorialDone = true; }
    this.onFirstAdd = null;
    this.queue = [];
    if (this.lineTimer) { this.lineTimer.remove(); this.lineTimer = null; }
    this.lineActive = false;
    const cd = rect(this.L.cauldron);
    const cx = cd.x + cd.w / 2, cy = cd.y + 120;
    this.sparkles.explode(40, cx, cy);
    G.audio.sfx('success');
    this.brewBtn.setEnabled(false);
    this.emptyBtn.setEnabled(false);
    this.hideGlow();
    this.hideTip();
    this.clearTutorialHighlight();
    this.clearFloats(); // the ingredients melt into the finished potion
    if (this.isMix) {
      const lb = rect(this.L.loveBottle);
      const love = this.add.image(lb.x + lb.w / 2, lb.y + lb.h / 2 + 80, 'bottle_love').setDisplaySize(lb.w, lb.h).setDepth(D.love).setScale(0);
      const s = lb.w / love.width;
      this.tweens.add({ targets: love, scale: s, y: lb.y + lb.h / 2, duration: 700, ease: 'Back.easeOut' });
      this.time.delayedCall(500, () => this.sparkles.explode(50, lb.x + lb.w / 2, lb.y + lb.h / 2));
    } else {
      const bottle = this.add.image(cx, cy, 'bottle_' + this.potion.id).setDepth(D.love).setScale(0);
      const t = rect(this.L.tabs[1]);
      this.tweens.chain({
        targets: bottle,
        tweens: [
          { scale: 1.6, y: cy - 60, duration: 500, ease: 'Back.easeOut' },
          { scale: 1.6, duration: 600 },
          { x: t.x + t.w / 2, y: t.y + t.h / 2, scale: 0.4, alpha: 0.2, duration: 600, ease: 'Sine.easeIn',
            onComplete: () => { bottle.destroy(); this.bottles.push(this.potion.id); this.refreshGrid(); } }
        ]
      });
    }
    this.refreshAll();
    this.playEvent('success');
    this.nextBtn.setEnabled(true);
    this.attractNext();
  }

  /**
   * Makes the Next arrow hard to miss: it swings back and forth around its centre, like the cat head icon
   * on the dialogue screen, with a pulsing glow behind it (size unchanged).
   */
  attractNext() {
    const b = this.nextBtn, c = b.container;
    this.nextGlow.setAlpha(0.25);
    this.tweens.add({ targets: this.nextGlow, alpha: 0.95, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Re-centre the button so it rotates around its middle, not its top-left corner.
    if (!b.centred) {
      c.list.forEach(o => { o.x -= b.w / 2; o.y -= b.h / 2; });
      c.x += b.w / 2; c.y += b.h / 2;
      b.centred = true;
    }
    c.setAngle(-10);
    this.tweens.add({ targets: c, angle: 10, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  fizzle() {
    const cd = rect(this.L.cauldron);
    this.smoke.explode(16, cd.x + cd.w / 2, cd.y + 120);
    G.audio.sfx('fizzle');
    this.playEvent('fizzle');
    this.input.enabled = false;
    this.time.delayedCall(700, () => { this.input.enabled = true; this.emptyCauldron(true); });
  }

  emptyCauldron(force) {
    if (this.done) return;
    this.clearFloats();
    this.totals = { fire: 0, water: 0, earth: 0, air: 0 };
    this.added = [];
    this.clearSelection();
    this.refreshAll();
  }

  next() {
    if (!this.done) return;
    Flow.next(this);
  }

  refreshAll() {
    this.refreshCounter();
    this.refreshLiquid();
    this.refreshGrid();
    this.refreshButtons();
  }

  /** Brew and Empty work whenever something is in the cauldron (dialogue doesn't block them). */
  refreshButtons() {
    const ok = !this.done && this.added.length > 0;
    this.brewBtn.setEnabled(ok);
    this.emptyBtn.setEnabled(ok);
  }

  refreshCounter() {
    this.counter.removeAll(true);
    const cr = rect(this.L.counter);
    if (this.isMix) {
      // Final potion: a row of the bottles in the cauldron.
      const ids = this.added;
      if (!ids.length) return;
      const slot = 66, total = ids.length * slot;
      let x = cr.x + (cr.w - total) / 2;
      ids.forEach(id => { this.counter.add(this.add.image(x + 33, cr.y + cr.h / 2, 'bottle_' + id).setDisplaySize(56, 56)); x += slot; });
      return;
    }
    // Current ratio of the mix, in the same format as the recipe and the cat's bubble (e.g. 2 : 1 : 3).
    if (this.units() === 0) return;
    const ratio = reduceRatio(this.totals);
    const els = this.cfg.elements.order.filter(e => ratio[e]);
    const icon = this.L.counterIcon, gap = 40;
    const totalW = els.length * icon + (els.length - 1) * gap;
    let x = cr.x + (cr.w - totalW) / 2;
    const style = font(this.cfg.font.counter, { color: '#ffffff', fontStyle: 'bold', stroke: '#2b1d3a', strokeThickness: 6 });
    // Under each ratio number: the actual amount of that element in the cauldron, smaller.
    const amountStyle = font(this.cfg.font.counterAmount || 22, { color: '#ffe9a8', fontStyle: 'bold', stroke: '#2b1d3a', strokeThickness: 5 });
    els.forEach((e, i) => {
      const colX = x + icon / 2;
      this.counter.add(this.add.image(colX, cr.y + icon / 2, 'element_' + e).setDisplaySize(icon, icon));
      const num = this.add.text(colX, cr.y + icon + 2, String(ratio[e]), style).setOrigin(0.5, 0);
      this.counter.add(num);
      this.counter.add(this.add.text(colX, num.y + num.height - 2, String(this.totals[e]), amountStyle).setOrigin(0.5, 0));
      if (i < els.length - 1) this.counter.add(this.add.text(x + icon + gap / 2, cr.y + icon + 2, ':', style).setOrigin(0.5, 0));
      x += icon + gap;
    });
  }

  // ---------------------------------------------------------------- floating ingredients

  /** An added crystal or bottle floats on the liquid. Clicking it takes it back out. */
  spawnFloat(entry) {
    const S = this.L.floatSlots;
    const slots = [];
    S.rows.forEach((row, ri) => row.forEach(dx => slots.push({ dx, dy: S.rowY[ri] })));
    const i = this.floating.length;
    const s = slots[i % slots.length];
    const jitter = i >= slots.length ? Phaser.Math.Between(-14, 14) : 0;
    const x = S.center[0] + s.dx + jitter, y = S.center[1] + s.dy + (jitter ? Phaser.Math.Between(-6, 6) : 0);
    const img = this.add.image(x, y - 70, entry.key).setDisplaySize(S.size, S.size).setDepth(D.floating + i * 0.001).setInteractive();
    const f = { id: entry.id, type: entry.type, crystal: entry.crystal, key: entry.key, img, x, y };
    this.tweens.add({
      targets: img, y, duration: 320, ease: 'Bounce.easeOut',
      onComplete: () => {
        if (!img.active) return;
        this.tweens.add({ targets: img, y: y - 5, angle: { from: -5, to: 5 }, duration: Phaser.Math.Between(900, 1300), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });
    img.on('pointerover', (p) => { if (!p.wasTouch && !this.held) this.showTip(f, 'float'); });
    img.on('pointerout', () => this.hideTip());
    img.on('pointerdown', () => {
      if (this.done || this.held || this.selected || this._leaving) return;
      this.removeFloat(f);
    });
    this.floating.push(f);
    return f;
  }

  /** Takes one floating ingredient out of the cauldron and puts it back on the shelf. */
  removeFloat(f) {
    const idx = this.floating.indexOf(f);
    if (idx < 0) return;
    this.floating.splice(idx, 1);
    const ai = this.added.lastIndexOf(f.id);
    if (ai >= 0) this.added.splice(ai, 1);
    if (f.type === 'crystal') ELEMENTS.forEach(e => { this.totals[e] -= f.crystal.elements[e] || 0; });
    this.hideTip();
    this.tweens.killTweensOf(f.img);
    f.img.disableInteractive();
    const cell = this.gridItems.find(it => it.id === f.id);
    const pn = rect(this.L.panel);
    const tx = cell ? cell.cell.cx : pn.x + pn.w / 2, ty = cell ? cell.cell.cy : pn.y + pn.h / 2;
    this.tweens.add({ targets: f.img, x: tx, y: ty, angle: 0, scale: f.img.scale * 0.6, alpha: 0.3, duration: 320, ease: 'Sine.easeIn', onComplete: () => f.img.destroy() });
    G.audio.sfx('pickup');
    this.lastAddTime = this.time.now;
    this.refreshAll();
  }

  /** All floating ingredients sink (Empty, fizzle, success). */
  clearFloats() {
    (this.floating || []).forEach(f => {
      this.tweens.killTweensOf(f.img);
      f.img.disableInteractive();
      this.tweens.add({ targets: f.img, y: f.img.y + 30, alpha: 0, scale: f.img.scale * 0.7, duration: 350, onComplete: () => f.img.destroy() });
    });
    this.floating = [];
    this.hideTip();
  }

  // ---------------------------------------------------------------- hover info

  /** Name and composition of a crystal (element amounts) or a potion bottle (its ratio). */
  showTip(item, where) {
    this.hideTip();
    const c = this.cfg;
    const box = this.add.container(0, 0).setDepth(D.tip);
    const isBottle = item.type === 'bottle';
    let name, parts, sep = '';
    if (isBottle) {
      const p = potionById(item.id);
      name = p ? p.name : item.id;
      const recipe = p && (p[G.state.choices[item.id]] || p.book);
      const ratio = recipe ? reduceRatio(recipe) : {};
      parts = c.elements.order.filter(e => ratio[e]).map(e => ({ e, v: ratio[e] }));
      sep = ':';
    } else {
      const cr = item.crystal || crystalById(item.id);
      name = cr ? cr.name : item.id;
      parts = c.elements.order.filter(e => cr && cr.elements[e]).map(e => ({ e, v: cr.elements[e] }));
    }
    const pad = 16, icon = 36;
    const title = this.add.text(pad, pad, name, font(26, { color: '#ffffff', fontStyle: 'bold' }));
    box.add(title);
    let x = pad;
    const rowY = pad + title.height + 10;
    parts.forEach((pt, i) => {
      box.add(this.add.image(x + icon / 2, rowY + icon / 2, 'element_' + pt.e).setDisplaySize(icon, icon));
      const t = this.add.text(x + icon + 6, rowY + icon / 2, String(pt.v), font(26, { color: '#ffe27a', fontStyle: 'bold' })).setOrigin(0, 0.5);
      box.add(t);
      x += icon + 6 + t.width + 12;
      if (sep && i < parts.length - 1) {
        const s = this.add.text(x - 4, rowY + icon / 2, sep, font(26, { color: '#ffe27a', fontStyle: 'bold' })).setOrigin(0.5);
        box.add(s);
        x += 14;
      }
    });
    const w = Math.max(title.width + pad * 2, x - 12 + pad), h = rowY + icon + pad;
    const bg = this.add.graphics();
    bg.fillStyle(0x2b1d3a, 0.92).fillRoundedRect(0, 0, w, h, 12);
    bg.lineStyle(3, 0xcbb9df, 1).strokeRoundedRect(0, 0, w, h, 12);
    box.addAt(bg, 0);
    if (where === 'grid') {
      box.setPosition(item.cell.x - w - 12, Phaser.Math.Clamp(item.cell.cy - h / 2, 10, 1080 - h - 10));
    } else {
      box.setPosition(Phaser.Math.Clamp(item.img.x - w / 2, 10, 1920 - w - 10), item.img.y - item.img.displayHeight / 2 - h - 10);
    }
    this.tip = box;
  }

  hideTip() {
    if (this.tip) { this.tip.destroy(); this.tip = null; }
  }

  refreshLiquid() {
    const n = this.isMix ? this.added.length : this.units();
    if (n === 0) {
      this.liquid.clearTint().setAlpha(0.35);
      this.bubbles.stop();
      return;
    }
    let tint;
    if (this.isMix) {
      tint = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(0xe05a8a), 6, n);
      tint = Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b);
    } else {
      tint = this.pleasantTint();
    }
    this.liquid.setTint(tint).setAlpha(1);
    if (this.bubbles.setParticleTint) this.bubbles.setParticleTint(tint); else this.bubbles.particleTint = tint;
    if (!this.bubbles.emitting) this.bubbles.start();
  }

  /**
   * A bright, clear liquid colour for any mix (book or cat). Averaging RGB turns yellow + purple
   * into grey mud, so instead the element hues are blended on the colour wheel (weighted by amount)
   * and saturation/brightness are kept high. If the hues cancel out, the strongest element's hue wins.
   */
  pleasantTint() {
    const C = Phaser.Display.Color;
    let x = 0, y = 0, total = 0, best = null, bestAmt = 0;
    ELEMENTS.forEach(e => {
      const amt = this.totals[e];
      if (!amt) return;
      const c = C.HexStringToColor(this.cfg.elements.colors[e]);
      const hsv = C.RGBToHSV(c.red, c.green, c.blue);
      x += Math.cos(hsv.h * Math.PI * 2) * amt;
      y += Math.sin(hsv.h * Math.PI * 2) * amt;
      total += amt;
      if (amt > bestAmt) { bestAmt = amt; best = hsv.h; }
    });
    let h = Math.atan2(y, x) / (Math.PI * 2);
    if (h < 0) h += 1;
    if (Math.hypot(x, y) < total * 0.2) h = best; // opposite hues cancel out: use the strongest element
    const rgb = C.HSVToRGB(h, 0.55, 0.95);
    return C.GetColor(rgb.r, rgb.g, rgb.b);
  }

  // ---------------------------------------------------------------- guidance and resistance

  refreshGuidance() {
    this.outlines.clear();
    this.nudges.forEach(t => t.stop());
    this.nudges = [];
    this.gridItems.forEach(it => { it.img.y = it.baseY; });
    if (this.done || this.isMix) {
      this.recipeRows.forEach(r => { this.tweens.killTweensOf(r.hi); r.hi.setAlpha(0); });
      return;
    }
    // Selected item outline
    if (this.selected) {
      const s = this.gridItems.find(it => it.id === this.selected.id);
      if (s) {
        const gr = this.L.grid;
        this.outlines.lineStyle(6, 0xc0396b, 1).strokeRoundedRect(s.cell.x - 3, s.cell.y - 3, gr.cell + 6, gr.cell + 6, 12);
      }
    }
    if (this.level >= 2) {
      // Recipe elements whose share in the mix is still too small glow
      const book = this.potion.book;
      const sumT = this.units(), sumB = ELEMENTS.reduce((s, e) => s + (book[e] || 0), 0);
      const matched = this.equals(book);
      this.recipeRows.forEach(r => {
        const need = !matched && (sumT === 0 || this.totals[r.e] / sumT < book[r.e] / sumB - 1e-9);
        if (need && !r.pulsing) {
          r.pulsing = this.tweens.add({ targets: r.hi, alpha: { from: 0.15, to: this.level >= 3 ? 0.9 : 0.6 }, duration: this.level >= 3 ? 450 : 800, yoyo: true, repeat: -1 });
        } else if (!need && r.pulsing) {
          r.pulsing.stop(); r.pulsing = null; r.hi.setAlpha(0);
        }
      });
      // Fitting crystals get an outline (level 2) and a nudge (level 3)
      if (this.tab === 'crystals') {
        const gr = this.L.grid;
        this.outlines.lineStyle(4, color(this.cfg.colors.outline), 1);
        this.gridItems.forEach(it => {
          if (it.type !== 'crystal' || matched || !this.fits(it.crystal)) return;
          this.outlines.strokeRoundedRect(it.cell.x + 2, it.cell.y + 2, gr.cell - 4, gr.cell - 4, 10);
          if (this.level >= 3) {
            this.nudges.push(this.tweens.add({ targets: it.img, y: it.baseY - 8, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 300 }));
          }
        });
      }
    }
    if (this.level >= 3 && !this.glowOn) this.showGlow(true);
  }


  showGlow(strong) {
    if (this.glowOn) return;
    this.glowOn = true;
    this.glowTween = this.tweens.add({ targets: this.recipeGlow, alpha: { from: 0.15, to: 0.95 }, duration: strong ? 450 : 900, yoyo: true, repeat: -1 });
  }

  hideGlow() {
    if (this.level >= 3 && !this.done) return; // level 3 glow stays on
    if (this.glowTween) { this.glowTween.stop(); this.glowTween = null; }
    this.glowOn = false;
    this.recipeGlow.setAlpha(0);
  }

  heavyLerp(entry) {
    if (entry.type !== 'crystal' || this.level < 2 || this.fits(entry.crystal)) return 1;
    return this.cfg.resist.heavyLerp[String(this.level)] || 1;
  }

  // ---------------------------------------------------------------- input

  pointerPos(p) {
    return { x: p.x + this.drift.x, y: p.y + this.drift.y };
  }

  onPointerMove(p) {
    const mouse = !p.wasTouch;
    if (mouse !== this.mouseMode) {
      this.mouseMode = mouse;
      this.setCustomCursor(mouse);
    }
  }

  setCustomCursor(on) {
    this.cursorImg.setVisible(on);
    this.input.manager.canvas.style.cursor = on ? 'none' : '';
  }

  beginPress(entry, p) {
    if (this.done || this.held || this._leaving) return;
    if (this.selected && this.selected.id === entry.id) { this.clearSelection(); return; }
    this.hideTip();
    const img = this.add.image(entry.img.x, entry.img.y, entry.key).setDisplaySize(this.L.grid.item, this.L.grid.item).setDepth(D.held);
    entry.img.setAlpha(0.35);
    const lerp = this.heavyLerp(entry);
    this.held = { entry, img, lerp, start: this.time.now, sx: p.x, sy: p.y, moved: 0, slipTimer: null };
    G.audio.sfx('pickup');

    const offRecipe = entry.type === 'crystal' && this.level >= 2 && !this.fits(entry.crystal);
    if (offRecipe && !G.state.flags.commentHeavy) {
      G.state.flags.commentHeavy = true;
      this.playEvent('resist_heavy');
    }
    if (offRecipe && this.level >= 3) {
      const r = this.cfg.resist;
      if (this.lastSlipped !== entry.id && Math.random() < r.slipChance) {
        const delay = Phaser.Math.FloatBetween(r.slipDelayMin, r.slipDelayMax) * 1000;
        this.held.slipTimer = this.time.delayedCall(delay, () => this.slip());
      } else if (this.lastSlipped === entry.id) {
        this.lastSlipped = null;
      }
    }
  }

  slip() {
    const h = this.held;
    if (!h) return;
    // A slip only counts once the crystal has actually left its cell.
    if (h.moved < this.cfg.potion.tapMaxMove) {
      h.slipTimer = this.time.delayedCall(150, () => this.slip());
      return;
    }
    this.held = null;
    this.lastSlipped = h.entry.id;
    G.audio.sfx('slip');
    this.flyBack(h);
    if (!G.state.flags.commentSlip) {
      G.state.flags.commentSlip = true;
      this.playEvent('resist_slip');
    }
  }

  flyBack(h) {
    this.tweens.add({ targets: h.img, x: h.entry.cell.cx, y: h.entry.cell.cy, duration: 260, ease: 'Sine.easeOut',
      onComplete: () => { h.img.destroy(); h.entry.img.setAlpha(1); } });
  }

  onPointerDown(p, over) {
    if (this._leaving) return;
    if (!this.done && this.selected && !this.held) {
      const pos = this.pointerPos(p);
      if (Phaser.Geom.Rectangle.Contains(this.dropZone, pos.x, pos.y)) {
        const entry = this.selected;
        this.clearSelection();
        this.tapPlace(entry);
        return;
      }
      if (!over.length) { this.clearSelection(); return; }
    }
    // A click or tap on any free spot (not a crystal, button or tab) continues the dialogue.
    if (!over.length) this.advanceLine(true);
  }

  tapPlace(entry) {
    // Tap-to-place gets the same slip rule as dragging at level 3.
    const off = entry.type === 'crystal' && this.level >= 3 && !this.fits(entry.crystal);
    if (off && this.lastSlipped !== entry.id && Math.random() < this.cfg.resist.slipChance) {
      this.lastSlipped = entry.id;
      G.audio.sfx('slip');
      const img = this.add.image(this.dropZone.centerX, this.dropZone.centerY, entry.key).setDisplaySize(this.L.grid.item, this.L.grid.item).setDepth(D.held);
      this.flyBack({ entry, img });
      if (!G.state.flags.commentSlip) { G.state.flags.commentSlip = true; this.playEvent('resist_slip'); }
      return;
    }
    if (this.lastSlipped === entry.id) this.lastSlipped = null;
    this.addItem(entry);
  }

  onPointerUp(p) {
    const h = this.held;
    if (!h) return;
    this.held = null;
    if (h.slipTimer) h.slipTimer.remove();
    const quick = h.moved < this.cfg.potion.tapMaxMove && (this.time.now - h.start) < this.cfg.potion.tapMaxTime * 1000;
    if (quick) {
      // Tap: select the item, then tap the cauldron.
      h.img.destroy();
      h.entry.img.setAlpha(1);
      this.selected = h.entry;
      this.refreshGuidance();
      this.showTip(h.entry, 'grid'); // on touch screens this is how the player sees the composition
      return;
    }
    const pos = this.pointerPos(p);
    if (Phaser.Geom.Rectangle.Contains(this.dropZone, pos.x, pos.y) || Phaser.Geom.Rectangle.Contains(this.dropZone, h.img.x, h.img.y)) {
      h.img.destroy();
      h.entry.img.setAlpha(1);
      this.addItem(h.entry);
    } else {
      this.flyBack(h);
    }
  }

  clearSelection() {
    if (!this.selected) return;
    this.selected = null;
    this.hideTip();
    this.refreshGuidance();
  }

  update(time, delta) {
    const p = this.input.activePointer;
    const k = delta / 16.667;
    const r = this.cfg.resist;
    // Cursor drift (PC, level 3, while dragging an off-recipe crystal)
    const h = this.held;
    const drifting = h && this.mouseMode && this.level >= 3 && h.entry.type === 'crystal' && !this.fits(h.entry.crystal);
    if (drifting) {
      const target = this.nearestFittingCell();
      if (target) {
        const dx = target.cx - (p.x + this.drift.x), dy = target.cy - (p.y + this.drift.y);
        const len = Math.hypot(dx, dy) || 1;
        this.drift.x += dx / len * r.driftSpeed * k;
        this.drift.y += dy / len * r.driftSpeed * k;
        const dl = Math.hypot(this.drift.x, this.drift.y);
        if (dl > r.driftMax) { this.drift.x *= r.driftMax / dl; this.drift.y *= r.driftMax / dl; }
      }
    } else if (this.drift.x || this.drift.y) {
      const f = Math.pow(0.85, k);
      this.drift.x *= f; this.drift.y *= f;
      if (Math.abs(this.drift.x) < 0.3 && Math.abs(this.drift.y) < 0.3) { this.drift.x = 0; this.drift.y = 0; }
    }
    const pos = this.pointerPos(p);
    if (this.mouseMode) {
      this.cursorImg.setPosition(pos.x, pos.y);
      if (!this.scene.isPaused()) this.input.manager.canvas.style.cursor = 'none';
    }
    // Held item follows the (drifted) pointer, slowly if heavy
    if (h) {
      h.moved = Math.max(h.moved, Math.hypot(p.x - h.sx, p.y - h.sy));
      const f = 1 - Math.pow(1 - h.lerp, k);
      h.img.x += (pos.x - h.img.x) * f;
      h.img.y += (pos.y - h.img.y) * f;
    }
    // Level 1+ idle glow and hint
    if (this.level >= 1 && !this.done && !this.glowOn && (this.tutorialStep === 0 || this.tutorialStep >= 5)) {
      // Idle time counts only after the opening lines; use the scene clock (same clock as lastAddTime).
      if (this.startedAt !== undefined && this.time.now - Math.max(this.lastAddTime, this.startedAt) > this.cfg.guidance.glowDelay * 1000) {
        this.showGlow(false);
        if (!this.hintPlayed) { this.hintPlayed = true; this.playEvent('hint'); }
      }
    }
  }

  nearestFittingCell() {
    let best = null, bd = Infinity;
    const p = this.input.activePointer;
    this.gridItems.forEach(it => {
      if (it.type !== 'crystal' || !this.fits(it.crystal)) return;
      const d = Math.hypot(it.cell.cx - p.x, it.cell.cy - p.y);
      if (d < bd) { bd = d; best = it.cell; }
    });
    return best;
  }

  onCatClick() {
    if (this.lineActive) { this.advanceLine(true); return; }
    if (this.done || !this.potion.catPresent || this.queue.length) return;
    G.audio.sfx('meow');
    this.playEvent('advice');
  }

  // ---------------------------------------------------------------- lines from the script

  /** Queues the lines of a script event. cb runs after they have all been shown. */
  playEvent(name, cb) {
    const ev = this.section.events[name];
    if (ev && ev.rows.length) {
      let rows = ev.rows.filter(r => (r.kind === 'line' || (r.kind === 'cmd' && r.name === 'sfx')) && condOk(r.cond, G.state.choices));
      if (ev.random) {
        const lines = rows.filter(r => r.kind === 'line');
        rows = lines.length ? [lines[Math.floor(Math.random() * lines.length)]] : [];
      }
      rows.forEach(r => this.queue.push({ row: r, ev: name }));
      if (name === 'advice') {
        const lines = rows.filter(r => r.kind === 'line');
        if (lines.length) this.adviceRow = lines[lines.length - 1];
      }
    }
    // The cat's recipe bubble appears with his advice (or right away if the advice has no lines).
    if (name === 'advice' && !this.queue.some(q => q.ev === 'advice')) this.showCatBubble();
    if (cb) this.queue.push({ cb });
    if (!this.lineActive) this.nextLine();
  }

  nextLine() {
    if (this.lineTimer) { this.lineTimer.remove(); this.lineTimer = null; }
    this.stopIdle();
    while (this.queue.length) {
      const item = this.queue.shift();
      if (item.cb) { item.cb(); continue; }
      const r = item.row;
      if (r.kind === 'cmd') { G.audio.sfx(r.args[0]); continue; }
      let name = null;
      if (r.speaker) {
        name = charName(r.speaker);
      }
      if (!item.repeat) G.session.log.push({ name, text: r.text });
      this.portrait.show(!!r.speaker); // narration: no portrait
      if (r.speaker === 'heroine') this.portrait.setExpr(r.expr);
      if (r.speaker === 'jaros' && this.cat) {
        // The cat on the table: "jaros angry: ..." → cat_table_angry (if it exists).
        const key = r.expr && this.textures.exists('cat_table_' + r.expr) ? 'cat_table_' + r.expr : 'cat_table';
        if (this.cat.texture.key !== key) { const w = this.cat.displayWidth, h = this.cat.displayHeight; this.cat.setTexture(key).setDisplaySize(w, h); }
      }
      this.lineActive = true;
      this.refreshButtons();
      if (item.ev === 'advice' && !item.repeat) this.showCatBubble();
      this.currentEv = item.ev;
      this.textbox.show(name, r.text, { instant: this.skip || !!item.repeat, onDone: () => this.lineDone() });
      this.startIdle();
      return;
    }
    // No more lines: the last one stays until a new line replaces it or the player leaves.
    // The cat's recipe stays visible in his bubble.
    // After the Heroine reacts to the game pushing back (heavy or slipping crystal),
    // the textbox goes back to the advice line (shown again like a normal line, then cleared on tap).
    if (this.adviceRow && !this.done && (this.currentEv === 'resist_heavy' || this.currentEv === 'resist_slip')) { this.showAdvice(); return; }
    // No more lines: the textbox empties after the last line is tapped, like on the dialogue screen.
    this.lineActive = false;
    this.textbox.setMore(false);
    this.textbox.clear();
    this.currentEv = null;
    this.refreshButtons();
    if (this.skip) this.toggleSkip(); // nothing left to skip
  }

  /** Shows the advice line again: instantly, not added to the Log again, and cleared on the next tap. */
  showAdvice() {
    this.queue.push({ row: this.adviceRow, ev: 'advice', repeat: true });
    this.nextLine();
  }

  /** A line is fully shown: wait for a click/tap, or continue by itself in Auto mode (same as the dialogue screen). */
  lineDone() {
    // Bouncing arrow only when another line is still waiting (on the last line there's nothing more to click for).
    this.textbox.setMore(!this.skip && this.queue.length > 0);
    if (this.skip && !this.lineTimer) {
      this.lineTimer = this.time.delayedCall(80, () => { this.lineTimer = null; this.nextLine(); });
    } else if (G.settings.auto && !this.lineTimer) {
      this.lineTimer = this.time.delayedCall(autoDelayMs(this.textbox.full.length), () => { this.lineTimer = null; this.nextLine(); });
    }
  }

  /** Click / tap / Space / Enter: finish the typing line, or show the next one. */
  advanceLine(byPlayer) {
    if (!this.lineActive || this._leaving) return false;
    if (byPlayer && this.skip) this.toggleSkip();
    if (this.textbox.typing) { this.textbox.finish(); return true; }
    if (byPlayer) G.session.advances++;
    this.nextLine();
    return true;
  }

  onTextboxClick() {
    this.advanceLine(true);
  }

  toggleAuto() {
    G.settings.auto = !G.settings.auto;
    SaveSystem.saveSettings();
    this.menu.get('auto').setActive(G.settings.auto);
    if (G.settings.auto && this.lineActive && !this.textbox.typing) this.lineDone();
    if (!G.settings.auto && this.lineTimer) { this.lineTimer.remove(); this.lineTimer = null; }
  }

  toggleSkip() {
    this.skip = !this.skip;
    this.menu.get('skip').setActive(this.skip);
    if (this.skip && this.lineActive) {
      if (this.textbox.typing) this.textbox.finish();
      else this.lineDone();
    }
  }

  startIdle() {
    this.stopIdle();
    if (G.session.advances >= this.cfg.hints.idleAdvanceMaxShows) return;
    // "Click to continue" only makes sense if another line is waiting.
    if (!this.queue.some(item => item.row && item.row.kind === 'line')) return;
    this.idleTimer = this.time.delayedCall(this.cfg.hints.idleAdvance * 1000, () => {
      if (!this.lineActive) return;
      this.hint.setVisible(true).setAlpha(1);
      this.hintTween = this.tweens.add({ targets: this.hint, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    });
  }

  stopIdle() {
    if (this.idleTimer) { this.idleTimer.remove(); this.idleTimer = null; }
    if (this.hintTween) { this.hintTween.stop(); this.hintTween = null; }
    if (this.hint) this.hint.setVisible(false);
  }

  /** Save position: a potion always restarts from its beginning when loaded. */
  saveData() {
    return { kind: 'potion', sectionId: this.section.id, row: null, endingId: null, text: this.potion.name };
  }

  // ---------------------------------------------------------------- start and tutorial

  startSequence() {
    this.startedAt = this.time.now;
    if (this.potion.tutorial && !G.state.flags.tutorialDone) {
      this.tutorialStep = 1;
      this.playEvent('start', () => this.tutorial(1));
    } else {
      this.playEvent('start', () => this.playEvent('advice'));
    }
  }

  tutorial(step) {
    this.tutorialStep = step;
    const L = this.L;
    switch (step) {
      case 1:
        this.tutorialHighlight([L.recipe]);
        this.playEvent('tutorial_recipe', () => this.tutorial(2));
        break;
      case 2:
        this.tutorialHighlight([L.counter, L.panel]);
        this.playEvent('tutorial_elements', () => this.tutorial(3));
        break;
      case 3:
        this.tutorialHighlight([L.panel]);
        if (this.added.length) { this.playEvent('tutorial_drag', () => this.tutorial(4)); break; }
        this.onFirstAdd = () => this.tutorial(4);
        this.playEvent('tutorial_drag');
        break;
      case 4:
        this.tutorialHighlight([L.brew]);
        this.playEvent('tutorial_brew', () => this.tutorial(5));
        break;
      case 5:
        this.clearTutorialHighlight();
        G.state.flags.tutorialDone = true;
        this.lastAddTime = this.time.now;
        this.playEvent('advice');
        break;
    }
  }

  tutorialHighlight(rects) {
    this.clearTutorialHighlight();
    if (this.done) return;
    this.tutHi.lineStyle(8, 0xc0396b, 1);
    rects.forEach(a => { const r = rect(a); this.tutHi.strokeRoundedRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 18); });
    this.tutHiTween = this.tweens.add({ targets: this.tutHi, alpha: { from: 1, to: 0.25 }, duration: 600, yoyo: true, repeat: -1 });
  }

  clearTutorialHighlight() {
    if (this.tutHiTween) { this.tutHiTween.stop(); this.tutHiTween = null; }
    this.tutHi.clear().setAlpha(1);
  }

  // ---------------------------------------------------------------- misc

  debugFill(which) {
    if (this.done) return;
    this.emptyCauldron(true);
    if (this.isMix) {
      this.added = this.potion.mix.slice();
    } else {
      const rec = this.potion[which] || {};
      ELEMENTS.forEach(e => { this.totals[e] = (rec[e] || 0) * 10; });
      this.added = ['debug'];
    }
    this.refreshAll();
  }

  cleanup() {
    this.input.manager.canvas.style.cursor = '';
    this.bubbles.stop();
  }
}
