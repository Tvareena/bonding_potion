import { rect, charImage } from '../core.js';

// Heroine portrait inside its frame (one image, no expressions).
export class Portrait {
  constructor(scene, frameRect, portraitRect, depth) {
    const f = rect(frameRect), p = rect(portraitRect);
    this.scene = scene;
    this.img = scene.add.image(p.x, p.y, charImage('heroine')).setOrigin(0, 0).setDisplaySize(p.w, p.h).setDepth(depth);
    this.frame = scene.add.image(f.x, f.y, 'ui_portrait_frame').setOrigin(0, 0).setDisplaySize(f.w, f.h).setDepth(depth + 1);
    this.shown = true;
  }

  setVisible(v) { this.img.setVisible(v); this.frame.setVisible(v); }

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
