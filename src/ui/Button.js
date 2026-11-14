import { G, font, hasTexture } from '../core.js';

// Image button with normal / hover / pressed / disabled images and a text label drawn on top.
// base: 'ui_button_large', 'ui_button_small', 'ui_next', 'ui_tab'
export class Button {
  constructor(scene, base, x, y, w, h, label, onClick, opts) {
    opts = opts || {};
    this.scene = scene;
    this.base = base;
    this.onClick = onClick;
    this.enabled = true;
    this.selected = false;
    this.hover = false;
    this.pressed = false;
    this.container = scene.add.container(x, y);
    this.img = scene.add.image(0, 0, base + '_normal').setOrigin(0, 0).setDisplaySize(w, h);
    this.container.add(this.img);
    this.label = null;
    if (label !== null && label !== undefined) {
      const size = opts.fontSize || (h >= 100 ? G.config.font.button : G.config.font.buttonSmall);
      this.label = scene.add.text(w / 2, h / 2, label, font(size, { color: G.config.colors.buttonText, fontStyle: 'bold' })).setOrigin(0.5);
      this.container.add(this.label);
    }
    this.w = w; this.h = h;
    this.img.setInteractive({ useHandCursor: opts.handCursor !== false });
    this.img.on('pointerover', (p) => { if (!p.wasTouch) { this.hover = true; this.refresh(); } });
    this.img.on('pointerout', () => { this.hover = false; this.pressed = false; this.refresh(); });
    this.img.on('pointerdown', () => { if (!this.enabled) return; this.pressed = true; this.refresh(); });
    this.img.on('pointerup', () => {
      const was = this.pressed;
      this.pressed = false; this.refresh();
      if (was && this.enabled && this.onClick) {
        if (G.audio) G.audio.sfx('click');
        this.onClick();
      }
    });
    this.refresh();
  }

  state() {
    if (!this.enabled) return 'disabled';
    if (this.selected) return 'selected';
    if (this.pressed) return 'pressed';
    if (this.hover) return 'hover';
    return 'normal';
  }

  refresh() {
    let s = this.state();
    let key = `${this.base}_${s}`;
    if (!hasTexture(this.scene, key)) key = `${this.base}_normal`;
    this.img.setTexture(key).setDisplaySize(this.w, this.h);
    this.img.clearTint();
    if (s === 'disabled' && !hasTexture(this.scene, `${this.base}_disabled`)) this.img.setTint(0x999999);
    if (this.label) this.label.setColor(this.enabled ? G.config.colors.buttonText : G.config.colors.buttonTextDisabled);
  }

  setEnabled(v) { this.enabled = v; if (!v) { this.pressed = false; } this.refresh(); return this; }
  setSelected(v) { this.selected = v; this.refresh(); return this; }
  setLabel(t) { if (this.label) this.label.setText(t); return this; }
  setVisible(v) { this.container.setVisible(v); return this; }
  setDepth(d) { this.container.setDepth(d); return this; }
  destroy() { this.container.destroy(); }
}
