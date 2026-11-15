import { rect, charImage, exprImage } from '../core.js';

// Heroine portrait inside its frame. Lines like "heroine happy: ..." switch to heroine_happy (if it exists).
export class Portrait {
  constructor(scene, frameRect, portraitRect, depth) {
    const f = rect(frameRect), p = rect(portraitRect);
    this.scene = scene;
    this.rect = p;
    this.img = scene.add.image(p.x, p.y, charImage('heroine')).setOrigin(0, 0).setDisplaySize(p.w, p.h).setDepth(depth);
    this.frame = scene.add.image(f.x, f.y, 'ui_portrait_frame').setOrigin(0, 0).setDisplaySize(f.w, f.h).setDepth(depth + 1);
    this.shown = true;
  }

  setVisible(v) { this.img.setVisible(v); this.frame.setVisible(v); }

  /** Shows the Heroine's image for an emotion (null = default image). */
  setExpr(expr) {
    const key = exprImage(this.scene, 'heroine', expr);
    if (this.img.texture.key !== key) this.img.setTexture(key).setDisplaySize(this.rect.w, this.rect.h);
  }

  /** Fades the portrait (with its frame) in or out. Used for narration lines, which have no speaker. */
  show(v, instant) {
    if (v === this.shown) return;
    this.shown = v;
    const targets = [this.img, this.frame];
    this.scene.tweens.killTweensOf(targets);
    if (instant) { targets.forEach(o => o.setAlpha(v ? 1 : 0)); return; }
    this.scene.tweens.add({ targets, alpha: v ? 1 : 0, duration: 200 });
  }
}
