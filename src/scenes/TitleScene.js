import { G, T, rect } from '../core.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Flow } from '../systems/StoryRunner.js';
import { openOverlay } from './OverlayScene.js';
import { setupDebug } from '../systems/Debug.js';

// Title screen (artist's mockup): background, logo image, a light panel, and buttons that are
// transparent PNG images of their words: START, CONTINUE (only with a save), LOAD, CREDITS.
export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this._leaving = false;
    this.input.enabled = true;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const L = G.layout.title;
    this.add.image(0, 0, 'bg_title').setOrigin(0, 0).setDisplaySize(1920, 1080);
    const lg = rect(L.logo);
    this.add.image(lg.x, lg.y, 'ui_logo').setOrigin(0, 0).setDisplaySize(lg.w, lg.h);

    const latest = SaveSystem.latest();
    const items = [
      { key: 'ui_title_start', fn: () => this.start() },
      latest ? { key: 'ui_title_continue', fn: () => Flow.load(this, SaveSystem.latest()) } : null,
      { key: 'ui_title_load', fn: () => openOverlay(this, 'load') },
      { key: 'ui_title_credits', fn: () => openOverlay(this, 'credits') }
    ].filter(Boolean);

    // The panel fits the number of buttons (shorter when Continue is hidden).
    const P = rect(L.menuPanel), B = L.menuButtons;
    const panelH = Math.min(P.h, B.padding * 2 + (items.length - 1) * B.step + B.h);
    this.add.image(P.x, P.y, 'ui_menu_panel').setOrigin(0, 0).setDisplaySize(P.w, panelH);
    items.forEach((it, i) => this.imageButton(it.key, B.x + B.w / 2, B.y + i * B.step + B.h / 2, B.w, B.h, it.fn));

    G.audio.music('shop');
    setupDebug(this);
  }

  /** A button that is just an image of its word. Hover: the word turns pink (config colors.titleMenuHover) and grows a little (mouse only). */
  imageButton(key, cx, cy, w, h, onClick) {
    const img = this.add.image(cx, cy, key).setDisplaySize(w, h);
    const base = img.scale;
    const hover = Phaser.Display.Color.HexStringToColor(G.config.colors.titleMenuHover || '#b0558a').color;
    // Click area = the whole image (it's transparent around the word, which is fine to click).
    img.setInteractive({ useHandCursor: true });
    img.on('pointerover', (p) => { if (!p.wasTouch) { img.setTintFill(hover); this.tweens.add({ targets: img, scale: base * 1.06, duration: 120 }); } });
    img.on('pointerout', () => { img.clearTint(); this.tweens.add({ targets: img, scale: base, duration: 120 }); });
    img.on('pointerup', () => { if (G.audio) G.audio.sfx('click'); onClick(); });
    return img;
  }

  start() {
    // Starting over replaces the autosave; numbered save slots are kept.
    if (SaveSystem.readAuto()) {
      openOverlay(this, 'confirm', { message: T('confirm.newGame'), onYes: () => Flow.newGame(this) });
    } else {
      Flow.newGame(this);
    }
  }
}
