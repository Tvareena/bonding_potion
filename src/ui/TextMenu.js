import { G, font } from '../core.js';

// Text-only buttons: the player sees and clicks just the words (no button art).
export class TextButton {
  constructor(scene, x, y, w, h, label, onClick) {
    this.scene = scene;
    this.active = false;
    this.zone = scene.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.text = scene.add.text(x + w / 2, y + h / 2, label, font(G.config.font.menu, { color: G.config.colors.menu, fontStyle: 'bold' })).setOrigin(0.5);
    this.hover = false;
    this.zone.on('pointerover', (p) => { if (!p.wasTouch) { this.hover = true; this.refresh(); } });
    this.zone.on('pointerout', () => { this.hover = false; this.refresh(); });
    this.zone.on('pointerup', () => { if (G.audio) G.audio.sfx('click'); onClick(); });
    this.refresh();
  }
  refresh() {
    const c = G.config.colors;
    this.text.setColor(this.active ? c.menuActive : (this.hover ? c.menuHover : c.menu));
    this.text.setFontStyle(this.active ? 'bold italic' : 'bold');
  }
  setActive(v) { this.active = v; this.refresh(); }
  setDepth(d) { this.zone.setDepth(d); this.text.setDepth(d); return this; }
  setVisible(v) { this.zone.setVisible(v); this.text.setVisible(v); if (v) this.zone.setInteractive(); else this.zone.disableInteractive(); }
}

/**
 * A row of text buttons. items: [{ id, label, onClick }]
 * Items are laid out right-aligned so the last item stays at the right end.
 */
export class TextMenu {
  constructor(scene, cfg, items, depth) {
    this.buttons = {};
    const n = items.length;
    const total = 5; // full menu has 6 items → first x is cfg.x; fewer items shift right
    items.forEach((it, i) => {
      const x = cfg.x + (total - (n - 1) + i) * cfg.step;
      const b = new TextButton(scene, x, cfg.y, cfg.w, cfg.h, it.label, it.onClick).setDepth(depth || 0);
      this.buttons[it.id] = b;
    });
  }
  get(id) { return this.buttons[id]; }
  setVisible(v) { Object.values(this.buttons).forEach(b => b.setVisible(v)); }
}
