import { G, T, font, rect, goTo } from '../core.js';
import { Button } from '../ui/Button.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { setupDebug } from '../systems/Debug.js';

// Ending card: illustration, ending name, "Ending X of 3", Title button.
export class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }

  create(data) {
    this._leaving = false;
    this.input.enabled = true;
    this.cameras.main.fadeIn(600, 0, 0, 0);
    const id = data.endingId || 'bad';
    const L = G.layout.ending;
    const c = G.config.colors;

    this.add.image(0, 0, 'ending_' + id).setOrigin(0, 0).setDisplaySize(1920, 1080);
    const n = G.config.endings.order.indexOf(id) + 1;
    const name = this.add.text(L.name[0], L.name[1], T('ending.' + id),
      font(G.config.font.endingName, { color: c.endingText, fontStyle: 'bold', stroke: c.endingStroke, strokeThickness: 10, align: 'center', wordWrap: { width: 1500 } })).setOrigin(0.5).setAlpha(0);
    const counter = this.add.text(L.counter[0], L.counter[1], T('ending.counter', { n }),
      font(G.config.font.endingCounter, { color: c.endingText, stroke: c.endingStroke, strokeThickness: 6 })).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [name, counter], alpha: 1, duration: 900, delay: 400 });

    const b = rect(L.button);
    new Button(this, 'ui_button_large', b.x, b.y, b.w, b.h, T('ending.toTitle'), () => goTo(this, 'Title'));

    SaveSystem.addSeenEnding(id);
    SaveSystem.clearProgress();
    G.audio.music(id);
    setupDebug(this);
  }
}
