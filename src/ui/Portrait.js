import { rect, charImage, exprImage } from '../core.js';

// Pauline's portrait (no frame). Lines like "heroine happy: ..." switch to heroine_happy (if it exists).
export class Portrait {
  constructor(scene, portraitRect, depth) {
    const p = rect(portraitRect);
    this.scene = scene;
    this.rect = p;
    this.img = scene.add.image(p.x, p.y, charImage('heroine')).setOrigin(0, 0).setDisplaySize(p.w, p.h).setDepth(depth);
    this.shown = true;
  }

  setVisible(v) { this.img.setVisible(v); }

  /** Shows Pauline's image for an emotion (null = default image). */
  setExpr(expr) {
    const key = exprImage(this.scene, 'heroine', expr);
    if (this.img.texture.key !== key) this.img.setTexture(key).setDisplaySize(this.rect.w, this.rect.h);
  }

  /** Fades the portrait in or out. Used for narration lines (no speaker) and when the potion-screen dialogue ends. */
  show(v, instant) {
    if (v === this.shown) return;
    this.shown = v;
    this.scene.tweens.killTweensOf(this.img);
    if (instant) { this.img.setAlpha(v ? 1 : 0); return; }
    this.scene.tweens.add({ targets: this.img, alpha: v ? 1 : 0, duration: 200 });
  }
}
