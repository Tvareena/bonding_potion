import { G } from '../core.js';

// A stretchable frame built from 9 (or 3) image pieces. Works in WebGL and Canvas.
// Slice sizes come from data/assets.json → images.<key>.nineSlice = [left, right, top, bottom].
export function nineSlice(scene, key, x, y, w, h) {
  const entry = G.assets.images[key] || {};
  const [l, r, t, b] = entry.nineSlice || [0, 0, 0, 0];
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage();
  const sw = src.width, sh = src.height;
  const container = scene.add.container(x, y);

  const colsSrc = [[0, l], [l, sw - l - r], [sw - r, r]];
  const rowsSrc = [[0, t], [t, sh - t - b], [sh - b, b]];
  const midW = Math.max(0, w - l - r), midH = Math.max(0, h - t - b);
  const colsDst = [[0, l], [l, midW], [l + midW, r]];
  const rowsDst = [[0, t], [t, midH], [t + midH, b]];

  for (let ri = 0; ri < 3; ri++) {
    for (let ci = 0; ci < 3; ci++) {
      const [sx, sWidth] = colsSrc[ci];
      const [sy, sHeight] = rowsSrc[ri];
      const [dx, dWidth] = colsDst[ci];
      const [dy, dHeight] = rowsDst[ri];
      if (sWidth <= 0 || sHeight <= 0 || dWidth <= 0 || dHeight <= 0) continue;
      const frameName = `__ns_${ci}_${ri}`;
      if (!tex.has(frameName)) tex.add(frameName, 0, sx, sy, sWidth, sHeight);
      const img = scene.add.image(dx, dy, key, frameName).setOrigin(0, 0);
      img.setDisplaySize(dWidth, dHeight);
      container.add(img);
    }
  }
  container.setSize(w, h);
  return container;
}
