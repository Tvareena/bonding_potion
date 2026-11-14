import { G, font, rect } from '../core.js';
import { nineSlice } from './NineSlice.js';

// Textbox with a name plate and typewriter text (TDD §6.1).
export class TextBox {
  /**
   * cfg: { box, nameplate, text: [x,y,w,h], fontSize, fontMin, nameSize, depth }
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
