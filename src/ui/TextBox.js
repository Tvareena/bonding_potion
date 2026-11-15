import { G, font, rect, color } from '../core.js';
import { nineSlice } from './NineSlice.js';

// Textbox with a name plate and typewriter text (TDD §6.1).
export class TextBox {
  /**
   * cfg: { box, nameplate, text: [x,y,w,h], fontSize, fontMin, nameSize, depth, more: [x, y] }
   */
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    const d = cfg.depth || 0;
    const b = rect(cfg.box), np = rect(cfg.nameplate), t = rect(cfg.text);
    this.textRect = t;
    this.box = nineSlice(scene, 'ui_textbox', b.x, b.y, b.w, b.h).setDepth(d);
    this.plate = nineSlice(scene, 'ui_nameplate', np.x, np.y, np.w, np.h).setDepth(d + 1);
    this.nameText = scene.add.text(np.x + np.w / 2, np.y + np.h / 2, '', font(cfg.nameSize, { color: G.config.colors.name, fontStyle: 'bold' })).setOrigin(0.5).setDepth(d + 2);
    this.body = scene.add.text(t.x, t.y, '', font(cfg.fontSize, { lineSpacing: 6 })).setDepth(d + 2);
    this.full = '';
    this.shown = 0;
    this.typing = false;
    this.timer = null;
    this.onDone = null;

    // "More lines" arrow: a small bouncing triangle at the bottom-right of the text (drawn by the game).
    const mp = cfg.more || [t.x + t.w - 14, t.y + t.h - 10];
    this.moreY = mp[1];
    this.moreArrow = scene.add.triangle(mp[0], mp[1], 0, 0, 32, 0, 16, 20, color(G.config.colors.menu))
      .setOrigin(0.5).setDepth(d + 3).setVisible(false);
    this.moreTween = null;
  }

  /** Shows or hides the bouncing "more lines" arrow. */
  setMore(on) {
    if (on === !!this.moreTween) return;
    if (on) {
      this.moreArrow.setVisible(true).setY(this.moreY - 4);
      this.moreTween = this.scene.tweens.add({ targets: this.moreArrow, y: this.moreY + 4, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.moreTween.stop(); this.moreTween = null;
      this.moreArrow.setVisible(false);
    }
  }

  /** Fades the whole textbox (box, name plate, text) in or out. */
  fade(v, instant) {
    if (this.faded === !v) return;
    this.faded = !v;
    const targets = [this.box, this.plate, this.nameText, this.body];
    this.scene.tweens.killTweensOf(targets);
    if (instant) { targets.forEach(o => o.setAlpha(v ? 1 : 0)); return; }
    this.scene.tweens.add({ targets, alpha: v ? 1 : 0, duration: 220 });
  }

  setVisible(v) {
    [this.box, this.plate, this.nameText, this.body].forEach(o => o.setVisible(v));
    if (v && !this.nameText.text) { this.plate.setVisible(false); this.nameText.setVisible(false); }
  }

  /** Wraps text to the box width, shrinking the font until it fits the box height. Returns pre-wrapped text. */
  layout(text) {
    let size = this.cfg.fontSize;
    const min = this.cfg.fontMin || Math.round(size * 0.7);
    let wrapped = '';
    while (true) {
      this.body.setFontSize(size);
      this.body.setWordWrapWidth(this.textRect.w, true);
      wrapped = this.body.getWrappedText(text).join('\n');
      this.body.setWordWrapWidth(null);
      this.body.setText(wrapped);
      if (this.body.height <= this.textRect.h || size <= min) break;
      size -= 2;
    }
    this.body.setText('');
    return wrapped;
  }

  /** Shows a line. name null → narration (no name plate). */
  show(name, text, opts) {
    opts = opts || {};
    this.stop();
    const hasName = !!name;
    this.plate.setVisible(hasName);
    this.nameText.setVisible(hasName).setText(name || '');
    this.full = this.layout(text);
    this.shown = 0;
    this.onDone = opts.onDone || null;
    const cps = opts.instant ? 0 : (G.config.text.speeds[G.settings.textSpeed] || 45);
    if (!cps) { this.finish(); return; }
    this.typing = true;
    const step = Math.max(10, 1000 / cps);
    this.timer = this.scene.time.addEvent({
      delay: step, loop: true, callback: () => {
        this.shown++;
        this.body.setText(this.full.slice(0, this.shown));
        if (this.shown >= this.full.length) this.finish();
      }
    });
  }

  finish() {
    if (this.timer) { this.timer.remove(); this.timer = null; }
    this.body.setText(this.full);
    const wasTyping = this.typing;
    this.typing = false;
    if (this.onDone) { const cb = this.onDone; this.onDone = null; cb(wasTyping); }
  }

  stop() {
    if (this.timer) { this.timer.remove(); this.timer = null; }
    this.setMore(false);
    this.typing = false;
    this.onDone = null;
  }

  clear() {
    this.stop();
    this.full = '';
    this.body.setText('');
    this.nameText.setText('');
    this.plate.setVisible(false);
    this.nameText.setVisible(false);
  }
}
