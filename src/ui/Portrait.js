import { G, rect, hasTexture, warn } from '../core.js';

// Heroine portrait inside its frame.
export class Portrait {
  constructor(scene, frameRect, portraitRect, depth) {
    const f = rect(frameRect), p = rect(portraitRect);
    this.scene = scene;
    this.p = p;
    this.expr = G.characters.heroine.default || 'neutral';
    this.img = scene.add.image(p.x, p.y, 'heroine_' + this.expr).setOrigin(0, 0).setDisplaySize(p.w, p.h).setDepth(depth);
    this.frame = scene.add.image(f.x, f.y, 'ui_portrait_frame').setOrigin(0, 0).setDisplaySize(f.w, f.h).setDepth(depth + 1);
    if (G.session.heroineExpr) this.set(G.session.heroineExpr);
  }

  set(expr) {
    if (!expr) return;
    const key = 'heroine_' + expr;
    if (!hasTexture(this.scene, key)) { warn(`Unknown Heroine expression "${expr}"`); return; }
    this.expr = expr;
    G.session.heroineExpr = expr;
    this.img.setTexture(key).setDisplaySize(this.p.w, this.p.h);
  }

  setVisible(v) { this.img.setVisible(v); this.frame.setVisible(v); }
}
