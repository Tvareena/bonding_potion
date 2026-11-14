import { rect, charImage } from '../core.js';

// Heroine portrait inside its frame (one image, no expressions).
export class Portrait {
  constructor(scene, frameRect, portraitRect, depth) {
    const f = rect(frameRect), p = rect(portraitRect);
    this.img = scene.add.image(p.x, p.y, charImage('heroine')).setOrigin(0, 0).setDisplaySize(p.w, p.h).setDepth(depth);
    this.frame = scene.add.image(f.x, f.y, 'ui_portrait_frame').setOrigin(0, 0).setDisplaySize(f.w, f.h).setDepth(depth + 1);
  }

  setVisible(v) { this.img.setVisible(v); this.frame.setVisible(v); }
}
