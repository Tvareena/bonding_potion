import { G, T, font, rect } from '../core.js';
import { Button } from '../ui/Button.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Flow } from '../systems/StoryRunner.js';
import { openOverlay } from './OverlayScene.js';
import { setupDebug } from '../systems/Debug.js';

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

    const save = SaveSystem.loadAuto();
    const items = [
      { label: T('title.start'), fn: () => this.start(save) },
      save ? { label: T('title.continue'), fn: () => Flow.resume(this, save) } : null,
      { label: T('title.settings'), fn: () => openOverlay(this, 'settings') }
    ].filter(Boolean);
    items.forEach((it, i) => {
      const r = rect(L.buttons[i]);
      new Button(this, 'ui_button_large', r.x, r.y, r.w, r.h, it.label, it.fn);
    });

    const seen = SaveSystem.seenEndings().length;
    if (seen > 0) {
      this.add.text(L.endingsSeen[0], L.endingsSeen[1], T('title.endingsSeen', { n: seen }),
        font(28, { color: G.config.colors.menu, fontStyle: 'bold' })).setOrigin(0.5);
    }

    G.audio.music('shop');
    setupDebug(this);
  }

  start(save) {
    if (save) {
      openOverlay(this, 'confirm', { message: T('confirm.newGame'), onYes: () => Flow.newGame(this) });
    } else {
      Flow.newGame(this);
    }
  }
}
